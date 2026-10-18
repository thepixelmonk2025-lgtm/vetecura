"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { PurchaseOrderRow, Product } from "./types";
import {
  Printer,
  QrCode,
  Barcode,
  PackagePlus,
  CheckCircle2,
  Settings2,
  FileCode2,
  Download,
  Layers,
  LayoutGrid,
} from "lucide-react";
import { CustomSelect } from "./CustomSelect";

interface Preset {
  code: string;
  name: string;
  dimensions: string;
  width_mm: number;
  height_mm: number;
  symbology: "QR" | "CODE128";
  defaultText: string;
  zplTemplate: string;
}

const PRESETS: Preset[] = [
  {
    code: "Standard (50×30 mm)",
    name: "Standard Sticker (50mm × 30mm)",
    dimensions: "50mm × 30mm (2\" × 1.2\")",
    width_mm: 50,
    height_mm: 30,
    symbology: "QR",
    defaultText: "VET-PO20260041-0001",
    zplTemplate: "^XA\n^PW400\n^LL240\n^FO20,20^BQN,2,4^FDMM,VET-PO20260041-0001^FS\n^FO130,25^A0N,24,24^FDVETECURA IMS^FS\n^FO130,55^A0N,18,18^FDPO-2026-0041^FS\n^FO130,80^A0N,16,16^FDVET-PO20260041-0001^FS\n^XZ",
  },
  {
    code: "Small (40×25 mm)",
    name: "Small Item Sticker (40mm × 25mm)",
    dimensions: "40mm × 25mm",
    width_mm: 40,
    height_mm: 25,
    symbology: "QR",
    defaultText: "VET-PO20260041-0001",
    zplTemplate: "^XA\n^PW320\n^LL200\n^FO15,15^BQN,2,3^FDMM,VET-PO20260041-0001^FS\n^FO100,20^A0N,20,20^FDVETECURA^FS\n^FO100,45^A0N,16,16^FDVET-PO20260041-0001^FS\n^XZ",
  },
  {
    code: "Large (75×50 mm)",
    name: "Big Box / Carton Sticker (75mm × 50mm)",
    dimensions: "75mm × 50mm (3\" × 2\")",
    width_mm: 75,
    height_mm: 50,
    symbology: "QR",
    defaultText: "VET-PO20260041-0001",
    zplTemplate: "^XA\n^PW600\n^LL400\n^FO30,30^BQN,2,6^FDMM,VET-PO20260041-0001^FS\n^FO200,40^A0N,32,32^FDVETECURA IMS^FS\n^FO200,85^A0N,24,24^FDPO-2026-0041^FS\n^FO200,120^A0N,20,20^FDVET-PO20260041-0001^FS\n^XZ",
  },
  {
    code: "Line Barcode (50×25 mm)",
    name: "Classic Barcode Strip (50mm × 25mm)",
    dimensions: "50mm × 25mm (Lines)",
    width_mm: 50,
    height_mm: 25,
    symbology: "CODE128",
    defaultText: "VET-PO20260041-0001",
    zplTemplate: "^XA\n^PW400\n^LL200\n^FO20,20^BCN,60,Y,N,N^FDVET-PO20260041-0001^FS\n^FO20,110^A0N,20,20^FDPharmaCare Laboratories^FS\n^XZ",
  },
];

function generateCode128Bars(text: string): number[] {
  const bars: number[] = [2, 1, 1, 2, 3, 2];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) % 100;
    const w1 = (code % 3) + 1;
    const w2 = ((code + 1) % 4) + 1;
    const w3 = ((code + 2) % 3) + 1;
    const w4 = ((code + 3) % 2) + 1;
    bars.push(w1, w2, w3, w4);
  }
  bars.push(2, 3, 3, 1, 1, 1, 2);
  return bars;
}

interface LabelPreviewerProps {
  poList?: PurchaseOrderRow[];
  products?: Product[];
  targetPoNumber?: string;
  targetSupplier?: string;
  expectedUnits?: number;
}

export default function LabelPreviewer({
  poList = [],
  targetPoNumber,
  targetSupplier,
  expectedUnits,
}: LabelPreviewerProps) {
  const availablePOs: PurchaseOrderRow[] = poList.length > 0 ? poList : [
    { po_number: "PO-2026-0041", supplier: "PharmaCare Laboratories", expected_units: 500, scanned_units: 0, status: "In Progress" },
    { po_number: "PO-2026-0040", supplier: "BioVet Vaccines Inc", expected_units: 777, scanned_units: 777, status: "Completed & Verified" },
    { po_number: "PO-2026-0039", supplier: "Apollo Industrial Tyres", expected_units: 200, scanned_units: 200, status: "Completed & Verified" },
  ];

  const [selectedPoNumber, setSelectedPoNumber] = useState<string>(targetPoNumber || availablePOs[0].po_number);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const [barcodeVal, setBarcodeVal] = useState<string>("");
  const [printLayoutMode, setPrintLayoutMode] = useState<"a4_sheet" | "thermal_roll">("a4_sheet");
  const [printQty, setPrintQty] = useState<number>(24);
  const [previewQrDataUrl, setPreviewQrDataUrl] = useState<string>("");
  const [printStatus, setPrintStatus] = useState<string | null>(null);

  const currentPO = availablePOs.find((p) => p.po_number === selectedPoNumber) || null;

  // Generate preview QR code instantly offline
  useEffect(() => {
    let activeVal = "";
    if (selectedPoNumber === "manual") {
      activeVal = selectedPreset.defaultText;
      setPrintQty(1);
    } else if (currentPO) {
      activeVal = `VET-${currentPO.po_number.replace(/-/g, "")}-0001`;
      // Default to entire PO units if available, or currentPO expected_units
      setPrintQty(currentPO.expected_units || 54);
    } else {
      activeVal = selectedPreset.defaultText;
    }
    setBarcodeVal(activeVal);

    QRCode.toDataURL(activeVal || "VETECURA", { margin: 0, width: 200 })
      .then((url) => setPreviewQrDataUrl(url))
      .catch((err) => console.error("Error generating QR", err));
  }, [selectedPoNumber, currentPO?.po_number]);

  // Generate QR for specific code
  const handleGenerateQr = async (text: string): Promise<string> => {
    try {
      return await QRCode.toDataURL(text, { margin: 0, width: 220 });
    } catch (e) {
      return "";
    }
  };

  const handlePresetChange = (preset: Preset) => {
    setSelectedPreset(preset);
  };

  // 100% RELIABLE OFFLINE NATIVE PRINT ENGINE
  const handleRealPhysicalPrint = async (printAll: boolean = false) => {
    const totalToPrint = printAll ? (currentPO ? currentPO.expected_units : printQty) : printQty;
    const poLabel = selectedPoNumber !== "manual" ? selectedPoNumber : "PO-CUSTOM";
    const supplierLabel = currentPO ? currentPO.supplier : "Vetecura IMS";
    const cleanPrefix = selectedPoNumber !== "manual" ? `VET-${selectedPoNumber.replace(/-/g, "")}` : "VET-UNIT";

    setPrintStatus(`Preparing ${totalToPrint} barcode stickers for printing...`);

    // Generate all QR data URLs offline in parallel
    const labelItems = await Promise.all(
      Array.from({ length: totalToPrint }).map(async (_, idx) => {
        const unitBarcode = `${cleanPrefix}-${String(idx + 1).padStart(4, "0")}`;
        const qrDataUrl = await handleGenerateQr(unitBarcode);
        return {
          unitBarcode,
          qrDataUrl,
          unitIndex: idx + 1,
        };
      })
    );

    const isA4 = printLayoutMode === "a4_sheet";

    const labelsHtml = labelItems.map((item) => `
      <div class="label-box">
        <div class="label-inner">
          <div class="qr-col">
            <img src="${item.qrDataUrl}" alt="QR" class="qr-image" />
          </div>
          <div class="info-col">
            <div class="brand">VETECURA IMS</div>
            <div class="po-num">${poLabel}</div>
            <div class="barcode-num">${item.unitBarcode}</div>
            <div class="footer-meta">
              <span class="supplier">${supplierLabel.slice(0, 16)}</span>
              <span class="index">#${item.unitIndex}/${totalToPrint}</span>
            </div>
          </div>
        </div>
      </div>
    `).join("");

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
      alert("Please allow browser popups to open the sticker print window.");
      return;
    }

    const styles = isA4 ? `
      /* A4 STICKER SHEET (3 Columns x 8 Rows = 24 Labels Per A4 Page) */
      @page {
        size: A4 portrait;
        margin: 8mm 6mm;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: Arial, -apple-system, sans-serif;
        background: #ffffff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print-bar {
        background: #0f172a;
        color: #ffffff;
        padding: 12px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        border-radius: 8px;
      }
      .no-print-bar button {
        background: #059669;
        color: #ffffff;
        font-weight: bold;
        border: none;
        padding: 8px 18px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
      }
      .grid-container {
        display: grid;
        grid-template-columns: repeat(3, 64mm);
        grid-auto-rows: 33mm;
        gap: 2mm 3mm;
        justify-content: center;
        width: 100%;
      }
      .label-box {
        width: 64mm;
        height: 33mm;
        border: 1px dashed #cbd5e1;
        background: #ffffff;
        padding: 2.5mm;
        break-inside: avoid;
        page-break-inside: avoid;
        overflow: hidden;
      }
      .label-inner {
        display: flex;
        align-items: center;
        gap: 3mm;
        height: 100%;
        width: 100%;
      }
      .qr-col {
        width: 25mm;
        height: 25mm;
        flex-shrink: 0;
      }
      .qr-image {
        width: 100%;
        height: 100%;
        display: block;
      }
      .info-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
      }
      .brand {
        font-size: 8pt;
        font-weight: 900;
        color: #0f172a;
        letter-spacing: 0.5px;
      }
      .po-num {
        font-size: 7pt;
        font-weight: 700;
        color: #475569;
      }
      .barcode-num {
        font-size: 7.5pt;
        font-weight: 900;
        font-family: monospace;
        color: #000000;
        background: #f1f5f9;
        padding: 1px 3px;
        border-radius: 2px;
        display: inline-block;
      }
      .footer-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 6.5pt;
        color: #64748b;
        font-weight: bold;
      }
      .index {
        color: #059669;
        font-weight: 900;
      }
      @media print {
        .no-print-bar { display: none !important; }
        .label-box { border: none !important; }
      }
    ` : `
      /* DEDICATED CONTINUOUS THERMAL ROLL PRINTER (Zebra, TSC, TVS, Dymo) */
      @page {
        size: ${selectedPreset.width_mm}mm ${selectedPreset.height_mm}mm;
        margin: 0mm;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${selectedPreset.width_mm}mm;
        background: #ffffff;
        font-family: Arial, -apple-system, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .no-print-bar {
        background: #0f172a;
        color: #ffffff;
        padding: 10px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .no-print-bar button {
        background: #059669;
        color: #ffffff;
        font-weight: bold;
        border: none;
        padding: 6px 14px;
        border-radius: 6px;
        cursor: pointer;
      }
      .grid-container {
        display: block;
        margin: 0;
        padding: 0;
      }
      .label-box {
        width: ${selectedPreset.width_mm}mm;
        height: ${selectedPreset.height_mm}mm;
        max-width: ${selectedPreset.width_mm}mm;
        max-height: ${selectedPreset.height_mm}mm;
        padding: 2mm;
        background: #ffffff;
        break-inside: avoid;
        page-break-inside: avoid;
        page-break-after: always;
        break-after: page;
        overflow: hidden;
        display: flex;
        align-items: center;
      }
      .label-inner {
        display: flex;
        align-items: center;
        gap: 2mm;
        width: 100%;
        height: 100%;
      }
      .qr-col {
        width: ${selectedPreset.height_mm * 0.8}mm;
        height: ${selectedPreset.height_mm * 0.8}mm;
        flex-shrink: 0;
      }
      .qr-image {
        width: 100%;
        height: 100%;
        display: block;
      }
      .info-col {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
      }
      .brand {
        font-size: 7pt;
        font-weight: 900;
        color: #000000;
        line-height: 1;
      }
      .po-num {
        font-size: 6.5pt;
        font-weight: 700;
        color: #333333;
        line-height: 1;
      }
      .barcode-num {
        font-size: 7.5pt;
        font-weight: 900;
        font-family: monospace;
        color: #000000;
        line-height: 1;
      }
      .footer-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 6pt;
        color: #444444;
        font-weight: bold;
        line-height: 1;
      }
      .index {
        color: #059669;
        font-weight: 900;
      }
      @media print {
        .no-print-bar { display: none !important; }
        .label-box { border: none !important; margin: 0 !important; }
      }
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Vetecura Stickers - ${poLabel}</title>
          <style>${styles}</style>
        </head>
        <body>
          <div class="no-print-bar">
            <div>
              <strong>Vetecura Barcode Stickers (${totalToPrint} Stickers)</strong>
              <div style="font-size: 11px; opacity: 0.8;">Format: ${isA4 ? "A4 Sticker Sheet (24 Stickers per Page)" : `${selectedPreset.dimensions} Continuous Roll`}</div>
            </div>
            <button onclick="window.print()">🖨️ Click to Print Stickers</button>
          </div>
          <div class="grid-container">
            ${labelsHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    setPrintStatus(`✅ All ${totalToPrint} stickers ready! Print window opened.`);
  };

  // DOWNLOAD RAW ZPL FILE
  const handleDownloadZPL = () => {
    const totalToPrint = currentPO ? currentPO.expected_units : printQty;
    const cleanPrefix = selectedPoNumber !== "manual" ? `VET-${selectedPoNumber.replace(/-/g, "")}` : "VET-UNIT";

    let zplBatchString = "";
    for (let i = 1; i <= totalToPrint; i++) {
      const code = `${cleanPrefix}-${String(i).padStart(4, "0")}`;
      zplBatchString += `^XA\n^PW${selectedPreset.width_mm * 8}\n^LL${selectedPreset.height_mm * 8}\n^FO20,20^BQN,2,4^FDMM,${code}^FS\n^FO120,20^A0N,22,22^FDVETECURA IMS^FS\n^FO120,50^A0N,18,18^FD${selectedPoNumber}^FS\n^FO120,75^A0N,16,16^FD${code}^FS\n^XZ\n\n`;
    }

    const blob = new Blob([zplBatchString], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selectedPoNumber || "stickers"}_${totalToPrint}units.zpl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setPrintStatus(`📥 Downloaded ${link.download} (Ready for printer)!`);
  };

  const code128Bars = generateCode128Bars(barcodeVal || "VETECURA");

  return (
    <div id="thermal-label-previewer" className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-slate-200/90 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-600" />
            <span>Print Barcode & QR Stickers</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Create and print barcode stickers for your products using normal A4 sticker sheets or roll printers.
          </p>
        </div>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full border border-emerald-200">
          Ready to Print (Works Offline)
        </span>
      </div>

      {/* PO Selector Banner */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1 w-full md:w-auto">
          <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <PackagePlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Select Supplier Order to Print Stickers</span>
          </label>
          <div className="w-full md:max-w-md">
            <CustomSelect
              value={selectedPoNumber}
              onChange={setSelectedPoNumber}
              options={[
                ...availablePOs.map((po) => ({
                  value: po.po_number,
                  label: `${po.po_number} — ${po.supplier}`,
                  sublabel: `${po.expected_units} Items to Receive · [${po.status}]`,
                })),
                {
                  value: "manual",
                  label: "Type Custom Barcode Manually",
                  sublabel: "Enter your own barcode or code",
                },
              ]}
              placeholder="Select Order..."
            />
          </div>
        </div>

        {currentPO && selectedPoNumber !== "manual" && (
          <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs shrink-0 shadow-2xs">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Supplier / Vendor</p>
              <p className="font-bold text-slate-900">{currentPO.supplier}</p>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Items in Order</p>
              <p className="font-black text-emerald-600">{currentPO.expected_units} Items</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Controls & Print Triggers */}
        <div className="space-y-4">
          {/* Target Printer Paper Format */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Choose Paper Type</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPrintLayoutMode("a4_sheet")}
                className={`p-3 text-left rounded-2xl border transition-all ${
                  printLayoutMode === "a4_sheet"
                    ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-950 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-black">A4 Sticker Sheet (Office Printer)</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">24 stickers on 1 normal A4 sheet</p>
              </button>

              <button
                type="button"
                onClick={() => setPrintLayoutMode("thermal_roll")}
                className={`p-3 text-left rounded-2xl border transition-all ${
                  printLayoutMode === "thermal_roll"
                    ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-950 shadow-2xs"
                    : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-black">Barcode Roll Printer</p>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Sticker rolls (Zebra, TVS, TSC)</p>
              </button>
            </div>
          </div>

          {/* Preset Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Sticker Size & Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.code}
                  onClick={() => handlePresetChange(preset)}
                  className={`p-2.5 text-left rounded-2xl border transition-all ${
                    selectedPreset.code === preset.code
                      ? "border-slate-900 bg-slate-900 text-white font-bold shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-extrabold">{preset.code}</p>
                    {preset.symbology === "QR" ? (
                      <QrCode className={`w-3.5 h-3.5 ${selectedPreset.code === preset.code ? "text-emerald-400" : "text-slate-400"}`} />
                    ) : (
                      <Barcode className={`w-3.5 h-3.5 ${selectedPreset.code === preset.code ? "text-emerald-400" : "text-slate-400"}`} />
                    )}
                  </div>
                  <p className={`text-[10px] mt-0.5 ${selectedPreset.code === preset.code ? "text-slate-300" : "text-slate-400"}`}>
                    {preset.dimensions}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Sample Barcode Code / Number
            </label>
            <input
              type="text"
              value={barcodeVal}
              onChange={(e) => setBarcodeVal(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-900"
            />
            <p className="text-[10px] text-slate-400 mt-1">Each printed sticker will automatically have its own unique sequence number.</p>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                How Many Stickers to Print?
              </label>
              {currentPO && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPrintQty(24)}
                    className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 cursor-pointer"
                  >
                    1 Sheet (24 stickers)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintQty(currentPO.expected_units || 54)}
                    className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[10px] font-bold text-emerald-700 cursor-pointer"
                  >
                    Entire Order ({currentPO.expected_units || 54} stickers)
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={5000}
                value={printQty || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setPrintQty(isNaN(val) ? 1 : Math.max(1, val));
                }}
                className="w-full px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-white outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 text-slate-900 shadow-2xs"
              />
              <span className="text-xs font-semibold text-slate-400 shrink-0">Stickers</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              onClick={() => handleRealPhysicalPrint(false)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-md transition-all hover:scale-[1.01]"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>🖨️ Print {printQty} Stickers Now ({printLayoutMode === "a4_sheet" ? "A4 Sheet" : "Sticker Roll"})</span>
            </button>

            {currentPO && currentPO.expected_units > printQty && (
              <button
                onClick={() => handleRealPhysicalPrint(true)}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-all"
              >
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print All {currentPO.expected_units} Stickers for this Order</span>
              </button>
            )}

            <button
              onClick={handleDownloadZPL}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl border border-slate-200 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>📥 Download File for Industrial Printers (.ZPL)</span>
            </button>
          </div>

          {printStatus && (
            <div className="p-3 text-xs font-bold rounded-2xl bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{printStatus}</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Live Visual Render & Generated ZPL */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5" />
                <span>Live Sticker Preview</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{selectedPreset.dimensions}</span>
            </div>

            {/* Visual Thermal Label Card Mockup with Exact Proportion */}
            <div className="bg-white text-slate-900 p-3.5 rounded-xl border border-slate-300 shadow-inner flex items-center justify-between font-sans">
              {selectedPreset.symbology === "QR" ? (
                <div className="flex items-center gap-3 w-full">
                  <div className="h-16 w-16 bg-white p-1 rounded border border-slate-200 shadow-2xs flex items-center justify-center shrink-0">
                    {previewQrDataUrl ? (
                      <img
                        src={previewQrDataUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-[10px] text-slate-400">Loading...</div>
                    )}
                  </div>
                  <div className="flex-1 overflow-hidden space-y-0.5">
                    <p className="text-[10px] font-black text-slate-900 uppercase">VETECURA IMS</p>
                    <p className="text-[9px] font-bold text-slate-500">{selectedPoNumber !== "manual" ? selectedPoNumber : "SAMPLE-ORDER"}</p>
                    <p className="text-[10px] font-black text-slate-900 font-mono truncate">{barcodeVal}</p>
                    <p className="text-[8px] text-emerald-700 font-bold">Verified Inventory Barcode</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 w-full text-center">
                  <p className="text-xs font-black tracking-wider uppercase font-mono">{barcodeVal}</p>
                  <div className="flex justify-center items-center h-10 gap-0.5 w-full bg-white p-1.5 border border-slate-200 rounded">
                    {code128Bars.map((w, idx) => (
                      <div
                        key={idx}
                        className={idx % 2 === 0 ? "bg-black h-full" : "bg-white h-full"}
                        style={{ width: `${w * 1.5}px` }}
                      />
                    ))}
                  </div>
                  <p className="text-[9px] font-bold text-slate-500">Standard Barcode</p>
                </div>
              )}
            </div>
          </div>

          {/* Raw ZPL Output Box */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Industrial Printer Code (Optional)</span>
              </label>
              <span className="text-[10px] text-slate-400">For Zebra & thermal printers only</span>
            </div>
            <p className="text-[11px] text-slate-500">
              You do not need this code for regular printing. It is only needed if your technician configures a direct Zebra print server.
            </p>
            <pre className="p-3 bg-slate-950 text-emerald-400 text-[10px] font-mono rounded-xl overflow-x-auto border border-slate-800 max-h-36">
              {selectedPreset.zplTemplate.replace(selectedPreset.defaultText, barcodeVal)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
