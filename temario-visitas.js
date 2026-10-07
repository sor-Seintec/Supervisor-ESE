// Catálogo novo do Supervisor-ESE. Os documentos antigos de "actions" permanecem
// no Firestore para preservar o histórico, mas não são oferecidos em novas visitas.
export const temarioVisitas = [
  {
    id: 'temario-v1-gestao-pedagogica',
    name: 'Gestão Pedagógica',
    topics: ['Currículo', 'Planejamento pedagógico', 'Práticas pedagógicas', 'Recuperação e recomposição das aprendizagens', 'Projetos pedagógicos', 'Acompanhamento das ações formativas']
  },
  {
    id: 'temario-v1-avaliacao-resultados-aprendizagem',
    name: 'Avaliação, Resultados e Aprendizagem',
    topics: ['Avaliações internas', 'Avaliações externas', 'Análise de resultados', 'Indicadores educacionais', 'Frequência e participação dos estudantes', 'Planos de melhoria e intervenções']
  },
  {
    id: 'temario-v1-gestao-escolar-organizacao-institucional',
    name: 'Gestão Escolar e Organização Institucional',
    topics: ['Organização e funcionamento da escola', 'Plano de Gestão', 'Regimento Escolar', 'Calendário Escolar', 'Rotinas administrativas', 'Organização dos tempos e espaços escolares']
  },
  {
    id: 'temario-v1-vida-escolar-registros-academicos',
    name: 'Vida Escolar e Registros Acadêmicos',
    topics: ['Matrícula', 'Transferência', 'Classificação e reclassificação', 'Frequência', 'Histórico escolar', 'Documentação escolar', 'Regularização de vida escolar', 'Registros nos sistemas']
  },
  {
    id: 'temario-v1-gestao-pessoas',
    name: 'Gestão de Pessoas',
    topics: ['Quadro de pessoal', 'Atribuição', 'Exercício', 'Frequência', 'Afastamentos', 'Acúmulo de cargos', 'Avaliação de desempenho', 'Orientações funcionais', 'Formação e acompanhamento dos profissionais']
  },
  {
    id: 'temario-v1-programa-ensino-integral-pei',
    name: 'Programa Ensino Integral – PEI',
    topics: ['Organização e funcionamento do PEI', 'Modelo Pedagógico', 'Modelo de Gestão', 'Tutoria', 'Projeto de Vida', 'Eletivas', 'Práticas e vivências', 'Acompanhamento das ações do programa']
  },
  {
    id: 'temario-v1-convivencia-protecao-estudantes',
    name: 'Convivência Escolar e Proteção dos Estudantes',
    topics: ['Clima escolar', 'Conflitos', 'Bullying e outras formas de violência', 'Busca ativa', 'Prevenção do abandono', 'Proteção de direitos', 'Encaminhamentos à rede de proteção']
  },
  {
    id: 'temario-v1-educacao-especial-inclusao',
    name: 'Educação Especial e Inclusão',
    topics: ['Atendimento aos estudantes elegíveis aos serviços da Educação Especial', 'AEE', 'Acessibilidade', 'Inclusão', 'Acompanhamento pedagógico', 'Documentação e registros']
  },
  {
    id: 'temario-v1-gestao-democratica-participacao',
    name: 'Gestão Democrática e Participação',
    topics: ['Conselho de Escola', 'APM', 'Grêmio Estudantil', 'Participação dos estudantes', 'Participação das famílias', 'Relação escola-comunidade']
  },
  {
    id: 'temario-v1-recursos-financeiros-prestacao-contas',
    name: 'Recursos Financeiros e Prestação de Contas',
    topics: ['Aplicação de recursos', 'Prestação de contas', 'APM', 'Programas de transferência de recursos', 'Documentação e procedimentos financeiros']
  },
  {
    id: 'temario-v1-infraestrutura-patrimonio-servicos',
    name: 'Infraestrutura, Patrimônio e Serviços',
    topics: ['Prédio escolar', 'Manutenção', 'Conservação', 'Patrimônio', 'Alimentação escolar', 'Limpeza', 'Segurança', 'Condições de funcionamento']
  },
  {
    id: 'temario-v1-programas-projetos-politicas',
    name: 'Programas, Projetos e Políticas Educacionais',
    topics: ['Programas da Secretaria', 'Projetos institucionais', 'Implementação de políticas educacionais', 'Acompanhamento de ações e metas']
  },
  {
    id: 'temario-v1-legislacao-orientacao-normativa',
    name: 'Legislação e Orientação Normativa',
    topics: ['Legislação educacional', 'Normas', 'Resoluções', 'Procedimentos administrativos', 'Adequação de documentos', 'Cumprimento de orientações e determinações']
  },
  {
    id: 'temario-v1-monitoramento-supervisao',
    name: 'Monitoramento e Acompanhamento da Supervisão',
    topics: ['Acompanhamento de orientações anteriores', 'Verificação de providências', 'Monitoramento de Plano de Ação', 'Acompanhamento de situações específicas']
  },
  {
    id: 'temario-v1-demandas-especificas-outros',
    name: 'Demandas Específicas / Outros',
    topics: ['Demandas extraordinárias', 'Situações não contempladas nos demais macrotemas']
  }
];
