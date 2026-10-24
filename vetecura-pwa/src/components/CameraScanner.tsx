import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { Zap, CheckCircle2 } from 'lucide-react';

interface CameraScannerProps {
  onScan: (barcodeValue: string) => void;
  onClose: () => void;
  continuousMode: boolean;
  onToggleContinuous: () => void;
  scannedCount: number;
  totalExpected: number;
  lastScannedCode: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({
  onScan,
  onClose,
  continuousMode,
  onToggleContinuous,
  scannedCount,
  totalExpected,
  lastScannedCode,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);

  // Tracking refs for continuous scanning
  const activeControlsRef = useRef<IScannerControls | null>(null);
  const lastScannedTextRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const isSingleLockedRef = useRef<boolean>(false);

  useEffect(() => {
    isSingleLockedRef.current = false;
    const codeReader = new BrowserMultiFormatReader();

    async function startCamera() {
      try {
        if (!videoRef.current) return;

        if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          if (typeof window !== 'undefined' && !window.isSecureContext) {
            setErrorMsg(
              'ब्राऊझर सुरक्षेमुळे साध्या HTTP वर कॅमेरा ब्लॉक असतो. कॅमेरा चालवण्यासाठी HTTPS (SSL) आवश्यक आहे, किंवा चाचणीसाठी Chrome मध्ये chrome://flags सक्षम करा. (किंवा USB/Bluetooth बारकोड गन वापरा).'
            );
          } else {
            setErrorMsg('कॅमेरा डिव्हाइस सापडले नाही किंवा कॅमेरा परवाणगी नाकारली आहे.');
          }
          return;
        }

        activeControlsRef.current = await codeReader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result, _err) => {
            if (result) {
              const text = result.getText()?.trim();
              if (!text) return;

              const now = Date.now();

              if (continuousMode) {
                // Continuous Auto-Scan Mode:
                // Ignore if it's the exact same code scanned within 1200ms
                if (lastScannedTextRef.current === text && now - lastScannedTimeRef.current < 1200) {
                  return;
                }

                lastScannedTextRef.current = text;
                lastScannedTimeRef.current = now;

                // Visual flash on viewfinder
                setScanFlash(true);
                setTimeout(() => setScanFlash(false), 250);

                onScan(text);
              } else {
                // Single-Scan Mode: Stop camera on first scan
                if (!isSingleLockedRef.current) {
                  isSingleLockedRef.current = true;
                  if (activeControlsRef.current) {
                    activeControlsRef.current.stop();
                    activeControlsRef.current = null;
                  }
                  onScan(text);
                }
              }
            }
          }
        );

        // Check torch support
        try {
          const stream = videoRef.current.srcObject as MediaStream;
          const track = stream?.getVideoTracks()[0];
          const capabilities = (track as any)?.getCapabilities?.();
          if (capabilities?.torch) {
            setHasTorch(true);
          }
        } catch (e) {
          // ignore
        }
      } catch (err: any) {
        console.error('Camera initialization failed:', err);
        setErrorMsg(err.message || 'Camera access denied or unavailable.');
      }
    }

    startCamera();

    return () => {
      isSingleLockedRef.current = true;
      if (activeControlsRef.current) {
        activeControlsRef.current.stop();
        activeControlsRef.current = null;
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [continuousMode, onScan]);

  const toggleTorch = async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      }
    } catch (e) {
      console.warn('Torch toggle not supported', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md rounded-3xl overflow-hidden border border-white/20 bg-slate-950 shadow-2xl">
        {/* Top Viewfinder HUD */}
        <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded-full">
              {scannedCount} / {totalExpected}
            </span>
            <span className="text-[11px] font-bold text-slate-300">
              {continuousMode ? '⚡ Continuous Auto-Scan' : 'Single Scan'}
            </span>
          </div>

          <button
            onClick={onToggleContinuous}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
              continuousMode
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Auto Mode {continuousMode ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {errorMsg ? (
          <div className="p-8 text-center text-rose-400">
            <p className="font-bold text-base">Camera Error</p>
            <p className="text-xs mt-2 text-slate-400">{errorMsg}</p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 rounded-full bg-slate-800 text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-[380px] object-cover"
              playsInline
              muted
            />

            {/* Visual Scan Flash Overlay */}
            {scanFlash && (
              <div className="absolute inset-0 bg-emerald-500/40 z-10 pointer-events-none transition-opacity duration-150 flex items-center justify-center">
                <div className="bg-slate-900/90 text-emerald-400 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 shadow-xl">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Scanned!</span>
                </div>
              </div>
            )}

            {/* Viewfinder Target Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-48 border-2 border-dashed border-emerald-400/90 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] flex items-center justify-center">
                <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
              </div>
            </div>

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center items-center gap-3 px-4">
              {hasTorch && (
                <button
                  onClick={toggleTorch}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    isTorchOn ? 'bg-amber-400 text-slate-950' : 'bg-black/60 text-white border border-white/20'
                  }`}
                >
                  {isTorchOn ? '⚡ Torch ON' : '💡 Torch'}
                </button>
              )}

              <button
                onClick={onClose}
                className="px-6 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-extrabold backdrop-blur-md transition-all cursor-pointer"
              >
                Done Scanning
              </button>
            </div>
          </div>
        )}

        {/* Live Feedback Footer on Camera */}
        <div className="p-3 bg-slate-900 text-center border-t border-slate-800">
          <p className="text-[11px] font-bold text-slate-400 truncate">
            Last: <span className="font-mono text-emerald-400">{lastScannedCode || 'Point at barcode'}</span>
          </p>
        </div>
      </div>

      <p className="mt-3 text-slate-400 text-xs font-medium text-center">
        {continuousMode
          ? '⚡ High-Speed Continuous Mode: Hold camera over consecutive barcodes'
          : 'Center the Code 128 / QR label in the box'}
      </p>
    </div>
  );
};
