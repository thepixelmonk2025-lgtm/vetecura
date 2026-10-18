"use client";

import React, { useState } from "react";
import { SalesOrderRow } from "../types";
import {
  Truck,
  Smartphone,
  Search,
  CheckCircle2,
  AlertOctagon,
  Clock,
  Plus,
  ArrowRight,
  Package,
  Layers,
} from "lucide-react";
import { CustomSelect } from "../CustomSelect";

import { useSortableData } from "../../hooks/useSortableData";

interface OutboundViewProps {
  salesOrderList: SalesOrderRow[];
  userRole: import("../types").UserRole;
  onOpenCreateSO: () => void;
  onEditSO?: (so: SalesOrderRow) => void;
  onDeleteSO?: (so: SalesOrderRow) => void;
}

export const OutboundView: React.FC<OutboundViewProps> = ({
  salesOrderList,
  userRole,
  onOpenCreateSO,
  onEditSO,
  onDeleteSO,
}) => {
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const defaultOrders: SalesOrderRow[] = salesOrderList.length > 0 ? salesOrderList : [
    { id: "1", order_reference: "SO-88412", customer_name: "Apex Veterinary Hospital", expected_count: 50, scanned_count: 0, status: "In Progress", created_at: "2026-08-25, 08:50 AM" },
    { id: "2", order_reference: "SO-88413", customer_name: "City Pet Clinic", expected_count: 100, scanned_count: 42, status: "In Progress", created_at: "2026-08-25, 09:30 AM" },
    { id: "3", order_reference: "SO-88414", customer_name: "Rural Agrivet Centre", expected_count: 200, scanned_count: 0, status: "In Progress", created_at: "2026-08-25, 10:00 AM" },
  ];

  const [selectedOrderRef, setSelectedOrderRef] = useState<string>(defaultOrders[0]?.order_reference || "SO-88412");

  const selectedSO = defaultOrders.find((s) => s.order_reference === selectedOrderRef) || defaultOrders[0];

  const soOptions = defaultOrders.map((so) => ({
    value: so.order_reference,
    label: `${so.order_reference} — ${so.customer_name}`,
    sublabel: `${so.expected_count} Units · Status: ${so.status}`,
  }));

  const filteredOrders = defaultOrders.filter((so) => {
    const matchesSearch =
      so.order_reference.toLowerCase().includes(searchFilter.toLowerCase()) ||
      so.customer_name.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || so.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  const { items: sortedOrders, requestSort, sortConfig } = useSortableData(filteredOrders);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-black text-slate-900">Stock Out & Shipping Orders</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Scan every item before it leaves the warehouse. Prevents wrong items or wrong quantities from being shipped.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {(userRole === "owner" || userRole === "warehouse_manager") && (
            <button
              onClick={onOpenCreateSO}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-2xl border border-blue-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ New Customer Order</span>
            </button>
          )}
          <a
            href={`http://localhost:5173/?type=dispatch&po=${selectedSO.order_reference}&expected=${selectedSO.expected_count}&scanned=${selectedSO.scanned_count}&customer=${encodeURIComponent(selectedSO.customer_name)}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-2xl shadow-md shadow-blue-600/15 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Dispatch Scanner</span>
          </a>
        </div>
      </div>

      {/* Customer Sales Order Selector Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-50/70 to-indigo-50/50 rounded-3xl border border-blue-200/80 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-xs">
        <div className="flex-1 w-full lg:w-auto space-y-1.5">
          <label className="block text-[11px] font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Select Customer Order to Dispatch</span>
          </label>
          <div className="w-full lg:max-w-md">
            <CustomSelect
              value={selectedOrderRef}
              onChange={setSelectedOrderRef}
              options={soOptions}
              placeholder="Select customer order..."
            />
          </div>
        </div>

        {selectedSO && (
          <div className="flex items-center gap-4 flex-wrap bg-white px-5 py-3 rounded-2xl border border-blue-200 text-xs shadow-2xs">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Customer / Client</p>
              <p className="font-bold text-slate-900">{selectedSO.customer_name}</p>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <p className="text-[10px] text-slate-400 font-bold uppercase">Items Packed & Verified</p>
              <p className="font-black text-blue-600">
                {selectedSO.scanned_count} / {selectedSO.expected_count} Items
              </p>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <a
                href={`http://localhost:5173/?type=dispatch&po=${selectedSO.order_reference}&expected=${selectedSO.expected_count}&scanned=${selectedSO.scanned_count}&customer=${encodeURIComponent(selectedSO.customer_name)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-xs transition-all text-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Scan & Pack Order</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Customer Orders</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{defaultOrders.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Pending dispatch across all clients</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ready to Ship</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {defaultOrders.filter((s) => s.status === "Ready to Ship").length} Orders
          </p>
          <p className="text-xs text-slate-400 mt-0.5">All items packed & verified</p>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Orders Blocked (Mismatch)</p>
          <p className="text-2xl font-black text-red-600 mt-1">
            {defaultOrders.filter((s) => s.status === "Mismatch (Block)").length}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Quantity or item mismatch detected</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order # or Customer..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all", label: "All Orders" },
              { id: "Ready to Ship", label: "Ready to Ship" },
              { id: "In Progress", label: "Packing in Progress" },
              { id: "Mismatch", label: "Blocked (Mismatch)" }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                  statusFilter === st.id ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold border-y border-slate-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('order_reference')}>
                  Order # {sortConfig?.key === 'order_reference' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('created_at')}>
                  Date & Time {sortConfig?.key === 'created_at' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('customer_name')}>
                  Customer / Client {sortConfig?.key === 'customer_name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('expected_count')}>
                  Ordered Items {sortConfig?.key === 'expected_count' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('scanned_count')}>
                  Packed & Verified {sortConfig?.key === 'scanned_count' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('status')}>
                  Order Status {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {sortedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                    No customer orders found matching your search.
                  </td>
                </tr>
              ) : (
                sortedOrders.map((so) => (
                  <tr key={so.id} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3.5 font-bold text-slate-900 font-mono">{so.order_reference}</td>
                    <td className="p-3.5 text-slate-500 text-[11px]">{so.created_at || "2026-08-25, 08:50 AM"}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{so.customer_name}</td>
                    <td className="p-3.5 font-bold">{so.expected_count} units</td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          so.status === "Ready to Ship"
                            ? "bg-emerald-100 text-emerald-800"
                            : so.status === "Mismatch (Block)"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {so.scanned_count} / {so.expected_count} {so.status === "Ready to Ship" ? "Verified ✓" : "Items"}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      {so.status === "Ready to Ship" ? (
                        <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-[10px] font-black">
                          Ready to Ship
                        </span>
                      ) : so.status === "Mismatch (Block)" ? (
                        <span className="px-3 py-1 bg-red-600 text-white rounded-xl text-[10px] font-black">
                          Blocked (Mismatch)
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-[10px] font-black">
                          Packing in Progress
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {/* Edit SO */}
                      {onEditSO && (userRole === "owner" || userRole === "warehouse_manager") && (
                        <button
                          onClick={() => onEditSO(so)}
                          title="Edit Order Details"
                          className="inline-flex items-center justify-center p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                        >
                          ✏️
                        </button>
                      )}

                      {/* Cancel/Delete SO */}
                      {onDeleteSO && (userRole === "owner" || userRole === "warehouse_manager") && (
                        <button
                          onClick={() => onDeleteSO(so)}
                          title="Cancel / Delete Order"
                          className="inline-flex items-center justify-center p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                        >
                          🗑️
                        </button>
                      )}

                      <a
                        href={`http://localhost:5173/?type=dispatch&po=${so.order_reference}&expected=${so.expected_count}&scanned=${so.scanned_count}&customer=${encodeURIComponent(so.customer_name)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-xl text-[11px] font-bold transition-all cursor-pointer border border-blue-200"
                      >
                        <Smartphone className="w-3 h-3 text-blue-600" />
                        <span>Scan & Pack</span>
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
