"use client";

import { useState } from "react";

type Role = "owner" | "warehouse_manager" | "purchase_team";
type NavTab = "dashboard" | "inbound" | "dispatch" | "inventory" | "reports";

export default function WebAdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeRole, setActiveRole] = useState<Role>("owner");
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [userName, setUserName] = useState("Kennedy Jones");
  const [userRoleTitle, setUserRoleTitle] = useState("Executive Owner");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setUserName(loginEmail.split("@")[0].replace(".", " "));
    setIsLoggedIn(true);
  };

  const handleRoleChange = (role: Role) => {
    setActiveRole(role);
    if (role === "owner") {
      setUserName("Kennedy Jones");
      setUserRoleTitle("Executive Owner");
    } else if (role === "warehouse_manager") {
      setUserName("Ruben Philips");
      setUserRoleTitle("Warehouse Manager");
    } else {
      setUserName("Emery Donin");
      setUserRoleTitle("Purchase Lead");
    }
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0d3b33] flex items-center justify-center p-6 font-sans text-slate-800">
        <div className="w-full max-w-md p-8 rounded-3xl bg-white shadow-2xl border border-emerald-900/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-2xl bg-[#004D40] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-emerald-900/20">
              ⚡
            </div>
            <div>
              <h1 className="text-xl font-black text-[#004D40]">Vetecura IMS</h1>
              <p className="text-xs text-slate-500 font-medium">Smart Barcode Inventory System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-xs text-slate-500 mb-6">Sign in to access your role workspace.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                required
                placeholder="manager@vetecura.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-[#004D40] focus:bg-white transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-[#004D40] focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-[#004D40] hover:bg-[#00382f] text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition-all mt-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- REDESIGNED TALENTASYNC DASHBOARD DESIGN ---
  return (
    <div className="min-h-screen bg-[#f3f6f4] font-sans text-slate-800 antialiased pb-12">
      {/* TOP HEADER CONTAINER (Deep Emerald Green Header) */}
      <header className="bg-[#0b3c34] text-white px-6 md:px-12 pt-6 pb-20 shadow-md">
        {/* Top Header Bar */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-emerald-800/40 pb-5">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-white font-extrabold text-lg">
              ⚡
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">Vetecura</span>
          </div>

          {/* Center Pill Navbar */}
          <nav className="flex items-center bg-[#072a24] p-1.5 rounded-full border border-emerald-800/50 shadow-inner">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "inbound", label: "Inbound GRN", icon: "📦" },
              { id: "dispatch", label: "Dispatch", icon: "🚚" },
              { id: "inventory", label: "Inventory", icon: "🏬" },
              { id: "reports", label: "Reports", icon: "🛡️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavTab)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                  activeTab === tab.id
                    ? "bg-[#185348] text-white shadow-md font-bold"
                    : "text-emerald-200/70 hover:text-white"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right User Profile & Controls */}
          <div className="flex items-center gap-3">
            {/* Role Switcher Pill */}
            <div className="flex items-center bg-[#072a24] p-1 rounded-full border border-emerald-800/50">
              {(["owner", "warehouse_manager", "purchase_team"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`px-3 py-1 text-[11px] font-semibold rounded-full capitalize transition-all ${
                    activeRole === r ? "bg-emerald-500 text-white font-bold" : "text-emerald-300/70 hover:text-white"
                  }`}
                >
                  {r.replace("_", " ")}
                </button>
              ))}
            </div>

            <button title="Notifications" className="h-9 w-9 rounded-full bg-[#185348] hover:bg-emerald-700/50 border border-emerald-700/50 flex items-center justify-center text-xs text-white">
              🔔
            </button>

            {/* User Profile Avatar Pill */}
            <div className="flex items-center gap-2.5 bg-[#185348] pl-2 pr-3 py-1 rounded-full border border-emerald-700/50">
              <div className="h-7 w-7 rounded-full bg-emerald-400 text-emerald-950 font-black text-xs flex items-center justify-center uppercase">
                {userName.charAt(0)}
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <p className="text-xs font-bold text-white leading-none">{userName}</p>
                <p className="text-[10px] text-emerald-300 font-medium">{userRoleTitle}</p>
              </div>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              title="Sign Out"
              className="h-9 w-9 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 flex items-center justify-center text-xs text-red-200"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Good Morning Greeting Subheader */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center mt-6">
          <div>
            <p className="text-xs font-semibold text-emerald-300/80">Good Morning,</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight mt-0.5">{userName}</h1>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#185348] hover:bg-emerald-700/50 border border-emerald-700/50 text-white rounded-full text-xs font-semibold">
              📅 <span>2026</span> ▼
            </button>
            <button className="px-5 py-2.5 bg-white text-[#0b3c34] hover:bg-emerald-50 text-xs font-extrabold rounded-full shadow-lg shadow-black/10 transition-all">
              Export Audit Data
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER (OVERLAPPING METRIC CARDS) */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 -mt-12 space-y-6">
        {/* ROW 1: TOP STATS METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1 */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-sm">
                💼
              </div>
              <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                ↗
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">$150,000</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                  +4.2%
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">Total Inventory</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-sm">
                📦
              </div>
              <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                ↗
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">12,450</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                  +5.03%
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">Units Dispatched</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center text-sm">
                🛡️
              </div>
              <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                ↗
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">0</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                  Verified
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">Audit Anomalies</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center text-sm">
                ⚠️
              </div>
              <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-[10px] text-slate-400">
                ↗
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">1 Batch</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                  Risk 20
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">Expiry Risk Alerts</p>
            </div>
          </div>

          {/* Card 5: Add Widget Action Card */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-dashed border-slate-300 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 transition-all">
            <div className="h-11 w-11 rounded-full bg-[#0b3c34] text-white flex items-center justify-center text-xl font-bold shadow-md shadow-emerald-950/20 mb-2">
              +
            </div>
            <span className="text-xs font-bold text-slate-700">Add new widget</span>
          </div>
        </div>

        {/* ROW 2: THREE-COLUMN GRID SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1: ACTIVE DISPATCH ORDERS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Active Dispatches</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">24 Active Orders</p>
              </div>
              <div className="flex gap-1">
                <button className="h-6 w-6 rounded-full border border-slate-200 text-xs text-slate-400">←</button>
                <button className="h-6 w-6 rounded-full border border-slate-200 text-xs text-slate-400">→</button>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { name: "Senior Vaccine Batch A", type: "Cold-Chain Outbound", icon: "💉", color: "bg-red-500" },
                { name: "Vitamin D3 Softgels", type: "Standard Dispatch", icon: "💊", color: "bg-blue-500" },
                { name: "Surgical Gloves Pack", type: "Bulk Outbound", icon: "🧤", color: "bg-emerald-500" },
                { name: "Antiseptic Solution 1L", type: "Hazardous Outbound", icon: "🧪", color: "bg-amber-500" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-sm">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] font-medium text-slate-400">{item.type}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: SURFACED APPROVALS / PENDING SCANS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Pending Approvals</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">2 Items Requiring Manager Sign-Off</p>
              </div>
              <span className="text-slate-400 font-bold text-xs">•••</span>
            </div>

            <div className="space-y-3">
              {[
                { name: "Ruben Philips", title: "Damage Write-Off", time: "Mon 12, 2026 - 10:00 AM", avatar: "👨🏻‍💼" },
                { name: "Emery Donin", title: "PO #2026-0041 Approval", time: "Mon 12, 2026 - 10:30 AM", avatar: "👩🏽‍💼" },
                { name: "Charlie Korsgaard", title: "Cycle Count Variance", time: "Mon 12, 2026 - 11:15 AM", avatar: "👨🏼‍💼" },
                { name: "Ryan Vaccaro", title: "GRN Gate Entry Sign-Off", time: "Mon 12, 2026 - 11:45 AM", avatar: "👨🏻‍💻" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-lg">
                      {item.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{item.name}</p>
                      <p className="text-[10px] font-medium text-slate-400">{item.title}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[9px] font-semibold text-slate-600 bg-slate-200/70 rounded-full">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 3: STOCK DISTRIBUTION STATUS */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Rack Occupancy</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">Total Registered Stock</p>
              </div>
              <span className="text-xl font-black text-slate-900">3,109</span>
            </div>

            {/* Segmented Bar */}
            <div className="flex h-3 w-full rounded-full overflow-hidden gap-1 bg-slate-100">
              <div className="bg-[#0b3c34] w-[50%] h-full rounded-full"></div>
              <div className="bg-[#185348] w-[25%] h-full rounded-full"></div>
              <div className="bg-emerald-400 w-[15%] h-full rounded-full"></div>
              <div className="bg-slate-300 w-[10%] h-full rounded-full"></div>
            </div>

            {/* Category breakdown list */}
            <div className="space-y-3 pt-2">
              {[
                { label: "Rack A (High Velocity)", count: "1,554 units" },
                { label: "Rack B (Cold Chain Storage)", count: "777 units" },
                { label: "Rack C (Bulk Hold)", count: "466 units" },
                { label: "Damage Hold Warehouse", count: "312 units" },
              ].map((cat, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#0b3c34]"></span>
                    <span className="text-slate-600">{cat.label}</span>
                  </div>
                  <span className="font-bold text-slate-900">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3: BOTTOM KPI & HEATMAP SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KPI Percentage */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-2">
            <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider">Average Barcode Accuracy KPI</h3>
            <p className="text-4xl font-black text-slate-900">99,86%</p>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-3">
              <div className="h-full bg-[#0b3c34] w-[99.86%]"></div>
            </div>
          </div>

          {/* Audit Verification Heatmap Matrix */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-extrabold text-slate-900">Daily Scan Activity Overview</h3>
              <span className="text-xs text-slate-400 font-bold">2026 Log Matrix</span>
            </div>

            {/* Heatmap Dots Grid */}
            <div className="grid grid-cols-16 gap-1.5 py-2">
              {Array.from({ length: 48 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-md ${
                    i % 5 === 0
                      ? "bg-[#0b3c34]"
                      : i % 3 === 0
                      ? "bg-emerald-400"
                      : i % 2 === 0
                      ? "bg-emerald-200"
                      : "bg-slate-100"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
