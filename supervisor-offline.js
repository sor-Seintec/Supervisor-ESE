import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

const DB_NAME = 'supervisor-ese-offline-v1';
const DB_VERSION = 1;
const STORE_NAME = 'visitOutbox';
const FALLBACK_KEY = 'supervisor-ese-visit-outbox-v1';
const CACHE_PREFIX = 'supervisor-ese-read-cache-v1';
const DEFAULT_CACHE_TTL = 5 * 60 * 1000;
const RETRYABLE_CODES = new Set([
  'aborted',
  'cancelled',
  'deadline-exceeded',
  'internal',
  'resource-exhausted',
  'unavailable',
  'unknown'
]);

function normalizeCode(error) {
  return String(error?.code || error?.name || 'unknown').replace(/^firestore\//, '');
}

function requestPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Falha no armazenamento local.'));
  });
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userUid', 'userUid', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Não foi possível abrir o armazenamento local.'));
  });
}

async function withStore(mode, callback) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const completed = new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Falha na transação local.'));
      transaction.onabort = () => reject(transaction.error || new Error('Transação local cancelada.'));
    });
    const result = await callback(transaction.objectStore(STORE_NAME));
    await completed;
    return result;
  } finally {
    database.close();
  }
}

function readFallback() {
  try {
    const value = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeFallback(items) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(items));
}

function notifyChanged() {
  window.dispatchEvent(new CustomEvent('supervisor-outbox-change'));
}

export function createOperationId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function queueVisitOperation(operation) {
  const record = {
    ...operation,
    status: 'pending',
    attempts: Number(operation.attempts || 0),
    createdAtLocal: operation.createdAtLocal || Date.now(),
    updatedAtLocal: Date.now(),
    nextAttemptAt: 0,
    lastErrorCode: null,
    lastErrorMessage: null
  };
  let storedInIndexedDb = false;
  try {
    await withStore('readwrite', store => requestPromise(store.put(record)));
    storedInIndexedDb = true;
  } catch (indexedDbError) {
    const items = readFallback().filter(item => item.id !== record.id);
    items.push(record);
    try {
      writeFallback(items);
    } catch (fallbackError) {
      const error = new Error('O navegador não permitiu guardar o registro localmente.');
      error.cause = { indexedDbError, fallbackError };
      throw error;
    }
  }
  if (storedInIndexedDb) {
    try { writeFallback(readFallback().filter(item => item.id !== record.id)); } catch { /* IndexedDB já protege o registro. */ }
  }
  notifyChanged();
  return record;
}

export async function listVisitOutbox(userUid) {
  let indexedItems = [];
  try {
    indexedItems = await withStore('readonly', store => requestPromise(store.getAll()));
  } catch {
    indexedItems = [];
  }
  const merged = new Map();
  [...indexedItems, ...readFallback()].forEach(item => {
    if (item?.id) merged.set(item.id, item);
  });
  return [...merged.values()]
    .filter(item => !userUid || item.userUid === userUid)
    .sort((a, b) => (a.createdAtLocal || 0) - (b.createdAtLocal || 0));
}

export async function getVisitOutboxCount(userUid) {
  return (await listVisitOutbox(userUid)).length;
}

async function removeOperation(id) {
  let removedFromIndexedDb = false;
  try {
    await withStore('readwrite', store => requestPromise(store.delete(id)));
    removedFromIndexedDb = true;
  } catch {
    // A cópia de contingência ainda será removida logo abaixo.
  }
  const fallback = readFallback().filter(item => item.id !== id);
  try { writeFallback(fallback); } catch (error) { if (!removedFromIndexedDb) throw error; }
  notifyChanged();
}

async function updateOperation(operation) {
  const record = { ...operation, updatedAtLocal: Date.now() };
  let storedInIndexedDb = false;
  try {
    await withStore('readwrite', store => requestPromise(store.put(record)));
    storedInIndexedDb = true;
  } catch {
    const fallback = readFallback().filter(item => item.id !== record.id);
    fallback.push(record);
    writeFallback(fallback);
  }
  if (storedInIndexedDb) {
    try { writeFallback(readFallback().filter(item => item.id !== record.id)); } catch { /* IndexedDB contém a versão atual. */ }
  }
  notifyChanged();
}

function timeout(promise, milliseconds = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => {
      const error = new Error('Tempo de conexão esgotado.');
      error.code = 'deadline-exceeded';
      reject(error);
    }, milliseconds))
  ]);
}

function restoreTimestampFields(data, fields) {
  const restored = { ...data };
  fields.forEach(field => {
    if (Number.isFinite(restored[field])) restored[field] = Timestamp.fromMillis(restored[field]);
  });
  return restored;
}

async function commitOperation(db, operation) {
  // Depois de uma tentativa sem resposta, primeiro confirma se o lote atômico já
  // chegou ao servidor. Isso torna a repetição segura e evita visitas duplicadas.
  if (Number(operation.attempts || 0) > 0) {
    const existingVisit = await timeout(getDoc(doc(db, 'visits', operation.visitId)));
    if (existingVisit.exists()) return;
  }
  const batch = writeBatch(db);
  const visit = restoreTimestampFields(operation.visit, ['visitDate']);
  batch.set(doc(db, 'visits', operation.visitId), {
    ...visit,
    recordedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }, { merge: true });

  if (operation.goalJustificationId && operation.goalJustification) {
    const justification = restoreTimestampFields(operation.goalJustification, ['referenceDate']);
    batch.set(doc(db, 'goalJustifications', operation.goalJustificationId), {
      ...justification,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  if (operation.agendaId) {
    batch.update(doc(db, 'agenda', operation.agendaId), {
      status: operation.visit.statusCode,
      updatedAt: serverTimestamp()
    });
  }
  await timeout(batch.commit());
}

export async function syncVisitOutbox(db, userUid, { force = false } = {}) {
  if (!userUid) return { synced: 0, pending: 0, failed: 0 };
  const operations = await listVisitOutbox(userUid);
  let synced = 0;
  let failed = 0;
  for (const operation of operations) {
    if (!force && operation.nextAttemptAt && operation.nextAttemptAt > Date.now()) continue;
    try {
      await commitOperation(db, operation);
      await removeOperation(operation.id);
      synced += 1;
    } catch (error) {
      const code = normalizeCode(error);
      const attempts = Number(operation.attempts || 0) + 1;
      const retryable = RETRYABLE_CODES.has(code) || navigator.onLine === false;
      const delay = Math.min(30 * 60 * 1000, 15000 * (2 ** Math.min(attempts - 1, 7)));
      await updateOperation({
        ...operation,
        attempts,
        status: retryable ? 'pending' : 'needs_attention',
        nextAttemptAt: retryable ? Date.now() + delay : 0,
        lastErrorCode: code,
        lastErrorMessage: String(error?.message || 'Falha ao sincronizar.')
      });
      failed += 1;
      if (code === 'resource-exhausted' || navigator.onLine === false) break;
    }
  }
  return {
    synced,
    failed,
    pending: await getVisitOutboxCount(userUid)
  };
}

function encodeCache(value) {
  if (value && typeof value.toMillis === 'function') return { __timestampMillis: value.toMillis() };
  if (Array.isArray(value)) return value.map(encodeCache);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, encodeCache(child)]));
  }
  return value;
}

function decodeCache(value) {
  if (Array.isArray(value)) return value.map(decodeCache);
  if (value && typeof value === 'object') {
    if (Number.isFinite(value.__timestampMillis)) {
      const milliseconds = value.__timestampMillis;
      return {
        seconds: Math.floor(milliseconds / 1000),
        nanoseconds: (milliseconds % 1000) * 1000000,
        toDate: () => new Date(milliseconds),
        toMillis: () => milliseconds
      };
    }
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decodeCache(child)]));
  }
  return value;
}

function cacheKey(userUid, name) {
  return `${CACHE_PREFIX}:${userUid}:${name}`;
}

export function setReadCache(userUid, name, data, ttl = DEFAULT_CACHE_TTL) {
  if (!userUid) return;
  const savedAt = Date.now();
  try {
    sessionStorage.setItem(cacheKey(userUid, name), JSON.stringify({
      savedAt,
      expiresAt: savedAt + ttl,
      data: encodeCache(data)
    }));
  } catch {
    // Cache é uma otimização; falhar não pode impedir o uso do sistema.
  }
}

export function getReadCache(userUid, name, { allowExpired = false } = {}) {
  if (!userUid) return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(cacheKey(userUid, name)) || 'null');
    if (!parsed || (!allowExpired && parsed.expiresAt <= Date.now())) return null;
    return {
      data: decodeCache(parsed.data),
      savedAt: parsed.savedAt,
      fresh: parsed.expiresAt > Date.now()
    };
  } catch {
    return null;
  }
}

export function expireReadCache(userUid, name) {
  if (!userUid) return;
  try {
    const key = cacheKey(userUid, name);
    const parsed = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (parsed) sessionStorage.setItem(key, JSON.stringify({ ...parsed, expiresAt: 0 }));
  } catch {
    // Mantém o fluxo principal mesmo sem cache.
  }
}

export function exportPendingVisits(items) {
  const safeItems = items.map(item => ({
    exportedAt: new Date().toISOString(),
    ...item
  }));
  const blob = new Blob([JSON.stringify(safeItems, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Supervisor-ESE-pendentes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}
