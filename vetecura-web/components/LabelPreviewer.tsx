"use client";

import { useState } from "react";

interface Preset {
  code: string;
  name: string;
  dimensions: string;
  symbology: "QR" | "CODE128";
  defaultText: string;
  zplTemplate: string;
}

const PRESETS: Preset[] = [
  {
    code: "SM-25x15",
    name: "Item Small QR (25mm x 15mm)",
    dimensions: "25mm × 15mm",
    symbology: "QR",
    defaultText: "VET-VD2207-000342",
    zplTemplate: "^XA\n^FO20,20^BQN,2,4^FDMM,VET-VD2207-000342^FS\n^FO100,30^A0N,20,20^FDVD2207^FS\n^XZ",
  },
  {
    code: "MD-40x20",
    name: "Item Barcode Code128 (40mm x 20mm)",
    dimensions: "40mm × 20mm",
    symbology: "CODE128",
    defaultText: "VET-SKU-VD2207",
    zplTemplate: "^XA\n^FO30,20^BCN,50,Y,N,N^FDVET-SKU-VD2207^FS\n^FO30,80^A0N,22,22^FDVit D3 Softgels^FS\n^XZ",
  },
  {
    code: "MD-50x30",
    name: "Batch Expiry Label (50mm x 30mm)",
    dimensions: "50mm × 30mm",
    symbology: "QR",
    defaultText: "BATCH-RAB-202607-091",
    zplTemplate: "^XA\n^FO20,20^BQN,2,5^FDMM,BATCH-RAB-202607-091^FS\n^FO120,25^A0N,24,24^FDRabies Vaccine^FS\n^FO120,55^A0N,20,20^FDEXP: 2027-12-31^FS\n^XZ",
  },
  {
    code: "LG-70x40",
    name: "Warehouse Rack Label (70mm x 40mm)",
    dimensions: "70mm × 40mm",
    symbology: "QR",
    defaultText: "RACK-A01-FRONT",
    zplTemplate: "^XA\n^FO30,30^BQN,2,7^FDMM,RACK-A01-FRONT^FS\n^FO180,40^A0N,40,40^FDRACK A-01^FS\n^FO180,90^A0N,24,24^FDHigh Velocity^FS\n^XZ",
  },
];

export default function LabelPreviewer() {
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const [barcodeVal, setBarcodeVal] = useState(selectedPreset.defaultText);
  const [selectedPrinter, setSelectedPrinter] = useState("GRN Desk Zebra GK420 (ZPL)");
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const handlePresetChange = (preset: Preset) => {
    setSelectedPreset(preset);
    setBarcodeVal(preset.defaultText);
  };

  const handleSimulatePrint = () => {
    setPrintStatus("Queuing print job to Redis...");
    setTimeout(() => {
      setPrintStatus(`✅ Print Job Sent to ${selectedPrinter} (Status: printed)`);
      setTimeout(() => setPrintStatus(null), 4000);
    }, 1000);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900">Live Thermal Barcode Label Generator & ZPL Preview</h2>
          <p className="text-xs text-slate-400">Template-driven ZPL / ESC-POS printer driver engine with real-time barcode canvas.</p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
          Zebra ZPL II Supported
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Controls & Presets */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Label Template Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.code}
                  onClick={() => handlePresetChange(preset)}
                  className={`p-3 text-left rounded-2xl border transition-all ${
                    selectedPreset.code === preset.code
                      ? "border-[#052620] bg-emerald-50/60 font-bold text-[#052620] shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <p className="text-xs font-extrabold">{preset.code}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{preset.dimensions}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Barcode / Label Data Value</label>
            <input
              type="text"
              value={barcodeVal}
              onChange={(e) => setBarcodeVal(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-slate-50 outline-none focus:border-[#052620]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Target Registered Printer</label>
            <select
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 outline-none"
            >
              <option>GRN Desk Zebra GK420 (ZPL - Network 192.168.1.102)</option>
              <option>Dispatch Bay TVS Thermal (ESC/POS - USB)</option>
              <option>Rack Setup Mobile Printer (Bluetooth)</option>
            </select>
          </div>

          <button
            onClick={handleSimulatePrint}
            className="w-full py-3 bg-[#052620] hover:bg-[#083a31] text-white text-xs font-black rounded-2xl shadow-md transition-all"
          >
            🖨️ Send Print Job to {selectedPreset.code}
          </button>

          {printStatus && (
            <div className="p-3 text-xs font-bold rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse">
              {printStatus}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Visual Render & Generated ZPL */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400">Visual Label Print Mockup</span>
              <span className="text-[10px] text-slate-400">{selectedPreset.dimensions}</span>
            </div>

            {/* Visual Thermal Label Card Mockup */}
            <div className="bg-white text-slate-900 p-4 rounded-xl border border-slate-300 shadow-inner min-h-[140px] flex items-center justify-between font-sans">
              {selectedPreset.symbology === "QR" ? (
                <div className="flex items-center gap-4 w-full">
                  <div className="h-16 w-16 bg-slate-900 p-1.5 rounded-lg flex items-center justify-center text-white shrink-0">
                    {/* Simulated SVG QR Code Grid */}
                    <div className="grid grid-cols-4 gap-0.5 w-full h-full">
                      {[1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1].map((cell, idx) => (
                        <div key={idx} className={cell ? "bg-white" : "bg-slate-900"} />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-black text-slate-900 uppercase truncate">{barcodeVal}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-1">VETECURA IMS</p>
                    <p className="text-[9px] text-emerald-700 font-semibold mt-0.5">203 DPI Thermal Verified</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 w-full text-center">
                  <p className="text-xs font-black tracking-widest uppercase">{barcodeVal}</p>
                  {/* Simulated Code128 Barcode Lines */}
                  <div className="flex justify-center items-center h-10 gap-0.5 w-full bg-slate-100 p-1 rounded">
                    {[2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2, 1, 4, 1].map((w, idx) => (
                      <div key={idx} className="bg-slate-950 h-full" style={{ width: `${w * 2}px` }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-bold text-slate-500">Vetecura SKU Label</p>
                </div>
              )}
            </div>
          </div>

          {/* Raw ZPL Output Box */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Generated ZPL II Raw String</label>
            <pre className="p-3 bg-slate-950 text-emerald-400 text-[10px] font-mono rounded-2xl overflow-x-auto border border-slate-800">
              {selectedPreset.zplTemplate.replace(selectedPreset.defaultText, barcodeVal)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
