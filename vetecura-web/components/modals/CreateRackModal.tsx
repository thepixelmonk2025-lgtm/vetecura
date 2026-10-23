"use client";

import React, { useState } from "react";
import { Warehouse, Boxes, ShieldCheck, X } from "lucide-react";
import { CustomSelect } from "../CustomSelect";

interface CreateRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRack: (rackData: { code: string; capacity_units: number; rack_type: string }) => void;
}

const RACK_TYPE_OPTIONS = [
  { value: "Standard Ambient", label: "Standard (Room Temperature)", sublabel: "Normal warehouse storage" },
  { value: "Cold Chain (2°C - 8°C)", label: "Cold Storage (2°C - 8°C)", sublabel: "Refrigerated medicine storage" },
  { value: "Damage Hold Quarantine", label: "Damage Hold Area", sublabel: "Separate area for broken or expired items" },
  { value: "High Velocity Fast-Moving", label: "Fast-Moving Shelf", sublabel: "Near front gate for quick access" },
];

export const CreateRackModal: React.FC<CreateRackModalProps> = ({
  isOpen,
  onClose,
  onCreateRack,
}) => {
  const [rackCode, setRackCode] = useState("");
  const [capacity, setCapacity] = useState<number>(500);
  const [rackType, setRackType] = useState<string>("Standard Ambient");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rackCode.trim()) {
      alert("Please enter a shelf identifier code (e.g. Rack D-01)");
      return;
    }

    const fullCode = rackType === "Cold Chain (2°C - 8°C)"
      ? `${rackCode.trim()} (Cold Chain)`
      : rackType === "Damage Hold Quarantine"
      ? `${rackCode.trim()} (Damage Hold)`
      : rackCode.trim();

    onCreateRack({
      code: fullCode,
      capacity_units: capacity || 500,
      rack_type: rackType,
    });

    setRackCode("");
    setCapacity(500);
    setRackType("Standard Ambient");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-scale-up space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Warehouse className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Add New Storage Shelf</h3>
              <p className="text-xs text-slate-400">Set up shelf name, storage temperature, and item capacity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Shelf / Rack Code
            </label>
            <input
              type="text"
              placeholder="e.g. Rack D-01 or Shelf-B-04"
              value={rackCode}
              onChange={(e) => setRackCode(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Storage Temperature & Type
              </label>
              <CustomSelect
                value={rackType}
                onChange={setRackType}
                options={RACK_TYPE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Maximum Capacity (Total Units)
              </label>
              <input
                type="number"
                min="10"
                max="10000"
                value={capacity}
                onChange={(e) => {
                  const val = e.target.value;
                  setCapacity(val === "" ? ("" as any) : Number(val));
                }}
                className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-950 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>A barcode label will be automatically created to scan this shelf.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-black rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer"
            >
              Save Storage Shelf
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
