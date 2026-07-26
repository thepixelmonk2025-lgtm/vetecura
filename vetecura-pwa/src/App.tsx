import { useState } from 'react';
import './index.css';

export default function App() {
  const [scannedCount, setScannedCount] = useState(342);
  const totalExpected = 500;
  const [isOnline, setIsOnline] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);
  const [flashClass, setFlashClass] = useState('');
  const [lastScanned, setLastScanned] = useState('VET-VD2207-000123');

  const triggerScan = () => {
    // Simulate random scan result (80% success, 20% duplicate/rejected)
    const isSuccess = Math.random() > 0.2;

    if (isSuccess) {
      setFlashClass('flash-success');
      setScannedCount((prev) => Math.min(prev + 1, totalExpected));
      const nextSeq = String(scannedCount + 1).padStart(6, '0');
      setLastScanned(`VET-VD2207-${nextSeq}`);

      if (!isOnline) {
        setQueuedCount((prev) => prev + 1);
      }
    } else {
      setFlashClass('flash-error');
    }

    setTimeout(() => setFlashClass(''), 300);
  };

  const toggleConnection = () => {
    setIsOnline((prev) => !prev);
  };

  return (
    <div className={`pwa-container ${flashClass}`}>
      {/* Header with persistent offline status indicator */}
      <header className="pwa-header">
        <h1 className="pwa-title">Vetecura PWA Scanner</h1>
        <button
          className={`status-badge ${isOnline ? 'online' : 'offline'}`}
          onClick={toggleConnection}
          title="Click to toggle connection state for testing"
        >
          <span>{isOnline ? '🟢 Synced' : `⚠️ Offline (${queuedCount})`}</span>
        </button>
      </header>

      {/* Persistent Progress Indicator */}
      <div className="progress-card">
        <div className="progress-info">
          <span className="progress-label">GRN Stock In Progress</span>
          <span className="progress-count">
            {scannedCount} / {totalExpected}
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${(scannedCount / totalExpected) * 100}%` }}
          ></div>
        </div>
        <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#94a3b8' }}>
          Last item: <span style={{ color: '#f8fafc', fontWeight: 600 }}>{lastScanned}</span>
        </div>
      </div>

      {/* Main Single-Action Scan Target */}
      <main className="scan-area">
        <button className="scan-button" onClick={triggerScan}>
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          <span>TAP TO SCAN</span>
        </button>
        <p style={{ marginTop: '20px', color: '#94a3b8', fontSize: '0.9rem' }}>
          Supports Camera + External USB/Bluetooth Scanner
        </p>
      </main>

      {/* Footer Controls */}
      <footer className="pwa-footer">
        <button className="btn-secondary">Pause Session</button>
        <button className="btn-primary" disabled={scannedCount < totalExpected}>
          Complete GRN
        </button>
      </footer>
    </div>
  );
}
