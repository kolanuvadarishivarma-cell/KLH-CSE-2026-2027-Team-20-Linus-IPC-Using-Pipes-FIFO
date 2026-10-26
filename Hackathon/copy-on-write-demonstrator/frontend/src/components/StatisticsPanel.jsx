import React from 'react';
import { CheckCircle2, XCircle, Clock, Cpu, Hash, ShieldCheck, Database, Layers } from 'lucide-react';

export default function StatisticsPanel({ result, isRunning }) {
  const hasRun = !!result;

  const metrics = [
    {
      label: 'Parent PID',
      value: hasRun ? result.parentPid : '—',
      icon: <Hash size={16} style={{ color: 'var(--accent-blue)' }} />,
      desc: 'Process ID of parent creator',
    },
    {
      label: 'Child PID',
      value: hasRun ? result.childPid : '—',
      icon: <Hash size={16} style={{ color: 'var(--accent-purple)' }} />,
      desc: 'Process ID spawned via fork()',
    },
    {
      label: 'Initial Value',
      value: hasRun ? result.initialValue : '—',
      icon: <Database size={16} style={{ color: 'var(--text-secondary)' }} />,
      desc: 'Shared integer value before mutation',
    },
    {
      label: 'Parent Final Value',
      value: hasRun ? result.parentFinalValue : '—',
      icon: <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />,
      desc: 'Preserved untouched in parent space',
      highlight: 'success',
    },
    {
      label: 'Child Final Value',
      value: hasRun ? result.childFinalValue : '—',
      icon: <Cpu size={16} style={{ color: 'var(--color-cow)' }} />,
      desc: 'Mutated in child private page',
      highlight: 'cow',
    },
    {
      label: 'Writer Mode',
      value: hasRun ? (result.writerMode || 'child').toUpperCase() : '—',
      icon: <Layers size={16} style={{ color: 'var(--accent-blue)' }} />,
      desc: 'Selected mutation operator',
    },
    {
      label: 'Execution Duration',
      value: hasRun ? `${result.durationMs} ms` : '—',
      icon: <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />,
      desc: 'Spawn, sync, write, and reap time',
    },
    {
      label: 'Demonstration Result',
      value: hasRun ? (result.success ? 'PASSED' : 'FAILED') : 'PENDING',
      icon: hasRun && result.success 
        ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
        : <XCircle size={16} style={{ color: 'var(--color-danger)' }} />,
      desc: hasRun && result.success ? 'Memory Isolation Verified' : 'Awaiting execution',
      highlight: hasRun && result.success ? 'success' : (hasRun ? 'danger' : 'neutral'),
    },
  ];

  return (
    <section id="statistics" style={{ padding: '2.5rem 0 3.5rem' }}>
      <div className="container">
        {/* Title */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Runtime Telemetry & Execution Metrics
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Direct observations recorded from the operating system kernel and C runtime. No simulated metrics.
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}>
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{
                padding: '1.2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'rgba(13, 17, 26, 0.7)',
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.65rem',
                }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {m.label}
                  </span>
                  {m.icon}
                </div>

                <div style={{
                  fontSize: '1.65rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.02em',
                  color: m.highlight === 'success' 
                    ? 'var(--color-success)' 
                    : (m.highlight === 'cow' ? 'var(--color-cow)' : '#fff'),
                  marginBottom: '0.35rem',
                }}>
                  {m.value}
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {m.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Disclaimer distinguishing real metrics from conceptual models */}
        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          borderLeft: '2px solid var(--border-subtle)',
          paddingLeft: '0.75rem',
        }}>
          * All metrics above (PIDs, duration, observed integer values) reflect real kernel returns from <code style={{ color: 'var(--accent-blue)' }}>copy_on_write.c</code>.
          Notice that fabricated RAM savings or unmeasured physical frame counts are omitted to ensure strict scientific and engineering rigor.
        </div>
      </div>
    </section>
  );
}
