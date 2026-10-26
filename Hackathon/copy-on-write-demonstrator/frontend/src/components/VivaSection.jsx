import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, BookOpen, Search, CheckCircle2 } from 'lucide-react';

export default function VivaSection() {
  const [openIndex, setOpenIndex] = useState(0);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');

  const questions = [
    {
      q: 'What is Copy-on-Write (COW)?',
      category: 'COW Internals',
      a: 'Copy-on-Write is an operating system memory-management optimization where multiple processes share the same physical memory pages for reading. A private copy of a physical page is created only when one of the processes attempts to write to it.',
    },
    {
      q: 'What does the fork() system call do in Linux?',
      category: 'Process Management',
      a: 'fork() creates a new child process by duplicating the calling parent process. The child receives an identical copy of the parent’s file descriptors, registers, and address space mappings, but has a unique Process ID (PID).',
    },
    {
      q: 'What is a Process ID (PID)?',
      category: 'Process Management',
      a: 'A Process ID (PID) is a unique non-negative integer assigned by the kernel to every active process in the system, used to identify, manage, and signal the process.',
    },
    {
      q: 'What happens immediately after fork() regarding memory?',
      category: 'COW Internals',
      a: 'Immediately after fork(), no physical RAM pages are copied. Instead, the kernel duplicates the parent’s page table entries and marks them as Read-Only. Both parent and child point to the exact same physical memory frames.',
    },
    {
      q: 'Why does the child initially see the parent’s memory value (e.g. 100)?',
      category: 'Memory Management',
      a: 'Because the child’s virtual page table maps to the exact same underlying physical frame that the parent populated before fork(). Since no modification has occurred, both observe the identical physical bytes.',
    },
    {
      q: 'What is a Page Fault?',
      category: 'Memory Management',
      a: 'A page fault is a hardware interrupt raised by the CPU Memory Management Unit (MMU) when a program accesses a virtual page that is either not present in RAM or has insufficient access permissions (such as writing to a read-only page).',
    },
    {
      q: 'When does Linux actually copy a COW page?',
      category: 'COW Internals',
      a: 'Linux copies a COW page only when a process issues a write instruction to a page marked with write-protection flags. The resulting page fault traps into the kernel (do_wp_page), which allocates a new frame, clones the data, and updates the writer’s page table to Read-Write.',
    },
    {
      q: 'What is the difference between Virtual and Physical memory?',
      category: 'Memory Management',
      a: 'Virtual memory is a per-process simulated address space provided by the OS and MMU, allowing isolated 0x0000... addresses. Physical memory refers to the actual hardware RAM chips installed on the motherboard.',
    },
    {
      q: 'What is the purpose of the waitpid() system call?',
      category: 'Linux System Calls',
      a: 'waitpid() suspends the parent process until a specified child process has changed state (terminated, stopped, or resumed). It collects the child’s exit status and prevents the child from remaining a "zombie process" in the process table.',
    },
    {
      q: 'What is the purpose of the mmap() system call?',
      category: 'Linux System Calls',
      a: 'mmap() creates a new memory mapping in the calling process’s virtual address space. It can map files from disk into memory or allocate anonymous zero-filled memory regions without file backing.',
    },
    {
      q: 'What is the difference between MAP_PRIVATE and MAP_SHARED in mmap()?',
      category: 'Linux System Calls',
      a: 'MAP_PRIVATE creates a private Copy-on-Write mapping where modifications are invisible to other processes and not written back to the underlying file. MAP_SHARED creates a shared mapping where modifications are immediately visible to all mapping processes and synced to the underlying file.',
    },
    {
      q: 'What are the main advantages of Copy-on-Write?',
      category: 'COW Internals',
      a: '1. Fast fork(): forks run in sub-milliseconds regardless of memory size.\n2. Memory efficiency: unwritten libraries and code pages are shared across processes.\n3. Huge optimization for fork() + execve(): eliminates copying GBs of memory that would be immediately discarded by the new program image.',
    },
    {
      q: 'Why does Copy-on-Write operate at page granularity rather than variable granularity?',
      category: 'Memory Management',
      a: 'Hardware MMUs and CPU TLBs manage memory protection flags (Read, Write, Execute) at the page level (usually 4KB), not at the level of individual 4-byte integers. Therefore, any write inside a page requires duplicating the entire 4096-byte frame.',
    },
    {
      q: 'Which Linux kernel function handles write-protection faults for COW?',
      category: 'COW Internals',
      a: 'In the Linux kernel source (mm/memory.c), write-protection faults on private anonymous mappings are handled by the function do_wp_page(), which allocates a new struct page, copies the memory contents via copy_user_highpage(), and remaps the PTE.',
    },
  ];

  const categories = ['ALL', 'COW Internals', 'Process Management', 'Memory Management', 'Linux System Calls'];

  const filtered = questions.filter((item) => {
    const matchesCat = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch = item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <section id="viva" style={{ padding: '3.5rem 0 5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '2.5rem',
        }}>
          <span className="badge badge-green" style={{ marginBottom: '0.75rem' }}>
            College Viva Voce & Exam Preparation
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Viva Questions & Comprehensive Answers
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '680px', fontSize: '0.95rem' }}>
            14 curated questions frequently asked in Operating Systems and System Programming viva examinations.
          </p>
        </div>

        {/* Filter bar & Search */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}>
          {/* Category pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: '1px solid',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: activeCategory === cat ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.05)',
                  borderColor: activeCategory === cat ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  color: activeCategory === cat ? '#000' : 'var(--text-secondary)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '0.45rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            minWidth: '240px',
          }}>
            <Search size={15} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search viva questions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                width: '100%',
              }}
            />
          </div>
        </div>

        {/* Questions Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filtered.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="glass-panel"
                style={{
                  overflow: 'hidden',
                  border: isOpen ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Question Row */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  style={{
                    width: '100%',
                    padding: '1.15rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#fff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '1.75rem',
                      height: '1.75rem',
                      borderRadius: '50%',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--accent-blue)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      Q{idx + 1}
                    </span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                      {item.q}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                      {item.category}
                    </span>
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Answer Content */}
                {isOpen && (
                  <div style={{
                    padding: '0 1.5rem 1.25rem 3.9rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                    paddingTop: '0.85rem',
                    whiteSpace: 'pre-line',
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
