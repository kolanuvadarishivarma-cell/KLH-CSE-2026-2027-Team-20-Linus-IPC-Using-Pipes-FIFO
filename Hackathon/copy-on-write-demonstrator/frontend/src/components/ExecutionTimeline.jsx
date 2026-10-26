import React, { useState } from 'react';
import { 
  GitFork, ShieldCheck, Edit3, Eye, CheckCircle2, 
  Terminal, Clock, AlertTriangle, Layers, Info, Trash2, Cpu 
} from 'lucide-react';

export default function ExecutionTimeline({ events = [], executedAt, durationMs }) {
  const [showRaw, setShowRaw] = useState(false);

  // Default demonstration stages if no execution has happened yet
  const defaultStages = [
    {
      type: 'INIT',
      title: 'Anonymous Memory Allocation (mmap)',
      description: 'Parent calls mmap() with MAP_PRIVATE | MAP_ANONYMOUS to request an isolated 4KB page and sets initial integer value to 100.',
      statusType: 'neutral',
      phase: 'parent',
    },
    {
      type: 'FORK',
      title: 'Process Duplication (fork)',
      description: 'Parent invokes fork(). Kernel clones page table entries with Write-Protection flags enabled, without duplicating physical RAM frames.',
      statusType: 'shared',
      phase: 'kernel',
    },
    {
      type: 'CHILD_READ',
      title: 'Inherited Memory Read',
      description: 'Child reads the virtual memory address and observes 100 directly from the shared physical page without triggering any copy.',
      statusType: 'shared',
      phase: 'child',
    },
    {
      type: 'CHILD_WRITE',
      title: 'Write Trigger & Copy-on-Write Page Fault',
      description: 'Child attempts to write 200. MMU detects write-protection and raises a page fault trap. Linux allocates a new physical frame and copies page contents.',
      statusType: 'cow-fault',
      phase: 'child',
    },
    {
      type: 'CHILD_EXIT',
      title: 'Child Process Exit',
      description: 'Child confirms its memory contains 200, signals parent via POSIX pipe, and terminates cleanly with exit code 0.',
      statusType: 'success',
      phase: 'child',
    },
    {
      type: 'PARENT_VERIFY',
      title: 'Parent Memory Verification',
      description: 'Parent wakes up from pipe read and inspects its own memory address. Confirms value is still 100, proving memory isolation.',
      statusType: 'success',
      phase: 'parent',
    },
    {
      type: 'PARENT_REAP',
      title: 'Process Harvesting (waitpid)',
      description: 'Parent calls waitpid() to retrieve child exit status (0) and prevent zombie process accumulation.',
      statusType: 'success',
      phase: 'parent',
    },
    {
      type: 'CLEANUP',
      title: 'Resource Deallocation (munmap)',
      description: 'Parent unmaps the allocated virtual memory range via munmap() and closes pipe file descriptors.',
      statusType: 'cleanup',
      phase: 'parent',
    },
  ];

  const displayEvents = events.length > 0 ? events : defaultStages;

  const getIcon = (type) => {
    switch (type) {
      case 'INIT':
        return <Layers size={16} style={{ color: 'var(--accent-blue)' }} />;
      case 'FORK':
        return <GitFork size={16} style={{ color: 'var(--accent-purple)' }} />;
      case 'CHILD_READ':
        return <Eye size={16} style={{ color: 'var(--color-success)' }} />;
      case 'CHILD_WRITE':
        return <Edit3 size={16} style={{ color: 'var(--color-cow)' }} />;
      case 'CHILD_EXIT':
        return <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />;
      case 'PARENT_VERIFY':
        return <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />;
      case 'PARENT_REAP':
        return <CheckCircle2 size={16} style={{ color: 'var(--accent-blue)' }} />;
      case 'CLEANUP':
        return <Trash2 size={16} style={{ color: 'var(--text-muted)' }} />;
      default:
        return <Cpu size={16} style={{ color: 'var(--accent-blue)' }} />;
    }
  };

  const getBadgeClass = (statusType) => {
    switch (statusType) {
      case 'shared':
        return 'badge-green';
      case 'cow-fault':
        return 'badge-orange';
      case 'success':
        return 'badge-blue';
      case 'cleanup':
        return 'badge-purple';
      default:
        return 'badge-blue';
    }
  };

  return (
    <section id="timeline" style={{ padding: '3rem 0 4rem', background: 'rgba(13, 17, 26, 0.4)' }}>
      <div className="container">
        {/* Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '2rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Clock size={20} style={{ color: 'var(--accent-blue)' }} />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                System Execution Timeline
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              {events.length > 0 
                ? `Actual sequence recorded from C runtime execution (${durationMs || 0} ms duration)`
                : 'Canonical POSIX system-call and COW sequence reference'}
            </p>
          </div>

          <button
            onClick={() => setShowRaw(!showRaw)}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
          >
            <Terminal size={14} />
            {showRaw ? 'Hide Raw Log Records' : 'Show Raw Event Records'}
          </button>
        </div>

        {/* Timeline Items */}
        <div style={{
          position: 'relative',
          paddingLeft: '2rem',
          borderLeft: '2px solid rgba(56, 189, 248, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
        }}>
          {displayEvents.map((evt, idx) => (
            <div
              key={evt.id || idx}
              className="glass-panel"
              style={{
                padding: '1.25rem 1.5rem',
                position: 'relative',
                borderLeft: evt.statusType === 'cow-fault'
                  ? '3px solid var(--color-cow)'
                  : '1px solid var(--border-subtle)',
              }}
            >
              {/* Bullet Node on the vertical line */}
              <div style={{
                position: 'absolute',
                left: '-2.65rem',
                top: '1.5rem',
                width: '1.25rem',
                height: '1.25rem',
                borderRadius: '50%',
                background: evt.statusType === 'cow-fault' ? 'var(--color-cow)' : 'var(--bg-tertiary)',
                border: `2px solid ${evt.statusType === 'cow-fault' ? '#fff' : 'var(--accent-blue)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: evt.statusType === 'cow-fault' ? '0 0 12px var(--color-cow)' : 'none',
              }} />

              {/* Title & Badges */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                marginBottom: '0.5rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {getIcon(evt.type)}
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
                    {idx + 1}. {evt.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span className={`badge ${getBadgeClass(evt.statusType)}`}>
                    {evt.phase || 'Kernel'}
                  </span>
                  {evt.pid && (
                    <span style={{
                      fontSize: '0.72rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      background: 'rgba(0,0,0,0.3)',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                    }}>
                      PID: {evt.pid}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {evt.description}
              </p>

              {/* Raw record inspect */}
              {showRaw && evt.raw && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--accent-cyan)',
                  wordBreak: 'break-all',
                }}>
                  {evt.raw}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Note about hardware/kernel instrumentation */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.65rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(56, 189, 248, 0.06)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          marginTop: '2rem',
        }}>
          <Info size={18} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <strong>Kernel Instrumentation Note:</strong> In user space, the hardware page fault (trap to kernel)
            is transparent: the child simply issues an assignment (<code style={{ color: 'var(--accent-blue)' }}>*shared_var = 200</code>),
            and the kernel page-fault handler (<code style={{ color: 'var(--accent-blue)' }}>do_wp_page()</code>) allocates and clones the page before resuming the process.
            The timeline sequence reflects the real observed state changes from our C synchronization pipeline.
          </div>
        </div>
      </div>
    </section>
  );
}
