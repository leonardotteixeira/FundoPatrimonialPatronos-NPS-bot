# Patronos NPS Bot

> Bot de WhatsApp que aplica uma pesquisa de satisfação (estilo NPS) a mentores e mentorados do programa **Trilha de Carreiras**, da [Patronos](https://patronos.org.br/), conversando um pergunta por vez e salvando as respostas em CSV.

## O problema

Ao final de cada ciclo do programa de mentoria, alguém precisava mandar manualmente uma bateria de perguntas de satisfação para cada mentor e cada mentorado, acompanhar quem já respondeu e consolidar tudo numa planilha. Isso não escala e é fácil perder o controle de quem está em qual pergunta. O bot assume esse trabalho: dispara a pesquisa em massa, conduz a conversa (uma pergunta por vez, validando cada resposta) e grava o resultado, sem precisar de intervenção manual além de rodar o disparo inicial.

## Solution

Um bot de WhatsApp que dispara a pesquisa, conduz a conversa e grava as respostas sozinho. Os resultados podem ser visualizados no [`patronos-nps-dashboard`](https://github.com/leonardotteixeira/FundoPatrimonialPatronos-NPS-DASH).

## Como funciona

1. **Login**: conecta numa conta de WhatsApp via QR code (protocolo multi-device, biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys) — não é a API oficial do WhatsApp Business).
2. **Disparo**: lê uma lista de contatos (`contacts/mentorados.csv` ou `contacts/mentores.csv`, formato `name,phone`) e envia a primeira pergunta da pesquisa para cada um, em lotes de 15 com pausa de 25 minutos entre lotes — para não disparar os limites antiabuso do WhatsApp.
3. **Conversa**: cada resposta recebida é validada de acordo com o tipo da pergunta (múltipla escolha, nota de 0 a 10, ou texto livre); se a resposta não for válida, o bot pede de novo. Se for válida, envia a próxima pergunta.
4. **Conclusão**: ao terminar todas as perguntas, a resposta completa é gravada em `responses/<grupo>.csv` e o contato recebe uma mensagem de agradecimento.
5. **Painel local**: um servidor HTTP simples (`http://localhost:3838`) mostra quantos contatos estão sem iniciar, em andamento ou completos, lendo o mesmo arquivo de estado usado pela conversa.

O progresso de cada contato (qual pergunta está respondendo, respostas já dadas) fica em `state/<grupo>.json` — se o processo cair e voltar, ninguém recomeça do zero.

## Tecnologias

- **Node.js** (sem framework HTTP para o bot em si; o painel usa `http` nativo)
- [`@whiskeysockets/baileys`](https://github.com/WhiskeySockets/Baileys) — cliente WhatsApp Web multi-device
- `pino` — logger (usado em modo silencioso pelo Baileys)
- `qrcode-terminal` — exibe o QR code de login no terminal
- Persistência em arquivo: JSON (estado da conversa) e CSV (contatos e respostas), sem banco de dados

Não há nenhuma IA/LLM envolvida — é uma máquina de estados simples por contato, com perguntas fixas definidas em código.

## Arquitetura

```
contacts/*.csv ──▶ index.js ──envia──▶ WhatsApp (Baileys) ──▶ mentor/mentorado
                       │                                            │
                       │◀──────────── responde ─────────────────────┘
                       ▼
                  state/*.json (progresso por telefone)
                       │
                  ao completar
                       ▼
                responses/*.csv (resultado final)

dashboard.js ──lê state/*.json──▶ http://localhost:3838 (painel somente leitura)
```

- `src/index.js` — conexão com o WhatsApp, disparo em lote, máquina de estados da conversa (`askQuestion` / `handleIncomingAnswer`), tratamento de retry/reconexão do Baileys.
- `src/groups.js` — mapeia cada grupo (mentorados/mentores) para seus arquivos de contatos, perguntas, estado e respostas.
- `src/questions/*.js` — as perguntas de cada pesquisa (mentorados e mentores têm baterias diferentes).
- `src/message-store.js` — guarda mensagens enviadas recentemente para responder ao `getMessage` do Baileys quando o WhatsApp pede reenvio por falha de decriptação do outro lado — sem isso, o Baileys não sabe o que reenviar e a mensagem simplesmente não chega.
- `src/dashboard.js` + `public/dashboard.html` — painel HTTP local de acompanhamento.

## Como executar

```bash
npm install
cp contacts/mentorados.example.csv contacts/mentorados.csv   # preencha com contatos reais
cp contacts/mentores.example.csv contacts/mentores.csv
npm start                # escaneie o QR code exibido no terminal
```

Em outro terminal, com o bot já conectado:

```bash
npm run send:mentorados  # dispara a pesquisa para o grupo de mentorados
npm run send:mentores    # dispara a pesquisa para o grupo de mentores
```

O painel de acompanhamento fica em `http://localhost:3838` enquanto o bot está rodando.

## Aprendizados

- **Protocolo de retry do WhatsApp**: entender por que o Baileys pede a mensagem de volta via `getMessage` (falha de decriptação do lado do destinatário) e implementar o `message-store` foi o ponto mais não-óbvio do projeto — sem isso, uma fração das mensagens simplesmente nunca chega e não há erro nenhum indicando o motivo.
- **LID vs. número de telefone**: o WhatsApp multi-device às vezes identifica o remetente por um ID anônimo (`@lid`) em vez do número; o número real vem em `senderPn`. Sem tratar isso, o bot não conseguia casar a resposta recebida com o contato que a pesquisa tinha enviado.
- **Enviar em massa sem ser bloqueado**: lotes pequenos com pausas longas entre eles (em vez de disparo simultâneo) foi a abordagem que funcionou na prática para uma conta pessoal de WhatsApp, que tem limites bem mais restritos que uma conta Business oficial.
- Guardar o progresso da conversa por telefone em arquivo, em vez de manter tudo em memória, foi suficiente para o volume desse uso e evita perder contexto se o processo reiniciar.

## Status

Projeto experimental desenvolvido para uma necessidade real do programa Trilha de Carreiras (Patronos) e mantido aqui como parte do meu portfólio. Rodou uma campanha real de envio (contatos de mentorados e mentores cadastrados em `contacts/`), com parte das respostas ainda em aberto no momento em que este README foi escrito. Não é um produto nem uma ferramenta genérica — as perguntas e o fluxo são específicos desse programa.

## Próximos passos

- Testes automatizados (hoje não há nenhum — a validação foi manual, testando com números reais).
- Limite de tentativas em respostas inválidas (hoje o bot pergunta de novo indefinidamente se a resposta não for entendida).
- Trocar os arquivos JSON/CSV por um banco simples (ex.: SQLite) se o volume ou o número de campanhas simultâneas crescer.
- Suportar mais de duas "campanhas"/grupos sem precisar editar `groups.js` manualmente.
