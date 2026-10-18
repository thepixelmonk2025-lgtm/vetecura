"use client";

import React, { useState } from "react";
import { Lock, Mail, Activity, ShieldCheck, ArrowRight, UserCircle2 } from "lucide-react";

interface LoginViewProps {
  onLogin: (email: string, pass: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Add a slight artificial delay for effect
    setTimeout(() => {
      onLogin(email, password);
      setLoading(false);
    }, 800);
  };

  const handleDemoFill = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("password123");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] sm:w-[40%] h-[40%] bg-emerald-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] sm:w-[40%] h-[40%] bg-slate-200 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-slate-100 flex flex-col lg:flex-row w-full max-w-md lg:max-w-4xl overflow-hidden z-10 animate-fade-in my-auto">
        
        {/* Left Side: Branding / Info (Hidden on very small mobile if desired, or compact on tablet/mobile) */}
        <div className="bg-slate-900 w-full lg:w-5/12 p-6 sm:p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
          
          <div>
            <div className="flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-6 lg:mb-8">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shrink-0">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">Vetecura<span className="text-emerald-400"> Stock</span></h1>
            </div>
            
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white leading-snug sm:leading-tight mb-2 sm:mb-4">
              Warehouse & Stock<br className="hidden sm:inline" /> Management
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6 lg:mb-8">
              Accurate tracking for every box and medicine. Scan barcodes, avoid mistakes, and manage inventory with ease.
            </p>

            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Protected Records</p>
                  <p className="text-[11px] sm:text-xs text-slate-400">All stock changes are tracked and tamper-proof</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 sm:gap-3">
                <PackageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-bold text-white">Live Stock Sync</p>
                  <p className="text-[11px] sm:text-xs text-slate-400">Handheld scanners and computer stay updated together</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 sm:mt-8 lg:mt-12 pt-4 sm:pt-6 border-t border-slate-800/80 flex flex-col gap-1 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-white/90">
              <span className="text-[11px] text-slate-400">Developed by</span>
              <span className="font-extrabold text-emerald-400 tracking-wide text-xs">The Pixel Monk</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500">
              &copy; 2026 Vetecura &bull; Powered by The Pixel Monk
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full lg:w-7/12 p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1.5">Welcome Back</h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Please enter your email and password to access the warehouse.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@vetecura.com"
                  className="w-full pl-10 sm:pl-11 pr-3.5 sm:pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 sm:mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 sm:pl-11 pr-3.5 sm:pr-4 py-2.5 sm:py-3 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-semibold text-slate-900 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold py-3 sm:py-3.5 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-sm sm:text-base cursor-pointer mt-2"
            >
              {loading ? "Checking details..." : "Sign In to Warehouse"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Quick mobile credit fallback if stacked */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex lg:hidden items-center justify-between text-[11px] text-slate-400">
            <span>Powered by <strong className="text-emerald-600 font-bold">The Pixel Monk</strong></span>
            <span>&copy; 2026</span>
          </div>

        </div>
      </div>
    </div>
  );
};

// Mini-component for icon used above
const PackageIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16.5 9.4 7.55 4.24" />
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.29 7 12 12.02 20.71 7" />
    <line x1="12" x2="12" y1="22" y2="12" />
  </svg>
);
