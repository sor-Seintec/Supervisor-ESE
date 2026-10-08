// Ausências são informativas: nunca são convertidas em visitas ou créditos de meta.
export const absenceReasons = Object.freeze([
  'Atestado médico', 'Ausência médica', 'Doação de sangue', 'Exame médico',
  'Falta médica', 'Férias', 'Feriado', 'Licença médica', 'Licença prêmio', 'Ponto Facultativo'
]);
export const absenceShifts = Object.freeze(['Dia inteiro', 'Manhã', 'Tarde', 'Integral', 'Flexível']);
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validateAbsence(input) {
  if (!input.supervisorId) throw new Error('Selecione o supervisor.');
  if (!absenceReasons.includes(input.reason)) throw new Error('Selecione o motivo da ausência.');
  if (!validDate(input.startDate) || !validDate(input.endDate)) throw new Error('Informe datas válidas para o início e o fim.');
  if (input.endDate < input.startDate) throw new Error('A data final não pode ser anterior à inicial.');
  if (!absenceShifts.includes(input.shift)) throw new Error('Selecione o turno.');
  if (typeof input.notes !== 'string' || input.notes.length > 800) throw new Error('Use até 800 caracteres na observação.');
  return { supervisorId: input.supervisorId, reason: input.reason, startDate: input.startDate,
    endDate: input.endDate, shift: input.shift, notes: input.notes.trim(), status: 'informed', schemaVersion: 1 };
}
export function coversDay(absence, day) {
  return absence.status === 'informed' && absence.startDate <= day && day <= absence.endDate;
}
export function formatDate(value) { return validDate(value) ? value.split('-').reverse().join('/') : '—'; }
export function formatPeriod(absence) {
  return absence.startDate === absence.endDate ? formatDate(absence.startDate)
    : `${formatDate(absence.startDate)} a ${formatDate(absence.endDate)}`;
}
