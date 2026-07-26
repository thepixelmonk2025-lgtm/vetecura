"use client";

import { useState } from "react";

type Role = "owner" | "warehouse_manager" | "purchase_team";
type ThemeMode = "light" | "dark";

export default function WebAdminDashboard() {
  const [activeRole, setActiveRole] = useState<Role>("owner");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

  const isDark = themeMode === "dark";

  return (
    <div
      className={`min-h-screen font-sans antialiased p-6 md:p-10 transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Header */}
      <header
        className={`max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b ${
          isDark ? "border-slate-800" : "border-slate-200"
        }`}
      >
        <div>
          <h1
            className={`text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3 ${
              isDark ? "text-white" : "text-slate-900"
            }`}
          >
            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-lg shadow-md shadow-blue-500/20">
              VET
            </span>
            Vetecura Web Admin
          </h1>
          <p className={`text-sm mt-1 font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Enterprise Management & Operational Control System
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle Button */}
          <button
            onClick={() => setThemeMode(isDark ? "light" : "dark")}
            className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-2 transition-all ${
              isDark
                ? "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm"
            }`}
          >
            {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>

          {/* Role Selector */}
          <div
            className={`flex p-1.5 rounded-xl border ${
              isDark ? "bg-slate-900 border-slate-800" : "bg-slate-200/80 border-slate-300"
            }`}
          >
            {(["owner", "warehouse_manager", "purchase_team"] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                  activeRole === role
                    ? isDark
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-bold"
                      : "bg-white text-blue-600 shadow-sm font-bold"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {role.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* OWNER DASHBOARD */}
        {activeRole === "owner" && (
          <div className="space-y-6">
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Executive Owner Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div
                className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Total Inventory Value
                </p>
                <p className={`text-3xl font-black mt-2 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                  $150,000
                </p>
                <span className={`text-xs font-bold ${isDark ? "text-emerald-500" : "text-emerald-600"}`}>
                  ↑ 4.2% from last month
                </span>
              </div>
              <div
                className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Dispatch Volume (30D)
                </p>
                <p className={`text-3xl font-black mt-2 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                  12,450 units
                </p>
                <span className={`text-xs font-bold ${isDark ? "text-blue-500" : "text-blue-600"}`}>
                  100% Barcode verified
                </span>
              </div>
              <div
                className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Security Anomalies
                </p>
                <p className={`text-3xl font-black mt-2 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                  0
                </p>
                <span className={`text-xs font-semibold ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  Chain verified (Audit Log)
                </span>
              </div>
              <div
                className={`p-6 rounded-2xl border ${
                  isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                }`}
              >
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Expiry Risk Alerts
                </p>
                <p className={`text-3xl font-black mt-2 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                  1 Batch
                </p>
                <span className={`text-xs font-bold ${isDark ? "text-amber-500" : "text-amber-600"}`}>
                  Risk Score: 20.0
                </span>
              </div>
            </div>

            {/* Vendor Scorecard Summary */}
            <div
              className={`p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <h3 className={`text-base font-bold mb-4 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Vendor Performance Summary
              </h3>
              <div className="overflow-x-auto">
                <table className={`w-full text-left text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  <thead
                    className={`font-bold border-b ${
                      isDark ? "bg-slate-950 text-slate-300 border-slate-800" : "bg-slate-100 text-slate-700 border-slate-200"
                    }`}
                  >
                    <tr>
                      <th className="p-3">Supplier Name</th>
                      <th className="p-3">On-Time Delivery</th>
                      <th className="p-3">Rejection Rate</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                    <tr>
                      <td className={`p-3 font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        PharmaCare Ltd
                      </td>
                      <td className="p-3 text-emerald-500 font-bold">98.5%</td>
                      <td className="p-3">0.2%</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-xs font-bold">
                          Preferred
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className={`p-3 font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                        MediSupply Global
                      </td>
                      <td className="p-3 text-amber-500 font-bold">89.0%</td>
                      <td className="p-3 text-red-500 font-bold">2.1%</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-md text-xs font-bold">
                          Under Review
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* WAREHOUSE MANAGER DASHBOARD */}
        {activeRole === "warehouse_manager" && (
          <div className="space-y-6">
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Warehouse Manager Operations
            </h2>

            {/* Surfaced Approvals Section */}
            <div
              className={`p-6 rounded-2xl border ${
                isDark
                  ? "bg-amber-500/10 border-amber-500/20"
                  : "bg-amber-50 border-amber-200 shadow-sm"
              }`}
            >
              <h3 className={`text-base font-bold mb-1 ${isDark ? "text-amber-400" : "text-amber-900"}`}>
                Surfaced Approvals Needed
              </h3>
              <p className={`text-xs mb-4 font-medium ${isDark ? "text-amber-300/80" : "text-amber-700"}`}>
                Pending manager decisions requiring immediate review.
              </p>

              <div className="space-y-3">
                <div
                  className={`flex justify-between items-center p-4 rounded-xl border shadow-sm ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-amber-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                      Write-Off Request
                    </span>
                    <p className={`text-sm font-bold mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                      Damaged Bottle - Vitamin D3 (Barcode #VET-VD2207-000004)
                    </p>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Photo Proof Verified • Requested by Staff A
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-sm">
                      Approve
                    </button>
                    <button
                      className={`px-3.5 py-1.5 text-xs font-bold border rounded-lg transition-all ${
                        isDark
                          ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div
                  className={`flex justify-between items-center p-4 rounded-xl border shadow-sm ${
                    isDark ? "bg-slate-900 border-slate-800" : "bg-white border-amber-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                      Purchase Order Approval
                    </span>
                    <p className={`text-sm font-bold mt-0.5 ${isDark ? "text-white" : "text-slate-900"}`}>
                      PO #2026-0041 • 500 units Vitamin C 1000mg
                    </p>
                    <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Total: $4,500.00 • Submitted by Purchase Team
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-sm">
                      Approve PO
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Rack Occupancy */}
            <div
              className={`p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <h3 className={`text-base font-bold mb-4 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Rack Occupancy Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div
                  className={`p-4 rounded-xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Rack A-01
                  </span>
                  <p className="text-lg font-bold text-emerald-500 mt-1">45 / 50 units</p>
                </div>
                <div
                  className={`p-4 rounded-xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Rack B-12
                  </span>
                  <p className="text-lg font-bold text-amber-500 mt-1">49 / 50 units</p>
                </div>
                <div
                  className={`p-4 rounded-xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Rack C-05
                  </span>
                  <p className="text-lg font-bold text-blue-500 mt-1">10 / 50 units</p>
                </div>
                <div
                  className={`p-4 rounded-xl border ${
                    isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <span className={`text-xs font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Damage Warehouse
                  </span>
                  <p className="text-lg font-bold text-red-500 mt-1">3 units</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PURCHASE TEAM DASHBOARD */}
        {activeRole === "purchase_team" && (
          <div className="space-y-6">
            <h2 className={`text-xl font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
              Purchase Team Reorder Center
            </h2>

            <div
              className={`p-6 rounded-2xl border ${
                isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"
              }`}
            >
              <h3 className={`text-base font-bold mb-4 ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                Low Stock Reorder Suggestions
              </h3>
              <table className={`w-full text-left text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                <thead
                  className={`font-bold border-b ${
                    isDark ? "bg-slate-950 text-slate-300 border-slate-800" : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Reorder Level</th>
                    <th className="p-3">Suggested Reorder Qty</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                  <tr>
                    <td className={`p-3 font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>
                      Vitamin D3 Softgels 2000IU
                    </td>
                    <td className="p-3 font-mono text-xs opacity-70">VD2207</td>
                    <td className="p-3 text-red-500 font-bold">12 units</td>
                    <td className="p-3">50 units</td>
                    <td className="p-3 text-emerald-500 font-bold">+88 units</td>
                    <td className="p-3">
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm">
                        Draft PO
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
