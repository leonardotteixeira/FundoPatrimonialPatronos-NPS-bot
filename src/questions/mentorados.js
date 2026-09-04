module.exports = [
  {
    key: 'sessao',
    type: 'choice',
    text: (name) =>
      `Olá${name ? ' ' + name : ''}! O Patronos quer saber como foi sua experiência no programa Trilha de Carreiras — leva só 3 minutinhos 🙂\n\n` +
      `1️⃣ Qual sessão você está avaliando?\nResponda *1* para 1ª Sessão ou *2* para 2ª Sessão.`,
    options: { '1': '1ª Sessão', '2': '2ª Sessão' },
  },
  {
    key: 'execucao_programa',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *execução do programa*?',
  },
  {
    key: 'clareza_objetivos',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *clareza na definição dos objetivos*?',
  },
  {
    key: 'material_apoio',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia o *material de apoio enviado*?',
  },
  {
    key: 'comunicacao_equipe',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *comunicação com a Equipe Trilhas*?',
  },
  {
    key: 'satisfacao_mentor',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito insatisfeito, 10 = muito satisfeito): quão satisfeito você está com a participação do seu mentor no programa?',
  },
  {
    key: 'desafios',
    type: 'text',
    text: () => 'Quais foram os principais desafios que você enfrentou no Programa?',
  },
  {
    key: 'sugestoes',
    type: 'text',
    text: () =>
      'Tem algum comentário ou sugestão para as próximas edições do Programa? (pode responder "não" se não tiver)',
  },
  {
    key: 'satisfacao_geral',
    type: 'scale',
    text: () =>
      'Por fim, de 0 a 10 (0 = muito insatisfeito, 10 = muito satisfeito): quão satisfeito você está com sua participação geral no programa Trilha de Carreiras?',
  },
];
