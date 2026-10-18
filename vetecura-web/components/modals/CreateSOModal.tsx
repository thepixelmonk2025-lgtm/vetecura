"use client";

import React, { useState } from "react";
import { Truck, Package, X, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Product } from "../types";
import { CustomSelect } from "../CustomSelect";

interface CreateSOModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCreateSO: (customerName: string, items: Array<{ product_id: string; ordered_qty: number }>) => void;
}

export const CreateSOModal: React.FC<CreateSOModalProps> = ({
  isOpen,
  onClose,
  products,
  onCreateSO,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState([{ product_id: products.length > 0 ? products[0].id : "", ordered_qty: 50 }]);

  if (!isOpen) return null;

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: `SKU: ${p.sku}`,
  }));

  const handleAddItem = () => {
    setItems([...items, { product_id: products.length > 0 ? products[0].id : "", ordered_qty: 50 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof typeof items[0], value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert("Please enter customer / clinic name");
      return;
    }

    if (items.length === 0) {
      alert("Please add at least one item.");
      return;
    }

    const hasInvalidItem = items.some(item => !item.product_id || item.ordered_qty <= 0);
    if (hasInvalidItem) {
      alert("Please select a product and valid quantity for all items.");
      return;
    }

    const payload = items.map(item => ({
      product_id: item.product_id || (products.length > 0 ? products[0].id : "1"),
      ordered_qty: item.ordered_qty
    }));

    onCreateSO(customerName.trim(), payload);
    setCustomerName("");
    setItems([{ product_id: products.length > 0 ? products[0].id : "", ordered_qty: 50 }]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 animate-scale-up space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Create Customer Order (Sales Order)</h3>
              <p className="text-xs text-slate-400">Create a new order for a customer or clinic to pack and ship</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Customer / Clinic Name
            </label>
            <input
              type="text"
              placeholder="e.g. Apex Veterinary Clinic or City Pet Hospital"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
              required
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                Order Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>
            
            <div className="space-y-3 pr-1 pb-16">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl relative">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Select Product
                    </label>
                    <CustomSelect
                      value={item.product_id}
                      onChange={(val) => handleItemChange(index, "product_id", val)}
                      options={productOptions.length > 0 ? productOptions : [{ value: "1", label: "Select Product", sublabel: "SKU" }]}
                      placeholder="Select product..."
                    />
                  </div>
                  <div className="w-full sm:w-1/3 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        required
                        value={item.ordered_qty}
                        onChange={(e) => handleItemChange(index, "ordered_qty", Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 text-slate-900 outline-none focus:border-slate-900 transition-all"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors mb-0.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Earliest expiry items (FEFO) are automatically prioritized for packing.</span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-black rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-all cursor-pointer"
            >
              Save & Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
