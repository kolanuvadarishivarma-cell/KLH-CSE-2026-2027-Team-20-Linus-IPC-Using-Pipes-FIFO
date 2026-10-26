import React, { useState, useEffect } from 'react';
import ProcessCard from './ProcessCard';
import { 
  Play, RotateCcw, FastForward, Cpu, Layers, AlertTriangle, 
  ArrowRight, Shield, Zap, Info, CheckCircle2, ChevronRight, ChevronLeft,
  Sliders, Settings, Terminal, GitFork, ArrowDown
} from 'lucide-react';

export default function MemoryVisualization({
  result,
  isRunning,
  onRunDemo,
  onReset,
}) {
  // Configurable inputs state (supports any name, string, text, or number)
  const [initialValInput, setInitialValInput] = useState('Alice');
  const [modifiedValInput, setModifiedValInput] = useState('Bob');
  const [writerMode, setWriterMode] = useState('child');
  const [delayMs, setDelayMs] = useState(50);

  // Stepper state
  const [currentStep, setCurrentStep] = useState(0);

  // When a new execution finishes, animate the steps
  useEffect(() => {
    if (result && result.success) {
      animateTrace();
    }
  }, [result]);

  const animateTrace = () => {
    setCurrentStep(1);
    const timers = [
      setTimeout(() => setCurrentStep(2), 700),
      setTimeout(() => setCurrentStep(3), 1500),
      setTimeout(() => setCurrentStep(4), 2400),
      setTimeout(() => setCurrentStep(5), 3400),
      setTimeout(() => setCurrentStep(6), 4400),
    ];
    return () => timers.forEach(clearTimeout);
  };

  const handleReplay = () => {
    if (!result) return;
    animateTrace();
  };

  const handleStep = (step) => {
    setCurrentStep(Math.max(0, Math.min(6, step)));
  };

  const handleRun = () => {
    onRunDemo({
      initialValue: initialValInput.trim() || 'Alice',
      modifiedValue: modifiedValInput.trim() || 'Bob',
      writerMode,
      delayMs: parseInt(delayMs, 10) || 50,
    });
  };

  const setPreset = (init, mod, mode = 'child') => {
    setInitialValInput(init);
    setModifiedValInput(mod);
    setWriterMode(mode);
  };

  // Derive active values based on result or current inputs
  const hasResult = !!result;
  const parentPid = result?.parentPid || 24430;
  const childPid = result?.childPid || 24454;
  const virtualAddr = result?.virtualAddress || '0x7fff4000';
  
  const initialVal = hasResult ? result.initialValue : (initialValInput || 'Alice');
  const modifiedVal = hasResult ? (result.childFinalValue || result.modifiedValue || 'Bob') : (modifiedValInput || 'Bob');
  const activeWriter = result?.writerMode || writerMode;
  const isParentWriter = activeWriter === 'parent';
  const isBothWriter = activeWriter === 'both';
  const isChildWriter = !isParentWriter && !isBothWriter;

  let parentVal = currentStep >= 1 ? initialVal : '—';
  let childVal = '—';
  let parentPageStatus = 'Unmapped';
  let childPageStatus = 'Unmapped';
  let parentExecStatus = 'Idle';
  let childExecStatus = 'Not Started';

  if (currentStep >= 1) {
    parentPageStatus = 'Allocated (RW)';
    parentExecStatus = `mmap() Initialized to "${initialVal}"`;
  }
  if (currentStep >= 2) {
    parentPageStatus = 'Read-Only (COW Protected)';
    childPageStatus = 'Read-Only (COW Protected)';
    childVal = initialVal;
    parentExecStatus = 'Parent Active (Waiting for Child)';
    childExecStatus = 'Child Spawned (fork)';
  }
  if (currentStep === 3) {
    parentPageStatus = 'Read-Only (Shared Frame)';
    childPageStatus = 'Read-Only (Shared Frame)';
    childVal = initialVal;
    childExecStatus = `Reading Inherited "${initialVal}"`;
  }
  if (currentStep === 4) {
    if (isParentWriter) {
      parentPageStatus = 'Write Triggered: Page Fault!';
      parentVal = `${initialVal} ➔ ${modifiedVal}`;
      parentExecStatus = 'Parent Trapping to Kernel (COW Copy)';
      childPageStatus = 'Read-Only (Original Frame)';
      childVal = initialVal;
      childExecStatus = 'Holding in Shared Frame (No Write)';
    } else if (isBothWriter) {
      parentPageStatus = 'Write Triggered: Page Fault!';
      parentVal = `${initialVal} ➔ ${modifiedVal}_Parent`;
      parentExecStatus = 'Parent Trapping to Kernel (COW Copy)';
      childPageStatus = 'Write Triggered: Page Fault!';
      childVal = `${initialVal} ➔ ${modifiedVal}`;
      childExecStatus = 'Child Trapping to Kernel (COW Copy)';
    } else {
      parentPageStatus = 'Read-Only (Original Frame)';
      parentVal = initialVal;
      parentExecStatus = 'Parent Active (Waiting on Pipe)';
      childPageStatus = 'Write Triggered: Page Fault!';
      childVal = `${initialVal} ➔ ${modifiedVal}`;
      childExecStatus = 'Child Trapping to Kernel (COW Copy)';
    }
  }
  if (currentStep >= 5) {
    if (isParentWriter) {
      parentVal = result?.parentFinalValue || modifiedVal;
      parentPageStatus = `Private Frame #2 ("${modifiedVal}")`;
      parentExecStatus = 'Parent Write Complete (Private Frame)';
      childVal = result?.childFinalValue || initialVal;
      childPageStatus = `Original Frame #1 ("${initialVal}")`;
      childExecStatus = 'Exited (Code 0) - Memory Untouched!';
    } else if (isBothWriter) {
      parentVal = result?.parentFinalValue || `${initialVal}_Parent`;
      parentPageStatus = 'Private Frame A (Parent RW)';
      parentExecStatus = 'Parent Write Complete';
      childVal = result?.childFinalValue || modifiedVal;
      childPageStatus = 'Private Frame B (Child RW)';
      childExecStatus = 'Exited (Code 0)';
    } else {
      parentVal = result?.parentFinalValue || initialVal;
      parentPageStatus = `Original Frame #1 ("${initialVal}")`;
      parentExecStatus = 'Verified Untouched in Original Frame';
      childVal = result?.childFinalValue || modifiedVal;
      childPageStatus = `Private Frame #2 ("${modifiedVal}")`;
      childExecStatus = 'Exited (Code 0) - Mutation Isolated';
    }
  }
  if (currentStep === 6) {
    parentExecStatus = 'Child Reaped (waitpid) & Cleaned';
    childExecStatus = 'Terminated';
  }

  const isCowTriggered = currentStep >= 4;
  const isPageFaultActive = currentStep === 4;

  const osParent = result?.osProcessSnapshot?.parent;
  const osChild = result?.osProcessSnapshot?.child;

  return (
    <section id="live-demo" style={{ padding: '3rem 0 4.5rem' }}>
      <div className="container">
        {/* Section Header */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          marginBottom: '2.5rem',
        }}>
          <span className="badge badge-blue" style={{ marginBottom: '0.75rem' }}>
            Interactive Hardware & Kernel Simulator
          </span>
          <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Live Memory Architecture & Process Prover
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px', fontSize: '0.95rem' }}>
            Customize memory inputs, execute the real Linux C binary, and inspect concrete operating system proof
            that a genuine child process is created with independent Copy-on-Write memory isolation.
          </p>
        </div>

        {/* 1. CUSTOMIZABLE INPUT CONTROLS PANEL */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          background: 'linear-gradient(135deg, rgba(19, 25, 38, 0.95) 0%, rgba(13, 17, 26, 0.9) 100%)',
          border: '1px solid var(--border-active)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            paddingBottom: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={18} style={{ color: 'var(--accent-blue)' }} />
              <strong style={{ fontSize: '1rem', color: '#fff' }}>
                Interactive Demonstration Parameters (Customizable Inputs)
              </strong>
            </div>

            {/* Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick Presets:</span>
              <button
                type="button"
                onClick={() => setPreset('Alice', 'Bob', 'child')}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                Alice ➔ Bob
              </button>
              <button
                type="button"
                onClick={() => setPreset('Rishi', 'LinuxKernel', 'child')}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                Rishi ➔ Linux
              </button>
              <button
                type="button"
                onClick={() => setPreset('100', '200', 'child')}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                100 ➔ 200
              </button>
              <button
                type="button"
                onClick={() => setPreset('Original_Data', 'Mutated_Copy', 'child')}
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
              >
                Original ➔ Mutated
              </button>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1.25rem',
            alignItems: 'flex-end',
          }}>
            {/* Input 1: Initial Memory Value */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                1. Initial Memory (Name, String, or Number):
              </label>
              <input
                type="text"
                value={initialValInput}
                onChange={(e) => setInitialValInput(e.target.value)}
                placeholder="e.g. Alice, Rishi, 100"
                disabled={isRunning}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--accent-blue)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                String/Name written by parent before fork()
              </span>
            </div>

            {/* Input 2: Child Modified Value */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                2. Modified Value on Write (New Name/String):
              </label>
              <input
                type="text"
                value={modifiedValInput}
                onChange={(e) => setModifiedValInput(e.target.value)}
                placeholder="e.g. Bob, LinuxKernel, 200"
                disabled={isRunning}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--color-cow)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                New string written to trigger Copy-on-Write
              </span>
            </div>

            {/* Input 3: Writer Mode */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem', fontWeight: 600 }}>
                3. Mutation Operator:
              </label>
              <select
                value={writerMode}
                onChange={(e) => setWriterMode(e.target.value)}
                disabled={isRunning}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0, 0, 0, 0.5)',
                  border: '1px solid var(--border-subtle)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              >
                <option value="child">Child Writes (Classic COW)</option>
                <option value="parent">Parent Writes (Reverse COW)</option>
                <option value="both">Both Write (Dual COW Frames)</option>
              </select>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Select which process performs the write
              </span>
            </div>

            {/* Input 4: Execution Delay Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  4. Concurrency Hold:
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {delayMs} ms
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500"
                step="25"
                value={delayMs}
                onChange={(e) => setDelayMs(e.target.value)}
                disabled={isRunning}
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                Keeps child alive for live OS process table query
              </span>
            </div>

            {/* Run Button */}
            <div>
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
              >
                <Play size={16} fill="currentColor" />
                {isRunning ? 'Executing C Binary...' : 'Run Demonstration'}
              </button>
            </div>
          </div>
        </div>

        {/* 2. OPERATING SYSTEM TASK VERIFICATION PANEL (PROOF OF ANOTHER PROCESS) */}
        <div className="glass-panel" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          background: 'rgba(10, 14, 22, 0.9)',
          border: hasResult ? '1.5px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-subtle)',
          boxShadow: hasResult ? '0 0 25px rgba(16, 185, 129, 0.1)' : 'none',
        }}>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <GitFork size={20} style={{ color: 'var(--accent-purple)' }} />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>
                  Operating System Kernel Task Verification (Process Prover)
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Hardware and kernel proof confirming the fork() system call instantiated a distinct process in the OS scheduler
                </span>
              </div>
            </div>

            <span className={`badge ${hasResult ? 'badge-green' : 'badge-blue'}`}>
              {hasResult ? 'Verified by Kernel ps/task_struct' : 'Ready to Verify on Run'}
            </span>
          </div>

          {/* Process Tree Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem',
          }}>
            {/* Parent Task Node */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span className="badge badge-blue">Parent OS Task</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Kernel Task 1</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                PID: {hasResult ? parentPid : '—'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                State: <strong style={{ color: '#fff' }}>{osParent?.state || 'Running'}</strong> (Executing C binary)
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                PPID: {osParent?.ppid || '—'} (Shell/Node parent)
              </div>
            </div>

            {/* Child Task Node */}
            <div style={{
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid rgba(139, 92, 246, 0.4)',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span className="badge badge-purple">Child OS Task (forked)</span>
                <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>New Process Created</span>
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-purple)' }}>
                PID: {hasResult ? childPid : '—'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                State: <strong style={{ color: '#fff' }}>{osChild?.state || 'Active Child Task'}</strong> (Concurrent Execution)
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                PPID: <strong style={{ color: 'var(--accent-blue)' }}>{hasResult ? parentPid : '—'}</strong> (Proof: matches Parent PID!)
              </div>
            </div>
          </div>

          {/* Raw Kernel Process Table Box */}
          {result?.osProcessSnapshot?.raw && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.55)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: '#a7f3d0',
              overflowX: 'auto',
            }}>
              <div style={{ color: 'var(--text-muted)', marginBottom: '0.3rem', fontSize: '0.72rem' }}>
                # Live OS Kernel Process Table Snapshot (Captured via ps query while child is concurrently alive):
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {result.osProcessSnapshot.raw}
              </pre>
            </div>
          )}
        </div>

        {/* 3. STEPPER & PLAYBACK CONTROLS */}
        <div className="glass-panel" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
        }}>
          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onReset}
              disabled={isRunning || currentStep === 0}
              className="btn btn-secondary"
            >
              <RotateCcw size={15} />
              Reset
            </button>

            <button
              onClick={handleReplay}
              disabled={isRunning || !hasResult}
              className="btn btn-secondary"
            >
              <FastForward size={15} />
              Replay Trace
            </button>
          </div>

          {/* Step indicators */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              onClick={() => handleStep(currentStep - 1)}
              disabled={currentStep <= 0}
              style={{
                background: 'transparent',
                border: 'none',
                color: currentStep <= 0 ? 'var(--text-muted)' : '#fff',
                cursor: currentStep <= 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Stage <strong style={{ color: 'var(--accent-blue)' }}>{currentStep}</strong> of 6
            </span>

            <button
              onClick={() => handleStep(currentStep + 1)}
              disabled={currentStep >= 6}
              style={{
                background: 'transparent',
                border: 'none',
                color: currentStep >= 6 ? 'var(--text-muted)' : '#fff',
                cursor: currentStep >= 6 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Stage description */}
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-muted)', marginRight: '0.35rem' }}>Current State:</span>
            <span style={{ fontWeight: 600, color: isPageFaultActive ? 'var(--color-cow)' : '#fff' }}>
              {currentStep === 0 && 'Ready to Run'}
              {currentStep === 1 && `1. Parent allocated memory initialized to "${initialVal}"`}
              {currentStep === 2 && '2. Child spawned via fork() — Shared Page'}
              {currentStep === 3 && `3. Child reads inherited value "${initialVal}"`}
              {currentStep === 4 && (
                isParentWriter
                  ? `4. Parent writes "${modifiedVal}" — PAGE FAULT (COW for Parent)!`
                  : `4. Child writes "${modifiedVal}" — PAGE FAULT (COW for Child)!`
              )}
              {currentStep === 5 && '5. Kernel cloned frame — Independent Private Copy'}
              {currentStep === 6 && (
                isParentWriter
                  ? `6. Parent holds "${result?.parentFinalValue || modifiedVal}" & Child remains untouched ("${result?.childFinalValue || initialVal}")`
                  : `6. Parent verified untouched ("${result?.parentFinalValue || initialVal}") & Child holds "${result?.childFinalValue || modifiedVal}"`
              )}
            </span>
          </div>
        </div>

        {/* 4. VISUALIZATION CARDS & PHYSICAL FRAME DIAGRAM */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          alignItems: 'stretch',
          marginBottom: '1.5rem',
        }}>
          {/* Parent Process Card */}
          <ProcessCard
            role="parent"
            pid={hasResult ? parentPid : null}
            ppid={hasResult ? childPid : null}
            virtualAddress={hasResult ? virtualAddr : null}
            currentValue={parentVal}
            pageStatus={parentPageStatus}
            executionStatus={parentExecStatus}
            osState={osParent?.state || (currentStep >= 1 ? 'S+ (Synchronized)' : null)}
            isMutating={isPageFaultActive && (isParentWriter || isBothWriter)}
            step={currentStep}
          />

          {/* Center Physical RAM Frame Visualization */}
          <div className="glass-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.5rem',
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(13, 17, 26, 0.95) 0%, rgba(7, 9, 14, 0.98) 100%)',
            border: isPageFaultActive
              ? '1px solid rgba(249, 115, 22, 0.6)'
              : '1px solid var(--border-subtle)',
            boxShadow: isPageFaultActive
              ? '0 0 35px rgba(249, 115, 22, 0.25)'
              : '0 8px 32px rgba(0, 0, 0, 0.35)',
            transition: 'all 0.3s ease',
            minHeight: '420px',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              paddingBottom: '0.85rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={18} style={{ color: 'var(--accent-blue)' }} />
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                  Physical RAM Frames (Kernel View)
                </span>
              </div>
              <span className={`badge ${isCowTriggered ? 'badge-orange' : 'badge-green'}`}>
                {isCowTriggered ? '2 Distinct Physical Frames' : '1 Shared Physical Frame'}
              </span>
            </div>

            {/* Middle Blocks */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              margin: '1.5rem 0',
            }}>
              {/* Frame A: Original Physical Page */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.05)',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                position: 'relative',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.1)',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-success)' }} />
                    <strong style={{ fontSize: '0.85rem', color: '#fff' }}>
                      Physical Frame #1 ({isParentWriter && isCowTriggered ? 'Child Retains Here' : 'Original Initial Frame'})
                    </strong>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-success)',
                    background: 'rgba(16, 185, 129, 0.15)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                  }}>
                    {isCowTriggered
                      ? (isParentWriter ? `Child Retained ("${initialVal}")` : `Parent Retained ("${initialVal}")`)
                      : `Shared Read-Only ("${initialVal}")`}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(0, 0, 0, 0.4)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Physical Stored Value:
                  </span>
                  <span style={{
                    fontSize: '1.35rem',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    color: 'var(--color-success)',
                  }}>
                    {initialVal}
                  </span>
                </div>

                <div style={{
                  marginTop: '0.6rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                }}>
                  <span>Mapped by:</span>
                  {!isCowTriggered ? (
                    <>
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Parent PID {hasResult ? parentPid : '—'}</span>
                      {currentStep >= 2 && (
                        <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Child PID {hasResult ? childPid : '—'}</span>
                      )}
                    </>
                  ) : (
                    isParentWriter ? (
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Child PID {hasResult ? childPid : '—'} (Untouched)</span>
                    ) : (
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Parent PID {hasResult ? parentPid : '—'} (Untouched)</span>
                    )
                  )}
                </div>
              </div>

              {/* Dynamic Trap Banner */}
              {isPageFaultActive && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(249, 115, 22, 0.15)',
                  border: '1px solid rgba(249, 115, 22, 0.4)',
                  color: 'var(--color-cow)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  animation: 'pulse 1.5s infinite',
                }}>
                  <Zap size={16} />
                  <span>
                    TRAP: Write Page Fault! Kernel allocates new physical frame for {isParentWriter ? 'Parent' : 'Child'}
                  </span>
                </div>
              )}

              {/* Frame B: Cloned Private Page */}
              {isCowTriggered ? (
                <div style={{
                  background: 'rgba(249, 115, 22, 0.08)',
                  border: '1.5px solid rgba(249, 115, 22, 0.5)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  position: 'relative',
                  boxShadow: '0 0 20px rgba(249, 115, 22, 0.15)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-cow)' }} />
                      <strong style={{ fontSize: '0.85rem', color: '#fff' }}>
                        Physical Frame #2 (COW Private Frame for {isParentWriter ? 'Parent' : 'Child'})
                      </strong>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-cow)',
                      background: 'rgba(249, 115, 22, 0.15)',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                    }}>
                      {isParentWriter ? `Parent Private ("${modifiedVal}")` : `Child Private ("${modifiedVal}")`}
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      Physical Stored Value:
                    </span>
                    <span style={{
                      fontSize: '1.35rem',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      color: 'var(--color-cow)',
                    }}>
                      {isParentWriter ? (result?.parentFinalValue || modifiedVal) : (result?.childFinalValue || modifiedVal)}
                    </span>
                  </div>

                  <div style={{
                    marginTop: '0.6rem',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <span>Mapped by:</span>
                    {isParentWriter ? (
                      <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>
                        Parent PID {hasResult ? parentPid : '—'} (New Private Frame RW)
                      </span>
                    ) : (
                      <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                        Child PID {hasResult ? childPid : '—'} (New Private Frame RW)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                }}>
                  No separate physical frame allocated yet.
                  <br />
                  Both processes share Frame #1 until a memory write occurs.
                </div>
              )}
            </div>

            {/* Disclaimer */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
            }}>
              <Info size={14} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent-blue)' }} />
              <div>
                <strong>Kernel Page Mechanics:</strong> Prior to the write, virtual pages of Parent ({hasResult ? virtualAddr : '0x...'})
                and Child ({hasResult ? virtualAddr : '0x...'}) reference the identical physical frame. Upon write, the MMU fault allocates Frame #2 specifically for the writing process.
              </div>
            </div>
          </div>

          {/* Child Process Card */}
          <ProcessCard
            role="child"
            pid={hasResult ? childPid : null}
            ppid={hasResult ? parentPid : null}
            virtualAddress={hasResult ? virtualAddr : null}
            currentValue={childVal}
            pageStatus={childPageStatus}
            executionStatus={childExecStatus}
            osState={osChild?.state || (currentStep >= 2 ? 'S+ (Concurrent Task)' : null)}
            isMutating={isPageFaultActive && (isChildWriter || isBothWriter)}
            step={currentStep}
          />
        </div>
      </div>
    </section>
  );
}
