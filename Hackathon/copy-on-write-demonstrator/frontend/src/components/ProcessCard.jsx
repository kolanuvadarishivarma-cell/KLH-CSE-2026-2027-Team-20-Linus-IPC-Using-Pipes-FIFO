import React from 'react';
import { Layers, CheckCircle2, AlertCircle, Clock, ShieldCheck, Database, ArrowRight, Cpu, GitFork } from 'lucide-react';

export default function ProcessCard({
  role = 'parent',
  pid,
  ppid,
  virtualAddress,
  currentValue,
  pageStatus,
  executionStatus,
  osState,
  isMutating = false,
  step = 0,
}) {
  const isParent = role === 'parent';

  return (
    <div className="glass-panel" style={{
      flex: '1 1 320px',
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
      border: isMutating
        ? '1px solid rgba(249, 115, 22, 0.6)'
        : '1px solid var(--border-subtle)',
      boxShadow: isMutating
        ? '0 0 25px rgba(249, 115, 22, 0.2)'
        : '0 8px 32px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.3s ease',
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isParent ? 'var(--accent-blue)' : 'var(--accent-violet)',
            boxShadow: `0 0 8px ${isParent ? 'var(--accent-blue)' : 'var(--accent-violet)'}`,
          }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
              {isParent ? 'Parent Process' : 'Child Process'}
            </h3>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {isParent ? 'Task Originator' : 'fork() Offspring Task'}
            </span>
          </div>
        </div>

        <span className={isParent ? 'badge badge-blue' : 'badge badge-purple'}>
          {isParent ? 'Creator PID' : 'Child PID'}
        </span>
      </div>

      {/* Grid of properties */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.85rem',
        marginBottom: '1.25rem',
      }}>
        {/* PID */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            Process ID (PID)
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: isParent ? 'var(--accent-blue)' : 'var(--accent-violet)' }}>
            {pid || '—'}
          </div>
        </div>

        {/* PPID */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
        }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            {isParent ? 'Child Target PID' : 'Parent PID (PPID)'}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {ppid || '—'}
          </div>
        </div>
      </div>

      {/* OS Task Status Pill */}
      {osState && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.25)',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '1.25rem',
          fontSize: '0.75rem',
        }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Cpu size={13} style={{ color: 'var(--accent-cyan)' }} />
            Kernel Task State:
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#38bdf8' }}>
            {osState}
          </span>
        </div>
      )}

      {/* Virtual Memory Mapping Box */}
      <div style={{
        background: 'rgba(13, 17, 26, 0.8)',
        borderRadius: 'var(--radius-md)',
        padding: '1rem',
        border: '1px solid var(--border-subtle)',
        marginBottom: '1.25rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.6rem',
        }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Database size={13} />
            Virtual Memory Mapping
          </span>
          <span style={{
            fontSize: '0.7rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan)',
            background: 'rgba(6, 182, 212, 0.1)',
            padding: '0.15rem 0.45rem',
            borderRadius: '4px',
          }}>
            {virtualAddress || '0x—'}
          </span>
        </div>

        {/* Observed Value & Page Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: 'var(--radius-sm)',
          border: isMutating ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Observed Value *var</div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              fontFamily: 'var(--font-mono)',
              color: isMutating ? 'var(--color-cow)' : 'var(--color-success)',
              transition: 'color 0.3s ease',
            }}>
              {currentValue !== undefined && currentValue !== null ? currentValue : '—'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Page Table Flag</div>
            <span style={{
              display: 'inline-block',
              marginTop: '0.2rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              background: pageStatus?.includes('Private') || pageStatus?.includes('Copy') || pageStatus?.includes('Modified')
                ? 'var(--color-cow-bg)'
                : 'var(--color-success-bg)',
              color: pageStatus?.includes('Private') || pageStatus?.includes('Copy') || pageStatus?.includes('Modified')
                ? 'var(--color-cow)'
                : 'var(--color-success)',
            }}>
              {pageStatus || 'Unmapped'}
            </span>
          </div>
        </div>
      </div>

      {/* Execution status footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.78rem',
        color: 'var(--text-secondary)',
        paddingTop: '0.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}>
        <span>Status:</span>
        <span style={{ fontWeight: 600, color: '#fff' }}>
          {executionStatus || 'Idle'}
        </span>
      </div>
    </div>
  );
}
