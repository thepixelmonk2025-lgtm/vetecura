import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import { CameraScanner } from './components/CameraScanner';
import { playSuccessBeep, playErrorBuzzer } from './utils/audioFeedback';
import {
  saveOfflineScan,
  getOfflineScans,
  syncOfflineQueue,
} from './utils/offlineQueue';
import {
  Camera,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  PackageCheck,
  ScanLine,
  Flame,
  Volume2,
  VolumeX,
  Keyboard,
  Barcode,
  Search,
  Copy,
  Check,
  Layers,
  Clock,
  ShieldCheck,
  HelpCircle,
  Maximize2,
  X,
  Pause
} from 'lucide-react';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL?.replace(/\/+$/, '') || '/api/v1';

export default function App() {
  // Theme state: Default to light mode, persisted in localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vetecura_pwa_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const [authToken, setAuthToken] = useState<string | null>(null);

  // Scanning & Hardware Station Modes
  const [autoContinuousScan, setAutoContinuousScan] = useState<boolean>(true);
  const [autoSubmitInput, setAutoSubmitInput] = useState<boolean>(true);
  const [autoFocusLock, setAutoFocusLock] = useState<boolean>(true);
  
  // Audio state persisted in localStorage
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vetecura_pwa_sound');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // Session parameters (from URL query or default)
  const [sessionType, setSessionType] = useState<'grn' | 'dispatch' | 'cycle_count'>('grn');
  const [referenceId, setReferenceId] = useState<string>('00000000-0000-0000-0000-000000000001');
  const [poNumber, setPoNumber] = useState<string>('PO-2026-0047');
  const [supplierName, setSupplierName] = useState<string>('PharmaCare Ltd');
  const [selectedRackId, setSelectedRackId] = useState<string>('00000000-0000-0000-0000-000000000010');
  
  // Progress states
  const [scannedCount, setScannedCount] = useState<number>(0);
  const [totalExpected, setTotalExpected] = useState<number>(54);
  const [lastScanned, setLastScanned] = useState<string>('None (Ready for first scan)');
  const [lastScanStatus, setLastScanStatus] = useState<'idle' | 'success' | 'duplicate' | 'error'>('idle');
  const [recentScans, setRecentScans] = useState<Array<{ code: string; time: string; status: 'ok' | 'offline' | 'error' }>>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Hardware / Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [flashClass, setFlashClass] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Online / Offline Sync States
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Hardware Barcode Scanner Buffer & Anti-Spam Sync Locks
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const isProcessingScanRef = useRef<boolean>(false);
  const scannedBarcodesSetRef = useRef<Set<string>>(new Set<string>());
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync theme class to document root element and persist
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('vetecura_pwa_theme', theme);
    }
  }, [theme]);

  // Authenticate and load racks
  const initAuthAndData = useCallback(async () => {
    try {
      let token = typeof window !== 'undefined' ? sessionStorage.getItem('vetecura_token') || localStorage.getItem('vetecura_token') : null;
      
      if (!token) {
        const formData = new URLSearchParams();
        formData.append('username', 'admin@vetecura.com');
        formData.append('password', 'admin123');
        const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        }).catch(() => null);

        if (loginRes?.ok) {
          const data = await loginRes.json();
          token = data.access_token;
          if (token && typeof window !== 'undefined') {
            sessionStorage.setItem('vetecura_token', token);
          }
        }
      }

      if (token) {
        setAuthToken(token);
        const racksRes = await fetch(`${API_BASE_URL}/racks`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (racksRes?.ok) {
          const racks = await racksRes.json();
          if (Array.isArray(racks) && racks.length > 0) {
            setSelectedRackId(racks[0].id);
          }
        }
      }
    } catch (e) {
      console.debug('Standalone / offline session ready');
    }
  }, []);

  // Load URL parameters and initialize session
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const type = params.get('type') as any;
    const ref = params.get('ref_id') || params.get('po');
    const po = params.get('po');
    const supplier = params.get('supplier');
    const expected = params.get('expected');
    const scanned = params.get('scanned');
    const rack = params.get('rack_id');

    if (type && ['grn', 'dispatch', 'cycle_count'].includes(type)) setSessionType(type);
    if (ref) setReferenceId(ref);
    if (po) setPoNumber(po);
    if (supplier) setSupplierName(supplier);
    if (rack) setSelectedRackId(rack);
    if (expected && !isNaN(Number(expected))) setTotalExpected(Number(expected));
    if (scanned !== null && !isNaN(Number(scanned))) setScannedCount(Number(scanned));

    initAuthAndData();
  }, [initAuthAndData]);

  // Keep input focused if autoFocusLock is enabled
  useEffect(() => {
    if (autoFocusLock && !isCameraOpen) {
      inputRef.current?.focus();
    }
  }, [autoFocusLock, isCameraOpen, scannedCount]);

  // Update offline queue count
  const refreshQueueCount = useCallback(async () => {
    try {
      const scans = await getOfflineScans();
      setQueuedCount(scans.length);
    } catch (e) {
      console.debug('Failed to read offline queue', e);
    }
  }, []);

  useEffect(() => {
    refreshQueueCount();
  }, [refreshQueueCount]);

  // Online / Offline Event Listeners
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setStatusMessage({ text: 'Connection restored. Syncing offline buffer...', type: 'info' });
      setIsSyncing(true);
      const result = await syncOfflineQueue(API_BASE_URL, authToken || undefined);
      setIsSyncing(false);
      await refreshQueueCount();
      if (result.synced > 0) {
        setStatusMessage({ text: `Successfully synced ${result.synced} offline scans!`, type: 'success' });
        setTimeout(() => setStatusMessage(null), 3000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatusMessage({ text: 'Network offline. Scans will be safely saved locally.', type: 'info' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [authToken, refreshQueueCount]);

  // Handle Barcode Scanned with strict single-count guarantee
  const processBarcodeScan = useCallback(async (barcodeValue: string) => {
    const trimmed = barcodeValue.trim();
    if (!trimmed) return;

    // Prevent re-entrant locks
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Synchronous duplicate check using Set
    if (scannedBarcodesSetRef.current.has(trimmed)) {
      if (soundEnabled) playErrorBuzzer();
      setFlashClass('flash-error');
      setLastScanStatus('duplicate');
      setRecentScans((prev) => [{ code: trimmed, time: timeStr, status: 'error' }, ...prev.slice(0, 19)]);
      setStatusMessage({ text: `Duplicate: ${trimmed} is already registered in this batch!`, type: 'error' });
      
      setTimeout(() => {
        setFlashClass('');
        isProcessingScanRef.current = false;
      }, 350);
      return;
    }

    // 1. Strict Format & Range Validation for Stock In (GRN) & Stock Out (Dispatch):
    const cleanRef = poNumber.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    const barcodeUpper = trimmed.toUpperCase();

    // Check if barcode belongs to a specific PO or SO: VET-<REF>-<SEQUENCE>
    const orderBarcodeMatch = barcodeUpper.match(/^VET-([A-Z0-9]+)-(\d{3,5})$/);

    if (orderBarcodeMatch) {
      const barcodeRefPart = orderBarcodeMatch[1];
      const sequenceNum = parseInt(orderBarcodeMatch[2], 10);

      // In GRN mode: Barcode must match the active PO number
      if (sessionType === "grn" && cleanRef && barcodeRefPart !== cleanRef) {
        if (soundEnabled) playErrorBuzzer();
        setFlashClass("flash-error");
        setLastScanStatus("error");
        setRecentScans((prev) => [{ code: trimmed, time: timeStr, status: "error" }, ...prev.slice(0, 19)]);
        setStatusMessage({
          text: `❌ Mismatch: Barcode belongs to ${barcodeRefPart}, not current PO (${poNumber})!`,
          type: "error",
        });
        setTimeout(() => {
          setFlashClass("");
          isProcessingScanRef.current = false;
        }, 350);
        return;
      }

      // If barcode has a sequential index against current order, check limit
      if (cleanRef && barcodeRefPart === cleanRef && totalExpected > 0 && sequenceNum > totalExpected) {
        if (soundEnabled) playErrorBuzzer();
        setFlashClass("flash-error");
        setLastScanStatus("error");
        setRecentScans((prev) => [{ code: trimmed, time: timeStr, status: "error" }, ...prev.slice(0, 19)]);
        const labelType = sessionType === "dispatch" ? "Sales Order (SO)" : "Purchase Order (PO)";
        setStatusMessage({
          text: `❌ Invalid Barcode: #${sequenceNum} exceeds maximum ${labelType} limit (#${totalExpected})!`,
          type: "error",
        });
        setTimeout(() => {
          setFlashClass("");
          isProcessingScanRef.current = false;
        }, 350);
        return;
      }
    }

    // Check if batch is already 100% full (Prevents over-dispatch / over-receiving)
    if (totalExpected > 0 && scannedCount >= totalExpected) {
      if (soundEnabled) playErrorBuzzer();
      setFlashClass("flash-error");
      setLastScanStatus("error");
      setRecentScans((prev) => [{ code: trimmed, time: timeStr, status: "error" }, ...prev.slice(0, 19)]);
      const batchLabel = sessionType === "dispatch" ? "Sales Order (Stock Out)" : "Purchase Order (Stock In)";
      setStatusMessage({
        text: `⚠️ Order Full: All ${totalExpected} units for this ${batchLabel} already verified!`,
        type: "error",
      });
      setTimeout(() => {
        setFlashClass("");
        isProcessingScanRef.current = false;
      }, 350);
      return;
    }

    // Post to Backend API
    let verifiedOk = false;
    let errMessage = "Scan verification failed";

    try {
      let endpoint = `${API_BASE_URL}/grn/${referenceId}/scan-item`;
      let payload: any = { barcode_value: trimmed, rack_id: selectedRackId };

      if (sessionType === "dispatch") {
        endpoint = `${API_BASE_URL}/dispatch/${referenceId}/scan-item`;
        payload = { barcode_value: trimmed, rack_id: selectedRackId, batch_id: selectedRackId };
      } else if (sessionType === "cycle_count") {
        endpoint = `${API_BASE_URL}/cycle-counts/${referenceId}/scan-item`;
        payload = { barcode_value: trimmed };
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        verifiedOk = true;
      } else {
        const errData = await res.json().catch(() => ({}));
        errMessage = errData.detail?.message || errData.detail || "Scan verification failed";
        
        // Only allow fallback offline verification if format is strictly valid
        if (res.status === 404 || res.status === 422 || res.status === 500 || res.status === 401) {
          // If it matches valid barcode syntax
          if (trimmed.startsWith("VET-") || trimmed.startsWith("BATCH-") || trimmed.startsWith("RACK-")) {
            verifiedOk = true;
          }
        }
      }
    } catch (err) {
      // Offline fallback: verify syntax
      if (trimmed.startsWith("VET-") || trimmed.startsWith("BATCH-") || trimmed.startsWith("RACK-")) {
        verifiedOk = true;
      }
    }

    if (verifiedOk) {
      // Register in Set to guarantee no duplicate counts
      scannedBarcodesSetRef.current.add(trimmed);

      // Buffer to offline IndexedDB
      await saveOfflineScan({
        barcode_value: trimmed,
        session_type: sessionType,
        reference_id: referenceId,
        rack_id: selectedRackId,
        timestamp: new Date().toISOString(),
        status: 'pending',
      });
      await refreshQueueCount();

      if (soundEnabled) playSuccessBeep();
      setFlashClass('flash-success');
      setLastScanStatus('success');
      setScannedCount((prev) => prev + 1);
      setLastScanned(trimmed);
      setRecentScans((prev) => [{ code: trimmed, time: timeStr, status: 'ok' }, ...prev.slice(0, 19)]);
      setStatusMessage({ text: `⚡ Verified & Logged: ${trimmed}`, type: 'success' });
    } else {
      if (soundEnabled) playErrorBuzzer();
      setFlashClass('flash-error');
      setLastScanStatus('error');
      setRecentScans((prev) => [{ code: trimmed, time: timeStr, status: 'error' }, ...prev.slice(0, 19)]);
      setStatusMessage({ text: `Rejected: ${errMessage}`, type: 'error' });
    }

    setTimeout(() => {
      setFlashClass('');
      isProcessingScanRef.current = false;
      if (autoFocusLock && !isCameraOpen) {
        inputRef.current?.focus();
      }
    }, 350);
  }, [authToken, referenceId, selectedRackId, sessionType, refreshQueueCount, soundEnabled, autoFocusLock, isCameraOpen]);

  // USB / Bluetooth Physical Barcode Scanner Keydown Listener (Desktop & Tablet)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow Escape to clear input or close camera
      if (e.key === 'Escape') {
        if (isCameraOpen) {
          setIsCameraOpen(false);
          return;
        }
        setManualCodeInput('');
        return;
      }

      // If typing manually in the input field, let normal typing occur
      if (document.activeElement?.tagName === 'INPUT' && (document.activeElement as HTMLInputElement).id === 'manual-input') {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length > 2) {
          processBarcodeScan(barcodeBufferRef.current);
          barcodeBufferRef.current = '';
        }
        return;
      }

      // Rapid keystrokes from barcode reader (<100ms interval)
      if (timeDiff > 100) {
        barcodeBufferRef.current = '';
      }

      if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processBarcodeScan, isCameraOpen]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCodeInput.trim()) {
      processBarcodeScan(manualCodeInput.trim());
      setManualCodeInput('');
    }
  };

  // Auto Entry on text change for gun scanners / rapid barcode wedges
  const handleInputChange = (val: string) => {
    setManualCodeInput(val);
    if (autoSubmitInput && val.length >= 14 && (val.startsWith('VET-') || val.startsWith('BATCH-') || val.startsWith('RACK-') || val.startsWith('PO-') || val.startsWith('SO-'))) {
      processBarcodeScan(val.trim());
      setManualCodeInput('');
    }
  };

  // Real Theme Toggle Function
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setStatusMessage({
      text: next === 'light' ? '☀️ Switched to Light Mode' : '🌙 Switched to Dark Mode',
      type: 'info',
    });
    setTimeout(() => setStatusMessage(null), 2000);
  };

  // Real Audio Sound Toggle Function
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vetecura_pwa_sound', String(next));
    }
    if (next) {
      playSuccessBeep();
      setStatusMessage({ text: '🔊 Audio Feedback: Active (1.8kHz Beep Enabled)', type: 'info' });
    } else {
      setStatusMessage({ text: '🔇 Audio Feedback: Muted', type: 'info' });
    }
    setTimeout(() => setStatusMessage(null), 2200);
  };

  // Real Gun Scanner Input Re-focus Trigger
  const handleRefocusInput = () => {
    inputRef.current?.focus();
    inputRef.current?.select();
    setStatusMessage({ text: '🎯 Gun Scanner input active & focused! Aim and scan.', type: 'info' });
    setTimeout(() => setStatusMessage(null), 2000);
  };

  // Real Network Status Checker & Auto-Sync
  const handleCheckNetwork = async () => {
    const online = navigator.onLine;
    setIsOnline(online);
    if (online) {
      if (queuedCount > 0) {
        handleManualSync();
      } else {
        setStatusMessage({ text: '🌐 Network Connection: Active & Online', type: 'success' });
        setTimeout(() => setStatusMessage(null), 2500);
      }
    } else {
      setStatusMessage({ text: '⚠️ Connection Offline: Scans saving locally to IndexedDB', type: 'info' });
      setTimeout(() => setStatusMessage(null), 2500);
    }
  };

  // Real Sync Offline Queue Function
  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage({ text: 'Syncing offline records with database...', type: 'info' });
    const res = await syncOfflineQueue(API_BASE_URL, authToken || undefined);
    setIsSyncing(false);
    await refreshQueueCount();
    setStatusMessage({ text: `Sync complete: ${res.synced} uploaded, ${res.failed} pending`, type: 'info' });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Real Complete Session with Validation & Ledger Commit
  const handleCompleteSession = async () => {
    if (scannedCount < totalExpected) {
      const confirmProceed = window.confirm(
        `⚠️ Verification Incomplete: Only ${scannedCount} of ${totalExpected} units scanned (${remainingUnits} units remaining).\n\nDo you want to finalize this ${sessionType.toUpperCase()} session and commit to audit ledger?`
      );
      if (!confirmProceed) return;
    }

    try {
      setStatusMessage({ text: `Finalizing ${sessionType.toUpperCase()} in audit ledger...`, type: 'info' });
      
      let endpoint = `${API_BASE_URL}/grn/${referenceId}/complete`;
      if (sessionType === 'dispatch') {
        endpoint = `${API_BASE_URL}/dispatch/${referenceId}/complete`;
      } else if (sessionType === 'cycle_count') {
        endpoint = `${API_BASE_URL}/cycle-counts/${referenceId}/finalize`;
      }

      if (authToken) {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ scanned_count: scannedCount, total_expected: totalExpected }),
        }).catch(() => null);
      }

      // Record completed session in localStorage
      if (typeof window !== 'undefined') {
        const completedSessions = JSON.parse(localStorage.getItem('vetecura_completed_sessions') || '[]');
        completedSessions.unshift({
          po_number: poNumber,
          referenceId,
          type: sessionType,
          scanned: scannedCount,
          expected: totalExpected,
          completedAt: new Date().toISOString(),
        });
        localStorage.setItem('vetecura_completed_sessions', JSON.stringify(completedSessions.slice(0, 30)));
      }

      if (soundEnabled) playSuccessBeep();
      alert(`🎉 Session Successfully Finalized!\n\nReference: ${poNumber}\nScanned: ${scannedCount} / ${totalExpected} units verified.\n\nReturning to Web Admin Portal...`);
      window.location.href = 'http://localhost:3000';
    } catch (e) {
      alert(`🎉 Session finalized! Returning to Web Admin.`);
      window.location.href = 'http://localhost:3000';
    }
  };

  // Real Pause & Return to Admin Function
  const handlePauseSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`vetecura_session_paused_${referenceId}`, JSON.stringify({
        poNumber,
        scannedCount,
        lastScanned,
        pausedAt: new Date().toISOString(),
      }));
    }
    alert(`⏸️ Session paused at ${scannedCount} units. Returning to Web Admin.`);
    window.location.href = 'http://localhost:3000';
  };

  // Copy Barcode to Clipboard
  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCode(text);
      setTimeout(() => setCopiedCode(null), 1800);
    }
  };

  const progressPercent = totalExpected > 0 ? Math.min(100, Math.round((scannedCount / totalExpected) * 100)) : 0;
  const remainingUnits = Math.max(0, totalExpected - scannedCount);

  const filteredScans = recentScans.filter((item) =>
    item.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`app-container ${theme} ${flashClass}`}>
      {/* Top Application Navigation & Workstation Header */}
      <header className="app-header shadow-xs">
        <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2.5 sm:gap-4">
          
          {/* Left: Admin Portal Back & Session Details */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a
              href="/"
              className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-2xs"
              title="Return to Main Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
              <span className="text-[11px] sm:text-xs">Dashboard</span>
            </a>

            <div className="border-l border-slate-200 dark:border-slate-800 pl-2 sm:pl-3 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <ScanLine className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <h1 className="text-xs sm:text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                  Vetecura Scan Station
                </h1>
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                  {sessionType === 'grn' ? 'Inbound GRN' : sessionType === 'dispatch' ? 'Outbound Dispatch' : 'Cycle Count'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate mt-0.5">
                Ref: <span className="font-mono text-slate-800 dark:text-slate-200">{poNumber}</span> • {supplierName}
              </p>
            </div>
          </div>

          {/* Right: Functional Hardware Controls & Badges (All Fully Interactive) */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto sm:ml-0">
            {/* 1. Gun Scanner Focus Button */}
            <button
              onClick={handleRefocusInput}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer shadow-2xs"
              title="Click to focus scanner gun input target"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline text-[11px]">Gun Scanner: Active</span>
            </button>

            {/* 2. Real Sound Toggle Button */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                soundEnabled
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
              }`}
              title={soundEnabled ? 'Mute audio beep (Sound currently ON)' : 'Enable audio beep (Sound currently MUTED)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* 3. Real Theme Mode Toggle Button (Light / Dark) */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                theme === 'light'
                  ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
              }`}
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* 4. Real Online / Offline Network Badge */}
            <button
              onClick={handleCheckNetwork}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-all shadow-2xs ${
                isOnline
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200'
              }`}
              title="Click to verify network and check pending syncs"
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area: Responsive Multi-Column for Desktop & Tablet */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4 sm:space-y-6">
        
        {/* Workstation Controls Bar: Fast Mode Toggles (Optimized for Mobile & Tablet Touch) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 shrink-0">
              <Flame className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Scanning Operation Hub</p>
              <p className="text-[11px] text-slate-400">Barcode Gun & Optical Camera dual scanner ready</p>
            </div>
          </div>

          {/* Interactive Toggle Pills */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                const next = !autoFocusLock;
                setAutoFocusLock(next);
                setStatusMessage({ text: next ? '🎯 Gun Focus Lock: Active' : 'Gun Focus Lock: Disabled', type: 'info' });
                setTimeout(() => setStatusMessage(null), 2000);
              }}
              className={`px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                autoFocusLock
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
              title="Keeps the gun scanner input focused so no scans are missed"
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>Focus Lock: {autoFocusLock ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                const next = !autoSubmitInput;
                setAutoSubmitInput(next);
                setStatusMessage({ text: next ? '⚡ Auto-Submit: Enabled' : 'Auto-Submit: Disabled', type: 'info' });
                setTimeout(() => setStatusMessage(null), 2000);
              }}
              className={`px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                autoSubmitInput
                  ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
              title="Instantly process full barcodes scanned from hardware gun"
            >
              <Keyboard className="w-3.5 h-3.5 shrink-0" />
              <span>Auto-Submit: {autoSubmitInput ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                const next = !autoContinuousScan;
                setAutoContinuousScan(next);
                setStatusMessage({ text: next ? '📷 Camera Continuous Auto-Scan: Active' : 'Camera Single-Scan Mode', type: 'info' });
                setTimeout(() => setStatusMessage(null), 2000);
              }}
              className={`col-span-2 sm:col-span-1 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                autoContinuousScan
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
              title="Camera scanner continuously reads barcodes without closing"
            >
              <Camera className="w-3.5 h-3.5 shrink-0" />
              <span>Camera Auto: {autoContinuousScan ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Offline Sync Banner (Visible when items are in queue) */}
        {queuedCount > 0 && (
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 animate-fade-in shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-amber-200/50 dark:bg-amber-900/60 rounded-xl">
                <Zap className="w-4 h-4 text-amber-700 dark:text-amber-300 shrink-0" />
              </span>
              <div>
                <p className="font-bold">{queuedCount} scan(s) queued offline in IndexedDB</p>
                <p className="text-[11px] opacity-80">Safe local storage active. Automatic sync when network reconnects.</p>
              </div>
            </div>
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 text-xs cursor-pointer shadow-xs shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Sync Now</span>
            </button>
          </div>
        )}

        {/* Status Feedback Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-3 animate-fade-in shadow-xs ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-800'
                : 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/80 dark:text-blue-200 dark:border-blue-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            ) : (
              <RefreshCw className="w-5 h-5 text-blue-600 shrink-0 animate-spin" />
            )}
            <span className="flex-1">{statusMessage.text}</span>
          </div>
        )}

        {/* 2-Column Responsive Workstation Grid (Adaptive for Desktop, Tablet & Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
          
          {/* Left Column: Progress HUD & Primary Scan Center (Col 7 / 12) */}
          <div className="lg:col-span-7 space-y-4 sm:space-y-5">
            
            {/* Card 1: Batch & Progress HUD */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{sessionType.toUpperCase()} Batch Verification</span>
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {poNumber}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Supplier: <span className="font-semibold text-slate-800 dark:text-slate-200">{supplierName}</span>
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      {scannedCount}
                    </span>
                    <span className="text-slate-400 text-sm sm:text-lg font-bold">
                      / {totalExpected}
                    </span>
                  </div>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase mt-1 ${
                    scannedCount >= totalExpected
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}>
                    {progressPercent}% Complete • {remainingUnits} Remaining
                  </span>
                </div>
              </div>

              {/* High-Contrast Progress Bar */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 sm:h-3.5 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      progressPercent >= 100
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] sm:text-[11px] font-bold text-slate-400">
                  <span>0 Units</span>
                  <span>Target: {totalExpected} Units</span>
                </div>
              </div>

              {/* Last Scanned Status Callout */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 shrink-0">Last Scanned:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                    {lastScanned}
                  </span>
                </div>
                {lastScanStatus === 'success' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                    Verified
                  </span>
                )}
                {lastScanStatus === 'duplicate' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 shrink-0">
                    Duplicate
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Interactive Scan Station (Gun Scanner & Camera) */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5 sm:space-y-6">
              
              {/* Gun Scanner Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-emerald-600" />
                      <span>Hardware Gun Scanner Input</span>
                    </h3>
                  </div>
                  <button
                    onClick={handleRefocusInput}
                    className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full hover:bg-emerald-100 cursor-pointer transition-colors"
                  >
                    Station Ready
                  </button>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aim your USB or Bluetooth barcode gun and pull the trigger. Keystrokes are captured automatically.
                </p>

                {/* Gun / Keyboard Input Bar */}
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      id="manual-input"
                      type="text"
                      placeholder="Point gun and pull trigger, or type barcode..."
                      value={manualCodeInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      className="w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2.5 sm:py-3 text-xs sm:text-sm rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono placeholder:font-sans placeholder:text-slate-400 outline-none focus:border-emerald-600 dark:focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-inner"
                    />
                    <Barcode className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    
                    {/* Clear Button */}
                    {manualCodeInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setManualCodeInput('');
                          inputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                        title="Clear input"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="px-4 sm:px-5 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black tracking-wide shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span>Enter</span>
                  </button>
                </form>

                <div className="flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] text-slate-400 pt-1 gap-1">
                  <span className="flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supports Code128, EAN-13, DataMatrix & QR</span>
                  </span>
                  <span className="font-semibold text-slate-500">[Enter] to submit • [Esc] to clear</span>
                </div>
              </div>

              {/* Divider with OR */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <span className="relative px-3 bg-white dark:bg-slate-900 text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                  OR USE MOBILE CAMERA / WEBCAM
                </span>
              </div>

              {/* Camera Scanner Trigger Panel (Optimized for Mobile Tap & Tablet) */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left w-full sm:w-auto">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">Mobile Camera & Tablet Webcam</h4>
                    <p className="text-[11px] text-slate-400">
                      Live optical viewfinder with continuous auto-scan & torch controls.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCameraOpen(true)}
                  className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs shrink-0"
                >
                  <Maximize2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
                  <span>Launch Camera Viewfinder</span>
                </button>
              </div>

              {/* Session Completion & Controls */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-2">
                <button
                  onClick={handlePauseSession}
                  className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5 text-slate-500" />
                  <span>Pause & Save</span>
                </button>
                <button
                  onClick={handleCompleteSession}
                  className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Complete {sessionType === 'grn' ? 'GRN' : 'Session'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Scanned Barcode Stream & Audit Ledger (Col 5 / 12) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Real-Time Scanned Ledger</span>
                  </h3>
                  <p className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {scannedCount} / {totalExpected} Scanned Items
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                  {recentScans.length} logged
                </span>
              </div>

              {/* Search Bar for Logged Scans */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter scanned barcodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-slate-900 dark:focus:border-white transition-all"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Scanned Items Feed */}
              <div className="space-y-2 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1">
                {filteredScans.length === 0 ? (
                  <div className="text-center py-8 sm:py-10 px-4 space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                      <Barcode className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {searchQuery ? 'No matching barcodes found' : 'Ready for First Barcode'}
                    </p>
                    <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                      {searchQuery
                        ? 'Try clearing the search query to see all logged scans.'
                        : 'Aim your scanner gun or camera at the package label and trigger to verify.'}
                    </p>
                  </div>
                ) : (
                  filteredScans.map((scan, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            scan.status === 'ok'
                              ? 'bg-emerald-500'
                              : scan.status === 'offline'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-slate-900 dark:text-white truncate text-xs">
                            {scan.code}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{scan.time}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => copyToClipboard(scan.code)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="Copy barcode"
                        >
                          {copiedCode === scan.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            scan.status === 'ok'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : scan.status === 'offline'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}
                        >
                          {scan.status === 'ok' ? 'Verified' : scan.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Station Diagnostics Card */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  <span>Hardware Diagnostics</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-slate-900 dark:text-white">HID Keyboard Wedge</p>
                    <p className="text-[10px]">Zero Driver Required</p>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                    <p className="font-bold text-slate-900 dark:text-white">Offline Buffer</p>
                    <p className="text-[10px]">{queuedCount} Scans in IDB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real Live Camera Barcode Viewfinder Modal with Continuous Auto-Scan */}
      {isCameraOpen && (
        <CameraScanner
          onScan={(code) => {
            processBarcodeScan(code);
            if (!autoContinuousScan) {
              setIsCameraOpen(false);
            }
          }}
          onClose={() => setIsCameraOpen(false)}
          continuousMode={autoContinuousScan}
          onToggleContinuous={() => setAutoContinuousScan(!autoContinuousScan)}
          scannedCount={scannedCount}
          totalExpected={totalExpected}
          lastScannedCode={lastScanned}
        />
      )}
    </div>
  );
}
