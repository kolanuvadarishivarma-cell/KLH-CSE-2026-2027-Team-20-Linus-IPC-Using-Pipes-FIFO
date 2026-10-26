import React, { useState } from 'react';
import { Terminal, Code2, Copy, Check, Download, AlertCircle, Play } from 'lucide-react';

export default function TerminalOutput({
  stdout,
  stderr,
  exitCode,
  isRunning,
  sourceCode,
  onRunDemo,
}) {
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' | 'source'
  const [copied, setCopied] = useState(false);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sourceCode], { type: 'text/x-csrc' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'copy_on_write.c';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <section id="source-code" style={{ padding: '3rem 0 4.5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Code2 size={20} style={{ color: 'var(--accent-blue)' }} />
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                System Source Code & Terminal Output
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
              Inspect the exact POSIX C program and review real execution standard output and standard error.
            </p>
          </div>

          {/* Tab buttons */}
          <div style={{
            display: 'flex',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '0.3rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => setActiveTab('terminal')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'terminal' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'terminal' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              <Terminal size={14} />
              Real Terminal Output
              {exitCode !== undefined && exitCode !== null && (
                <span className={`badge ${exitCode === 0 ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                  Exit {exitCode}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('source')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-sm)',
                background: activeTab === 'source' ? 'var(--bg-tertiary)' : 'transparent',
                color: activeTab === 'source' ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.82rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              <Code2 size={14} />
              C Source (copy_on_write.c)
            </button>
          </div>
        </div>

        {/* Terminal / Code Window Panel */}
        <div className="glass-panel" style={{
          background: '#07090e',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
        }}>
          {/* Top Window Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.25rem',
            background: 'rgba(19, 25, 38, 0.8)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            {/* Window control dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#ef4444' }} />
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#f59e0b' }} />
              <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                marginLeft: '0.75rem',
              }}>
                {activeTab === 'terminal' ? 'bash -c ./linux/copy_on_write' : 'copy_on_write.c (C99)'}
              </span>
            </div>

            {/* Actions: Copy / Download */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                onClick={() => handleCopy(activeTab === 'terminal' ? (stdout || 'No output recorded') : sourceCode)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                title="Copy to clipboard"
              >
                {copied ? <Check size={13} style={{ color: 'var(--color-success)' }} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>

              {activeTab === 'source' && (
                <button
                  onClick={handleDownload}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  title="Download C Source File"
                >
                  <Download size={13} />
                  Download
                </button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div style={{
            maxHeight: '480px',
            overflowY: 'auto',
            padding: '1.25rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            lineHeight: 1.6,
          }}>
            {activeTab === 'terminal' ? (
              <div>
                {isRunning ? (
                  <div style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>$ ./linux/copy_on_write</span>
                    <span className="spin">⠋</span>
                    <span>Executing child processes and pipe synchronization...</span>
                  </div>
                ) : stdout ? (
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#e2e8f0' }}>
                    {stdout}
                  </pre>
                ) : (
                  <div style={{
                    padding: '3rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                  }}>
                    <Terminal size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                    <p>No demonstration has been executed in this session yet.</p>
                    <p style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
                      Click <strong>"Run Demonstration"</strong> above to compile and run the real C binary.
                    </p>
                  </div>
                )}

                {/* Stderr if present */}
                {stderr && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#fca5a5',
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <AlertCircle size={14} /> Standard Error (stderr):
                    </div>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{stderr}</pre>
                  </div>
                )}
              </div>
            ) : (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#93c5fd' }}>
                {sourceCode || '// C Source code loading...'}
              </pre>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
