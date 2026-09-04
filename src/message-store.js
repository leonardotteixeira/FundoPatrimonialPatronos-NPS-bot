const fs = require('fs');
const path = require('path');

const STORE_FILE = path.join(__dirname, '..', 'state', 'sent_messages.json');

// A janela de retry do WhatsApp é de minutos, não dias — 48h e um teto de
// entradas são só uma rede de segurança contra crescimento infinito do arquivo
// numa campanha longa, não um requisito do protocolo em si.
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_ENTRIES = 3000;

function loadStore() {
  if (!fs.existsSync(STORE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store));
}

function prune(store) {
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const [id, entry] of Object.entries(store)) {
    if (entry.sentAt < cutoff) delete store[id];
  }
  const ids = Object.keys(store);
  if (ids.length > MAX_ENTRIES) {
    const oldestFirst = ids.sort((a, b) => store[a].sentAt - store[b].sentAt);
    for (const id of oldestFirst.slice(0, ids.length - MAX_ENTRIES)) delete store[id];
  }
  return store;
}

// Guarda o conteúdo de uma mensagem enviada, indexado pelo id — é o que
// getMessage(key) usa pra devolver a mensagem original quando o WhatsApp
// pede reenvio (retry receipt) por falha de decriptação do outro lado.
function remember(key, message) {
  if (!key?.id) return;
  const store = loadStore();
  store[key.id] = {
    remoteJid: key.remoteJid ?? null,
    participant: key.participant ?? null,
    message,
    sentAt: Date.now(),
  };
  saveStore(prune(store));
}

// Localiza uma mensagem enviada anteriormente pela key que o Baileys passa
// pro getMessage(). Não cruzamos com remoteJid: o WhatsApp pode identificar a
// mesma conversa por LID (recebimento) ou pelo JID de telefone (usado no
// envio) dependendo do momento, e exigir que batam gera falso-negativo. O id
// da mensagem sozinho (string aleatória de ~22 chars) já é praticamente
// único, então essa checagem extra custava mais do que valia.
function recall(key) {
  const store = loadStore();
  const entry = store[key?.id];
  return entry ? entry.message : null;
}

module.exports = { remember, recall };
