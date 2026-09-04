const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  mentorados: {
    label: 'Mentorados',
    contactsFile: path.join(ROOT, 'contacts', 'mentorados.csv'),
    questions: require('./questions/mentorados'),
    stateFile: path.join(ROOT, 'state', 'mentorados.json'),
    responsesFile: path.join(ROOT, 'responses', 'mentorados.csv'),
  },
  mentores: {
    label: 'Mentores',
    contactsFile: path.join(ROOT, 'contacts', 'mentores.csv'),
    questions: require('./questions/mentores'),
    stateFile: path.join(ROOT, 'state', 'mentores.json'),
    responsesFile: path.join(ROOT, 'responses', 'mentores.csv'),
  },
};
