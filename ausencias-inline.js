import { collection, doc, getDocs, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { absenceReasons, absenceShifts, validateAbsence } from './ausencias-model.js';

export function setupInlineAbsence({db, state, showToast}) {
  const $ = id => document.getElementById(id);
  const form = $('visitForm');
  let saving = false, selectedReason = '', supervisorLoad = null, supervisorsReady = false;
  for (const shift of absenceShifts) $('absenceShift').add(new Option(shift, shift));
  function render() {
    const search = $('absenceSearch').value.toLocaleLowerCase('pt-BR');
    $('absenceReasons').replaceChildren();
    for (const reason of absenceReasons.filter(value => value.toLocaleLowerCase('pt-BR').includes(search))) {
      const label = document.createElement('label'); label.className = 'action-option';
      const input = document.createElement('input'); input.type = 'radio'; input.name = 'absenceReason'; input.value = reason;
      input.checked = selectedReason === reason;
      input.addEventListener('change', () => { selectedReason = reason; });
      const text = document.createElement('span'); text.textContent = reason;
      label.append(input, text); $('absenceReasons').append(label);
    }
    if (!$('absenceReasons').children.length) {
      const empty = document.createElement('p'); empty.className = 'action-empty'; empty.textContent = 'Nenhum motivo encontrado.';
      $('absenceReasons').append(empty);
    }
  }
  $('absenceSearch').addEventListener('input', render);
  $('absenceStart').addEventListener('change', () => {
    $('absenceEnd').min = $('absenceStart').value;
    if (!$('absenceEnd').value || $('absenceEnd').value < $('absenceStart').value) $('absenceEnd').value = $('absenceStart').value;
  });
  form.addEventListener('reset', () => { selectedReason = ''; $('absenceFeedback').textContent = ''; queueMicrotask(render); });
  async function loadSupervisors() {
    if (supervisorsReady) return;
    if (supervisorLoad) return supervisorLoad;
    supervisorLoad = (async () => {
      try {
        const snapshot = await getDocs(collection(db, 'supervisors'));
        $('absenceSupervisor').replaceChildren(new Option('Selecione o supervisor', ''));
        snapshot.docs.map(item => ({id:item.id,...item.data()})).filter(item => item.active !== false)
          .sort((a,b) => String(a.name || '').localeCompare(String(b.name || ''),'pt-BR'))
          .forEach(item => $('absenceSupervisor').add(new Option(item.name || item.id,item.id)));
        supervisorsReady = true;
      } catch {
        $('absenceFeedback').textContent = 'Não foi possível carregar os supervisores. Selecione a opção novamente para tentar.';
      } finally { supervisorLoad = null; }
    })();
    return supervisorLoad;
  }
  function toggle(active) {
    $('absencePanel').hidden = !active;
    form.querySelector('.section').hidden = active;
    $('statusGrid').closest('.section').hidden = active;
    $('notes').closest('.field').hidden = active;
    $('saveButton').textContent = active ? 'Confirmar ausência informada' : 'Confirmar registro';
    if (!active) return;
    $('absenceSupervisorField').hidden = state.profile?.role !== 'admin';
    if (state.profile?.role === 'admin') void loadSupervisors();
    if (!$('absenceStart').value) {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
      $('absenceStart').value = $('visitDate').value || today;
      $('absenceEnd').value = $('absenceStart').value;
      $('absenceShift').value = $('shiftSelect').value || 'Dia inteiro';
    }
    render();
  }
  async function save() {
    if (saving) return;
    let controls = [];
    try {
      if (!state.user || !state.profile) throw new Error('Faça login novamente para informar a ausência.');
      if (!navigator.onLine) throw new Error('Conecte-se à internet para salvar a ausência.');
      const data = validateAbsence({
        supervisorId: state.profile.role === 'admin' ? $('absenceSupervisor').value : state.profile.supervisorId,
        reason: selectedReason, startDate: $('absenceStart').value, endDate: $('absenceEnd').value,
        shift: $('absenceShift').value, notes: $('absenceNotes').value
      });
      saving = true;
      controls = [...form.elements].map(control => [control, control.disabled]);
      controls.forEach(([control]) => control.disabled = true);
      $('absenceFeedback').textContent = 'Salvando… Aguarde a confirmação antes de sair.';
      // Ausência não passa pela fila de visitas nem gera justificativa/crédito de meta.
      await setDoc(doc(collection(db, 'absences')), {...data, createdByUid:state.user.uid, createdAt:serverTimestamp()});
      selectedReason = ''; $('absenceNotes').value = ''; render();
      $('absenceFeedback').textContent = 'Ausência informada salva. Não conta como visita e não altera a meta. Planejamentos mantidos.';
      showToast('Ausência informada salva.', 'success');
    } catch (error) {
      const text = error.code === 'permission-denied'
        ? 'Sem permissão para salvar. Confira a regra absences no Firebase.'
        : error.message || 'Não foi possível salvar a ausência. Tente novamente.';
      $('absenceFeedback').textContent = text; showToast(text, 'error');
    } finally {
      controls.forEach(([control, disabled]) => control.disabled = disabled);
      saving = false;
    }
  }
  window.addEventListener('beforeunload', event => { if (saving) { event.preventDefault(); event.returnValue = ''; } });
  return {toggle, save};
}
