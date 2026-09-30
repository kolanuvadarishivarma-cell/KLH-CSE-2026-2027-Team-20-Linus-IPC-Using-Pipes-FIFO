// script.js — talks to the backend ONLY via plain HTTP.
// Has no knowledge of pipes, FIFOs, or any system call. It only ever does:
//   GET  /messages   -> "any new messages?"
//   POST /send       -> "the user typed this, send it"

let lastId = 0;
const chatEl = document.getElementById('chat');
const emptyEl = document.getElementById('empty');
const dot = document.getElementById('dot');
const statusText = document.getElementById('statusText');
const box = document.getElementById('messageBox');
const sendBtn = document.getElementById('sendBtn');
const form = document.getElementById('messageForm');

function addRow(cls, text) {
  if (emptyEl) emptyEl.style.display = 'none';
  const row = document.createElement('div');
  row.className = 'row ' + cls;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  row.appendChild(bubble);
  chatEl.appendChild(row);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Polls the backend once a second. Only ever displays messages the
// backend confirms it actually received through the real FIFO.
async function poll() {
  try {
    const res = await fetch('/messages?after=' + lastId);
    const data = await res.json();

    dot.classList.toggle('connected', data.connected);
    statusText.textContent = data.connected
      ? 'Connected to ' + data.peer_label
      : 'Waiting for ' + data.peer_label;

    box.disabled = !data.connected;
    sendBtn.disabled = !data.connected;

    for (const m of data.messages) {
      lastId = m.id;
      if (m.from === 'me') addRow('me', m.text);
      else if (m.from === 'peer') addRow('peer', m.text);
      else addRow('system', m.text);
    }
  } catch (e) {
    /* backend still starting up - retry next tick */
  }
  setTimeout(poll, 1000);
}
poll();

// A message is only ever sent because a person submitted this form.
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = box.value.trim();
  if (!text) return;
  box.value = '';
  await fetch('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
});
