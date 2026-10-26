import React from 'react';
import { 
  BookOpen, GitFork, Cpu, Database, Shield, Zap, 
  Layers, CheckCircle2, ArrowRight, HelpCircle, FileText 
} from 'lucide-react';

export default function HowItWorks() {
  const principles = [
    {
      title: '1. What is a Process?',
      icon: <Cpu size={20} style={{ color: 'var(--accent-blue)' }} />,
      text: 'A process is an instance of an executing program with its own CPU state, registers, file descriptors, and dedicated virtual memory address space managed by the operating system kernel.',
    },
    {
      title: '2. Virtual vs Physical Memory',
      icon: <Database size={20} style={{ color: 'var(--accent-cyan)' }} />,
      text: 'Processes never access physical RAM chips directly. Instead, the hardware MMU (Memory Management Unit) and kernel page tables translate virtual addresses (e.g. 0x7fff4000) into actual physical memory frames on demand.',
    },
    {
      title: '3. What fork() Actually Does',
      icon: <GitFork size={20} style={{ color: 'var(--accent-purple)' }} />,
      text: 'When a parent calls fork(), POSIX specifies that an exact clone of the process is created. In naive operating systems, this meant copying every single byte of RAM immediately (eager copying), which was tremendously slow and wasteful.',
    },
    {
      title: '4. The Copy-on-Write (COW) Optimization',
      icon: <Zap size={20} style={{ color: 'var(--color-cow)' }} />,
      text: 'Linux does NOT eagerly copy physical memory during fork(). Instead, it duplicates the parent page tables and marks all pages as Read-Only. Both parent and child share the identical physical frames for reading with zero copying overhead.',
    },
    {
      title: '5. The Write Page Fault Trap',
      icon: <Shield size={20} style={{ color: 'var(--color-warning)' }} />,
      text: 'When either process tries to modify a shared page (*var = 200), the CPU hardware detects a write to a read-only page and triggers a Page Fault interrupt. The Linux kernel catches this trap (via do_wp_page in the kernel).',
    },
    {
      title: '6. Private Allocation & Page Granularity',
      icon: <Layers size={20} style={{ color: 'var(--color-success)' }} />,
      text: 'The kernel allocates a brand-new physical frame, copies the 4KB page content from the original frame, updates the writing process page table to point to the new frame with Read-Write permissions, and resumes execution seamlessly.',
    },
  ];

  return (
    <section id="how-it-works" style={{ padding: '3.5rem 0 4.5rem', background: 'rgba(10, 13, 20, 0.6)' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '3rem',
        }}>
          <span className="badge badge-purple" style={{ marginBottom: '0.75rem' }}>
            Operating System Fundamentals
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            How Copy-on-Write Operates Under the Hood
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '700px', fontSize: '0.95rem' }}>
            From POSIX system calls to hardware MMU page faults and kernel memory management.
          </p>
        </div>

        {/* 6 Core Principles Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '3rem',
        }}>
          {principles.map((item, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                <div style={{
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                }}>
                  {item.icon}
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>
                  {item.title}
                </h3>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* 3-Step Lifecycle Comparison */}
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', marginBottom: '1.25rem', textAlign: 'center' }}>
            The 3-Step Lifecycle of Memory Sharing
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}>
            {/* Step 1 */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <span className="badge badge-blue" style={{ marginBottom: '0.5rem' }}>Step 1</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                Before fork()
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Only the parent process exists. It allocates a page via <code style={{ color: 'var(--accent-blue)' }}>mmap()</code> and writes value <strong style={{ color: '#fff' }}>100</strong>.
                Page table maps virtual address directly to a single physical frame with RW permissions.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}>
              <span className="badge badge-green" style={{ marginBottom: '0.5rem' }}>Step 2</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                Immediately After fork()
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Child process is created. Both parent and child page tables point to the <em>same physical frame</em>.
                Kernel marks page table entries in <strong>both processes as Read-Only</strong>.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(249, 115, 22, 0.3)',
            }}>
              <span className="badge badge-orange" style={{ marginBottom: '0.5rem' }}>Step 3</span>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                After Child Mutates Memory
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Child writes <strong style={{ color: 'var(--color-cow)' }}>200</strong>. CPU MMU triggers a write page fault.
                Kernel clones the frame for the child. Parent remains mapped to the original frame with value <strong style={{ color: 'var(--color-success)' }}>100</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Comparison Table: Eager Copying vs Copy-on-Write */}
        <div className="glass-panel" style={{ padding: '2rem', overflowX: 'auto' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>
            Architectural Comparison: Eager Copying vs. Linux Copy-on-Write
          </h3>

          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.85rem',
            textAlign: 'left',
          }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Feature</th>
                <th style={{ padding: '0.75rem 1rem' }}>Eager Copying (Early Unix)</th>
                <th style={{ padding: '0.75rem 1rem', color: 'var(--accent-blue)' }}>Copy-on-Write (Modern Linux)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>fork() Execution Latency</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-danger)' }}>Slow; proportional to process memory footprint (MBs or GBs)</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-success)' }}>Instantaneous; only copies page table references</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>Physical Memory Consumption</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-danger)' }}>Immediately doubles RAM allocation for each child</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-success)' }}>Zero extra RAM initially; allocates only pages that are modified</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>fork() followed by execve()</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-danger)' }}>Catastrophic waste: copies GBs only to immediately discard them in exec</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-success)' }}>Optimal efficiency: almost zero pages are copied before execve replaces image</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>Hardware Dependency</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>None; can be implemented purely in software</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--accent-cyan)' }}>Requires hardware MMU with page write-protection support</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#fff' }}>Duplication Granularity</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Whole address space</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--color-success)' }}>Page granularity (typically 4096 bytes per fault)</td>
              </tr>
            </tbody>
          </table>

          {/* Granularity clarification */}
          <div style={{
            marginTop: '1.25rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.03)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            <strong>Important Granularity Note:</strong> Copy-on-Write operates at <em>page granularity</em> (4KB or 16KB on ARM64),
            not at individual variable granularity. Modifying a single 4-byte integer causes the kernel to copy the entire enclosing page.
          </div>
        </div>
      </div>
    </section>
  );
}
