const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const GROUPS = require('./groups');
const { loadState, saveState } = require('./state');
const { saveCompletedResponse } = require('./responses');
const { startDashboard } = require('./dashboard');
const messageStore = require('./message-store');

const AUTH_DIR = path.join(__dirname, '..', 'auth_info');

let connectionStatus = 'connecting';
startDashboard(() => connectionStatus);

const BATCH_SIZE = 15;
const BATCH_PAUSE_MINUTES = 25;

function loadContacts(contactsFile) {
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function phoneVariants(phone) {
  // Celulares brasileiros têm o 9º dígito, mas nem toda base de dados está
  // consistente com isso — aceitamos as duas formas pra não perder resposta.
  const variants = new Set([phone]);
  if (phone.startsWith('55')) {
    const ddd = phone.slice(2, 4);
    const rest = phone.slice(4);
    if (rest.length === 9 && rest.startsWith('9')) {
      variants.add(`55${ddd}${rest.slice(1)}`);
    } else if (rest.length === 8) {
      variants.add(`55${ddd}9${rest}`);
    }
  }
  return [...variants];
}

function parseAnswer(question, rawText) {
  const text = rawText.trim();
  if (question.type === 'choice') {
    if (question.options[text]) return { ok: true, value: question.options[text] };
    return { ok: false, error: `Não entendi. Responda com um dos números: ${Object.keys(question.options).join(' ou ')}.` };
  }
  if (question.type === 'scale') {
    const n = Number(text.replace(',', '.'));
    if (!Number.isInteger(n) || n < 0 || n > 10) {
      return { ok: false, error: 'Por favor responda só com um número inteiro de 0 a 10.' };
    }
    return { ok: true, value: n };
  }
  if (!text) return { ok: false, error: 'Pode mandar uma respostinha em texto? Se não tiver nada a dizer, responda "não".' };
  return { ok: true, value: text };
}

async function sendText(sock, jid, text) {
  const sent = await sock.sendMessage(jid, { text });
  if (sent?.key) messageStore.remember(sent.key, sent.message);
  return sent;
}

async function askQuestion(sock, jid, questions, index, name) {
  const question = questions[index];
  await sendText(sock, jid, question.text(name));
}

async function sendSurvey(sock, groupKey) {
  const group = GROUPS[groupKey];
  const contacts = loadContacts(group.contactsFile);
  const state = loadState(group.stateFile);
  const toSend = contacts.filter((c) => !state[c.phone]);

  console.log(`[${group.label}] ${toSend.length} de ${contacts.length} contatos ainda não receberam a pesquisa.`);
  console.log(`Enviando em lotes de ${BATCH_SIZE}, com pausa de ${BATCH_PAUSE_MINUTES} min entre lotes.`);

  for (let i = 0; i < toSend.length; i++) {
    const contact = toSend[i];
    try {
      const [check] = await sock.onWhatsApp(contact.phone);
      if (!check?.exists) {
        console.error(`[${group.label}] [${i + 1}/${toSend.length}] Número não encontrado no WhatsApp, pulei: ${contact.name} (${contact.phone})`);
        continue;
      }
      const jid = check.jid;
      await askQuestion(sock, jid, group.questions, 0, contact.name);
      state[contact.phone] = { index: 0, answers: {}, completed: false, startedAt: new Date().toISOString() };
      saveState(group.stateFile, state);
      console.log(`[${group.label}] [${i + 1}/${toSend.length}] Enviado para ${contact.name} (${contact.phone})`);
    } catch (err) {
      console.error(`[${group.label}] Falha ao enviar para ${contact.name} (${contact.phone}):`, err.message);
    }

    const isLastInBatch = (i + 1) % BATCH_SIZE === 0;
    const isLastOverall = i === toSend.length - 1;
    if (isLastInBatch && !isLastOverall) {
      console.log(`[${group.label}] Lote concluído. Pausando ${BATCH_PAUSE_MINUTES} min antes do próximo lote...`);
      await sleep(BATCH_PAUSE_MINUTES * 60 * 1000);
    } else {
      await sleep(3000 + Math.random() * 3000);
    }
  }
  console.log(`[${group.label}] Envio concluído.`);
}

async function handleIncomingAnswer(sock, groupKey, contact, text, msgId) {
  const group = GROUPS[groupKey];
  const state = loadState(group.stateFile);
  const entry = state[contact.phone];
  const jid = `${contact.phone}@s.whatsapp.net`;

  if (!entry) return;

  // WhatsApp pode reentregar o mesmo evento (ex.: durante reconexão). Sem essa
  // checagem, a mesma resposta processaria duas vezes e pularia uma pergunta.
  if (msgId && entry.lastMessageId === msgId) return;

  if (entry.completed) {
    await sendText(sock, jid, 'Sua resposta já foi registrada, muito obrigado! 🙏');
    return;
  }

  const question = group.questions[entry.index];
  const result = parseAnswer(question, text);

  if (!result.ok) {
    if (msgId) entry.lastMessageId = msgId;
    saveState(group.stateFile, state);
    await sendText(sock, jid, result.error);
    return;
  }

  entry.answers[question.key] = result.value;
  entry.index += 1;
  if (msgId) entry.lastMessageId = msgId;

  if (entry.index >= group.questions.length) {
    entry.completed = true;
    entry.completedAt = new Date().toISOString();
    saveState(group.stateFile, state);
    saveCompletedResponse(group.responsesFile, group.questions, contact, entry.answers);
    await sendText(sock, jid, 'Muito obrigado pela sua resposta! Isso ajuda demais o programa Trilha de Carreiras. 🙏');
    console.log(`[${group.label}] Pesquisa concluída: ${contact.name} (${contact.phone})`);
  } else {
    saveState(group.stateFile, state);
    await askQuestion(sock, jid, group.questions, entry.index, contact.name);
  }
}

function buildContactIndex() {
  const index = new Map();
  for (const [groupKey, group] of Object.entries(GROUPS)) {
    for (const contact of loadContacts(group.contactsFile)) {
      for (const variant of phoneVariants(contact.phone)) {
        index.set(variant, { ...contact, groupKey });
      }
    }
  }
  return index;
}

async function start() {
  const sendArg = process.argv.find((a) => a.startsWith('--send='));
  const sendGroup = sendArg ? sendArg.split('=')[1] : null;
  if (sendGroup && !GROUPS[sendGroup]) {
    console.error(`Grupo desconhecido: ${sendGroup}. Use um de: ${Object.keys(GROUPS).join(', ')}`);
    process.exit(1);
  }

  const contactIndex = buildContactIndex();

  const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: authState,
    logger: pino({ level: 'silent' }),
    getMessage: async (key) => {
      console.log(`[retry] solicitação de reenvio recebida para id=${key.id}`);
      const message = messageStore.recall(key);
      if (message) {
        console.log(`[retry] mensagem encontrada, devolvendo para o Baileys.`);
      } else {
        console.log(`[retry] mensagem NÃO encontrada para id=${key.id}`);
      }
      return message;
    },
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      connectionStatus = 'qr';
      console.log('Escaneie o QR code com o WhatsApp (Aparelhos conectados):');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      connectionStatus = 'close';
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        'Conexão fechada.',
        shouldReconnect ? 'Reconectando...' : 'Deslogado — apague a pasta auth_info e escaneie de novo.'
      );
      if (shouldReconnect) start();
    } else if (connection === 'open') {
      connectionStatus = 'open';
      console.log('Conectado ao WhatsApp!');
      if (sendGroup) {
        sendSurvey(sock, sendGroup);
      } else {
        console.log('Bot no ar, ouvindo respostas. Rode "npm run send:mentorados" ou "npm run send:mentores" em outro terminal para disparar.');
      }
    }
  });

  sock.ev.on('messages.upsert', ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;
      // Quando o WhatsApp endereça a conversa por LID (identificador anônimo),
      // remoteJid vem como "...@lid" — o número de telefone real vem em senderPn.
      const rawId = msg.key.senderPn || msg.key.remoteJid;
      const phone = rawId?.split('@')[0];
      const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      console.log(`[recebido] remoteJid=${msg.key.remoteJid} senderPn=${msg.key.senderPn} texto=${JSON.stringify(text)}`);
      if (!phone) continue;
      const contact = contactIndex.get(phone);
      if (!contact) {
        console.log(`[recebido] número ${phone} não corresponde a nenhum contato ativo.`);
        continue;
      }

      if (text) {
        handleIncomingAnswer(sock, contact.groupKey, contact, text, msg.key.id).catch((err) =>
          console.error('Erro ao processar resposta:', err)
        );
      } else if (msg.message) {
        const jid = `${contact.phone}@s.whatsapp.net`;
        sendText(sock, jid, 'Só consigo entender mensagens de texto — pode responder digitando? 🙂');
      }
    }
  });
}

start();
