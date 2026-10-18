"use client";

import React, { useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { CustomSelect } from "../CustomSelect";

interface CreateReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (orderRef: string, condition: "good" | "damaged" | "expired", reason: string) => void;
}

const CONDITION_OPTIONS = [
  { value: "good", label: "Good Condition", sublabel: "Return to Available Shelf" },
  { value: "damaged", label: "Damaged", sublabel: "Move to Damage Hold Area" },
  { value: "expired", label: "Expired", sublabel: "Move to Damage Hold Area" },
];

export const CreateReturnModal: React.FC<CreateReturnModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [orderRef, setOrderRef] = useState("SO-88412");
  const [condition, setCondition] = useState<"good" | "damaged" | "expired">("good");
  const [reason, setReason] = useState("Customer Return - Wrong Product Ordered");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderRef) return;
    onSubmit(orderRef, condition, reason);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-fade-in text-xs">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-black text-slate-900">Record Customer Return</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
              Customer Order #
            </label>
            <input
              type="text"
              required
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-900 font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
              Item Condition
            </label>
            <CustomSelect
              value={condition}
              onChange={(val) => setCondition(val as any)}
              options={CONDITION_OPTIONS}
            />
          </div>

          <div>
            <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
              Reason for Return
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-900 font-semibold text-slate-900"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-full shadow-md transition-all"
            >
              Save Customer Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
