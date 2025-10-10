'use client';

import { useEffect, useState } from 'react';

/**
 * PerformanceMonitor - Development-only performance monitoring overlay
 *
 * Displays real-time performance metrics in development mode
 */
export default function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    fps: 0,
    memory: { used: 0, total: 0, limit: 0 },
    isVisible: false,
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    // FPS counter
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        // Get memory info if available
        const memory = (performance as any).memory;
        if (memory) {
          setMetrics((prev) => ({
            ...prev,
            fps,
            memory: {
              used: Math.round(memory.usedJSHeapSize / 1048576),
              total: Math.round(memory.totalJSHeapSize / 1048576),
              limit: Math.round(memory.jsHeapSizeLimit / 1048576),
            },
          }));
        } else {
          setMetrics((prev) => ({ ...prev, fps }));
        }

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    animationId = requestAnimationFrame(measureFPS);

    // Keyboard shortcut to toggle visibility (Ctrl+Shift+P)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setMetrics((prev) => ({ ...prev, isVisible: !prev.isVisible }));
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  if (!metrics.isVisible) {
    // Show toggle button when hidden
    return (
      <button
        onClick={() => setMetrics((prev) => ({ ...prev, isVisible: true }))}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          padding: '8px 12px',
          backgroundColor: '#333',
          color: '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 9999,
          opacity: 0.5,
        }}
        title="Show Performance Monitor (Ctrl+Shift+P)"
      >
        Perf
      </button>
    );
  }

  const fpsColor = metrics.fps >= 55 ? '#4CAF50' : metrics.fps >= 30 ? '#FF9800' : '#f44336';
  const memoryPercent = metrics.memory.limit > 0
    ? ((metrics.memory.used / metrics.memory.limit) * 100).toFixed(1)
    : 0;
  const memoryColor = Number(memoryPercent) < 70 ? '#4CAF50' : Number(memoryPercent) < 90 ? '#FF9800' : '#f44336';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        padding: '12px',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: '#fff',
        borderRadius: '8px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '200px',
        border: '1px solid #444',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <strong>Performance Monitor</strong>
        <button
          onClick={() => setMetrics((prev) => ({ ...prev, isVisible: false }))}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            padding: 0,
            fontSize: '14px',
          }}
          title="Hide (Ctrl+Shift+P)"
        >
          ×
        </button>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>FPS:</span>
          <strong style={{ color: fpsColor }}>{metrics.fps}</strong>
        </div>
      </div>

      {metrics.memory.limit > 0 && (
        <>
          <div style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Memory:</span>
              <strong style={{ color: memoryColor }}>
                {metrics.memory.used}MB / {metrics.memory.limit}MB
              </strong>
            </div>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#333',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${memoryPercent}%`,
                  height: '100%',
                  backgroundColor: memoryColor,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: '10px', color: '#888', marginTop: '8px' }}>
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
}
