"use client";

import { useState } from "react";

type Role = "owner" | "warehouse_manager" | "purchase_team";

export default function WebAdminDashboard() {
  const [activeRole, setActiveRole] = useState<Role>("owner");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased p-6 md:p-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-lg shadow-md shadow-blue-500/20">VET</span>
            Vetecura Web Admin
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Enterprise Management & Operational Control System
          </p>
        </div>

        {/* Role Selector */}
        <div className="flex bg-slate-200/80 p-1.5 rounded-xl border border-slate-300">
          {(["owner", "warehouse_manager", "purchase_team"] as Role[]).map((role) => (
            <button
              key={role}
              onClick={() => setActiveRole(role)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg capitalize transition-all ${
                activeRole === role
                  ? "bg-white text-blue-600 shadow-sm font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {role.replace("_", " ")}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-8">
        {/* OWNER DASHBOARD */}
        {activeRole === "owner" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Executive Owner Overview</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inventory Value</p>
                <p className="text-3xl font-black text-emerald-600 mt-2">$150,000</p>
                <span className="text-xs text-emerald-600 font-bold">↑ 4.2% from last month</span>
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispatch Volume (30D)</p>
                <p className="text-3xl font-black text-blue-600 mt-2">12,450 units</p>
                <span className="text-xs text-blue-600 font-bold">100% Barcode verified</span>
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Anomalies</p>
                <p className="text-3xl font-black text-slate-900 mt-2">0</p>
                <span className="text-xs text-slate-500 font-semibold">Chain verified (Audit Log)</span>
              </div>
              <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiry Risk Alerts</p>
                <p className="text-3xl font-black text-amber-600 mt-2">1 Batch</p>
                <span className="text-xs text-amber-600 font-bold">Risk Score: 20.0</span>
              </div>
            </div>

            {/* Vendor Scorecard Summary */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">Vendor Performance Summary</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Supplier Name</th>
                      <th className="p-3">On-Time Delivery</th>
                      <th className="p-3">Rejection Rate</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">PharmaCare Ltd</td>
                      <td className="p-3 text-emerald-600 font-bold">98.5%</td>
                      <td className="p-3 text-slate-600">0.2%</td>
                      <td className="p-3"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-bold">Preferred</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-slate-900">MediSupply Global</td>
                      <td className="p-3 text-amber-600 font-bold">89.0%</td>
                      <td className="p-3 text-red-600 font-bold">2.1%</td>
                      <td className="p-3"><span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-md text-xs font-bold">Under Review</span></td>
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
            <h2 className="text-xl font-bold text-slate-800">Warehouse Manager Operations</h2>

            {/* Surfaced Approvals Section (Rule §3: Approvals surfaced, not buried) */}
            <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-amber-900 mb-1">Surfaced Approvals Needed</h3>
              <p className="text-xs text-amber-700 mb-4 font-medium">Pending manager decisions requiring immediate review.</p>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Write-Off Request</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">Damaged Bottle - Vitamin D3 (Barcode #VET-VD2207-000004)</p>
                    <p className="text-xs text-slate-500">Photo Proof Verified • Requested by Staff A</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-sm">Approve</button>
                    <button className="px-3.5 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all border border-slate-300">Reject</button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
                  <div>
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Purchase Order Approval</span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">PO #2026-0041 • 500 units Vitamin C 1000mg</p>
                    <p className="text-xs text-slate-500">Total: $4,500.00 • Submitted by Purchase Team</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm">Approve PO</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Operational Rack Occupancy */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">Rack Occupancy Overview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">Rack A-01</span>
                  <p className="text-lg font-bold text-emerald-600 mt-1">45 / 50 units</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">Rack B-12</span>
                  <p className="text-lg font-bold text-amber-600 mt-1">49 / 50 units</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">Rack C-05</span>
                  <p className="text-lg font-bold text-blue-600 mt-1">10 / 50 units</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-semibold">Damage Warehouse</span>
                  <p className="text-lg font-bold text-red-600 mt-1">3 units</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PURCHASE TEAM DASHBOARD */}
        {activeRole === "purchase_team" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Purchase Team Reorder Center</h2>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
              <h3 className="text-base font-bold text-slate-800 mb-4">Low Stock Reorder Suggestions</h3>
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Reorder Level</th>
                    <th className="p-3">Suggested Reorder Qty</th>
                    <th className="p-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">Vitamin D3 Softgels 2000IU</td>
                    <td className="p-3 font-mono text-xs text-slate-500">VD2207</td>
                    <td className="p-3 text-red-600 font-bold">12 units</td>
                    <td className="p-3">50 units</td>
                    <td className="p-3 text-emerald-600 font-bold">+88 units</td>
                    <td className="p-3">
                      <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm">Draft PO</button>
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
