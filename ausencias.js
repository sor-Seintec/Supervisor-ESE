import { auth, db } from './firebase-gestor.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { collection, doc, getDoc, getDocsFromServer, query, where, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { absenceReasons, absenceShifts, validateAbsence, formatPeriod } from './ausencias-model.js';

const $ = id => document.getElementById(id);
let session, saving = false, historyVersion = 0;
let supervisorLocked = false;
const today = new Date();
const dateKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
for (const value of absenceReasons) $('reason').add(new Option(value, value));
for (const value of absenceShifts) $('shift').add(new Option(value, value));
$('startDate').value = $('endDate').value = dateKey;
$('startDate').addEventListener('change', () => {
  $('endDate').min = $('startDate').value;
  if (!$('endDate').value || $('endDate').value < $('startDate').value) $('endDate').value = $('startDate').value;
});
function errorMessage(error) {
  if (error.code === 'permission-denied') return 'Sem permissão para acessar ausências. O administrador precisa publicar a regra da coleção absences no Firebase.';
  if (error.code === 'unavailable' || !navigator.onLine) return 'Sem conexão com o servidor. Conecte-se à internet e tente novamente.';
  return error.message || 'Não foi possível concluir. Tente novamente.';
}
function message(text, kind = '') { $('message').textContent = text; $('message').className = kind; }
async function loadHistory() {
  const version = ++historyVersion, supervisorId = $('supervisor').value;
  $('history').replaceChildren();
  if (!supervisorId) { $('historyMessage').textContent = 'Selecione um supervisor.'; return; }
  $('historyMessage').textContent = 'Carregando histórico…';
  try {
    const snapshot = await getDocsFromServer(query(collection(db, 'absences'), where('supervisorId', '==', supervisorId)));
    if (version !== historyVersion) return;
    const rows = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      .sort((a,b) => b.startDate.localeCompare(a.startDate) || (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    $('historyMessage').textContent = rows.length ? `${rows.length} ausência(s) informada(s). Sem impacto na meta.` : 'Nenhuma ausência informada para este supervisor.';
    for (const row of rows) {
      const article = document.createElement('article'); article.className = 'history-item';
      const badge = document.createElement('span'); badge.className = 'badge'; badge.textContent = 'Ausência informada';
      const title = document.createElement('h3'); title.textContent = row.reason;
      const period = document.createElement('p'); period.textContent = `${formatPeriod(row)} · ${row.shift}`;
      article.append(badge, title, period);
      if (row.notes) { const notes = document.createElement('p'); notes.textContent = row.notes; article.append(notes); }
      $('history').append(article);
    }
  } catch (error) { if (version === historyVersion) $('historyMessage').textContent = errorMessage(error); }
}
$('supervisor').addEventListener('change', loadHistory);
$('refresh').addEventListener('click', loadHistory);
$('absenceForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (saving || !session) return;
  try {
    if (!navigator.onLine) throw new Error('Conecte-se à internet antes de salvar a ausência.');
    const data = validateAbsence({ supervisorId: $('supervisor').value, reason: $('reason').value,
      startDate: $('startDate').value, endDate: $('endDate').value, shift: $('shift').value, notes: $('notes').value });
    saving = true; $('save').disabled = true;
    for (const control of $('absenceForm').elements) control.disabled = true;
    message('Salvando… Aguarde a confirmação antes de sair desta página.');
    // Coleção exclusiva: nenhuma escrita em visits, agenda ou monthlyGoals.
    await setDoc(doc(collection(db, 'absences')), { ...data, createdByUid: session.uid, createdAt: serverTimestamp() });
    message('Ausência informada salva. Disponível no planejamento e neste histórico. A meta e as visitas permanecem inalteradas.', 'success');
    $('reason').value = ''; $('notes').value = '';
    await loadHistory();
  } catch (error) { message(errorMessage(error), 'error'); }
  finally {
    saving = false;
    for (const control of $('absenceForm').elements) control.disabled = false;
    $('supervisor').disabled = supervisorLocked;
  }
});
window.addEventListener('beforeunload', event => { if (saving) { event.preventDefault(); event.returnValue = ''; } });
onAuthStateChanged(auth, async user => {
  if (!user) { location.replace('index.html'); return; }
  try {
    const snapshot = await getDoc(doc(db, 'users', user.uid));
    const profile = snapshot.data();
    if (!profile?.active || !['admin', 'supervisor'].includes(profile.role)) throw new Error('Seu perfil não tem acesso ao registro de ausências.');
    $('supervisor').replaceChildren();
    if (profile.role === 'admin') {
      const supervisors = await getDocsFromServer(collection(db, 'supervisors'));
      $('supervisor').add(new Option('Selecione o supervisor', ''));
      supervisors.docs.map(item => ({ id: item.id, ...item.data() }))
        .filter(item => item.active !== false).sort((a,b) => String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'))
        .forEach(item => $('supervisor').add(new Option(item.name || item.id, item.id)));
      const selected = new URLSearchParams(location.search).get('supervisor');
      if (selected && [...$('supervisor').options].some(option => option.value === selected)) $('supervisor').value = selected;
    } else {
      if (!profile.supervisorId) throw new Error('Seu usuário ainda não está vinculado a um supervisor.');
      const supervisor = await getDoc(doc(db, 'supervisors', profile.supervisorId));
      $('supervisor').add(new Option(supervisor.data()?.name || profile.name || 'Meu registro', profile.supervisorId));
      supervisorLocked = true; $('supervisor').disabled = true;
    }
    session = user; $('loading').hidden = true; $('app').hidden = false;
    await loadHistory();
  } catch (error) { $('loading').textContent = errorMessage(error); }
});
