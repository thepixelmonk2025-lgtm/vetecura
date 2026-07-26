"use client";

import { useState } from "react";

type NavTab = "dashboard" | "inbound" | "dispatch" | "inventory" | "reports";

// SVG Icon Helpers
function IconLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
    </svg>
  );
}

function IconGrid({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function IconBox({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </svg>
  );
}

function IconTruck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.25v11.25m0-11.25h-6.375c-.621 0-1.125.504-1.125 1.125v8.25" />
    </svg>
  );
}

function IconWarehouse({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25a.75.75 0 01-.75-.75V8.25a.75.75 0 01.405-.668l7.5-3.75a.75.75 0 01.69 0l7.5 3.75a.75.75 0 01.405.668V20.25a.75.75 0 01-.75.75h-4.5M10.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21" />
    </svg>
  );
}

function IconShield({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconBell({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  );
}

function IconArrowUpRight({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
    </svg>
  );
}

function IconWallet({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 7.5v9m-3.75-6h7.5" />
    </svg>
  );
}

function IconAlertTriangle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function IconPlus({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconLogout({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

export default function WebAdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [userName, setUserName] = useState("Ruben Philips");
  const [userRoleTitle] = useState("Warehouse Manager");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setUserName(loginEmail.split("@")[0].replace(".", " "));
    setIsLoggedIn(true);
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#062923] flex items-center justify-center p-4 sm:p-6 font-sans text-slate-800">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white shadow-2xl border border-emerald-900/10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-2xl bg-[#0b3c34] flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-900/20">
              <IconLogo className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#0b3c34]">Vetecura IMS</h1>
              <p className="text-xs text-slate-500 font-medium">Smart Barcode Inventory System</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-xs text-slate-500 mb-6">Sign in to access your corporate workspace.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
              <input
                type="email"
                required
                placeholder="manager@vetecura.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-[#0b3c34] focus:bg-white transition-all"
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
                className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50 outline-none focus:border-[#0b3c34] focus:bg-white transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-[#0b3c34] hover:bg-[#072a24] text-white text-sm font-bold rounded-2xl shadow-lg shadow-emerald-900/20 transition-all mt-2"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- MOBILE-OPTIMIZED FULL SYSTEM ---
  return (
    <div className="min-h-screen bg-[#f3f6f4] font-sans text-slate-800 antialiased pb-12">
      {/* TOP HEADER CONTAINER */}
      <header className="bg-[#052620] text-white px-4 sm:px-6 md:px-12 pt-4 sm:pt-6 pb-16 sm:pb-20 shadow-md">
        {/* Top Header Bar */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-emerald-800/40 pb-4 sm:pb-5">
          
          {/* Top Row for Mobile (Logo + Actions) */}
          <div className="flex items-center justify-between">
            {/* Logo Brand */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shadow-md">
                <IconLogo className="w-5 h-5" />
              </div>
              <span className="font-black text-xl sm:text-2xl tracking-tight text-white">Vetecura</span>
            </div>

            {/* Mobile Actions (Bell + Profile + Sign Out) */}
            <div className="flex md:hidden items-center gap-2">
              <button
                title="Notifications"
                className="relative h-9 w-9 rounded-full bg-[#0a3830] border border-emerald-600/50 flex items-center justify-center text-white shrink-0"
              >
                <IconBell className="w-4 h-4" />
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400"></span>
              </button>

              <div className="h-8 w-8 rounded-full bg-[#00a884] text-slate-950 font-black text-xs flex items-center justify-center uppercase shadow-sm shrink-0">
                {userName.charAt(0)}
              </div>

              <button
                onClick={() => setIsLoggedIn(false)}
                title="Sign Out"
                className="h-9 w-9 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-200 shrink-0"
              >
                <IconLogout className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Navigation Pill Bar (Smooth Horizontal Scroll on Mobile) */}
          <nav className="flex items-center bg-[#021814] p-1.5 rounded-full border border-emerald-700/60 shadow-inner overflow-x-auto max-w-full">
            {[
              { id: "dashboard", label: "Dashboard", icon: <IconGrid className="w-4 h-4" /> },
              { id: "inbound", label: "Inbound GRN", icon: <IconBox className="w-4 h-4" /> },
              { id: "dispatch", label: "Dispatch", icon: <IconTruck className="w-4 h-4" /> },
              { id: "inventory", label: "Inventory", icon: <IconWarehouse className="w-4 h-4" /> },
              { id: "reports", label: "Reports", icon: <IconShield className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as NavTab)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2 text-xs font-bold rounded-full transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#00a884] text-slate-950 shadow-lg shadow-emerald-500/20 font-black"
                    : "text-emerald-100/80 hover:text-white hover:bg-emerald-900/40"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Desktop Right Control Bar */}
          <div className="hidden md:flex items-center gap-3">
            <button
              title="Notifications"
              className="relative h-10 w-10 rounded-full bg-[#0a3830] hover:bg-emerald-700/50 border border-emerald-600/50 flex items-center justify-center text-white transition-colors shrink-0"
            >
              <IconBell className="w-4 h-4" />
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </button>

            <div className="flex items-center gap-3 bg-[#0a3830] pl-2.5 pr-4 py-1.5 rounded-full border border-emerald-600/50 shrink-0">
              <div className="h-8 w-8 rounded-full bg-[#00a884] text-slate-950 font-black text-xs flex items-center justify-center uppercase shadow-sm">
                {userName.charAt(0)}
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <p className="text-xs font-extrabold text-white leading-none">{userName}</p>
                <p className="text-[10px] text-emerald-300 font-semibold mt-0.5">{userRoleTitle}</p>
              </div>
            </div>

            <button
              onClick={() => setIsLoggedIn(false)}
              title="Sign Out"
              className="h-10 w-10 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 flex items-center justify-center text-red-200 transition-colors shrink-0"
            >
              <IconLogout className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subheader Greeting Bar */}
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 sm:mt-6 gap-3">
          <div>
            <p className="text-xs font-bold text-emerald-300/90 tracking-wide uppercase">
              {activeTab === "dashboard" && "Good Morning,"}
              {activeTab === "inbound" && "Module 02 • Stock In Management"}
              {activeTab === "dispatch" && "Module 03 • Outbound Dispatch Engine"}
              {activeTab === "inventory" && "Module 04 • Physical Warehouse Racks"}
              {activeTab === "reports" && "Module 05 • Immutable Audit & Anti-Theft"}
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5 capitalize">
              {activeTab === "dashboard" && userName}
              {activeTab === "inbound" && "Inbound Goods Received (GRN)"}
              {activeTab === "dispatch" && "Outbound Dispatch Verification"}
              {activeTab === "inventory" && "Rack & Stock Storage Map"}
              {activeTab === "reports" && "Audit Ledger & Telegram Logs"}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <button className="flex items-center gap-2 px-3.5 py-2 bg-[#0a3830] hover:bg-emerald-700/50 border border-emerald-600/50 text-white rounded-full text-xs font-bold">
              📅 <span>2026</span> ▼
            </button>
            <button className="px-4 sm:px-5 py-2 sm:py-2.5 bg-white text-[#052620] hover:bg-emerald-50 text-xs font-black rounded-full shadow-lg shadow-black/10 transition-all">
              Export Audit Data
            </button>
          </div>
        </div>
      </header>

      {/* DYNAMIC MAIN WORKSPACE CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 -mt-10 sm:-mt-12 space-y-6">
        {/* ----------------- TAB 1: DASHBOARD OVERVIEW ----------------- */}
        {activeTab === "dashboard" && (
          <>
            {/* STATS ROW (1-col mobile, 2-col tablet, 5-col desktop) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <IconWallet className="w-5 h-5" />
                  </div>
                  <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                    <IconArrowUpRight />
                  </span>
                </div>
                <div className="mt-3 sm:mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">$150,000</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">+4.2%</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-1">Total Inventory</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <IconBox className="w-5 h-5" />
                  </div>
                  <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                    <IconArrowUpRight />
                  </span>
                </div>
                <div className="mt-3 sm:mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">12,450</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">+5.03%</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-1">Units Dispatched</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <IconShield className="w-5 h-5" />
                  </div>
                  <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                    <IconArrowUpRight />
                  </span>
                </div>
                <div className="mt-3 sm:mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">0</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">Verified</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-1">Audit Anomalies</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center">
                    <IconAlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="h-6 w-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                    <IconArrowUpRight />
                  </span>
                </div>
                <div className="mt-3 sm:mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl sm:text-2xl font-black text-slate-900">1 Batch</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">Risk 20</span>
                  </div>
                  <p className="text-xs font-medium text-slate-400 mt-1">Expiry Risk Alerts</p>
                </div>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-dashed border-slate-300 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-500 transition-all">
                <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-[#052620] text-white flex items-center justify-center shadow-md shadow-emerald-950/20 mb-2">
                  <IconPlus className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-700">Add new widget</span>
              </div>
            </div>

            {/* THREE COLUMN SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Active Dispatches</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">24 Active Orders</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Senior Vaccine Batch A", type: "Cold-Chain Outbound", icon: <IconBox className="w-5 h-5 text-blue-600" /> },
                    { name: "Vitamin D3 Softgels", type: "Standard Dispatch", icon: <IconTruck className="w-5 h-5 text-emerald-600" /> },
                    { name: "Surgical Gloves Pack", type: "Bulk Outbound", icon: <IconWarehouse className="w-5 h-5 text-purple-600" /> },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                        {item.icon}
                      </div>
                      <div className="flex-1 truncate">
                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-[10px] font-medium text-slate-400">{item.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Pending Approvals</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">2 Items Requiring Sign-Off</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Ruben Philips", title: "Damage Write-Off", time: "10:00 AM", avatar: "RP" },
                    { name: "Emery Donin", title: "PO #2026-0041 Approval", time: "10:30 AM", avatar: "ED" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50">
                      <div className="flex items-center gap-3 truncate">
                        <div className="h-9 w-9 rounded-full bg-[#052620] text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.avatar}
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 truncate">{item.title}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-[9px] font-semibold text-slate-600 bg-slate-200/70 rounded-full shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Rack Occupancy</h3>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">Total Registered Stock</p>
                  </div>
                  <span className="text-xl font-black text-slate-900">3,109</span>
                </div>
                <div className="flex h-3 w-full rounded-full overflow-hidden gap-1 bg-slate-100">
                  <div className="bg-[#052620] w-[50%] h-full rounded-full"></div>
                  <div className="bg-[#0b3c34] w-[25%] h-full rounded-full"></div>
                  <div className="bg-emerald-400 w-[15%] h-full rounded-full"></div>
                  <div className="bg-slate-300 w-[10%] h-full rounded-full"></div>
                </div>
                <div className="space-y-2 pt-2 text-xs">
                  <div className="flex justify-between font-semibold"><span className="text-slate-600">Rack A (High Velocity)</span><span className="font-bold">1,554 units</span></div>
                  <div className="flex justify-between font-semibold"><span className="text-slate-600">Rack B (Cold Chain)</span><span className="font-bold">777 units</span></div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ----------------- TAB 2: INBOUND GRN PAGE ----------------- */}
        {activeTab === "inbound" && (
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Active Inbound Shipments & PO Ingestion</h2>
                <p className="text-xs text-slate-400">Scan incoming goods to generate 100% item-level barcode tracking.</p>
              </div>
              <button className="px-5 py-2.5 bg-[#00a884] text-slate-950 text-xs font-black rounded-full shadow-md w-full sm:w-auto">
                + Register New Gate Entry
              </button>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80">
              <h3 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider">Approved Purchase Orders Ready for GRN</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[550px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Supplier</th>
                      <th className="p-3">Expected Units</th>
                      <th className="p-3">GRN Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-blue-600">PO-2026-0041</td>
                      <td className="p-3">PharmaCare Ltd</td>
                      <td className="p-3 font-bold">500 units</td>
                      <td className="p-3"><span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">In Progress (342/500)</span></td>
                      <td className="p-3"><button className="px-4 py-1.5 bg-[#052620] text-white text-xs font-bold rounded-xl">Open PWA Scanner</button></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-blue-600">PO-2026-0039</td>
                      <td className="p-3">MediSupply Global</td>
                      <td className="p-3 font-bold">1,200 units</td>
                      <td className="p-3"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">Completed & Verified</span></td>
                      <td className="p-3"><button className="px-4 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl">View Barcode Manifest</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: DISPATCH PAGE ----------------- */}
        {activeTab === "dispatch" && (
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Outbound Dispatch & FEFO Verification</h2>
                <p className="text-xs text-slate-400">Hard-blocked validation prevents non-scanned or mismatched dispatches.</p>
              </div>
              <button className="px-5 py-2.5 bg-[#052620] text-white text-xs font-black rounded-full shadow-md w-full sm:w-auto">
                + Generate FEFO Pick List
              </button>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80">
              <h3 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider">Active Sales Order Dispatch Scans</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[550px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Sales Order ID</th>
                      <th className="p-3">Customer / Destination</th>
                      <th className="p-3">Target Items</th>
                      <th className="p-3">Scan Verification</th>
                      <th className="p-3">Dispatch Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-emerald-600">SO-88412</td>
                      <td className="p-3">Central Vet Clinic #4</td>
                      <td className="p-3 font-bold">150 units</td>
                      <td className="p-3"><span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">150/150 Match</span></td>
                      <td className="p-3"><span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-extrabold">Ready to Ship</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-emerald-600">SO-88415</td>
                      <td className="p-3">City Animal Hospital</td>
                      <td className="p-3 font-bold">80 units</td>
                      <td className="p-3"><span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold">78/80 Mismatch (Block)</span></td>
                      <td className="p-3"><button className="px-3 py-1 bg-red-600 text-white rounded-xl text-xs font-bold">Manager Override</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 4: INVENTORY PAGE ----------------- */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Physical Warehouse Rack Map & Capacity</h2>
                <p className="text-xs text-slate-400">Consolidation-first algorithm optimizes rack storage and stock placement.</p>
              </div>
              <button className="px-5 py-2.5 bg-[#052620] text-white text-xs font-black rounded-full shadow-md w-full sm:w-auto">
                + Schedule Cycle Count Audit
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Rack A-01 (High Velocity)</h3>
                  <span className="text-xs font-bold text-emerald-600">90% Capacity</span>
                </div>
                <p className="text-xs text-slate-400">Contains: Vitamin D3 (450 units), Amoxicillin 500mg (200 units)</p>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[90%]"></div>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Rack B-12 (Cold Chain)</h3>
                  <span className="text-xs font-bold text-amber-600">98% Capacity</span>
                </div>
                <p className="text-xs text-slate-400">Contains: Senior Rabies Vaccine (777 units)</p>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 w-[98%]"></div>
                </div>
              </div>

              <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Damage Hold Warehouse</h3>
                  <span className="text-xs font-bold text-red-600">3 Damaged Bottles</span>
                </div>
                <p className="text-xs text-slate-400">Requires Manager write-off approval with photo proof</p>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 w-[15%]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- TAB 5: REPORTS & AUDIT PAGE ----------------- */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900">Immutable Audit Ledger & Compliance Reports</h2>
                <p className="text-xs text-slate-400">Cryptographic SHA-256 hash-chain guarantees 0 un-audited stock edits.</p>
              </div>
              <button className="px-5 py-2.5 bg-[#00a884] text-slate-950 text-xs font-black rounded-full shadow-md w-full sm:w-auto">
                🔍 Verify Ledger Hash Chain
              </button>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200/80">
              <h3 className="text-sm font-extrabold text-slate-900 mb-4 uppercase tracking-wider">Latest Cryptographic Audit Entries</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[600px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Entity ID</th>
                      <th className="p-3">SHA-256 Block Hash</th>
                      <th className="p-3">Integrity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="p-3 font-sans text-slate-500">2026-07-26 21:40:00</td>
                      <td className="p-3 font-bold text-emerald-600">STOCK_IN_SCAN</td>
                      <td className="p-3">VET-VD2207-000342</td>
                      <td className="p-3 text-slate-400 truncate max-w-xs">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</td>
                      <td className="p-3 font-sans"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">CHAIN OK</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-sans text-slate-500">2026-07-26 21:35:12</td>
                      <td className="p-3 font-bold text-blue-600">DISPATCH_VERIFIED</td>
                      <td className="p-3">SO-88412</td>
                      <td className="p-3 text-slate-400 truncate max-w-xs">8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4</td>
                      <td className="p-3 font-sans"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">CHAIN OK</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
