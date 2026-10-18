"use client";

import React from "react";
import { NavTab, UserRole } from "./types";
import {
  LayoutDashboard,
  PackagePlus,
  Truck,
  Warehouse,
  ShieldCheck,
  TrendingUp,
  Printer,
  Users2,
  Crown,
  Briefcase,
  Package,
  UserCog,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  userRole: UserRole;
  pendingWriteoffsCount?: number;
  lowStockCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  pendingWriteoffsCount = 0,
  lowStockCount = 0,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navGroups = [
    {
      group: "DAILY OPERATIONS",
      items: [
        {
          id: "overview" as NavTab,
          label: "Dashboard",
          icon: LayoutDashboard,
          desc: "Daily summary & stock totals",
        },
        {
          id: "inbound" as NavTab,
          label: "Stock In (Receiving)",
          icon: PackagePlus,
          desc: "Scan & receive new goods",
        },
        {
          id: "outbound" as NavTab,
          label: "Stock Out (Shipping)",
          icon: Truck,
          desc: "Pack, verify & send orders",
        },
        {
          id: "inventory" as NavTab,
          label: "Storage & Racks",
          icon: Warehouse,
          desc: "Shelf locations & capacity",
        },
      ],
    },
    {
      group: "SECURITY & ALERTS",
      items: [
        {
          id: "security" as NavTab,
          label: "Theft & Loss Protection",
          icon: ShieldCheck,
          desc: "Damage reports & audit logs",
          badge: pendingWriteoffsCount > 0 ? `${pendingWriteoffsCount} Pending` : undefined,
          badgeColor: "bg-amber-100 text-amber-800",
        },
        {
          id: "analytics" as NavTab,
          label: "Expiry & Stock Alerts",
          icon: TrendingUp,
          desc: "Track expiries & reorder needs",
          badge: lowStockCount > 0 ? `${lowStockCount} Low Stock` : undefined,
          badgeColor: "bg-red-100 text-red-800",
        },
        {
          id: "labels" as NavTab,
          label: "Print Barcode Labels",
          icon: Printer,
          desc: "Print thermal stickers & tags",
        },
      ],
    },
    {
      group: "STAFF & SETTINGS",
      items: [
        {
          id: "users" as NavTab,
          label: "Staff & Permissions",
          icon: Users2,
          desc: "Manage staff access & roles",
        },
      ],
    },
  ];

  if (userRole !== "owner") {
    navGroups.splice(2, 1); // Remove the ADMINISTRATION group entirely
  }

  const getRoleIcon = () => {
    switch (userRole) {
      case "owner":
        return <Crown className="w-4 h-4 text-amber-600" />;
      case "warehouse_manager":
        return <UserCog className="w-4 h-4 text-blue-600" />;
      case "purchase_team":
        return <Briefcase className="w-4 h-4 text-indigo-600" />;
      default:
        return <Package className="w-4 h-4 text-emerald-600" />;
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container: Fixed slide-over on mobile/tab, static sticky on desktop */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col h-screen select-none shadow-2xl lg:shadow-[2px_0_12px_rgba(0,0,0,0.02)] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:z-30 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xl shadow-md shadow-slate-900/20">
              <Warehouse className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-slate-900 text-base tracking-tight">Vetecura IMS</h1>
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md tracking-wider">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Smart Barcode Warehouse</p>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-1.5">
              <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase px-3 mb-2">
                {group.group}
              </p>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const IconComp = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left cursor-pointer ${
                      isActive
                        ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 font-bold scale-[1.01]"
                        : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComp className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                      <div className="truncate">
                        <div className={`text-xs ${isActive ? "text-white font-bold" : "text-slate-800 font-semibold"}`}>
                          {item.label}
                        </div>
                        <div className={`text-[10px] truncate ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full shrink-0 ml-1 ${
                        isActive ? "bg-white/20 text-white" : item.badgeColor
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom User Role & Live Status Card */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2.5">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-700 shrink-0">
                {getRoleIcon()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 capitalize truncate">
                  {userRole.replace("_", " ")}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-700">Live</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => {
                sessionStorage.removeItem("vetecura_token");
                sessionStorage.removeItem("vetecura_role");
                window.location.reload();
              }}
              className="w-8 h-8 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 rounded-xl flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Powered by The Pixel Monk Branding Badge */}
          <div className="flex items-center justify-between px-1 text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Powered by</span>
              <span className="font-extrabold text-slate-700 hover:text-emerald-600 transition-colors tracking-wide">
                The Pixel Monk
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">v1.0</span>
          </div>
        </div>
      </aside>
    </>
  );
};
