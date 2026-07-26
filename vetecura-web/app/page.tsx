"use client";

import { useState } from "react";

type Role = "owner" | "warehouse_manager" | "purchase_team";
type Tab = "overview" | "inbound" | "dispatch" | "inventory" | "reports";

export default function WebAdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [userEmail, setUserEmail] = useState("owner@vetecura.com");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [activeRole, setActiveRole] = useState<Role>("owner");
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isDark, setIsDark] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setUserEmail(loginEmail);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoginEmail("");
    setLoginPassword("");
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
        <div className={`w-full max-w-md p-8 rounded-3xl border shadow-2xl ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-blue-500/30">
              V
            </div>
            <div>
              <h1 className="text-xl font-bold">Vetecura IMS</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Smart Barcode Inventory System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Sign in with your corporate credentials.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                required
                placeholder="manager@vetecura.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={`w-full px-4 py-3 text-sm rounded-xl border outline-none ${
                  isDark ? "bg-slate-950 border-slate-800 focus:border-blue-500 text-white" : "bg-slate-50 border-slate-200 focus:border-blue-600 text-slate-900"
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`w-full px-4 py-3 text-sm rounded-xl border outline-none ${
                  isDark ? "bg-slate-950 border-slate-800 focus:border-blue-500 text-white" : "bg-slate-50 border-slate-200 focus:border-blue-600 text-slate-900"
                }`}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all mt-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- REDESIGNED SAAS SIDEBAR LAYOUT ---
  return (
    <div className={`min-h-screen flex ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className={`w-64 border-r flex flex-col justify-between p-5 ${isDark ? "bg-slate-900/80 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/25">
              V
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight tracking-tight">Vetecura IMS</h1>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                Enterprise
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Main Menu</p>
            {[
              { id: "overview", label: "Dashboard", icon: "📊" },
              { id: "inbound", label: "Inbound GRN", icon: "📦" },
              { id: "dispatch", label: "Outbound Dispatch", icon: "🚚" },
              { id: "inventory", label: "Rack Inventory", icon: "🏬" },
              { id: "reports", label: "Reports & Audit", icon: "🛡️" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  activeTab === item.id
                    ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20"
                    : isDark
                    ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* User Account & Logout in Sidebar Footer */}
        <div className={`p-3.5 rounded-2xl border ${isDark ? "bg-slate-950 border-slate-800" : "bg-slate-50 border-slate-200"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shrink-0">
                {userEmail.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold truncate">{userEmail}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold capitalize">{activeRole.replace("_", " ")}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TOP NAVBAR */}
        <header className={`h-16 border-b px-8 flex items-center justify-between ${isDark ? "bg-slate-900/50 border-slate-800" : "bg-white border-slate-200"}`}>
          {/* Search bar */}
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Search products, SKUs, GRNs, barcodes..."
              className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border outline-none transition-all ${
                isDark ? "bg-slate-950 border-slate-800 text-white focus:border-blue-500" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-600"
              }`}
            />
            <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
          </div>

          {/* Top Controls: Role Switcher + Dark Mode Toggle */}
          <div className="flex items-center gap-4">
            {/* Role Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Role:</span>
              {(["owner", "warehouse_manager", "purchase_team"] as Role[]).map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all ${
                    activeRole === role
                      ? "bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {role.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Dark Mode Switcher */}
            <button
              onClick={() => setIsDark(!isDark)}
              className={`p-2 text-xs rounded-xl border font-bold transition-all ${
                isDark ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm"
              }`}
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </header>

        {/* WORKSPACE CONTENT */}
        <main className="flex-1 p-8 space-y-8 overflow-y-auto">
          {/* Header Title */}
          <div className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-black tracking-tight capitalize">
                {activeRole.replace("_", " ")} Dashboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Real-time stock verification, audit logs, and operational controls.
              </p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all">
                + Create GRN Inbound
              </button>
            </div>
          </div>

          {/* DASHBOARD CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className={`p-5 rounded-2xl border transition-all ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventory Value</span>
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold text-xs">💰</span>
              </div>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-3">$150,000</p>
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">↑ 4.2% from last month</p>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dispatch Volume</span>
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 font-bold text-xs">📦</span>
              </div>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-3">12,450 units</p>
              <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1">100% Barcode verified</p>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security Anomalies</span>
                <span className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold text-xs">🛡️</span>
              </div>
              <p className="text-2xl font-black mt-3">0</p>
              <p className="text-[11px] font-semibold text-slate-400 mt-1">Hash-Chain Audit Verified</p>
            </div>

            <div className={`p-5 rounded-2xl border transition-all ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Risk</span>
                <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 font-bold text-xs">⚠️</span>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-3">1 Batch</p>
              <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-1">Risk Score: 20.0</p>
            </div>
          </div>

          {/* SURFACED APPROVALS OR TABLE SECTION */}
          {activeRole === "warehouse_manager" && (
            <div className="p-6 rounded-2xl border bg-amber-500/10 border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-amber-600 dark:text-amber-400">Surfaced Approvals Needed</h3>
                  <p className="text-xs text-amber-700 dark:text-amber-300">Requires manager verification before system stock execution.</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-500 text-white font-bold text-xs rounded-full">2 Pending</span>
              </div>

              <div className="space-y-3">
                <div className={`p-4 rounded-xl border flex justify-between items-center ${isDark ? "bg-slate-900 border-slate-800" : "bg-white border-amber-200"}`}>
                  <div>
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Damage Write-Off</span>
                    <p className="text-sm font-bold mt-0.5">Damaged Vitamin D3 (Barcode #VET-VD2207-000004)</p>
                    <p className="text-xs text-slate-400">Photo Proof Verified • Requested by Staff A</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-sm hover:bg-emerald-700">Approve</button>
                    <button className="px-3.5 py-1.5 text-xs font-bold border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800">Reject</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DATA TABLE */}
          <div className={`p-6 rounded-2xl border ${isDark ? "bg-slate-900/60 border-slate-800" : "bg-white border-slate-200 shadow-sm"}`}>
            <h3 className="text-base font-bold mb-4">Vendor Performance & Stock Compliance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className={`text-xs uppercase tracking-wider font-bold border-b ${isDark ? "bg-slate-950 text-slate-400 border-slate-800" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  <tr>
                    <th className="p-3.5">Supplier Name</th>
                    <th className="p-3.5">On-Time Delivery</th>
                    <th className="p-3.5">Rejection Rate</th>
                    <th className="p-3.5">Audit Log Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-slate-800" : "divide-slate-100"}`}>
                  <tr>
                    <td className="p-3.5 font-bold">PharmaCare Ltd</td>
                    <td className="p-3.5 text-emerald-600 font-bold">98.5%</td>
                    <td className="p-3.5">0.2%</td>
                    <td className="p-3.5"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold rounded-lg text-xs">Verified</span></td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold">MediSupply Global</td>
                    <td className="p-3.5 text-amber-600 font-bold">89.0%</td>
                    <td className="p-3.5 text-red-600 font-bold">2.1%</td>
                    <td className="p-3.5"><span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 font-bold rounded-lg text-xs">Under Review</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
