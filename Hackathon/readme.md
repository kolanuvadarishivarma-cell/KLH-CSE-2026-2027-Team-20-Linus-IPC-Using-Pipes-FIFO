# OSSP Hackathon: Copy-on-Write (COW) Memory Demonstrator

**Team 20 | Department of Computer Science & Engineering | KL University**

---

## 📌 Project Overview
An end-to-end Operating Systems & System Programming (OSSP) demonstration project illustrating **Copy-on-Write (COW)** memory management, virtual memory page fault handling, and multi-process concurrency in POSIX/Linux.

### 📁 Contents in this Directory
1. **[`copy-on-write-demonstrator/`](./copy-on-write-demonstrator/)**
   - **System Core (C):** POSIX `mmap(MAP_PRIVATE | MAP_ANONYMOUS)`, `fork()`, bidirectional pipes, OS kernel task table inspection via `ps`, and `waitpid()`.
   - **Backend Server (Node.js & Express):** Real-time process orchestration, event streaming, and execution analytics.
   - **Frontend UI (React & Vite):** Interactive visual memory diagram showing page tables, physical RAM frames, COW fault animations, and timeline steps.
   - **Documentation:** Full technical lab report ([`docs/project-report.md`](./copy-on-write-demonstrator/docs/project-report.md)) and 14+ viva questions ([`docs/viva-questions.md`](./copy-on-write-demonstrator/docs/viva-questions.md)).
2. **[`OSSP_COW_Memory_Demonstrator.pptx`](./OSSP_COW_Memory_Demonstrator.pptx)**
   - Official Hackathon presentation slide deck covering system design, page fault mechanics, and live demonstration workflow.

---

## 🚀 Quick Start
Refer to the dedicated guide in [`copy-on-write-demonstrator/README.md`](./copy-on-write-demonstrator/README.md) for full build, execution, and Docker instructions.
