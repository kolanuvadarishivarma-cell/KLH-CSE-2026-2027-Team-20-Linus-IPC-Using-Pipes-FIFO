/* ==========================================================================
   OS IPC Demonstrator: script.js
   1. Mode Switching: Named Pipes (WhatsApp 2-Way) vs Unnamed Pipes (Parent->Child)
   2. Named Pipes: Polling /messages, Sending /send, Syscall Log
   3. Unnamed Pipes: Queuing inputs to Parent (/unnamed/input), Forking Child (/unnamed/fork)
   ========================================================================== */

let activeMode = 'named';
let lastMessageId = 0;
let isConnected = false;
let myLabel = 'User A';
let peerLabel = 'User B';

// DOM Elements: Header & Status
const tabNamed = document.getElementById('tabNamed');
const tabUnnamed = document.getElementById('tabUnnamed');
const viewNamed = document.getElementById('viewNamed');
const viewUnnamed = document.getElementById('viewUnnamed');

const connDot = document.getElementById('connDot');
const connStatus = document.getElementById('connStatus');

// DOM Elements: WhatsApp Named Pipe
const waPeerName = document.getElementById('waPeerName');
const waPeerStatus = document.getElementById('waPeerStatus');
const peerAvatarInitial = document.getElementById('peerAvatarInitial');
const chatArea = document.getElementById('chatArea');
const emptyChatNotice = document.getElementById('emptyChatNotice');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const syscallDockText = document.getElementById('syscallDockText');

// DOM Elements: Unnamed Pipe (Parent -> Child)
const parentPidDisplay = document.getElementById('parentPidDisplay');
const parentInputForm = document.getElementById('parentInputForm');
const parentInputText = document.getElementById('parentInputText');
const queuedCount = document.getElementById('queuedCount');
const queuedItemsList = document.getElementById('queuedItemsList');
const emptyQueueMsg = document.getElementById('emptyQueueMsg');

const pipeBufferStatus = document.getElementById('pipeBufferStatus');
const btnForkChild = document.getElementById('btnForkChild');
const forkHint = document.getElementById('forkHint');

const cardChild = document.getElementById('cardChild');
const childPidDisplay = document.getElementById('childPidDisplay');
const childStatusDesc = document.getElementById('childStatusDesc');
const receivedItemsList = document.getElementById('receivedItemsList');
const emptyChildMsg = document.getElementById('emptyChildMsg');
const termOutput = document.getElementById('termOutput');

let queuedInputsList = [];

/* --------------------------------------------------------------------------
   1. Mode Switcher
   -------------------------------------------------------------------------- */
function switchMode(mode) {
  activeMode = mode;
  if (mode === 'named') {
    tabNamed.classList.add('active');
    tabUnnamed.classList.remove('active');
    viewNamed.classList.add('active');
    viewUnnamed.classList.remove('active');
  } else {
    tabUnnamed.classList.add('active');
    tabNamed.classList.remove('active');
    viewUnnamed.classList.add('active');
    viewNamed.classList.remove('active');
  }
}

/* --------------------------------------------------------------------------
   2. Named Pipes: WhatsApp Two-Way Chat
   -------------------------------------------------------------------------- */

function formatTime(date) {
  const d = date || new Date();
  let hours = d.getHours();
  let minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

function appendWhatsAppBubble(from, text) {
  if (emptyChatNotice) emptyChatNotice.style.display = 'none';

  const row = document.createElement('div');
  row.className = `chat-row ${from}`;

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;

  if (from !== 'system') {
    const meta = document.createElement('div');
    meta.className = 'bubble-meta';
    meta.innerHTML = `<span>${formatTime()}</span>` + (from === 'me' ? '<span style="color:#53bdeb;">✓✓</span>' : '');
    bubble.appendChild(meta);
  }

  row.appendChild(bubble);
  chatArea.appendChild(row);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Poll /messages
async function pollWhatsApp() {
  try {
    const res = await fetch('/messages?after=' + lastMessageId);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    isConnected = !!data.connected;
    myLabel = data.my_label || 'User A';
    peerLabel = data.peer_label || 'User B';

    // Header pills
    connDot.classList.toggle('online', isConnected);
    connStatus.textContent = isConnected
      ? `Online as ${myLabel}`
      : `Waiting for ${peerLabel}...`;

    // WhatsApp top bar
    waPeerName.textContent = peerLabel;
    peerAvatarInitial.textContent = peerLabel.charAt(peerLabel.length - 1) || 'B';

    if (isConnected) {
      waPeerStatus.textContent = 'online';
      waPeerStatus.className = 'wa-peer-status online';
      chatInput.disabled = false;
      sendBtn.disabled = false;
      syscallDockText.textContent = `[FIFO CONNECTED] Real-time 2-way chat ready between ${myLabel} and ${peerLabel}`;
    } else {
      waPeerStatus.textContent = `waiting for ${peerLabel} to open FIFO (open() blocked)`;
      waPeerStatus.className = 'wa-peer-status';
      chatInput.disabled = true;
      sendBtn.disabled = true;
    }

    if (data.messages && data.messages.length > 0) {
      for (const m of data.messages) {
        lastMessageId = m.id;
        appendWhatsAppBubble(m.from, m.text);
        if (m.from === 'peer') {
          syscallDockText.textContent = `[FIFO RECV] Read ${m.text.length + 1} bytes from incoming FIFO: "${m.text}"`;
        }
      }
    }
  } catch (e) {
    connDot.classList.remove('online');
    connStatus.textContent = 'Backend Offline';
    waPeerStatus.textContent = 'Backend offline. Run ./server in terminal.';
    chatInput.disabled = true;
    sendBtn.disabled = true;
  }

  setTimeout(pollWhatsApp, 1000);
}

// Send WhatsApp message
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = '';
  syscallDockText.textContent = `[FIFO SEND] Writing ${text.length + 1} bytes (with \\0) to outgoing FIFO...`;

  try {
    const res = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (res.ok) {
      syscallDockText.textContent = `[FIFO SEND] write(fd, "${text}\\0", ${text.length + 1}) succeeded! Check terminal for log.`;
    }
  } catch (err) {
    console.error('Send error:', err);
  }
});

/* --------------------------------------------------------------------------
   3. Unnamed Pipes: Parent Input Queue -> Fork Child
   -------------------------------------------------------------------------- */

// Add input to Parent Process BEFORE child is created
parentInputForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = parentInputText.value.trim();
  if (!text) return;

  parentInputText.value = '';
  termOutput.textContent = `[Parent] Writing "${text}" into unnamed pipefd[1]...\nCheck your terminal running ./server!`;

  try {
    const res = await fetch('/unnamed/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();

    // Update Parent PID
    parentPidDisplay.textContent = `Parent PID: ${data.parent_pid}`;

    // Update queued items list
    queuedInputsList = data.inputs || [];
    renderQueuedInputs();

    termOutput.textContent = 
`[TERMINAL LOG - PARENT PROCESS]
Parent (PID: ${data.parent_pid}) called pipe():
  - Allocated pipefd[0] (Read) and pipefd[1] (Write)
  - Wrote input #${data.count}: "${text}" into pipefd[1]
  - Stored in 64KB Linux kernel memory buffer!
  - STATUS: Child process has NOT been created yet. Data is waiting in RAM.`;

  } catch (err) {
    // If backend is offline, simulate
    queuedInputsList.push(text);
    renderQueuedInputs();
    termOutput.textContent = `[Client Simulation] Queued input #${queuedInputsList.length}: "${text}" in Parent.`;
  }
});

function renderQueuedInputs() {
  if (queuedInputsList.length === 0) {
    if (emptyQueueMsg) emptyQueueMsg.style.display = 'block';
    queuedItemsList.innerHTML = '<div class="empty-queue-msg">No inputs added to Parent yet. Type an input above and click Add!</div>';
    queuedCount.textContent = '0';
    btnForkChild.disabled = true;
    forkHint.textContent = 'Add at least one input to the Parent above to enable fork().';
    pipeBufferStatus.textContent = 'Buffer empty. Waiting for inputs...';
  } else {
    queuedItemsList.innerHTML = '';
    queuedInputsList.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'input-item';
      el.innerHTML = `
        <span class="item-text">${idx + 1}. "${escapeHtml(item)}"</span>
        <span class="item-tag">Kernel Buffer RAM</span>
      `;
      queuedItemsList.appendChild(el);
    });

    queuedCount.textContent = queuedInputsList.length;
    btnForkChild.disabled = false;
    forkHint.textContent = `Ready! Click to fork child process and consume all ${queuedInputsList.length} inputs.`;
    pipeBufferStatus.textContent = `Pipe buffer holds ${queuedInputsList.length} inputs in kernel memory. Ready for fork()!`;
  }
}

// Fork child process to receive all inputs
async function triggerForkChild() {
  btnForkChild.disabled = true;
  btnForkChild.innerHTML = '<span class="fork-icon">⏳</span><span class="fork-text">Forking Child Process...</span>';
  termOutput.textContent = 'Calling fork() on Linux server backend...';

  try {
    const res = await fetch('/unnamed/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || ('HTTP ' + res.status));
    }

    const data = await res.json();

    // Update UI for Child process
    childPidDisplay.textContent = `Child PID: ${data.child_pid}`;
    childStatusDesc.innerHTML = `Child process (PID <code>${data.child_pid}</code>) forked from Parent (PID <code>${data.parent_pid}</code>). It closed write end and read all ${data.count} inputs!`;

    // Render received items in Child
    receivedItemsList.innerHTML = '';
    const receivedArray = data.inputs || queuedInputsList;
    receivedArray.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'input-item';
      el.innerHTML = `
        <span class="item-text">${idx + 1}. "${escapeHtml(item)}"</span>
        <span class="item-tag tag-child">✓ Read from pipefd[0]</span>
      `;
      receivedItemsList.appendChild(el);
    });

    termOutput.textContent = 
`==================== REAL LINUX KERNEL EXECUTION ====================
1. [PARENT (PID ${data.parent_pid})] Queued ${data.count} inputs before child existed.
2. [PARENT (PID ${data.parent_pid})] Called fork() -> Created Child (PID ${data.child_pid})!
3. [CHILD  (PID ${data.child_pid})] Closed unused write end fd[1].
4. [CHILD  (PID ${data.child_pid})] Read loop from pipefd[0]:
${receivedArray.map((it, i) => `     -> Input #${i + 1} read: "${it}"`).join('\n')}
5. [PARENT (PID ${data.parent_pid})] Closed fd[1] -> Child hit EOF and exited cleanly with code 0.
6. [PARENT (PID ${data.parent_pid})] waitpid() collected Child. Pipe buffer destroyed!
=====================================================================
Check your backend terminal window to see the exact matching printout!`;

    pipeBufferStatus.textContent = `Child consumed all ${data.count} inputs cleanly! Pipe buffer closed.`;

  } catch (err) {
    // Offline simulation
    const childPid = 5204;
    childPidDisplay.textContent = `Child PID: ${childPid}`;
    childStatusDesc.innerHTML = `Child process created! Received all ${queuedInputsList.length} inputs from pipe.`;
    receivedItemsList.innerHTML = '';
    queuedInputsList.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'input-item';
      el.innerHTML = `
        <span class="item-text">${idx + 1}. "${escapeHtml(item)}"</span>
        <span class="item-tag tag-child">✓ Read from pipefd[0]</span>
      `;
      receivedItemsList.appendChild(el);
    });

    termOutput.textContent = 
`[Simulation Trace]
Parent forked child process (PID: ${childPid}).
Child read all ${queuedInputsList.length} inputs from pipefd[0].
Child reached EOF and exited with status 0.`;
  } finally {
    btnForkChild.disabled = false;
    btnForkChild.innerHTML = '<span class="fork-icon">🚀</span><span class="fork-text">Create Child Process (fork())</span>';
  }
}

// Reset unnamed pipe
async function resetUnnamedPipe() {
  queuedInputsList = [];
  renderQueuedInputs();
  parentPidDisplay.textContent = 'PID: Initializing...';
  childPidDisplay.textContent = 'Child not forked yet';
  childStatusDesc.textContent = 'Waiting for Parent to trigger fork(). Once created, Child will read all queued inputs from pipefd[0].';
  receivedItemsList.innerHTML = '<div class="empty-child-msg">Child has not been created yet.</div>';
  termOutput.textContent = '[Reset] Unnamed pipe reset. Enter new inputs for the Parent process above!';

  try {
    await fetch('/unnamed/reset', { method: 'POST' });
  } catch (e) {}
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Start polling
pollWhatsApp();
renderQueuedInputs();
