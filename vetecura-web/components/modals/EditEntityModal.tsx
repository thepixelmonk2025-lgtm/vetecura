"use client";

import React, { useState, useEffect } from "react";
import { Edit3, Lock, X, CheckCircle2, FileText, Layers, Building2, Package, Warehouse, Plus, Trash2 } from "lucide-react";
import { PurchaseOrderRow, SalesOrderRow, RackItem, Supplier, Product } from "../types";
import { CustomSelect } from "../CustomSelect";

export type EditableEntityType = "po" | "so" | "rack" | "supplier" | "product";

export interface EditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: EditableEntityType;
  data: PurchaseOrderRow | SalesOrderRow | RackItem | Supplier | Product | null;
  onSave: (updatedData: any, auditReason: string) => void;
  products?: Product[];
  suppliers?: Supplier[];
}

export const EditEntityModal: React.FC<EditEntityModalProps> = ({
  isOpen,
  onClose,
  entityType,
  data,
  onSave,
  products = [],
  suppliers = [],
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [auditReason, setAuditReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
      setAuditReason("");
      setError("");
    }
  }, [data, isOpen]);

  if (!isOpen || !data) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditReason.trim() || auditReason.trim().length < 5) {
      setError("Please enter a clear reason for this change (at least 5 characters).");
      return;
    }
    setError("");
    onSave(formData, auditReason.trim());
    onClose();
  };

  const getEntityTitle = () => {
    switch (entityType) {
      case "po":
        return `Edit Purchase Order (${(data as PurchaseOrderRow).po_number})`;
      case "so":
        return `Edit Customer Order (${(data as SalesOrderRow).order_reference})`;
      case "rack":
        return `Edit Storage Shelf (${(data as RackItem).code})`;
      case "supplier":
        return `Edit Supplier Details (${(data as Supplier).name})`;
      case "product":
        return `Edit Product Details (${(data as Product).name})`;
      default:
        return "Edit Record";
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Verified Change
              </span>
              <h3 className="text-base font-black text-slate-900 mt-1">{getEntityTitle()}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Entity-Specific Form Fields */}

          {/* 1. Purchase Order */}
          {entityType === "po" && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Supplier</label>
                <CustomSelect
                  options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
                  value={suppliers.find((s) => s.name === formData.supplier)?.id || ""}
                  onChange={(val) => {
                    const sup = suppliers.find((s) => s.id === val);
                    if (sup) setFormData({ ...formData, supplier: sup.name });
                  }}
                  placeholder="Search and select supplier..."
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-slate-700 font-bold">Order Items</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [...(formData.items || []), { product_id: products.length > 0 ? products[0].id : "", ordered_qty: 100 }];
                      setFormData({ ...formData, items: newItems, expected_units: newItems.reduce((sum, item) => sum + (item.ordered_qty || 0), 0) });
                    }}
                    className="text-[10px] flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50">
                  {(!formData.items || formData.items.length === 0) ? (
                    <div className="text-center text-slate-400 py-2">No items added yet.</div>
                  ) : (
                    formData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-100">
                        <div className="flex-1">
                          <CustomSelect
                            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                            value={item.product_id}
                            onChange={(val) => {
                              const newItems = [...formData.items];
                              newItems[idx] = { ...newItems[idx], product_id: val };
                              setFormData({ ...formData, items: newItems });
                            }}
                            placeholder="Select product"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            value={item.ordered_qty}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[idx] = { ...newItems[idx], ordered_qty: parseInt(e.target.value) || 0 };
                              setFormData({ ...formData, items: newItems, expected_units: newItems.reduce((sum, i) => sum + (i.ordered_qty || 0), 0) });
                            }}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium"
                            min="1"
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = formData.items.filter((_: any, i: number) => i !== idx);
                            setFormData({ ...formData, items: newItems, expected_units: newItems.reduce((sum: number, i: any) => sum + (i.ordered_qty || 0), 0) });
                          }}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Expected Quantity</label>
                  <input
                    type="number"
                    value={formData.expected_units || 0}
                    readOnly
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Order Status</label>
                  <input
                    type="text"
                    value={formData.status || "Draft"}
                    disabled
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Sales Order */}
          {entityType === "so" && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Customer / Clinic Name</label>
                <input
                  type="text"
                  value={formData.customer_name || ""}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-slate-700 font-bold">Order Items</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [...(formData.items || []), { product_id: products.length > 0 ? products[0].id : "", ordered_qty: 10 }];
                      setFormData({ ...formData, items: newItems, expected_count: newItems.reduce((sum, item) => sum + (item.ordered_qty || 0), 0) });
                    }}
                    className="text-[10px] flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md hover:bg-emerald-100"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50">
                  {(!formData.items || formData.items.length === 0) ? (
                    <div className="text-center text-slate-400 py-2">No items added yet.</div>
                  ) : (
                    formData.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-100">
                        <div className="flex-1">
                          <CustomSelect
                            options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                            value={item.product_id}
                            onChange={(val) => {
                              const newItems = [...formData.items];
                              newItems[idx] = { ...newItems[idx], product_id: val };
                              setFormData({ ...formData, items: newItems });
                            }}
                            placeholder="Select product"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            value={item.ordered_qty}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[idx] = { ...newItems[idx], ordered_qty: parseInt(e.target.value) || 0 };
                              setFormData({ ...formData, items: newItems, expected_count: newItems.reduce((sum, i) => sum + (i.ordered_qty || 0), 0) });
                            }}
                            className="w-full p-2.5 rounded-xl border border-slate-200 text-slate-900 font-medium"
                            min="1"
                            required
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = formData.items.filter((_: any, i: number) => i !== idx);
                            setFormData({ ...formData, items: newItems, expected_count: newItems.reduce((sum: number, i: any) => sum + (i.ordered_qty || 0), 0) });
                          }}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Expected Quantity</label>
                  <input
                    type="number"
                    value={formData.expected_count || 0}
                    readOnly
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Order Status</label>
                  <input
                    type="text"
                    value={formData.status || "In Progress"}
                    disabled
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. Storage Rack */}
          {entityType === "rack" && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Rack Location Code</label>
                <input
                  type="text"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium font-mono uppercase"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Total Unit Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity_units || 0}
                    onChange={(e) => setFormData({ ...formData, capacity_units: parseInt(e.target.value) || 0 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                    min={formData.current_occupancy || 1}
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Current Occupancy</label>
                  <input
                    type="text"
                    value={`${formData.current_occupancy || 0} units stored`}
                    disabled
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 4. Supplier */}
          {entityType === "supplier" && (
            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Supplier / Vendor Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person || ""}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">GSTIN Tax ID</label>
                  <input
                    type="text"
                    value={formData.gstin || ""}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium font-mono uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Product */}
          {entityType === "product" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku || ""}
                    disabled
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-500 font-mono font-bold cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Category</label>
                  <input
                    type="text"
                    value={formData.category || ""}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Product Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-700 font-bold mb-1">Reorder Level (Low Stock Alert Threshold)</label>
                <input
                  type="number"
                  value={formData.reorder_level || 0}
                  onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Audit Notice */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-2.5 text-amber-900">
            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="text-[11px] font-medium leading-relaxed">
              Every change is securely recorded in the tamper-proof ledger and notified instantly.
            </span>
          </div>

          {/* Mandatory Reason for Change */}
          <div className="space-y-1.5 pt-1">
            <label className="text-slate-800 font-extrabold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Reason for Change (Required for Records)</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={auditReason}
              onChange={(e) => {
                setAuditReason(e.target.value);
                if (error) setError("");
              }}
              placeholder="e.g. Quantity updated after customer request or inventory verification..."
              rows={2}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              required
            />
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          </div>

          {/* Buttons */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save & Record Change</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
