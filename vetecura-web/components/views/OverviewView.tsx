"use client";

import React from "react";
import { DashboardMetrics, PurchaseOrderRow, SalesOrderRow, TelegramAlertLog, UserRole } from "../types";
import {
  DollarSign,
  Truck,
  PackagePlus,
  ShieldCheck,
  Smartphone,
  Lock,
  ArrowRight,
  TrendingUp,
  ScanBarcode,
  Search,
  CheckCircle2,
  AlertCircle,
  Radio,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";

interface OverviewViewProps {
  metrics: DashboardMetrics;
  userRole: UserRole;
  poList: PurchaseOrderRow[];
  salesOrderList: SalesOrderRow[];
  telegramLogs: TelegramAlertLog[];
  onNavigate: (tab: any) => void;
  onOpenCreatePO: () => void;
  onOpenCycleCount: () => void;
  onVerifyLedger: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  metrics,
  userRole,
  poList,
  salesOrderList,
  telegramLogs,
  onNavigate,
  onOpenCreatePO,
  onOpenCycleCount,
  onVerifyLedger,
}) => {
  const activePOs = poList.filter((p) => p.status === "In Progress" || p.status === "Draft").length;
  const readyToShipSOs = salesOrderList.filter((s) => s.status === "Ready to Ship").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome & Operations Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase rounded-full border border-emerald-500/30">
              Live Warehouse Status
            </span>
            <span className="text-slate-400 text-xs">• 100% Barcode Verified</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Warehouse Dashboard & Control
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
            Scan and track physical boxes with barcode accuracy, prevent inventory loss, and automate your stock receiving and customer shipments.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                const scannerUrl = window.location.hostname !== "localhost" 
                  ? `${window.location.origin}/pwa/` 
                  : "http://localhost:5173";
                window.open(scannerUrl, "_blank");
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 cursor-pointer"
            title="Open scanner screen for mobile camera or handheld barcode gun"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Barcode Scanner</span>
          </button>
          <button
            onClick={onVerifyLedger}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer"
            title="Instant check for inventory accuracy & theft protection"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verify Stock Security</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Card 1: Outbound / Dispatched Units */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Dispatched & Shipped Stock
            </span>
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm">
              <Truck className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {metrics.dispatchedUnits.toLocaleString("en-IN")} units
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-blue-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{readyToShipSOs} customer orders</span>
              <span className="text-slate-400 font-normal text-[11px]">ready to dispatch</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Incoming Stock */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Incoming Stock Deliveries
            </span>
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
              <PackagePlus className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {activePOs} Orders Arriving
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-indigo-600">
              <span>Smart Expiry Priority</span>
              <span className="text-slate-400 font-normal text-[11px]">active</span>
            </div>
          </div>
        </div>

        {/* Card 3: Stock Security & Theft Protection */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Theft & Loss Protection
            </span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
              <span>100% Safe & In Sync</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-slate-500">
              <span>Zero Missing Items</span>
              <span className="text-slate-400 font-normal text-[11px]">Digital Lock</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts Hub */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Common Warehouse Actions
            </h3>
            <p className="text-xs text-slate-400">Start day-to-day warehouse tasks in one click</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {(userRole === "owner" || userRole === "purchase_team") && (
            <button
              onClick={onOpenCreatePO}
              className="p-4 rounded-2xl border border-slate-200 hover:border-slate-900 bg-slate-50/50 hover:bg-slate-900 hover:text-white transition-all text-left group space-y-2 shadow-2xs cursor-pointer"
            >
              <PackagePlus className="w-6 h-6 text-slate-700 group-hover:text-emerald-400 transition-colors" />
              <p className="text-xs font-bold group-hover:text-white text-slate-900">New Purchase Order</p>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-300">Order new stock from supplier</p>
            </button>
          )}

          <button
            onClick={() => onNavigate("inbound")}
            className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-700 bg-emerald-50/30 hover:bg-emerald-600 hover:text-white transition-all text-left group space-y-2 shadow-2xs cursor-pointer"
          >
            <ScanBarcode className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
            <p className="text-xs font-bold group-hover:text-white text-slate-900">Scan & Receive Stock</p>
            <p className="text-[10px] text-slate-400 group-hover:text-emerald-100">Verify boxes as trucks arrive</p>
          </button>

          <button
            onClick={() => onNavigate("outbound")}
            className="p-4 rounded-2xl border border-slate-200 hover:border-blue-700 bg-blue-50/30 hover:bg-blue-600 hover:text-white transition-all text-left group space-y-2 shadow-2xs cursor-pointer"
          >
            <Truck className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
            <p className="text-xs font-bold group-hover:text-white text-slate-900">Pack & Ship Orders</p>
            <p className="text-[10px] text-slate-400 group-hover:text-blue-100">Scan items for customer delivery</p>
          </button>

          {(userRole === "owner" || userRole === "warehouse_manager") && (
            <button
              onClick={onOpenCycleCount}
              className="p-4 rounded-2xl border border-slate-200 hover:border-amber-700 bg-amber-50/30 hover:bg-amber-600 hover:text-white transition-all text-left group space-y-2 shadow-2xs cursor-pointer"
            >
              <Search className="w-6 h-6 text-amber-600 group-hover:text-white transition-colors" />
              <p className="text-xs font-bold group-hover:text-white text-slate-900">Verify Rack Inventory</p>
              <p className="text-[10px] text-slate-400 group-hover:text-amber-100">Spot-check physical shelf stock</p>
            </button>
          )}
        </div>
      </div>

      {/* Split Grid: Recent Orders & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Orders Overview */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Recent Purchase & Delivery Orders
              </h3>
              <p className="text-xs text-slate-400">Current status of incoming and outgoing shipments</p>
            </div>
            <button
              onClick={() => onNavigate("inbound")}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>View All Incoming</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="table-responsive-container rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs min-w-[580px] sm:min-w-full">
              <thead className="bg-slate-50 text-slate-400 font-bold border-y border-slate-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Order / PO #</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Supplier / Partner</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {poList.slice(0, 4).map((po, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-all">
                    <td className="p-3 font-bold text-slate-900 font-mono">{po.po_number}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{po.created_at || "Recent"}</td>
                    <td className="p-3 font-semibold">{po.supplier}</td>
                    <td className="p-3 font-bold">{po.expected_units} units</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                        po.status === "Completed & Verified"
                          ? "bg-emerald-100 text-emerald-800"
                          : po.status === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onNavigate("inbound")}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Live Activity Feed */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Live Activity Alerts
                </h3>
                <p className="text-[11px] text-slate-400">Instant updates on stock in, out & safety</p>
              </div>
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
            </div>

            <div className="space-y-2.5 mt-4 max-h-72 overflow-y-auto pr-1">
              {telegramLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  <p>All activities up to date.</p>
                </div>
              ) : (
                telegramLogs.slice(0, 4).map((log, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-extrabold text-slate-900 uppercase">[{log.topic}]</span>
                      <span className="text-slate-400 font-mono">{log.time || "Recent"}</span>
                    </div>
                    <p className="text-slate-700 font-medium text-[11px] leading-relaxed">
                      {log.message}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => onNavigate("security")}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View Full Security History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
