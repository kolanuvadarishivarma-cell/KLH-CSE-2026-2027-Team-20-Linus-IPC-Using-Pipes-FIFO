const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

const LINUX_DIR = path.resolve(__dirname, '../linux');
const BINARY_NAME = 'copy_on_write';
const BINARY_PATH = path.join(LINUX_DIR, BINARY_NAME);
const SOURCE_PATH = path.join(LINUX_DIR, 'copy_on_write.c');

/**
 * Helper to ensure the C binary is compiled.
 */
function ensureCompiled() {
  return new Promise((resolve, reject) => {
    // Recompile if binary missing or source modified
    const needsBuild = !fs.existsSync(BINARY_PATH) || 
      (fs.statSync(SOURCE_PATH).mtimeMs > fs.statSync(BINARY_PATH).mtimeMs);

    if (!needsBuild) {
      return resolve(BINARY_PATH);
    }

    const make = spawn('make', ['-C', LINUX_DIR], {
      timeout: 10000,
      env: process.env,
    });

    let makeErr = '';
    make.stderr.on('data', (d) => {
      makeErr += d.toString();
    });

    make.on('close', (code) => {
      if (code === 0 && fs.existsSync(BINARY_PATH)) {
        resolve(BINARY_PATH);
      } else {
        reject(new Error(`Compilation failed (code ${code}): ${makeErr || 'Unknown error'}`));
      }
    });

    make.on('error', (err) => {
      reject(new Error(`Failed to invoke make compiler: ${err.message}`));
    });
  });
}

/**
 * Parse structured stdout from the C binary
 */
function parseBinaryOutput(stdout) {
  const lines = stdout.split('\n');
  const events = [];
  let parentPid = null;
  let childPid = null;
  let initialValue = 100;
  let parentFinalValue = 100;
  let childFinalValue = 200;
  let writerMode = 'child';
  let virtualAddress = null;
  let pageSize = null;

  let inProcessSnapshot = false;
  let processSnapshotLines = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Capture OS process table snapshot
    if (trimmed === '[OS_PROCESS_SNAPSHOT_START]') {
      inProcessSnapshot = true;
      continue;
    }
    if (trimmed === '[OS_PROCESS_SNAPSHOT_END]') {
      inProcessSnapshot = false;
      continue;
    }
    if (inProcessSnapshot) {
      processSnapshotLines.push(line);
      continue;
    }

    // Check system page size
    const pageSizeMatch = trimmed.match(/\[CONFIG\] System Page Size:\s+(\d+)/);
    if (pageSizeMatch) {
      pageSize = parseInt(pageSizeMatch[1], 10);
    }

    // Check virtual address
    const addrMatch = trimmed.match(/Allocated anonymous private memory page at virtual address:\s+(0x[0-9a-fA-F]+)/);
    if (addrMatch) {
      virtualAddress = addrMatch[1];
    }

    // Parse [EVENT:...] lines
    if (trimmed.startsWith('[EVENT:')) {
      const eventTypeMatch = trimmed.match(/\[EVENT:([A-Z_]+)\]/);
      const eventType = eventTypeMatch ? eventTypeMatch[1] : 'UNKNOWN';

      const descMatch = trimmed.match(/desc="([^"]+)"/);
      const desc = descMatch ? descMatch[1] : '';

      const pidMatch = trimmed.match(/\bpid=(\d+)/);
      const eventPid = pidMatch ? parseInt(pidMatch[1], 10) : null;

      const ppidMatch = trimmed.match(/\bparent_pid=(\d+)|\bppid=(\d+)/);
      const eventPpid = ppidMatch ? parseInt(ppidMatch[1] || ppidMatch[2], 10) : null;

      const cpidMatch = trimmed.match(/\bchild_pid=(\d+)/);
      const eventCpid = cpidMatch ? parseInt(cpidMatch[1], 10) : null;

      let title = eventType;
      let phase = 'system';
      let statusType = 'info';

      switch (eventType) {
        case 'INIT':
          title = 'Anonymous Memory Allocation';
          phase = 'parent';
          statusType = 'neutral';
          break;
        case 'FORK':
          title = 'Process Duplication (fork)';
          phase = 'kernel';
          statusType = 'shared';
          break;
        case 'OS_PROCESS_VERIFIED':
          title = 'OS Process Table Verification';
          phase = 'kernel';
          statusType = 'success';
          break;
        case 'CHILD_READ':
          title = 'Inherited Memory Read';
          phase = 'child';
          statusType = 'shared';
          break;
        case 'CHILD_WRITE':
          title = 'Copy-on-Write Triggered (Page Fault)';
          phase = 'child';
          statusType = 'cow-fault';
          break;
        case 'PARENT_WRITE':
          title = 'Parent Memory Write';
          phase = 'parent';
          statusType = 'cow-fault';
          break;
        case 'CHILD_EXIT':
          title = 'Child Process Termination';
          phase = 'child';
          statusType = 'success';
          break;
        case 'PARENT_VERIFY':
          title = 'Parent Memory Verification';
          phase = 'parent';
          statusType = 'success';
          break;
        case 'PARENT_REAP':
          title = 'Child Reclaim (waitpid)';
          phase = 'parent';
          statusType = 'success';
          break;
        case 'CLEANUP':
          title = 'Resource Release (munmap)';
          phase = 'parent';
          statusType = 'cleanup';
          break;
        default:
          title = eventType;
      }

      events.push({
        id: `evt-${events.length + 1}`,
        type: eventType,
        title,
        description: desc,
        pid: eventPid,
        parentPid: eventPpid,
        childPid: eventCpid,
        phase,
        statusType,
        raw: trimmed,
      });
    }

    // Parse [SUMMARY] line
    if (trimmed.startsWith('[SUMMARY]')) {
      const pMatch = trimmed.match(/parent_pid=(\d+)/);
      const cMatch = trimmed.match(/child_pid=(\d+)/);
      const initMatch = trimmed.match(/initial_val="([^"]+)"|initial_val=(\S+)/);
      const pfMatch = trimmed.match(/parent_final="([^"]+)"|parent_final=(\S+)/);
      const cfMatch = trimmed.match(/child_final="([^"]+)"|child_final=(\S+)/);
      const wMatch = trimmed.match(/writer=([a-z]+)/);

      if (pMatch) parentPid = parseInt(pMatch[1], 10);
      if (cMatch) childPid = parseInt(cMatch[1], 10);
      if (initMatch) initialValue = initMatch[1] || initMatch[2];
      if (pfMatch) parentFinalValue = pfMatch[1] || pfMatch[2];
      if (cfMatch) childFinalValue = cfMatch[1] || cfMatch[2];
      if (wMatch) writerMode = wMatch[1];
    }
  }

  // Parse process snapshot into structured objects
  let parsedSnapshot = {
    raw: processSnapshotLines.join('\n').trim(),
    parent: null,
    child: null,
  };

  for (const sLine of processSnapshotLines) {
    const parts = sLine.trim().split(/\s+/);
    if (parts.length >= 4 && !isNaN(parseInt(parts[0], 10))) {
      const pid = parseInt(parts[0], 10);
      const ppid = parseInt(parts[1], 10);
      const stat = parts[2];
      const comm = parts.slice(3).join(' ');

      if (pid === parentPid) {
        parsedSnapshot.parent = { pid, ppid, state: stat, command: comm };
      } else if (pid === childPid) {
        parsedSnapshot.child = { pid, ppid, state: stat, command: comm };
      }
    }
  }

  return {
    parentPid,
    childPid,
    initialValue,
    parentFinalValue,
    childFinalValue,
    writerMode,
    virtualAddress: virtualAddress || '0x7fff0000',
    pageSize: pageSize || 4096,
    osProcessSnapshot: parsedSnapshot,
    events,
  };
}

/**
 * GET /api/demo/info
 */
router.get('/info', (req, res) => {
  const isLinux = os.platform() === 'linux';
  const platformLabel = isLinux
    ? 'Linux Native (Direct Kernel Page-Table & COW)'
    : `POSIX Host (${os.platform()} - ${os.release()})`;

  let sourceCode = '';
  try {
    if (fs.existsSync(SOURCE_PATH)) {
      sourceCode = fs.readFileSync(SOURCE_PATH, 'utf8');
    }
  } catch (err) {
    sourceCode = '// Unable to read source code: ' + err.message;
  }

  res.json({
    name: 'Copy-on-Write Memory Demonstrator',
    course: 'Operating Systems and System Programming (OSSP)',
    hostPlatform: os.platform(),
    hostPlatformLabel: platformLabel,
    isLinux,
    binaryExists: fs.existsSync(BINARY_PATH),
    linuxWarning: !isLinux
      ? 'Host environment is Darwin/macOS. Program executes real POSIX fork(), mmap(), and pipe() system calls. For pure Linux kernel page-table inspection, deploy to an Ubuntu Linux host or container via the provided Dockerfile.'
      : null,
    features: [
      'Customizable User Inputs (Initial value, Modified value, Delay, Writer mode)',
      'Direct OS Process Table Inspection (ps/kernel task verification)',
      'Real-time C process execution via Node.js spawn()',
      'POSIX mmap() with MAP_PRIVATE | MAP_ANONYMOUS',
      'Process duplication using fork() system call',
      'Pipe-based inter-process synchronization',
      'Child memory write triggering Copy-on-Write (COW)',
      'Parent memory protection verification',
      'Process status harvesting via waitpid()',
      'Deterministic structured event telemetry',
    ],
    sourceCode,
  });
});

/**
 * POST /api/demo/run
 * Accepts optional body: { initialValue, modifiedValue, delayMs, writerMode }
 */
router.post('/run', async (req, res) => {
  const startTime = Date.now();

  try {
    // 1. Ensure binary is compiled
    await ensureCompiled();

    const { initialValue, modifiedValue, delayMs, writerMode } = req.body || {};
    const initVal = (initialValue !== undefined && initialValue !== null && String(initialValue).trim() !== '')
      ? String(initialValue).trim().slice(0, 100)
      : 'Alice';
    const modVal = (modifiedValue !== undefined && modifiedValue !== null && String(modifiedValue).trim() !== '')
      ? String(modifiedValue).trim().slice(0, 100)
      : 'Bob';
    const delay = Number.isInteger(Number(delayMs)) ? Math.max(0, Math.min(2000, Number(delayMs))) : 50;
    const writer = ['child', 'parent', 'both'].includes(writerMode) ? writerMode : 'child';

    // 3. Spawn the C binary with user arguments (safe execution, no shell interpolation)
    const procArgs = [initVal, modVal, String(delay), writer];

    console.log('\n======================================================================');
    console.log(`[EXPRESS BACKEND] Handling POST /api/demo/run`);
    console.log(`[CONFIG] Initial Value: "${initVal}" | Modified Value: "${modVal}" | Mode: ${writer} | Delay: ${delay}ms`);
    console.log(`[SPAWN] Executing C binary: ${BINARY_PATH} ${procArgs.join(' ')}`);

    const proc = spawn(BINARY_PATH, procArgs, {
      timeout: 8000,
      env: { ...process.env, LANG: 'C' },
    });

    console.log(`[NODE OS TASK] Child Process spawned with OS PID: ${proc.pid}`);
    console.log(`[STREAMING REAL-TIME OUTPUT FROM C PROGRAM]:`);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      // Stream live to backend console
      process.stdout.write(text.split('\n').map(l => l ? `  | ${l}` : '').join('\n') + '\n');
    });

    proc.stderr.on('data', (chunk) => {
      const errText = chunk.toString();
      stderr += errText;
      process.stderr.write(`  [STDERR] ${errText}\n`);
    });

    proc.on('close', (exitCode) => {
      const durationMs = Date.now() - startTime;
      console.log(`[PROCESS FINISHED] C binary exited with code ${exitCode} (${durationMs}ms)`);
      console.log(`[EXPRESS BACKEND] Sending structured JSON response to frontend client`);
      console.log('======================================================================\n');

      const parsed = parseBinaryOutput(stdout);

      const isLinux = os.platform() === 'linux';
      const hostPlatformLabel = isLinux
        ? 'Linux Native Kernel'
        : `macOS / POSIX Host (${os.platform()})`;

      res.json({
        success: exitCode === 0,
        exitCode,
        durationMs,
        stdout,
        stderr,
        parentPid: parsed.parentPid,
        childPid: parsed.childPid,
        initialValue: parsed.initialValue,
        parentFinalValue: parsed.parentFinalValue,
        childFinalValue: parsed.childFinalValue,
        writerMode: parsed.writerMode,
        virtualAddress: parsed.virtualAddress,
        pageSize: parsed.pageSize,
        osProcessSnapshot: parsed.osProcessSnapshot,
        events: parsed.events,
        hostPlatform: os.platform(),
        hostPlatformLabel,
        isLinux,
        executedAt: new Date().toISOString(),
      });
    });

    proc.on('error', (err) => {
      res.status(500).json({
        success: false,
        error: `Failed to spawn binary: ${err.message}`,
        durationMs: Date.now() - startTime,
      });
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
      durationMs: Date.now() - startTime,
    });
  }
});

module.exports = router;
