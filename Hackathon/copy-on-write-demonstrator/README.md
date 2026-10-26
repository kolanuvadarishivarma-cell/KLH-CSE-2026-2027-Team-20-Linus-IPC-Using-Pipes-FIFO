# Copy-on-Write (COW) Memory Demonstrator
> **Operating Systems and System Programming (OSSP) — Full-Stack Systems Engineering Project**

[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20POSIX-blue.svg)](https://www.kernel.org)
[![Language](https://img.shields.io/badge/Language-C99-orange.svg)](https://gcc.gnu.org)
[![Backend](https://img.shields.io/badge/Backend-Node.js%20%2F%20Express-green.svg)](https://nodejs.org)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%2F%20Vite-purple.svg)](https://react.dev)

A complete, full-stack demonstration system showing how Linux processes share memory after `fork()` using **Copy-on-Write (COW)** and duplicate physical frames only upon memory mutation.

---

## 1. Project Architecture

```
hackathon/copy-on-write-demonstrator/
├── backend/
│   ├── server.js               # Express application on port 5001
│   ├── package.json            # Express & CORS dependencies
│   ├── routes/
│   │   └── demo.js             # Compilation, execution via spawn(), and parsing
│   └── linux/
│       ├── copy_on_write.c     # Real C implementation with fork(), mmap(), pipe(), waitpid()
│       └── Makefile            # GCC compilation flags (-Wall -Wextra -O2 -pedantic -std=c99)
├── frontend/
│   ├── package.json            # React 18, Vite, Lucide icons
│   ├── vite.config.js          # Vite config with /api proxy to backend
│   ├── index.html              # HTML entry with dark dashboard typography
│   └── src/
│       ├── main.jsx            # React root mount
│       ├── App.jsx             # Main dashboard coordinator
│       ├── components/
│       │   ├── Navbar.jsx              # Status pill, live backend polling, quick run
│       │   ├── Hero.jsx                # Technical title, CTA, and architecture notice
│       │   ├── MemoryVisualization.jsx # Side-by-side processes and physical frame simulator
│       │   ├── ProcessCard.jsx         # Virtual addresses, observed values, and status
│       │   ├── ExecutionTimeline.jsx   # Real sequence recorded from C execution
│       │   ├── StatisticsPanel.jsx     # PIDs, duration, final values, verified result
│       │   ├── TerminalOutput.jsx      # Real standard output & C source viewer
│       │   ├── HowItWorks.jsx          # Educational module & eager copying comparison
│       │   └── VivaSection.jsx         # 14 curated viva questions with filter and search
│       └── styles/
│           └── global.css      # Dark technical dashboard design system
├── docs/
│   ├── project-report.md       # Comprehensive academic lab project report
│   └── viva-questions.md       # 14 viva questions and detailed answers
├── Dockerfile                  # Containerized build for native Ubuntu Linux
├── docker-compose.yml          # One-command execution on any Docker host
├── .gitignore
└── README.md
```

---

## 2. Core Concepts Demonstrated

1. **Anonymous Private Memory (`mmap`)**: Allocates isolated memory with `MAP_PRIVATE | MAP_ANONYMOUS` with custom user-supplied initial integers.
2. **Process Duplication (`fork`) & OS Task Prover**: Duplicates the process and actively executes `ps` during concurrent execution to inspect the kernel task table, proving the child exists with a unique PID and `child.PPID == parent.PID`.
3. **Customizable Interactive Inputs**: Users can supply arbitrary initial values (e.g. `42`), modified values (e.g. `999`), mutation operators (`child`, `parent`, or `both`), and hold delays.
4. **Read-Only Physical Page Sharing**: Initially, parent and child map to the same physical page frame for read operations.
5. **Copy-on-Write Page Fault**: When the child writes, the hardware MMU raises a write-protection page fault (`do_wp_page`). The Linux kernel duplicates the page into a new physical frame.
6. **Memory Isolation Proof**: The parent retains its custom initial value, while the child holds its new value.
7. **Deterministic Synchronization**: POSIX `pipe()` guarantees deterministic ordering across parent and child.
8. **Process Harvesting**: The parent collects child exit status using `waitpid()`.

---

## 3. Quick Start & Setup Instructions

### Prerequisites on Linux (Ubuntu / Debian)

Install GCC compiler, Make, and Node.js:

```bash
sudo apt update
sudo apt install -y build-essential gcc make curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

---

### Step 1: Compile and Test the C Program

```bash
cd backend/linux
make clean
make
./copy_on_write
```

You will see the deterministic execution trace where parent memory remains `100` and child modifies to `200`.

---

### Step 2: Start the Backend Server

Open a terminal and run:

```bash
cd backend
npm install
npm start
```

The Express server will start on `http://127.0.0.1:5001`.

---

### Step 3: Start the Frontend Dashboard

Open a second terminal and run:

```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 4. Docker Deployment (Ubuntu Linux Native)

To run the entire system inside a native Ubuntu Linux container with GCC:

```bash
docker compose up --build
```

Access the frontend at `http://localhost:5173` and backend at `http://localhost:5001`.

---

## 5. Host Platform Notice (macOS vs. Linux)

- **Native Linux (Ubuntu/Debian)**: The C program leverages the Linux kernel's virtual memory subsystem (`do_wp_page`) and page tables directly.
- **macOS (Darwin)**: The C program compiles cleanly using Apple Clang and POSIX system calls (`fork`, `mmap`, `pipe`, `waitpid`). The dashboard identifies the host platform as `Darwin (POSIX Host Mode)` and presents the live execution results. For native Linux kernel page table inspection, deploy using the included Dockerfile.

---

## 6. API Reference

### `GET /api/health`
Returns backend connectivity, compiler readiness, binary status, and platform.

```json
{
  "status": "healthy",
  "backend": "connected",
  "platform": "darwin",
  "isLinux": false,
  "compilerAvailable": true,
  "binaryCompiled": true,
  "timestamp": "2026-10-16T15:30:00.000Z",
  "uptime": 12.4
}
```

### `GET /api/demo/info`
Returns project metadata, supported features, and full C source code.

### `POST /api/demo/run`
Spawns the compiled C binary (`./linux/copy_on_write`), captures stdout/stderr, and returns structured telemetry:

```json
{
  "success": true,
  "exitCode": 0,
  "durationMs": 18,
  "parentPid": 23391,
  "childPid": 23415,
  "initialValue": 100,
  "parentFinalValue": 100,
  "childFinalValue": 200,
  "virtualAddress": "0x1049c4000",
  "pageSize": 16384,
  "events": [ ... ],
  "stdout": "...",
  "stderr": ""
}
```

---

## 7. Viva Voce Preparation

A dedicated preparation section with 14 questions and comprehensive answers is accessible in the dashboard under the **Viva Q&A** tab, and in `docs/viva-questions.md`.

---

## 8. License & Academic Integrity

Developed for the **Operating Systems and System Programming (OSSP)** coursework. Demonstrates genuine low-level systems programming and POSIX kernel interaction.
