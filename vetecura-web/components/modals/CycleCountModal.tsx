"use client";

import React, { useState, useEffect } from "react";
import { RackItem } from "../types";
import { ScanSearch, X, Smartphone } from "lucide-react";
import { CustomSelect } from "../CustomSelect";

interface CycleCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: RackItem[];
  preselectedRack?: string;
  onSchedule: (rackCode: string) => void;
}

export const CycleCountModal: React.FC<CycleCountModalProps> = ({
  isOpen,
  onClose,
  racks,
  preselectedRack,
  onSchedule,
}) => {
  const [selectedRack, setSelectedRack] = useState(preselectedRack || (racks.length > 0 ? racks[0].code : "Rack A-01"));

  useEffect(() => {
    if (preselectedRack) {
      setSelectedRack(preselectedRack);
    }
  }, [preselectedRack]);

  if (!isOpen) return null;

  const rackOptions = racks.length > 0
    ? racks.map((r) => ({
        value: r.code,
        label: r.code,
        sublabel: `${r.current_occupancy} units current load`,
      }))
    : [
        { value: "Rack A-01", label: "Rack A-01", sublabel: "High Velocity Fast-Moving" },
        { value: "Rack A-02", label: "Rack A-02", sublabel: "General Storage" },
        { value: "Rack B-12 (Cold Chain)", label: "Rack B-12 (Cold Chain)", sublabel: "Refrigerated Biologics" },
      ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSchedule(selectedRack || (rackOptions[0]?.value || "Rack A-01"));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-fade-in text-xs">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ScanSearch className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-black text-slate-900">Schedule Physical Stock Count</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Storage Shelf / Rack
            </label>
            <CustomSelect
              value={selectedRack}
              onChange={setSelectedRack}
              options={rackOptions}
              placeholder="Select shelf..."
            />
          </div>

          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-blue-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <Smartphone className="w-3.5 h-3.5 text-blue-700" />
              <span>Mobile Phone Scanner Task:</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Warehouse staff will scan items on this shelf using the mobile app. Any missing or extra items will be flagged immediately.
            </p>
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
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-full shadow-md transition-all"
            >
              Start Stock Count
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
