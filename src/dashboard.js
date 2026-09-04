const http = require('http');
const fs = require('fs');
const path = require('path');

const GROUPS = require('./groups');
const { loadState } = require('./state');

const DASHBOARD_HTML = path.join(__dirname, '..', 'public', 'dashboard.html');

function loadContactsRaw(contactsFile) {
  const lines = fs
    .readFileSync(contactsFile, 'utf-8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const [, ...rows] = lines;
  return rows.map((row) => {
    const [name, phone] = row.split(',').map((s) => s.trim());
    return { name, phone: phone.replace(/\D/g, '') };
  });
}

function buildStatus(getConnection) {
  const groups = {};
  for (const [key, group] of Object.entries(GROUPS)) {
    const contacts = loadContactsRaw(group.contactsFile);
    const state = loadState(group.stateFile);
    let notStarted = 0;
    let inProgress = 0;
    let completed = 0;

    const rows = contacts.map((c) => {
      const entry = state[c.phone];
      let status = 'not_started';
      let currentQuestion = null;
      let lastAnswer = null;

      if (entry) {
        if (entry.completed) {
          status = 'completed';
          completed++;
        } else {
          status = 'in_progress';
          inProgress++;
          const q = group.questions[entry.index];
          currentQuestion = q ? q.key : null;
        }
        const answerKeys = Object.keys(entry.answers || {});
        if (answerKeys.length) lastAnswer = String(entry.answers[answerKeys[answerKeys.length - 1]]);
      } else {
        notStarted++;
      }

      return { name: c.name, phone: c.phone, status, currentQuestion, lastAnswer };
    });

    groups[key] = {
      label: group.label,
      totalQuestions: group.questions.length,
      summary: { total: contacts.length, notStarted, inProgress, completed },
      contacts: rows,
    };
  }
  return { connection: getConnection(), groups };
}

function startDashboard(getConnection, port = 3838) {
  const server = http.createServer((req, res) => {
    if (req.url === '/api/status') {
      const status = buildStatus(getConnection);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(status));
      return;
    }
    if (req.url === '/' || req.url === '/index.html') {
      const html = fs.readFileSync(DASHBOARD_HTML, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('não encontrado');
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`Painel disponível em http://localhost:${port}`);
  });

  return server;
}

module.exports = { startDashboard };
