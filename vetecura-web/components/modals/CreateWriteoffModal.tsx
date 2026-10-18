"use client";

import React, { useState, useRef } from "react";
import { AlertTriangle, X, ShieldCheck, Upload, ImageIcon, Package, Trash2 } from "lucide-react";
import { Product, RackItem } from "../types";
import { CustomSelect } from "../CustomSelect";

interface CreateWriteoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, photoUrl: string, productId?: string, qty?: number) => void;
  products?: Product[];
  racks?: RackItem[];
}

const DAMAGE_REASONS = [
  { value: "broken_seal", label: "🔴 Box / Seal is Broken", desc: "The box or packaging was torn or opened." },
  { value: "damaged_transit", label: "🚛 Got Damaged During Delivery", desc: "Product was crushed or damaged while arriving." },
  { value: "expired", label: "📅 Expiry Date Has Passed", desc: "Product is past its expiry date." },
  { value: "quality_fail", label: "⚗️ Failed Quality Check", desc: "Product did not pass quality inspection." },
  { value: "water_damage", label: "💧 Wet / Water Damaged", desc: "Product got wet or was stored incorrectly." },
  { value: "theft_suspected", label: "🔒 Missing / Theft Suspected", desc: "Units are missing from the rack without a scan." },
  { value: "wrong_product", label: "❌ Wrong Product Received", desc: "Supplier sent a different product than ordered." },
];

export const CreateWriteoffModal: React.FC<CreateWriteoffModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  products = [],
  racks = [],
}) => {
  const [reason, setReason] = useState("broken_seal");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [qty, setQty] = useState<number>(1);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"upload" | "url">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: `SKU: ${p.sku}`,
  }));

  const selectedProduct = products.find((p) => p.id === (selectedProductId || products[0]?.id)) || products[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPhotoPreview(result);
      setPhotoUrl(`uploaded_local_${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl && !photoPreview) {
      alert("Please upload a photo or paste an image link. A photo is required to protect against theft.");
      return;
    }
    onSubmit(reason, photoPreview || photoUrl, selectedProductId, qty);
  };

  const clearPhoto = () => {
    setPhotoUrl("");
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
      {/* Modal card — uses flex-col so header + scroll-body + footer stack cleanly */}
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 my-6 flex flex-col" style={{ maxHeight: "calc(100vh - 3rem)" }}>

        {/* ── Fixed Header ─────────────────────────────────────── */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Report Damaged / Unusable Stock</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Use this when a product is broken, expired, or cannot be sold anymore.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Scrollable Body ───────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="overflow-y-auto flex-1 px-6 sm:px-8 py-5 space-y-5">

            {/* STEP 1 — Which product? */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                <Package className="w-3.5 h-3.5 text-slate-500" />
                Step 1 — Which product is damaged?
              </p>

              {products.length > 0 ? (
                <CustomSelect
                  value={selectedProductId || (products[0]?.id || "")}
                  onChange={setSelectedProductId}
                  options={productOptions}
                  placeholder="Select product..."
                />
              ) : (
                <input
                  type="text"
                  placeholder="Type the product name or SKU..."
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-red-400 transition-all"
                />
              )}

              {/* Selected product preview + qty */}
              <div className="flex items-center gap-3">
                {selectedProduct && (
                  <div className="flex-1 p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black text-slate-900 truncate">{selectedProduct.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{selectedProduct.sku}</p>
                    </div>
                  </div>
                )}
                <div className="w-28 shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 mb-1">How many to remove?</p>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-black rounded-xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:border-red-400 transition-all text-center"
                  />
                </div>
              </div>
            </div>

            {/* STEP 2 — What is wrong? */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                Step 2 — What is wrong with it?
              </p>
              <div className="grid grid-cols-1 gap-2">
                {DAMAGE_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      reason === r.value
                        ? "border-red-400 bg-red-50"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-red-600 w-4 h-4 shrink-0"
                    />
                    <div>
                      <p className={`text-xs font-black ${reason === r.value ? "text-red-900" : "text-slate-800"}`}>
                        {r.label}
                      </p>
                      <p className={`text-[10px] mt-0.5 ${reason === r.value ? "text-red-700" : "text-slate-400"}`}>
                        {r.desc}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* STEP 3 — Upload photo */}
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                Step 3 — Take a photo of the damaged item
              </p>
              <p className="text-[11px] text-slate-400">
                A photo is required — this prevents false claims and protects everyone.
              </p>

              {/* Upload vs URL toggle */}
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 w-fit text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setUploadMode("upload")}
                  className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${uploadMode === "upload" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
                >
                  📷 Upload Photo
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode("url")}
                  className={`px-4 py-1.5 rounded-xl transition-all cursor-pointer ${uploadMode === "url" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"}`}
                >
                  🔗 Paste Link
                </button>
              </div>

              {uploadMode === "upload" ? (
                <div>
                  {!photoPreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl p-6 cursor-pointer hover:border-red-400 hover:bg-red-50/30 transition-all"
                    >
                      <Upload className="w-7 h-7 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500">Click to upload photo</p>
                      <p className="text-[10px] text-slate-400">JPG, PNG up to 5MB</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Damage proof"
                        className="w-full max-h-36 object-cover rounded-2xl border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-all cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/60 text-white text-[10px] font-bold rounded-b-2xl">
                        ✅ Photo uploaded
                      </div>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                <input
                  type="url"
                  placeholder="Paste image URL — e.g. https://photos.vetecura.com/damage/001.jpg"
                  value={photoUrl}
                  onChange={(e) => {
                    setPhotoUrl(e.target.value);
                    setPhotoPreview(null);
                  }}
                  className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-red-400 transition-all"
                />
              )}
            </div>

            {/* Anti-theft notice */}
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-emerald-900">This item will NOT be deleted immediately.</p>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  It will be moved to the <strong>Damage Hold area</strong> and wait for Manager approval. This protects against accidental or false removal of stock.
                </p>
              </div>
            </div>

          </div>{/* end scrollable body */}

          {/* ── Sticky Footer ─────────────────────────────────────── */}
          <div className="px-6 sm:px-8 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-white rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-black rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-md transition-all cursor-pointer"
            >
              Submit Damage Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
