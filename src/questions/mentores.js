module.exports = [
  {
    key: 'sessao',
    type: 'choice',
    text: (name) =>
      `Olá${name ? ' ' + name : ''}! O Patronos quer saber como foi a sua sessão de mentoria — leva só 2 minutinhos 🙂\n\n` +
      `1️⃣ Qual sessão você está avaliando?\nResponda *1* para 1ª Sessão ou *2* para 2ª Sessão.`,
    options: { '1': '1ª Sessão', '2': '2ª Sessão' },
  },
  {
    key: 'preparacao',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *preparação do mentorado*?',
  },
  {
    key: 'clareza_objetivos',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *clareza na definição dos objetivos*?',
  },
  {
    key: 'comunicacao',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *facilidade de comunicação com o mentorado*?',
  },
  {
    key: 'engajamento',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia o *nível de engajamento do mentorado*?',
  },
  {
    key: 'relevancia',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *relevância das discussões*?',
  },
  {
    key: 'duracao',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *duração da sessão*?',
  },
  {
    key: 'comunicacao_equipe',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito abaixo do ideal, 10 = ideal): como você avalia a *comunicação com a Equipe Trilhas*?',
  },
  {
    key: 'pontos_positivos',
    type: 'text',
    text: () => 'Quais aspectos da sessão você considerou mais eficazes ou positivos?',
  },
  {
    key: 'pontos_melhorar',
    type: 'text',
    text: () => 'Quais áreas você acredita que poderiam ser melhoradas para futuras sessões?',
  },
  {
    key: 'satisfacao_programa',
    type: 'scale',
    text: () =>
      'De 0 a 10 (0 = muito insatisfeito, 10 = muito satisfeito): quão satisfeito você está com sua participação no programa Trilha de Carreiras?',
  },
  {
    key: 'comentario_final',
    type: 'text',
    text: () =>
      'Por fim, algum outro comentário ou sugestão sobre a sessão de mentoria ou o processo em geral? (pode responder "não" se não tiver)',
  },
];
