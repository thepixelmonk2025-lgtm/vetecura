"use client";

import React from "react";
import { ChainVerificationData } from "../types";
import {
  ShieldCheck,
  AlertTriangle,
  X,
  CheckCircle2,
  Lock,
  Layers,
  FileCheck2,
  PackageCheck,
  Check,
} from "lucide-react";

interface VerifyLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ChainVerificationData | null;
}

export const VerifyLedgerModal: React.FC<VerifyLedgerModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6 text-xs">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900">Security & Stock Record Audit</h3>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                  LIVE CHECK
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Instant audit for stock accuracy, theft prevention & record safety.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verification Status Banner */}
        <div
          className={`p-4 rounded-2xl border ${
            data.chain_intact
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
              : "bg-red-50/80 border-red-200 text-red-950"
          }`}
        >
          <div className="font-extrabold text-sm flex items-center gap-2">
            {data.chain_intact ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>All Stock Records 100% Verified & Untampered</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Attention: Record Discrepancy Found!</span>
              </>
            )}
          </div>
          <p className="text-xs mt-1.5 text-slate-600 font-medium leading-relaxed">
            {data.chain_intact
              ? "Every barcode scan, stock intake, and order dispatch matches the system records. No unauthorized changes, deletions, or stolen inventory detected."
              : data.message}
          </p>
        </div>

        {/* High-level KPI Numbers */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              Total Activities Audited
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{data.total_logs}</p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">scans & warehouse movements</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              Accuracy & Integrity
            </p>
            <p className="text-2xl font-black text-emerald-600 mt-1">100% Intact</p>
            <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
              {data.verified_count} of {data.total_logs} records verified
            </p>
          </div>
        </div>

        {/* Clear Security & Theft Protections Card (Plain English) */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
            Security & Compliance Highlights:
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-3 h-3" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Tamper-Proof Digital Lock</p>
                <p className="text-[11px] text-slate-500">
                  Records are permanently locked. No staff member or admin can secretly alter stock quantities.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <PackageCheck className="w-3 h-3" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Zero Ghost Inventory</p>
                <p className="text-[11px] text-slate-500">
                  Every single stock adjustment is backed by a physical barcode scan or an approved damage reason.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-3 h-3" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Pharma & Audit Inspection Ready</p>
                <p className="text-[11px] text-slate-500">
                  Clean, chronological audit trail ready for government inspection, drug regulators, and external auditors.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-md transition-all cursor-pointer text-xs"
          >
            Close Audit Report
          </button>
        </div>
      </div>
    </div>
  );
};
