"use client";

import React, { useState } from "react";
import { Supplier, Product } from "../types";
import { PackagePlus, X, ShieldAlert, Plus, Trash2 } from "lucide-react";
import { CustomSelect } from "../CustomSelect";

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: Product[];
  onCreatePO: (supplierId: string, items: Array<{ product_id: string; ordered_qty: number; unit_price?: number }>) => void;
  onOpenCreateProduct?: () => void;
  onOpenCreateSupplier?: () => void;
  initialItems?: Array<{ product_id: string; ordered_qty: number; unit_price?: number }>;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  products,
  onCreatePO,
  onOpenCreateProduct,
  onOpenCreateSupplier,
  initialItems,
}) => {
  const [selectedSupplier, setSelectedSupplier] = useState(suppliers.length > 0 ? suppliers[0].id : "");
  const [items, setItems] = useState<Array<{ product_id: string; ordered_qty: number | string }>>([
    { product_id: products.length > 0 ? products[0].id : "", ordered_qty: 100 },
  ]);

  React.useEffect(() => {
    if (isOpen) {
      if (initialItems && initialItems.length > 0) {
        setItems(initialItems);
      } else {
        setItems([{ product_id: products.length > 0 ? products[0].id : "", ordered_qty: 100 }]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([...items, { product_id: products.length > 0 ? products[0].id : "", ordered_qty: 100 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSupplier = selectedSupplier || (suppliers.length > 0 ? suppliers[0].id : "");

    if (!effectiveSupplier || items.length === 0) {
      alert("Please fill all fields.");
      return;
    }

    const hasInvalidItem = items.some(item => !item.product_id || Number(item.ordered_qty) <= 0);
    if (hasInvalidItem) {
      alert("Please select a product and valid quantity for all items.");
      return;
    }

    const payload = items.map(item => ({
      product_id: item.product_id || (products.length > 0 ? products[0].id : "1"),
      ordered_qty: Number(item.ordered_qty) || 1,
      unit_price: 250 // Mock price
    }));

    onCreatePO(effectiveSupplier, payload);
    setItems([{ product_id: products.length > 0 ? products[0].id : "", ordered_qty: 100 }]);
  };

  const supplierOptions = suppliers.map((s) => ({
    value: s.id,
    label: s.name,
    sublabel: s.code ? `Code: ${s.code}` : undefined,
  }));

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
    sublabel: `SKU: ${p.sku}`,
  }));

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-5 animate-fade-in text-xs max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">Create Purchase Order (Supplier Order)</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-slate-500 uppercase tracking-wider">
                Select Supplier / Vendor
              </label>
              {onOpenCreateSupplier && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateSupplier();
                  }}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  + Add New Supplier
                </button>
              )}
            </div>
            <CustomSelect
              value={selectedSupplier || (suppliers[0]?.id || "")}
              onChange={setSelectedSupplier}
              options={supplierOptions.length > 0 ? supplierOptions : [{ value: "1", label: "PharmaCare Laboratories", sublabel: "SUP-PHARMA" }]}
              placeholder="Select supplier..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <label className="block font-bold text-slate-500 uppercase tracking-wider">
                Order Items
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
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
                      options={productOptions.length > 0 ? productOptions : [{ value: "1", label: "Vitamin D3 Softgel 1000IU", sublabel: "SKU: PROD-001" }]}
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
                        required
                        value={item.ordered_qty}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleItemChange(index, "ordered_qty", val === "" ? "" : Number(val));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white outline-none focus:border-slate-900 font-semibold text-slate-900"
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

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-950 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert className="w-3.5 h-3.5 text-emerald-700" />
              <span>Receiving Verification Gate:</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              When goods arrive at the gate, every item is scanned with a barcode label. Items cannot be stored on shelves without a verified scan.
            </p>
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-full transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-full shadow-md transition-all"
            >
              Save & Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
