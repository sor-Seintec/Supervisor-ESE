# Supervisor-ESE — regra de justificativas e KPI

## Separação dos registros

- `visits`: histórico operacional de visitas realizadas, adiadas, canceladas ou justificadas.
- `goalJustifications`: solicitações que podem compensar uma meta, sempre vinculadas a uma visita.

Os motivos de adiamento e cancelamento permanecem apenas em `visits.operationalReason` e não alteram metas.

## Fluxo da justificativa de meta

1. O supervisor seleciona `J — Justificar meta` em uma visita planejada.
2. O Supervisor-ESE cria a visita e uma justificativa em `goalJustifications`.
3. A justificativa inicia com `validationStatus: "pending"` e `goalCreditApproved: 0`.
4. O futuro módulo do Gestor-ESE poderá aprovar ou rejeitar a solicitação.
5. Somente uma justificativa aprovada poderá receber `goalCreditApproved: 1`.

## Cálculo futuro recomendado

```text
resultado efetivo = visitas realizadas + créditos de justificativas aprovadas
faltam para a meta = máximo(meta - resultado efetivo, 0)
```

Justificativas pendentes ou rejeitadas não entram no resultado efetivo.

## Chaves para integração

Cada documento de `goalJustifications` contém:

- `supervisorId`
- `visitId`
- `agendaId`
- `schoolId` e `schoolName`
- `referenceDate` e `periodKey` no formato `AAAA-MM`
- `reason`
- `validationStatus`
- `goalCreditRequested`
- `goalCreditApproved`
- identificação do usuário que enviou e datas de auditoria
