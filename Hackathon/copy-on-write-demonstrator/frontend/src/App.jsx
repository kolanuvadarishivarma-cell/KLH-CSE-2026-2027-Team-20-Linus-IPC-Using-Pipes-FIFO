import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import MemoryVisualization from './components/MemoryVisualization';
import ExecutionTimeline from './components/ExecutionTimeline';
import StatisticsPanel from './components/StatisticsPanel';
import TerminalOutput from './components/TerminalOutput';
import HowItWorks from './components/HowItWorks';
import VivaSection from './components/VivaSection';
import { AlertCircle, RefreshCw, Cpu, Layers } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Poll backend health & fetch project info
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      } else {
        setHealth({ status: 'unhealthy', error: `HTTP ${res.status}` });
      }
    } catch (err) {
      setHealth({ status: 'offline', error: err.message });
    }
  };

  const loadInfo = async () => {
    try {
      const res = await fetch('/api/demo/info');
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      }
    } catch (err) {
      console.warn('Could not fetch demo info:', err);
    }
  };

  useEffect(() => {
    checkHealth();
    loadInfo();
    const interval = setInterval(checkHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  // Execute C demonstration with customizable inputs
  const handleRunDemo = async (customConfig = {}) => {
    if (isRunning) return;

    setIsRunning(true);
    setError(null);

    try {
      const res = await fetch('/api/demo/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customConfig || {}),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Demonstration execution returned a non-zero exit code');
      }

      setResult(data);

      // Scroll smoothly to visualization
      const elem = document.getElementById('live-demo');
      if (elem) {
        elem.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      setError(`Backend Communication Error: ${err.message}. Ensure backend is running at http://127.0.0.1:5001.`);
    } finally {
      setIsRunning(false);
    }
  };

  // Reset visual state
  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <Navbar health={health} onRunDemo={handleRunDemo} isRunning={isRunning} />

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {/* Global Error Banner */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '1rem',
          }}>
            <div className="container" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              color: '#fca5a5',
              fontSize: '0.88rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />
                <span><strong>Execution Error:</strong> {error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Hero Section */}
        <Hero onRunDemo={handleRunDemo} isRunning={isRunning} info={info} />

        {/* Live Memory Visualization & Controls */}
        <MemoryVisualization
          result={result}
          isRunning={isRunning}
          onRunDemo={handleRunDemo}
          onReset={handleReset}
        />

        {/* System Execution Timeline */}
        <ExecutionTimeline
          events={result?.events || []}
          executedAt={result?.executedAt}
          durationMs={result?.durationMs}
        />

        {/* Runtime Statistics */}
        <StatisticsPanel result={result} isRunning={isRunning} />

        {/* Source Code & Real Terminal Output */}
        <TerminalOutput
          stdout={result?.stdout}
          stderr={result?.stderr}
          exitCode={result?.exitCode}
          isRunning={isRunning}
          sourceCode={info?.sourceCode}
          onRunDemo={handleRunDemo}
        />

        {/* Educational Architecture Explanation */}
        <HowItWorks />

        {/* Viva Questions and Answers */}
        <VivaSection />
      </main>

      {/* Footer */}
      <footer style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-subtle)',
        padding: '3rem 0 2rem',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
      }}>
        <div className="container">
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            paddingBottom: '2rem',
            marginBottom: '2rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', fontWeight: 700, fontSize: '1rem', marginBottom: '0.35rem' }}>
                <Cpu size={18} style={{ color: 'var(--accent-blue)' }} />
                COW Memory Demonstrator
              </div>
              <p style={{ maxWidth: '450px', fontSize: '0.8rem', lineHeight: 1.5 }}>
                Operating Systems and System Programming (OSSP) demonstration project illustrating POSIX process duplication,
                hardware page write-protection, and the Copy-on-Write memory optimization.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '2rem', fontSize: '0.82rem' }}>
              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.4rem' }}>System Calls</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <code>fork()</code>
                  <code>mmap()</code>
                  <code>pipe()</code>
                  <code>waitpid()</code>
                  <code>munmap()</code>
                </div>
              </div>

              <div>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.4rem' }}>Stack</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span>C (GCC / Clang)</span>
                  <span>Node.js / Express</span>
                  <span>React / Vite</span>
                  <span>POSIX Memory API</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            fontSize: '0.78rem',
          }}>
            <div>
              Academic OSSP Engineering Project • Verified Systems Programming Implementation
            </div>
            <div>
              Host: {health?.platform ? `${health.platform} (${health.isLinux ? 'Native Linux Kernel' : 'POSIX Host Mode'})` : 'Localhost'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
