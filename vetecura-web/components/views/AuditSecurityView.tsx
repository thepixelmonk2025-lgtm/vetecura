"use client";

import React from "react";
import { AuditLogEntry, UserRole, DamageWriteoffItem } from "../types";
import {
  ShieldCheck,
  Lock,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  ArrowRight,
  Plus,
} from "lucide-react";

import { useSortableData } from "../../hooks/useSortableData";

interface AuditSecurityViewProps {
  auditLogs: AuditLogEntry[];
  userRole: UserRole;
  onVerifyLedger: () => void;
  onOpenCreateWriteoff: () => void;
  onOpenCreateReturn: () => void;
  pendingApprovals?: DamageWriteoffItem[];
  onApproveWriteoff?: (id: string) => void;
  onRejectWriteoff?: (id: string) => void;
}

export const AuditSecurityView: React.FC<AuditSecurityViewProps> = ({
  auditLogs,
  userRole,
  onVerifyLedger,
  onOpenCreateWriteoff,
  onOpenCreateReturn,
  pendingApprovals = [],
  onApproveWriteoff,
  onRejectWriteoff,
}) => {
  const { items: sortedLogs, requestSort, sortConfig } = useSortableData(auditLogs);

  const handleApprove = (id: string) => {
    if (onApproveWriteoff) onApproveWriteoff(id);
  };

  const handleReject = (id: string) => {
    if (onRejectWriteoff) onRejectWriteoff(id);
  };

  const formatIndianDateTime = (ts?: string) => {
    if (!ts) return "Just now";
    if (ts.includes("T") || ts.endsWith("Z")) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      }
    }
    return ts;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner with 1-Click Cryptographic Verifier */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-3xl text-white shadow-xl shadow-emerald-950/15 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase rounded-full border border-emerald-500/30">
              Theft & Loss Protection
            </span>
            <span className="text-slate-400 text-xs">• Digital Safety Lock</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Theft Prevention & Stock Safety Log
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
            Zero inventory changes without an approved barcode scan. Every warehouse movement is permanently recorded and locked to prevent stock theft, loss, and unauthorized edits.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onVerifyLedger}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/25 transition-all hover:scale-105"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Run Stock Security Check</span>
          </button>
        </div>
      </div>

      {/* Write-offs Pending Manager Approval */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Damaged Item Approvals (Photo Proof Required)
            </h3>
            <p className="text-xs text-slate-400">Damaged items stay locked in the hold area until reviewed by a manager</p>
          </div>
          <button
            onClick={onOpenCreateWriteoff}
            className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-2xl border border-red-200 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Report Damaged Item</span>
          </button>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-black text-slate-900">No Pending Damage Reviews</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              All reported items have been reviewed. There are no damaged items waiting for approval.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovals.map((wo) => (
              <div key={wo.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-200/80 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded-md uppercase">
                      Pending Review
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{wo.requested_by}</span>
                  </div>
                  <p className="font-bold text-slate-900 text-xs">{wo.item}</p>
                  <p className="text-xs text-slate-600 font-medium">Reason: {wo.reason}</p>
                </div>

                {/* Photo Proof Box */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 flex items-center gap-3">
                  <img
                    src={wo.photo_url}
                    alt="Proof"
                    className="w-16 h-16 object-cover rounded-xl shrink-0"
                  />
                  <div className="text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 font-bold text-slate-800">
                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Photo Proof Attached</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">Clear photo of damage provided by staff</p>
                  </div>
                </div>

                {/* Action Buttons */}
                {(userRole === "owner" || userRole === "warehouse_manager") && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => handleReject(wo.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition-all cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reject (Return to Stock)</span>
                    </button>
                    <button
                      onClick={() => handleApprove(wo.id)}
                      className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve (Remove Item)</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Audit Log Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Activity History & Digital Security Records
            </h3>
            <p className="text-xs text-slate-400">Every warehouse activity is permanently recorded and locked against unauthorized edits</p>
          </div>
          <button
            onClick={onVerifyLedger}
            className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
          >
            <span>Verify All Records Safe</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="table-responsive-container rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs min-w-[650px] sm:min-w-full">
            <thead className="bg-slate-50 text-slate-400 font-bold border-y border-slate-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('timestamp')}>
                  Date & Time {sortConfig?.key === 'timestamp' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('action')}>
                  Action Taken {sortConfig?.key === 'action' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('user_email')}>
                  Staff / User {sortConfig?.key === 'user_email' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                </th>
                <th className="p-3.5">Previous Safety Stamp</th>
                <th className="p-3.5 text-right">Safety Stamp (Verified)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 font-mono text-[11px]">
              {sortedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="p-3.5 text-slate-500 font-sans text-xs whitespace-nowrap">{formatIndianDateTime(log.timestamp)}</td>
                  <td className="p-3.5 font-sans font-bold text-slate-900">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px]">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3.5 font-sans text-slate-600">{log.user_email}</td>
                  <td className="p-3.5 text-slate-400 truncate max-w-[120px]" title={log.previous_hash || "N/A"}>
                    {log.previous_hash ? `${log.previous_hash.slice(0, 12)}...` : "N/A"}
                  </td>
                  <td className="p-3.5 text-right text-emerald-700 font-bold truncate max-w-[140px]" title={log.current_hash || "N/A"}>
                    {log.current_hash ? `${log.current_hash.slice(0, 14)}... ✓` : "N/A"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
