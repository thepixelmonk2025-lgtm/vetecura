"use client";

import React, { useState } from "react";
import { UserRole, TelegramAlertLog } from "./types";
import {
  Search,
  ShieldCheck,
  Plus,
  Bell,
  ChevronDown,
  PackagePlus,
  ScanSearch,
  AlertTriangle,
  RotateCcw,
  Radio,
  Menu,
} from "lucide-react";

interface HeaderProps {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  telegramLogs: TelegramAlertLog[];
  onClearNotifications?: () => void;
  onOpenCreatePO: () => void;
  onOpenCreateWriteoff: () => void;
  onOpenCreateReturn: () => void;
  onOpenCycleCount: () => void;
  onVerifyLedger: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userRole,
  setUserRole,
  telegramLogs,
  onClearNotifications,
  onOpenCreatePO,
  onOpenCreateWriteoff,
  onOpenCreateReturn,
  onOpenCycleCount,
  onVerifyLedger,
  searchQuery,
  setSearchQuery,
  onToggleMobileMenu,
}) => {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  return (
    <header className="min-h-[72px] sm:min-h-[76px] py-3.5 sm:py-4 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-40 shadow-sm gap-3 sm:gap-4 shrink-0">
      {/* Left: Mobile Menu Trigger + Omni-Search Input */}
      <div className="flex items-center gap-2.5 flex-1 max-w-md">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0 cursor-pointer"
            title="Open Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, PO, Barcode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 sm:pr-12 py-2.5 text-xs font-semibold rounded-2xl bg-slate-100/80 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
          />
          <kbd className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
            /
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">

        {/* Security & Stock Audit Button */}
        <button
          onClick={onVerifyLedger}
          className="hidden md:flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold transition-all shadow-2xs"
          title="Instant check for inventory accuracy, theft prevention & record safety"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Security Audit</span>
        </button>

        {/* Quick Action Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
            className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black shadow-md shadow-slate-900/10 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden xs:inline sm:inline">Action</span>
            <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
          </button>

          {isQuickActionOpen && (
            <div className="absolute right-0 mt-2 w-56 sm:w-60 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-fade-in text-xs font-semibold">
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onOpenCreatePO();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-800 cursor-pointer"
              >
                <PackagePlus className="w-4 h-4 text-slate-600" />
                <span>Create Purchase Order (PO)</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onOpenCycleCount();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-800 cursor-pointer"
              >
                <ScanSearch className="w-4 h-4 text-blue-600" />
                <span>Schedule Rack Cycle Count</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onOpenCreateWriteoff();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-red-600 cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span>Request Damage Write-Off</span>
              </button>
              <button
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onOpenCreateReturn();
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-amber-600 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-500" />
                <span>Log Customer Return</span>
              </button>
            </div>
          )}
        </div>

        {/* Telegram Notifications Tray */}
        <div className="relative">
          <button
            onClick={() => setIsAlertsOpen(!isAlertsOpen)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200/80 rounded-2xl text-slate-700 relative transition-all cursor-pointer flex items-center justify-center"
            title="Telegram Alert Notifications"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            {telegramLogs.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs">
                {telegramLogs.length}
              </span>
            )}
          </button>

          {isAlertsOpen && (
            <div className="fixed sm:absolute right-2 sm:right-0 top-[76px] sm:top-full mt-1 sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/90 p-4 z-50 animate-fade-in space-y-3 max-w-sm">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-600" />
                  <p className="font-extrabold text-sm text-slate-900">Telegram Alert Stream</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {telegramLogs.length > 0 && onClearNotifications && (
                    <button
                      onClick={onClearNotifications}
                      className="text-[10px] font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
                      title="Clear all alerts"
                    >
                      Clear All
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Bot Connected
                  </span>
                </div>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {telegramLogs.length === 0 ? (
                  <p className="text-center py-6 text-xs text-slate-400">No alerts in queue.</p>
                ) : (
                  telegramLogs.map((alert, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                          [{alert.topic}]
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {alert.time || "Live"}
                        </span>
                      </div>
                      <div
                        className="text-slate-700 font-medium text-[11px] leading-relaxed whitespace-pre-line [&_b]:font-bold [&_b]:text-slate-900 [&_code]:bg-slate-200/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:font-mono [&_code]:text-[10px] [&_code]:text-slate-900 [&_i]:text-slate-500 [&_i]:italic"
                        dangerouslySetInnerHTML={{ __html: (alert.message || "").replace(/\n/g, '<br/>') }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
