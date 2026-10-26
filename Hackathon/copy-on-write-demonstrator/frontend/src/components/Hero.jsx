import React from 'react';
import { Play, Sparkles, Terminal, Shield, Layers, ArrowRight, Info, AlertTriangle } from 'lucide-react';

export default function Hero({ onRunDemo, isRunning, info }) {
  return (
    <section id="overview" style={{
      padding: '5rem 0 3.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow gradient backdrop */}
      <div style={{
        position: 'absolute',
        top: '-100px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '650px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Technology labels */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '1.5rem',
        }}>
          <span className="badge badge-blue">Linux Ubuntu / POSIX</span>
          <span className="badge badge-purple">C (GCC / Clang)</span>
          <span className="badge badge-green">fork() System Call</span>
          <span className="badge badge-orange">Copy-on-Write (COW)</span>
          <span className="badge badge-blue">mmap() Anonymous Private</span>
          <span className="badge badge-purple">Full-Stack OSSP</span>
        </div>

        {/* Main Heading */}
        <h1 style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.25rem)',
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          maxWidth: '850px',
          marginBottom: '1.25rem',
          background: 'linear-gradient(135deg, #ffffff 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          See Memory Sharing in Action.
        </h1>

        {/* Supporting text */}
        <p style={{
          fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
          color: 'var(--text-secondary)',
          maxWidth: '720px',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          Explore how Linux <code style={{ color: 'var(--accent-blue)', background: 'rgba(56, 189, 248, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>fork()</code> uses
          Copy-on-Write to share physical memory pages until a process modifies them.
          Experience real-time operating system memory isolation directly backed by compiled C system calls.
        </p>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}>
          <button
            onClick={onRunDemo}
            disabled={isRunning}
            className="btn btn-primary"
            style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
          >
            <Play size={18} fill="currentColor" />
            {isRunning ? 'Running C Binary...' : 'Run Live Demonstration'}
          </button>

          <a
            href="#how-it-works"
            className="btn btn-secondary"
            style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}
          >
            Explore How It Works
            <ArrowRight size={16} />
          </a>
        </div>

        {/* Host OS Callout & Disclaimer */}
        {info?.linuxWarning && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            maxWidth: '850px',
          }}>
            <AlertTriangle size={20} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.85rem', color: '#fed7aa', lineHeight: 1.5 }}>
              <strong>Host Architecture Notice:</strong> {info.linuxWarning}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
