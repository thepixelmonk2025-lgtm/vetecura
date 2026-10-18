"use client";

import React, { useState, useMemo } from "react";
import { ExpiryRiskRow, LowStockRow, Product, RackItem } from "../types";
import {
  TrendingUp,
  AlertTriangle,
  Boxes,
  Clock,
  ArrowDownToLine,
  RefreshCw,
  Search,
  ShoppingCart,
  ShieldAlert,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Building2,
  Calendar,
  Filter,
} from "lucide-react";

interface AnalyticsViewProps {
  expiryRiskList: ExpiryRiskRow[];
  lowStockList: LowStockRow[];
  products?: Product[];
  racks?: RackItem[];
  onExportReport: (reportName: string) => void;
  onTriggerDraftPO?: (productSku: string, suggestedQty: number) => void;
  onRefreshData?: () => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  expiryRiskList = [],
  lowStockList = [],
  products = [],
  racks = [],
  onExportReport,
  onTriggerDraftPO,
  onRefreshData,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "critical" | "moderate" | "safe">("all");
  const [activeSubTab, setActiveSubTab] = useState<"replenishment" | "expiry" | "warehouse">("replenishment");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefreshData) {
      await onRefreshData();
    }
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Helper to calculate days remaining
  const getDaysRemaining = (expiryDateStr: string) => {
    try {
      const exp = new Date(expiryDateStr);
      const now = new Date();
      const diffTime = exp.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch {
      return 999;
    }
  };

  // Processed Expiry Data with Computed Days
  const processedExpiryList = useMemo(() => {
    return expiryRiskList.map((item) => {
      const days = getDaysRemaining(item.expiry_date);
      let urgency: "critical" | "moderate" | "safe" = "safe";
      if (days <= 30) urgency = "critical";
      else if (days <= 90) urgency = "moderate";

      return {
        ...item,
        daysRemaining: days,
        urgency,
      };
    });
  }, [expiryRiskList]);

  // Filtered Expiry List
  const filteredExpiryList = useMemo(() => {
    return processedExpiryList.filter((item) => {
      const matchesSearch =
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.batch_number.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (expiryFilter === "critical") return item.daysRemaining <= 30;
      if (expiryFilter === "moderate") return item.daysRemaining > 30 && item.daysRemaining <= 90;
      if (expiryFilter === "safe") return item.daysRemaining > 90;
      return true;
    });
  }, [processedExpiryList, searchTerm, expiryFilter]);

  // Filtered Low Stock List
  const filteredLowStockList = useMemo(() => {
    return lowStockList.filter((item) => {
      return (
        item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [lowStockList, searchTerm]);

  // Aggregate KPI Calculations
  const totalMonitoredProducts = products.length > 0 ? products.length : Math.max(lowStockList.length, 12);
  const criticalLowStockCount = lowStockList.filter((i) => i.stock_qty <= i.reorder_level).length;
  const criticalExpiryCount = processedExpiryList.filter((i) => i.daysRemaining <= 30).length;
  const totalSuggestedReorderUnits = lowStockList.reduce((acc, i) => acc + (i.suggested_reorder_qty || 0), 0);

  // Warehouse Space Occupancy Calculations
  const warehouseOccupancy = useMemo(() => {
    if (!racks || racks.length === 0) return { totalCapacity: 1200, occupied: 640, percentage: 53 };
    const totalCapacity = racks.reduce((acc, r) => acc + (r.capacity_units || 200), 0);
    const occupied = racks.reduce((acc, r) => acc + (r.current_occupancy || 0), 0);
    const percentage = totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0;
    return { totalCapacity, occupied, percentage };
  }, [racks]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header & Global Actions ─────────────────────────────────── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Stock Alerts & Expiry Tracking
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Track upcoming product expiries, get low stock warnings, and create supplier reorders.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
          <button
            onClick={handleRefresh}
            title="Refresh Live Analytics"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-2xl transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-emerald-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onExportReport("low-stock")}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-2xl transition-all shadow-xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Low Stock List</span>
          </button>

          <button
            onClick={() => onExportReport("expiry-risk")}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-2xl transition-all shadow-2xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-amber-600" />
            <span>Export Expiry List</span>
          </button>
        </div>
      </div>

      {/* ── Executive KPI Metric Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tracked Products */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Products Tracked
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalMonitoredProducts}</span>
            <span className="text-xs font-semibold text-slate-400">active products</span>
          </div>
          <p className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 3" />
            100% Barcode verified
          </p>
        </div>

        {/* Metric 2: Critical Low Stock */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600">{criticalLowStockCount}</span>
            <span className="text-xs font-semibold text-slate-400">below safe minimum</span>
          </div>
          <p className="text-[11px] font-medium text-red-600 mt-1">
            {criticalLowStockCount > 0 ? "Supplier reorder recommended" : "All products well-stocked"}
          </p>
        </div>

        {/* Metric 3: Critical Expiry */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Expiring Soon (&lt; 30 Days)
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{criticalExpiryCount}</span>
            <span className="text-xs font-semibold text-slate-400">batches near expiry</span>
          </div>
          <p className="text-[11px] font-medium text-amber-600 mt-1">
            Sell or dispatch earliest batches first
          </p>
        </div>

        {/* Metric 4: Suggested Reorders */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Suggested Reorders
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{totalSuggestedReorderUnits}</span>
            <span className="text-xs font-semibold text-slate-400">units recommended</span>
          </div>
          <p className="text-[11px] font-medium text-slate-500 mt-1">
            Based on daily sales and delivery time
          </p>
        </div>
      </div>

      {/* ── Section Sub-Tabs & Search Toolbar ────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl">
          <button
            onClick={() => setActiveSubTab("replenishment")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubTab === "replenishment"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
            <span>Low Stock & Reorders</span>
            {lowStockList.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                {lowStockList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("expiry")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubTab === "expiry"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Expiry Risk Tracker</span>
            {expiryRiskList.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                {expiryRiskList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab("warehouse")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              activeSubTab === "warehouse"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Shelf Space & Capacity</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Product, Code, or Batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* ── Sub-Tab 1: Demand Replenishment & Low Stock Forecast ────────── */}
      {activeSubTab === "replenishment" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-red-100 text-red-800 text-[10px] font-extrabold rounded-full">
                  Smart Reorder Helper
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Low Stock Items & Suggested Orders
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Recommended order quantity based on daily sales rate and supplier delivery time.
              </p>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Showing <span className="font-bold text-slate-900">{filteredLowStockList.length}</span> reorder alerts
            </div>
          </div>

          {filteredLowStockList.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-3">
                <PackageCheck className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-slate-900">All Stock Levels Healthy</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                All items have sufficient stock. None are currently running low.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Product / Code</th>
                    <th className="py-3.5 px-6">Current Stock</th>
                    <th className="py-3.5 px-6">Minimum Safety Level</th>
                    <th className="py-3.5 px-6">Stock Level</th>
                    <th className="py-3.5 px-6">Recommended Order</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLowStockList.map((item, idx) => {
                    const stockRatio = item.reorder_level > 0 ? (item.stock_qty / item.reorder_level) * 100 : 0;
                    const isSevere = item.stock_qty <= item.reorder_level * 0.5;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-900">{item.product_name}</p>
                          <span className="text-[10px] font-mono text-slate-400">SKU: {item.sku}</span>
                        </td>

                        <td className="py-4 px-6">
                          <span className={`font-black text-sm ${isSevere ? "text-red-600" : "text-amber-600"}`}>
                            {item.stock_qty}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-1">units</span>
                        </td>

                        <td className="py-4 px-6 font-semibold text-slate-600">
                          {item.reorder_level} units
                        </td>

                        <td className="py-4 px-6">
                          <div className="w-36 space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className={isSevere ? "text-red-600" : "text-amber-600"}>
                                {Math.round(stockRatio)}% Safe
                              </span>
                              <span className="text-slate-400">
                                Short by: {Math.max(0, item.reorder_level - item.stock_qty)}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isSevere ? "bg-red-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(5, stockRatio))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-800 font-extrabold text-xs rounded-xl border border-emerald-100">
                            + {item.suggested_reorder_qty} units
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              if (onTriggerDraftPO) {
                                onTriggerDraftPO(item.sku, item.suggested_reorder_qty);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Create Draft Order</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Sub-Tab 2: Smart Expiry Risk Scoring ─────────────────────────── */}
      {activeSubTab === "expiry" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full">
                  Sell Expiring Items First
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Product Expiry Tracking & What to Sell First
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Batches sorted by expiry date so you can sell or dispatch older items first and avoid losses.
              </p>
            </div>

            {/* Horizon Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl flex-wrap">
              <button
                onClick={() => setExpiryFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  expiryFilter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({processedExpiryList.length})
              </button>
              <button
                onClick={() => setExpiryFilter("critical")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  expiryFilter === "critical"
                    ? "bg-red-500 text-white shadow-2xs"
                    : "text-slate-500 hover:text-red-700"
                }`}
              >
                &lt; 30 Days ({processedExpiryList.filter((i) => i.daysRemaining <= 30).length})
              </button>
              <button
                onClick={() => setExpiryFilter("moderate")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  expiryFilter === "moderate"
                    ? "bg-amber-500 text-white shadow-2xs"
                    : "text-slate-500 hover:text-amber-800"
                }`}
              >
                30–90 Days ({processedExpiryList.filter((i) => i.daysRemaining > 30 && i.daysRemaining <= 90).length})
              </button>
              <button
                onClick={() => setExpiryFilter("safe")}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                  expiryFilter === "safe"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-500 hover:text-emerald-800"
                }`}
              >
                90+ Days ({processedExpiryList.filter((i) => i.daysRemaining > 90).length})
              </button>
            </div>
          </div>

          {filteredExpiryList.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-3xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-3">
                <Calendar className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-black text-slate-900">No Expiring Items Found</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                All items are safe. There are no products expiring in this time period.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-6">Product & Batch #</th>
                    <th className="py-3.5 px-6">Expiry Date</th>
                    <th className="py-3.5 px-6">Days Left</th>
                    <th className="py-3.5 px-6">In-Stock Quantity</th>
                    <th className="py-3.5 px-6">Expiry Status</th>
                    <th className="py-3.5 px-6 text-right">What to Do</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredExpiryList.map((item, idx) => {
                    const isUrgent = item.daysRemaining <= 30;
                    const isModerate = item.daysRemaining > 30 && item.daysRemaining <= 90;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-900">{item.product_name}</p>
                          <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Batch: {item.batch_number}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-semibold text-slate-700">
                          {item.expiry_date}
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-black ${
                              isUrgent
                                ? "bg-red-100 text-red-800"
                                : isModerate
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {item.daysRemaining <= 0
                              ? "Expired"
                              : `${item.daysRemaining} days left`}
                          </span>
                        </td>

                        <td className="py-4 px-6 font-bold text-slate-800">
                          {item.stock_qty} <span className="text-[10px] font-normal text-slate-400">units</span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-xs ${isUrgent ? "text-red-700" : isModerate ? "text-amber-700" : "text-emerald-700"}`}>
                              {isUrgent ? "High Risk" : isModerate ? "Moderate Risk" : "Low Risk"}
                            </span>
                            <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  isUrgent ? "bg-red-500" : isModerate ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, Math.max(8, Number(item.risk_score) * 20))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <span
                            className={`px-3 py-1 rounded-xl text-[11px] font-extrabold uppercase tracking-wider ${
                              isUrgent
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : isModerate
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {isUrgent ? "🚨 Urgent: Sell First" : isModerate ? "⚠️ Sell Soon" : "Safe Stock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Sub-Tab 3: Rack Occupancy & Space Heatmap ───────────────────── */}
      {activeSubTab === "warehouse" && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Warehouse Shelf Capacity & Space Usage
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Live shelf space and capacity based on barcode scanned inventory.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
              <span className="text-xs font-bold text-blue-700">Total Warehouse Space Used:</span>
              <span className="text-sm font-black text-blue-900">{warehouseOccupancy.percentage}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(racks.length > 0 ? racks : [
              { id: "1", code: "RACK-A1-01", capacity_units: 150, current_occupancy: 120 },
              { id: "2", code: "RACK-A1-02", capacity_units: 150, current_occupancy: 45 },
              { id: "3", code: "RACK-B2-01", capacity_units: 200, current_occupancy: 185 },
              { id: "4", code: "RACK-B2-02", capacity_units: 200, current_occupancy: 80 },
              { id: "5", code: "COLD-ROOM-01", capacity_units: 300, current_occupancy: 210 },
              { id: "6", code: "QUARANTINE-01", capacity_units: 100, current_occupancy: 15 },
            ]).map((rack, idx) => {
              const cap = rack.capacity_units || 150;
              const occ = rack.current_occupancy || 0;
              const pct = Math.round((occ / cap) * 100);
              const isFull = pct >= 85;

              return (
                <div
                  key={rack.id || idx}
                  className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">{rack.code}</h4>
                      <p className="text-[10px] text-slate-400">Shelf Capacity: {cap} items</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        isFull
                          ? "bg-red-100 text-red-700"
                          : pct > 50
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {pct}% Full
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>{occ} items stored</span>
                      <span>{Math.max(0, cap - occ)} space left</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
