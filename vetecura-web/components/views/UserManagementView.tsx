"use client";

import React, { useState } from "react";
import { SystemUser, UserRole } from "../types";
import {
  Users2,
  Crown,
  UserCog,
  Briefcase,
  Package,
  UserPlus,
  Power,
  X,
} from "lucide-react";

import { CustomSelect } from "../CustomSelect";

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner (Administrator)", sublabel: "Full access to all warehouse features, reports & settings" },
  { value: "warehouse_manager", label: "Warehouse Manager", sublabel: "Approves damage reports, oversees staff & manages stock" },
  { value: "warehouse_staff", label: "Warehouse Staff", sublabel: "Scans barcodes for receiving, shelving & packing goods" },
  { value: "purchase_team", label: "Purchasing Team", sublabel: "Orders new goods from suppliers & checks reorders" },
];

const getRoleLabel = (role: string) => {
  switch (role) {
    case "owner":
      return "Owner (Admin)";
    case "warehouse_manager":
      return "Warehouse Manager";
    case "warehouse_staff":
      return "Warehouse Staff";
    case "purchase_team":
      return "Purchasing Team";
    default:
      return role.replace("_", " ");
  }
};

interface UserManagementViewProps {
  systemUsers: SystemUser[];
  onToggleStatus?: (id: string, currentStatus: boolean) => Promise<boolean>;
  onCreateUser?: (data: any) => Promise<boolean>;
  onUpdateUser?: (id: string, data: any) => Promise<boolean>;
  onDeleteUser?: (id: string) => Promise<boolean>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  systemUsers,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onToggleStatus,
}) => {
  const [users, setUsers] = React.useState<SystemUser[]>(
    systemUsers.length > 0 ? systemUsers : []
  );

  React.useEffect(() => {
    if (systemUsers.length > 0) {
      setUsers(systemUsers);
    }
  }, [systemUsers]);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("warehouse_staff");

  const openEditUser = (user: SystemUser) => {
    setEditingUserId(user.id);
    setNewEmail(user.email);
    setNewPassword("");
    setNewRole(user.role);
    setIsAddUserOpen(true);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || (!editingUserId && !newPassword)) return;
    
    if (editingUserId) {
      if (onUpdateUser) {
        const success = await onUpdateUser(editingUserId, { email: newEmail, role: newRole, password: newPassword });
        if (!success) {
          alert("Could not update team member. Please check your permissions.");
          return;
        }
      } else {
        setUsers(users.map(u => u.id === editingUserId ? { ...u, email: newEmail, role: newRole } : u));
      }
      alert(`Team member ${newEmail} updated successfully!`);
    } else {
      if (onCreateUser) {
        const success = await onCreateUser({ email: newEmail, role: newRole, password: newPassword });
        if (!success) {
          alert("Could not create team member. Please check your permissions.");
          return;
        }
      } else {
        const newUser: SystemUser = {
          id: String(Date.now()),
          email: newEmail,
          role: newRole,
          is_active: true,
        };
        setUsers([...users, newUser]);
      }
      alert(`New team member ${newEmail} added successfully!`);
    }

    setIsAddUserOpen(false);
    setEditingUserId(null);
    setNewEmail("");
    setNewPassword("");
  };

  const toggleStatus = async (id: string) => {
    const user = users.find(u => u.id === id);
    if (!user) return;
    if (onToggleStatus) {
      const success = await onToggleStatus(id, user.is_active);
      if (!success) alert("Could not change account status.");
    } else {
      setUsers(users.map((u) => (u.id === id ? { ...u, is_active: !u.is_active } : u)));
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("Are you sure you want to remove this team member's account?")) {
      if (onDeleteUser) {
        const success = await onDeleteUser(id);
        if (!success) alert("Could not delete team member.");
      } else {
        setUsers(users.filter((u) => u.id !== id));
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-black text-slate-900">Staff Accounts & Permissions</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage who has access to your system, create logins, and set what each team member can do.
          </p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-md shadow-slate-900/10 transition-all"
        >
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>+ Add Team Member</span>
        </button>
      </div>

      {/* Role Permission Matrix Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-500" />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase">Owner (Full Admin)</h4>
          </div>
          <p className="text-[11px] text-slate-500">Full access to everything: inventory, financial value, security reports, and staff settings.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-blue-500" />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase">Warehouse Manager</h4>
          </div>
          <p className="text-[11px] text-slate-500">Approves damaged item write-offs, resolves order issues, and oversees routine stock counting.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase">Warehouse Staff</h4>
          </div>
          <p className="text-[11px] text-slate-500">Mobile phone scanner access to scan items upon delivery, stock shelves, and pack outgoing orders.</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            <h4 className="font-extrabold text-slate-900 text-xs uppercase">Purchasing Team</h4>
          </div>
          <p className="text-[11px] text-slate-500">Creates supplier purchase orders, tracks deliveries, and monitors low stock warnings.</p>
        </div>
      </div>

      {/* User Accounts Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
          Active Team Members
        </h3>

        <div className="table-responsive-container rounded-2xl border border-slate-100">
          <table className="w-full text-left text-xs min-w-[550px] sm:min-w-full">
            <thead className="bg-slate-50 text-slate-400 font-bold border-y border-slate-100 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3.5">Email / Login</th>
                <th className="p-3.5">Role & Access Level</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/80 transition-all">
                  <td className="p-3.5 font-bold text-slate-900 font-sans">{user.email}</td>
                  <td className="p-3.5 font-bold text-slate-800">
                    <span className="px-2.5 py-1 bg-slate-100 rounded-xl text-[10px]">
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                      user.is_active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                    }`}>
                      {user.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => openEditUser(user)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all bg-red-50 hover:bg-red-100 text-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => toggleStatus(user.id)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                          user.is_active
                            ? "bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700"
                            : "bg-emerald-100 hover:bg-emerald-200 text-emerald-800"
                        }`}
                      >
                        {user.is_active ? "Disable" : "Enable"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingUserId ? "Edit Team Member" : "Add New Team Member"}
              </h3>
              <button onClick={() => { setIsAddUserOpen(false); setEditingUserId(null); }} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address (Login ID)</label>
                <input
                  type="email"
                  required
                  placeholder="name@vetecura.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {editingUserId ? "New Password (Leave blank to keep unchanged)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingUserId}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:bg-white focus:border-slate-900"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-500 uppercase tracking-wider mb-1">Choose Role & Permissions</label>
                <CustomSelect
                  value={newRole}
                  onChange={(val) => setNewRole(val as UserRole)}
                  options={ROLE_OPTIONS}
                />
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => { setIsAddUserOpen(false); setEditingUserId(null); }} className="px-5 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-full">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-slate-900 text-white font-black rounded-full shadow-md">
                  {editingUserId ? "Save Changes" : "Add Team Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
