const fs = require('fs');
const path = require('path');

function csvField(value) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

function saveCompletedResponse(responsesFile, questions, contact, answers) {
  fs.mkdirSync(path.dirname(responsesFile), { recursive: true });
  if (!fs.existsSync(responsesFile)) {
    const header = ['timestamp', 'name', 'phone', ...questions.map((q) => q.key)];
    fs.writeFileSync(responsesFile, header.map(csvField).join(',') + '\n');
  }
  const row = [
    new Date().toISOString(),
    contact.name,
    contact.phone,
    ...questions.map((q) => answers[q.key]),
  ];
  fs.appendFileSync(responsesFile, row.map(csvField).join(',') + '\n');
}

module.exports = { saveCompletedResponse };
