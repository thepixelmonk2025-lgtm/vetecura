"use client";

import React, { useState } from "react";
import { PurchaseOrderRow, Supplier, Product } from "../types";
import {
  PackagePlus,
  Printer,
  Plus,
  Search,
  CheckCircle2,
  Building2,
  Package,
  Smartphone,
  Calendar,
  Clock,
} from "lucide-react";

import { useSortableData } from "../../hooks/useSortableData";

interface InboundViewProps {
  poList: PurchaseOrderRow[];
  suppliers: Supplier[];
  products: Product[];
  userRole: import("../types").UserRole;
  onOpenCreatePO: () => void;
  onNavigateToLabels: () => void;
  onOpenCreateSupplier: () => void;
  onOpenCreateProduct?: () => void;
  onEditPO?: (po: PurchaseOrderRow) => void;
  onDeletePO?: (po: PurchaseOrderRow) => void;
  onEditSupplier?: (sup: Supplier) => void;
  onDeleteSupplier?: (sup: Supplier) => void;
  onEditProduct?: (prod: Product) => void;
  onDeleteProduct?: (prod: Product) => void;
}

export const InboundView: React.FC<InboundViewProps> = ({
  poList,
  suppliers,
  products,
  userRole,
  onOpenCreatePO,
  onNavigateToLabels,
  onOpenCreateSupplier,
  onOpenCreateProduct,
  onEditPO,
  onDeletePO,
  onEditSupplier,
  onDeleteSupplier,
  onEditProduct,
  onDeleteProduct,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState("");

  const filteredPOs = poList.filter((po) => {
    const matchesStatus = filterStatus === "all" || po.status.toLowerCase().includes(filterStatus.toLowerCase());
    const matchesSearch =
      po.po_number.toLowerCase().includes(searchFilter.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const { items: sortedPOs, requestSort, sortConfig } = useSortableData(filteredPOs);

  const getScannerUrl = (po: PurchaseOrderRow) => {
    let base = process.env.NEXT_PUBLIC_SCANNER_URL;
    if (!base && typeof window !== "undefined") {
      if (window.location.port !== "3000" && window.location.hostname !== "localhost") {
        base = `${window.location.origin}/pwa`;
      } else {
        base = `http://${window.location.hostname}:5173`;
      }
    }
    base = base || "http://localhost:5173";
    return `${base}/?type=grn&po=${encodeURIComponent(po.po_number)}&expected=${po.expected_units}&supplier=${encodeURIComponent(po.supplier)}${po.id ? `&ref_id=${encodeURIComponent(po.id)}` : ""}`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase rounded-full border border-emerald-500/30">
              Receiving Dock
            </span>
            <span className="text-slate-400 text-xs">• 100% Barcode Gate Verification</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Stock In & Receiving Goods</h2>
          <p className="text-slate-400 text-xs max-w-xl">
            Create orders for suppliers, print barcode labels, and scan incoming deliveries directly to warehouse shelves.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {(userRole === "owner" || userRole === "purchase_team") && (
            <button
              onClick={onOpenCreateSupplier}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-bold transition-all shadow-sm"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>+ New Supplier</span>
            </button>
          )}
          {onOpenCreateProduct && (userRole === "owner" || userRole === "purchase_team") && (
            <button
              onClick={onOpenCreateProduct}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-bold transition-all shadow-sm"
            >
              <Package className="w-4 h-4 text-cyan-400" />
              <span>+ New Product</span>
            </button>
          )}
          <button
            onClick={onNavigateToLabels}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-2xl text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Print Labels</span>
          </button>
          {(userRole === "owner" || userRole === "purchase_team") && (
            <button
              onClick={onOpenCreatePO}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-600/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Purchase Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Purchase Orders</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{poList.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Active orders placed with suppliers</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Received & Verified Items</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {poList.reduce((sum, p) => sum + (p.status === "Completed & Verified" ? p.expected_units : 0), 0)} items
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Accurately scanned at gate</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Approved Suppliers</p>
          <p className="text-2xl font-black text-blue-600 mt-1">{suppliers.length || 3}</p>
          <p className="text-xs text-slate-400 mt-0.5">Active registered vendors</p>
        </div>
      </div>

      {/* Main PO Table Card */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Incoming Orders & Deliveries</h3>
            <p className="text-[11px] text-slate-500">Track supplier orders arriving at the warehouse and scan incoming goods.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Order # or Supplier..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Status Filter Buttons */}
            {[
              { id: "all", label: "All Orders" },
              { id: "draft", label: "Draft" },
              { id: "in progress", label: "Receiving" },
              { id: "completed", label: "Completed" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                  filterStatus === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* PO Table with Date & Time Column & Audited Actions */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold border-y border-slate-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('po_number')}>
                  Order / PO # {sortConfig?.key === 'po_number' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('created_at')}>
                  Date & Time {sortConfig?.key === 'created_at' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('supplier')}>
                  Supplier / Vendor {sortConfig?.key === 'supplier' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('expected_units')}>
                  Expected Quantity {sortConfig?.key === 'expected_units' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('status')}>
                  Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {sortedPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    No orders found matching your search.
                  </td>
                </tr>
              ) : (
                sortedPOs.map((po, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3.5 font-bold text-slate-900 font-mono">{po.po_number}</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{po.created_at || "2026-08-25 12:00 PM"}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800">{po.supplier}</td>
                    <td className="p-3.5 font-bold text-slate-900">{po.expected_units} units</td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        po.status === "Completed & Verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : po.status === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {po.status === "Completed & Verified" ? "Received & Verified" : po.status === "In Progress" ? "Receiving in Progress" : po.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Edit Button (Draft or In Progress) */}
                      {onEditPO && po.status !== "Completed & Verified" && (userRole === "owner" || userRole === "purchase_team") && (
                        <button
                          onClick={() => onEditPO(po)}
                          title="Edit Order Details"
                          className="inline-flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all"
                        >
                          ✏️
                        </button>
                      )}

                      {/* Delete / Cancel Button */}
                      {onDeletePO && po.status !== "Completed & Verified" && (userRole === "owner" || userRole === "purchase_team") && (
                        <button
                          onClick={() => onDeletePO(po)}
                          title="Cancel / Delete Order"
                          className="inline-flex items-center justify-center p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[11px] font-bold transition-all"
                        >
                          🗑️
                        </button>
                      )}

                      <a
                        href={getScannerUrl(po)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold shadow-xs transition-all"
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>Scan Goods</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

