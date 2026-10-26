# Project Report: Copy-on-Write Memory Demonstrator

**Course**: Operating Systems and System Programming (OSSP)  
**Academic Year**: 2026–2027  
**Project Title**: Copy-on-Write (COW) Memory Demonstrator  

---

## 1. Abstract

In modern operating systems, process creation is one of the most fundamental operations. Early Unix implementations copied the parent process's entire address space eagerly during the `fork()` system call, incurring severe CPU and memory performance penalties. Modern Linux operating systems solve this through **Copy-on-Write (COW)**. 

This project implements a full-stack demonstration system comprising a real POSIX C program utilizing system calls (`fork`, `mmap`, `pipe`, `waitpid`, `munmap`), a Node.js/Express execution backend, and an interactive React dashboard. The system visually captures the transition from read-only physical page sharing to private frame allocation upon child memory modification.

---

## 2. Problem Statement

Develop a comprehensive demonstration system illustrating how memory is shared after `fork()` and copied only when a process modifies it.

The system must demonstrate:
1. Process creation using `fork()`.
2. How parent and child processes share the same physical memory page with write-protection flags immediately after `fork()`.
3. How a write operation triggers a hardware page fault and traps into the kernel.
4. How Linux duplicates the physical frame on demand (Copy-on-Write).
5. How the parent's memory value remains completely isolated (retaining `100` while child becomes `200`).
6. Why Copy-on-Write drastically improves memory and runtime efficiency.

---

## 3. Objectives

- **Systems Programming**: Write robust, compilable C code executing low-level POSIX and Linux system calls.
- **Inter-Process Synchronization**: Coordinate parent and child execution deterministically using POSIX pipes to eliminate race conditions.
- **Real-Time Telemetry**: Emit structured machine-readable event tokens alongside human-readable terminal output.
- **Full-Stack Integration**: Build an Express backend executing the precompiled binary via safe child-process spawning and parse its output.
- **Educational Visualization**: Deliver a responsive dark-themed dashboard illustrating virtual memory addresses and conceptual physical frame allocations.

---

## 4. Software & Hardware Requirements

### Software
- **Operating System**: Linux Ubuntu 20.04/22.04/24.04 LTS (or POSIX-compatible host like macOS for development).
- **Compiler**: GCC 9+ or Clang 11+ with C99 standard support (`-std=c99`).
- **Build Tool**: GNU Make.
- **Backend Runtime**: Node.js v18+ and Express 4.x.
- **Frontend Stack**: React 18+, Vite 6+, Lucide Icons.

### Hardware
- **Processor**: x86_64 or ARM64 (AArch64) processor with hardware MMU (Memory Management Unit) supporting page write protection.
- **Memory**: Minimum 512 MB RAM (the demonstration uses a single 4KB/16KB page).

---

## 5. Linux System Calls Used

| System Call | Prototype | Purpose in Project |
|---|---|---|
| `mmap()` | `void *mmap(void *addr, size_t len, int prot, int flags, int fd, off_t offset)` | Allocates an anonymous private memory page (`MAP_PRIVATE \| MAP_ANONYMOUS`). |
| `pipe()` | `int pipe(int pipefd[2])` | Creates a unidirectional communication channel for deterministic parent-child coordination. |
| `fork()` | `pid_t fork(void)` | Duplicates the calling process; page tables are cloned with COW protection. |
| `getpid()` | `pid_t getpid(void)` | Retrieves the unique Process ID of the calling process. |
| `getppid()` | `pid_t getppid(void)` | Retrieves the Parent Process ID in the child process. |
| `write()` | `ssize_t write(int fd, const void *buf, size_t count)` | Signals completion token from child to parent across the pipe. |
| `read()` | `ssize_t read(int fd, void *buf, size_t count)` | Parent waits synchronously until the child has finished writing. |
| `waitpid()` | `pid_t waitpid(pid_t pid, int *status, int options)` | Reclaims child exit status, preventing zombie processes. |
| `munmap()` | `int munmap(void *addr, size_t len)` | Deallocates virtual memory page and frees kernel tracking structures. |

---

## 6. Algorithm & Flow

```mermaid
flowchart TD
    A([Start Program]) --> B["mmap(MAP_PRIVATE | MAP_ANONYMOUS)"]
    B --> C["Initialize *shared_var = 100"]
    C --> D["pipe(sync_pipe)"]
    D --> E["fork()"]
    E -->|Error| F([Exit Failure])
    
    E -->|PID == 0 (Child)| G["Child Process Started"]
    G --> H["Read *shared_var (Observes 100)"]
    H --> I["Write *shared_var = 200"]
    I --> J["Page Fault Traps to Kernel MMU"]
    J --> K["Kernel Allocates Private Frame & Copies Data"]
    K --> L["Child Writes 'W' to sync_pipe"]
    L --> M([Child Exits Code 0])

    E -->|PID > 0 (Parent)| N["Parent Process Waits on pipe read()"]
    N -->|Sync Token Received| O["Read *shared_var (Observes 100)"]
    O --> P["Verify Value is Still 100 (Isolated!)"]
    P --> Q["waitpid() Reaps Child Status"]
    Q --> R["munmap() and Close Descriptors"]
    R --> S([Demonstration Complete])
```

---

## 7. Implementation Details

### Private Anonymous Mapping
```c
int *shared_var = (int *)mmap(
    NULL,
    (size_t)page_size,
    PROT_READ | PROT_WRITE,
    MAP_PRIVATE | MAP_ANONYMOUS,
    -1,
    0
);
```
Using `MAP_PRIVATE` ensures changes are never propagated to other processes. When `fork()` is called, the kernel marks the PTEs (Page Table Entries) of both processes as read-only.

### Deterministic Pipe Synchronization
Without synchronization, a race condition could occur if the parent verified its value before the child executed its write instruction. By having the child write `'W'` into `sync_pipe[1]` and the parent block on `read(sync_pipe[0], ...)`, execution order is guaranteed:
$$\text{Child Read (100)} \longrightarrow \text{Child Write (200)} \longrightarrow \text{Pipe Signal} \longrightarrow \text{Parent Verify (100)}$$

---

## 8. Sample Execution Output

*(Recorded directly from actual binary execution)*

```
======================================================================
        LINUX / POSIX COPY-ON-WRITE (COW) MEMORY DEMONSTRATOR         
======================================================================
[INFO] System Page Size: 16384 bytes
[PARENT: 23391] Process started.
[PARENT: 23391] Allocated anonymous private memory page at virtual address: 0x1049c4000
[PARENT: 23391] Initialized integer value at 0x1049c4000: 100
[EVENT:INIT] pid=23391 addr=0x1049c4000 val=100 desc="Parent allocated anonymous private memory page and initialized value to 100"
[PARENT: 23391] Synchronization pipe established (read_fd=3, write_fd=5).
[PARENT: 23391] Calling fork() to duplicate process...
[PARENT: 23391] Child process created with PID: 23415. Waiting for child signal...
[CHILD: 23415] Spawned successfully (Parent PID: 23391).
[CHILD: 23415] Virtual address of shared_var: 0x1049c4000
[EVENT:FORK] parent_pid=23391 child_pid=23415 desc="fork() created child process; virtual page tables duplicated with COW protection"
[CHILD: 23415] Reading memory value BEFORE write: 100 (inherited from parent)
[CHILD: 23415] NOTE: At this stage, physical page is shared read-only between parent and child.
[EVENT:CHILD_READ] pid=23415 ppid=23391 val=100 desc="Child process reads inherited memory before write; shares physical page"
[CHILD: 23415] Mutating memory value from 100 to 200...
[CHILD: 23415] --> Hardware write protection triggers page fault; kernel allocates new private physical frame for child.
[CHILD: 23415] Memory value AFTER write: 200
[EVENT:CHILD_WRITE] pid=23415 old_val=100 new_val=200 desc="Child wrote 200 to memory; triggered COW page fault and private frame allocation"
[CHILD: 23415] Notified parent via pipe. Child exiting with status 0.
[EVENT:CHILD_EXIT] pid=23415 status=0 desc="Child process completed mutation and exited cleanly"
[PARENT: 23391] Received sync token ('W') from child. Child modification is done.
[PARENT: 23391] Verifying own memory value at 0x1049c4000: 100
[PARENT: 23391] SUCCESS: Memory value is still 100! Child's write did NOT alter parent memory.
[PARENT: 23391] PROOF: Linux Copy-on-Write isolated the child's mutation to its own private copy.
[EVENT:PARENT_VERIFY] pid=23391 val=100 expected=100 desc="Parent verified memory value remains 100 untouched after child write"
[PARENT: 23391] Child process 23415 terminated normally with exit status: 0
[EVENT:PARENT_REAP] pid=23391 child_pid=23415 status=0 desc="Parent collected child process termination status via waitpid()"
[PARENT: 23391] Released allocated memory page via munmap().
[EVENT:CLEANUP] desc="Parent unmapped memory with munmap() and closed IPC descriptors"
======================================================================
                       DEMONSTRATION SUMMARY                          
======================================================================
[SUMMARY] parent_pid=23391 child_pid=23415 initial_val=100 parent_final=100 child_final=200 status=SUCCESS
[CONCLUSION] Copy-on-Write demonstration completed successfully.
======================================================================
```

---

## 9. Observations & Key Findings

1. **Virtual Address Preservation**: Notice that both parent and child report the exact same virtual pointer address (`0x1049c4000`). This demonstrates that virtual address spaces are process-local; having identical virtual addresses does not mean physical memory is shared without hardware page-table translation.
2. **True Memory Isolation**: Even though the child modified its memory location to `200`, the parent verified its value remained `100`.
3. **No Memory Corruption**: Without COW or private mappings, writing to shared memory would overwrite the parent's data.

---

## 10. Advantages of Copy-on-Write

1. **Sub-millisecond `fork()` Performance**: `fork()` latency is $O(\text{page table entries})$ rather than $O(\text{RAM size})$.
2. **Drastic Memory Savings**: Shared libraries (glibc, libm) and read-only code segments remain shared across hundreds of system processes.
3. **Optimized `fork()` + `execve()` Idiom**: Most child processes in Unix call `execve()` immediately after `fork()`. COW prevents copying megabytes/gigabytes of RAM that would be instantly discarded.

---

## 11. Limitations

1. **Page Granularity Overhead**: If a process modifies a single 4-byte integer on a page, the OS must copy the full 4096-byte page.
2. **Page Fault Trap Cost**: Handling the MMU interrupt, switching privilege levels to kernel space, allocating a physical frame, copying 4KB, and updating page tables incurs microsecond-level latency compared to a direct in-place write.

---

## 12. Conclusion

The Copy-on-Write Memory Demonstrator successfully proves the mechanics of Linux virtual memory management. By bridging low-level C system programming with an Express and React web stack, the system provides an intuitive, interactive window into kernel memory mechanics.
