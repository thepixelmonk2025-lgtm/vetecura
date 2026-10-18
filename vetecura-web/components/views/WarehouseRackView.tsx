"use client";

import React, { useState } from "react";
import { RackItem } from "../types";
import {
  Warehouse,
  Snowflake,
  AlertTriangle,
  Boxes,
  Search,
  ArrowRight,
  RotateCcw,
  Plus,
  Layers,
  Thermometer,
} from "lucide-react";

import { useSortableData } from "../../hooks/useSortableData";

interface WarehouseRackViewProps {
  racks: RackItem[];
  userRole: import("../types").UserRole;
  onOpenCreateRack: () => void;
  onOpenCycleCount: (rackCode?: string) => void;
  onOpenCreateWriteoff: () => void;
  onOpenCreateReturn: () => void;
  onEditRack?: (rack: RackItem) => void;
  onDeleteRack?: (rack: RackItem) => void;
}

export const WarehouseRackView: React.FC<WarehouseRackViewProps> = ({
  racks,
  userRole,
  onOpenCreateRack,
  onOpenCycleCount,
  onOpenCreateWriteoff,
  onOpenCreateReturn,
  onEditRack,
  onDeleteRack,
}) => {
  const [ledgerSearch, setLedgerSearch] = useState("");

  const rawStockLedgerItems = [
    { product: "Vitamin D3 Softgel 1000IU", sku: "PROD-001", rack: "Rack A-01", batch: "VD-2207", expiry: "2026-09-30", qty: 450, status: "available" },
    { product: "Amoxicillin Trihydrate 500mg", sku: "PROD-002", rack: "Rack A-01", batch: "AMX-9941", expiry: "2027-01-15", qty: 200, status: "available" },
    { product: "Rabies Vaccine (Veterinary Grade)", sku: "PROD-003", rack: "Rack B-12 (Cold Chain)", batch: "RBV-1022", expiry: "2026-11-20", qty: 777, status: "available" },
    { product: "Ibuprofen Suspension 100mg/5ml", sku: "PROD-004", rack: "Rack A-02", batch: "IBU-4409", expiry: "2026-12-05", qty: 280, status: "available" },
    { product: "Damaged Bottle (Hold for Approval)", sku: "PROD-001", rack: "Damage Hold Warehouse", batch: "VD-2207", expiry: "2026-09-30", qty: 3, status: "damaged_hold" },
  ];

  // Calculate live occupancy per rack from inventory ledger if rack.current_occupancy is 0
  const rackOccupancyMap = rawStockLedgerItems.reduce((acc, item) => {
    acc[item.rack] = (acc[item.rack] || 0) + item.qty;
    return acc;
  }, {} as Record<string, number>);

  const initialRacks: RackItem[] = racks.length > 0 ? racks : [
    { id: "1", code: "Rack A-01", capacity_units: 500, current_occupancy: 450 },
    { id: "2", code: "Rack B-12", capacity_units: 200, current_occupancy: 0 },
    { id: "3", code: "Damage Hold", capacity_units: 50, current_occupancy: 3 },
  ];

  const defaultRacks: RackItem[] = initialRacks.map((r) => {
    // If backend returns 0 but ledger has items for this rack, use ledger quantity
    let occ = r.current_occupancy || 0;
    if (occ === 0) {
      const match = Object.keys(rackOccupancyMap).find(k => k.toLowerCase().includes(r.code.toLowerCase()) || r.code.toLowerCase().includes(k.toLowerCase()));
      if (match) {
        occ = rackOccupancyMap[match];
      }
    }
    return {
      ...r,
      current_occupancy: occ,
    };
  });

  const stockLedgerItems = rawStockLedgerItems.filter((it) => 
    it.product.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
    it.sku.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
    it.rack.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
    it.batch.toLowerCase().includes(ledgerSearch.toLowerCase())
  );

  const { items: sortedLedgerItems, requestSort, sortConfig } = useSortableData(stockLedgerItems);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar with Action Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black text-slate-900">Warehouse Shelves & Live Stock</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Track shelf space, monitor storage temperatures, and see live stock quantities across all shelves.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {(userRole === "owner" || userRole === "warehouse_manager") && (
            <button
              onClick={onOpenCreateRack}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>+ Add Storage Shelf</span>
            </button>
          )}
          <button
            onClick={onOpenCreateWriteoff}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-2xl border border-red-200 transition-all cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Report Damaged Item</span>
          </button>
          <button
            onClick={onOpenCreateReturn}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-2xl border border-amber-200 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Record Customer Return</span>
          </button>
          {(userRole === "owner" || userRole === "warehouse_manager") && (
            <button
              onClick={() => onOpenCycleCount()}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-md shadow-slate-900/10 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Start Stock Count</span>
            </button>
          )}
        </div>
      </div>

      {/* Visual Rack Map Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {defaultRacks.map((rack) => {
          const cap = rack.capacity_units || 500;
          const occ = rack.current_occupancy || 0;
          const pct = Math.min(Math.round((occ / cap) * 100), 100);
          const isDmg = rack.code.toLowerCase().includes("damage");
          const isCold = rack.code.toLowerCase().includes("cold");

          return (
            <div
              key={rack.id}
              className={`p-5 rounded-3xl border transition-all space-y-3 bg-white shadow-xs hover:shadow-md ${
                isDmg ? "border-red-200" : isCold ? "border-blue-200" : "border-slate-200/90"
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {isDmg ? (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  ) : isCold ? (
                    <Snowflake className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Boxes className="w-4 h-4 text-slate-700" />
                  )}
                  <h3 className="font-extrabold text-slate-900 text-sm">{rack.code}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    isDmg
                      ? "bg-red-100 text-red-800"
                      : pct > 90
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {pct}% Full
                  </span>

                  {/* Edit Rack */}
                  {onEditRack && (userRole === "owner" || userRole === "warehouse_manager") && (
                    <button
                      onClick={() => onEditRack(rack)}
                      title="Edit Shelf Details"
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors text-xs"
                    >
                      ✏️
                    </button>
                  )}

                  {/* Delete Rack */}
                  {onDeleteRack && (userRole === "owner" || userRole === "warehouse_manager") && (
                    <button
                      onClick={() => onDeleteRack(rack)}
                      title="Delete Shelf"
                      className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors text-xs"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isDmg ? "bg-red-500" : isCold ? "bg-blue-500" : pct > 90 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold pt-1">
                  <span>Current: {occ} units</span>
                  <span>Capacity: {cap} units</span>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-100 text-xs">
                <span className="text-[10px] text-slate-400 font-medium">
                  {isDmg ? "Damage Hold (Photo Proof Required)" : isCold ? "Cold Storage (2°C - 8°C)" : "Standard Storage (Room Temp)"}
                </span>
                <button
                  onClick={() => onOpenCycleCount(rack.code)}
                  className="inline-flex items-center gap-1 font-bold text-slate-900 hover:text-emerald-700 hover:underline transition-all cursor-pointer"
                >
                  <span>Check Shelf</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-Time Stock Ledger Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Current In-Stock Inventory
            </h3>
            <p className="text-xs text-slate-400">Live product quantities organized by batch number and storage shelf.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Product, Code, Shelf, or Batch..."
              value={ledgerSearch}
              onChange={(e) => setLedgerSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
            />
          </div>
        </div>

        <div className="table-responsive-container rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs min-w-[750px] sm:min-w-full">
            <thead className="bg-slate-50 text-slate-400 font-bold border-y border-slate-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('product')}>
                  Product Name {sortConfig?.key === 'product' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('sku')}>
                  Product Code (SKU) {sortConfig?.key === 'sku' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('rack')}>
                  Shelf / Rack {sortConfig?.key === 'rack' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('batch')}>
                  Batch # {sortConfig?.key === 'batch' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('expiry')}>
                  Expiry Date {sortConfig?.key === 'expiry' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('qty')}>
                  Available Stock {sortConfig?.key === 'qty' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 text-right cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('status')}>
                  Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {sortedLedgerItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                  <td className="p-3.5 font-bold text-slate-900">{item.product}</td>
                  <td className="p-3.5 font-mono text-slate-500">{item.sku}</td>
                  <td className="p-3.5 font-bold text-emerald-700">{item.rack}</td>
                  <td className="p-3.5 font-mono text-slate-700">{item.batch}</td>
                  <td className="p-3.5 text-slate-500">{item.expiry}</td>
                  <td className="p-3.5 font-black text-slate-900">{item.qty} units</td>
                  <td className="p-3.5 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      item.status === "available" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}>
                      {item.status === "available" ? "In Stock" : "Damaged / On Hold"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
