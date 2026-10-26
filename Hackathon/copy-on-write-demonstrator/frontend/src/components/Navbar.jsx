import React from 'react';
import { Cpu, Server, Activity, Terminal, BookOpen, HelpCircle, Code2, Play } from 'lucide-react';

export default function Navbar({ health, onRunDemo, isRunning }) {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(7, 9, 14, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '4.25rem',
      }}>
        {/* Logo / Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '2.5rem',
            height: '2.5rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: 'var(--accent-blue)',
          }}>
            <Cpu size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                COW Memory Lab
              </span>
              <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                OSSP
              </span>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Linux Copy-on-Write Memory Demonstrator
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav style={{
          display: 'none',
          alignItems: 'center',
          gap: '1.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
        }} className="nav-desktop">
          <a href="#overview" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            Overview
          </a>
          <a href="#live-demo" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            Live Demo
          </a>
          <a href="#how-it-works" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            How It Works
          </a>
          <a href="#source-code" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            Source Code
          </a>
          <a href="#docs" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            Documentation
          </a>
          <a href="#viva" style={{ transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color='var(--text-secondary)'}>
            Viva Q&A
          </a>
        </nav>

        {/* Status Indicator & Quick Run Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Health Pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 0.8rem',
            borderRadius: '9999px',
            background: health?.status === 'healthy' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${health?.status === 'healthy' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            fontSize: '0.78rem',
            fontWeight: 600,
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: health?.status === 'healthy' ? '#10b981' : '#ef4444',
              boxShadow: health?.status === 'healthy' ? '0 0 8px #10b981' : '0 0 8px #ef4444',
            }} />
            <span style={{ color: health?.status === 'healthy' ? '#10b981' : '#ef4444' }}>
              {health?.status === 'healthy' 
                ? (health.isLinux ? 'Linux Backend Active' : `POSIX Backend (${health.platform})`) 
                : 'Backend Offline'}
            </span>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={onRunDemo}
            disabled={isRunning || health?.status !== 'healthy'}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
          >
            {isRunning ? (
              <>
                <Activity size={15} className="spin" /> Executing C Demo...
              </>
            ) : (
              <>
                <Play size={15} fill="currentColor" /> Run Demo
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @media (min-width: 860px) {
          .nav-desktop {
            display: flex !important;
          }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </header>
  );
}
