"use client";

import React, { useState } from "react";
import { AlertTriangle, Trash2, ShieldAlert, X, CheckCircle2, FileText, Lock } from "lucide-react";

export interface ConfirmAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  itemIdentifier: string;
  actionType: "delete" | "cancel" | "archive" | "edit";
  entityName: string; // e.g. "Purchase Order", "Sales Order", "Storage Rack", "Supplier", "Product"
  warningText?: string;
  presetReasons?: string[];
}

export const ConfirmAuditModal: React.FC<ConfirmAuditModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemIdentifier,
  actionType,
  entityName,
  warningText,
  presetReasons = [
    "Cancelled by Customer/Supplier",
    "Duplicate Entry / Test Data",
    "Incorrect Specification Entered",
    "Operational Reassignment",
    "Replaced with New Batch",
  ],
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const isDeleteOrCancel = actionType === "delete" || actionType === "cancel" || actionType === "archive";

  const handleConfirm = () => {
    if (!reason.trim() || reason.trim().length < 5) {
      setError("Please provide a valid audit reason (minimum 5 characters).");
      return;
    }
    setError("");
    onConfirm(reason.trim());
    setReason("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isDeleteOrCancel
                  ? "bg-red-50 text-red-600 border border-red-200"
                  : "bg-blue-50 text-blue-600 border border-blue-200"
              }`}
            >
              {isDeleteOrCancel ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Secured Record • {entityName}
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Item Details Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
          <p className="text-[10px] font-bold uppercase text-slate-400">Selected Item</p>
          <p className="text-sm font-black text-slate-900 font-mono">{itemIdentifier}</p>
          <p className="text-xs text-slate-500 font-medium">
            {warningText ||
              (isDeleteOrCancel
                ? `Are you sure you want to ${actionType} this ${entityName}? This change will be permanently recorded in the ledger.`
                : `Confirm modifying this ${entityName}.`)}
          </p>
        </div>

        {/* Audit Trail Security Notice */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-900 space-y-0.5 leading-relaxed">
            <span className="font-extrabold block">Security & Record Keeping Notice:</span>
            <span>
              All deletions and changes are securely logged with your user name and time. Providing a reason is required to maintain clean warehouse records.
            </span>
          </div>
        </div>

        {/* Reason Input */}
        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>Reason for {actionType === "delete" ? "Deletion" : actionType === "cancel" ? "Cancellation" : "Update"} (Required)</span>
            <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. Order cancelled due to vendor price renegotiation..."
            rows={3}
            className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-800 placeholder:text-slate-400 resize-none bg-slate-50/50"
          />
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}

          {/* Quick Preset Tags */}
          <div className="pt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1.5">Quick Presets:</p>
            <div className="flex flex-wrap gap-1.5">
              {presetReasons.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(preset)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-left"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-6 py-2.5 rounded-full text-white font-black text-xs shadow-md transition-all flex items-center gap-1.5 ${
              isDeleteOrCancel
                ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm & Record</span>
          </button>
        </div>
      </div>
    </div>
  );
};
