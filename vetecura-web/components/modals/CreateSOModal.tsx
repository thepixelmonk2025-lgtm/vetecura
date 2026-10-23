"use client";

import React, { useState } from "react";
import { Truck, Package, X, CheckCircle2, Plus, Minus, Trash2 } from "lucide-react";
import { Product, StockLedgerDetailRow } from "../types";
import { CustomSelect } from "../CustomSelect";

interface CreateSOModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  stockLedgerItems?: StockLedgerDetailRow[];
  onCreateSO: (customerName: string, items: Array<{ product_id: string; ordered_qty: number }>) => void;
}

export const CreateSOModal: React.FC<CreateSOModalProps> = ({
  isOpen,
  onClose,
  products,
  stockLedgerItems = [],
  onCreateSO,
}) => {
  const [customerName, setCustomerName] = useState("");
  const [items, setItems] = useState<Array<{ product_id: string; ordered_qty: number | string }>>([
    { product_id: products.length > 0 ? products[0].id : "", ordered_qty: 1 },
  ]);

  // Helper to compute available physical stock from stock ledger
  const getProductStock = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return 0;
    return stockLedgerItems
      .filter((i) => i.sku === product.sku || (product.name && i.product.toLowerCase() === product.name.toLowerCase()))
      .reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
  };

  if (!isOpen) return null;

  const productOptions = products.map((p) => {
    const stock = stockLedgerItems
      .filter((i) => i.sku === p.sku || (p.name && i.product.toLowerCase() === p.name.toLowerCase()))
      .reduce((acc, i) => acc + (Number(i.qty) || 0), 0);
    return {
      value: p.id,
      label: p.name,
      sublabel: `SKU: ${p.sku} · Available Stock: ${stock} units`,
    };
  });

  const handleAddItem = () => {
    setItems([...items, { product_id: products.length > 0 ? products[0].id : "", ordered_qty: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Check if any line item exceeds stock or has 0 stock
  const stockErrors: string[] = [];
  items.forEach((item, idx) => {
    if (item.product_id) {
      const prod = products.find((p) => p.id === item.product_id);
      const stock = getProductStock(item.product_id);
      const requested = Number(item.ordered_qty) || 0;
      const prodName = prod ? prod.name : `Item #${idx + 1}`;
      if (stock === 0) {
        stockErrors.push(`"${prodName}" has 0 stock in warehouse. Receive stock via Inbound PO first.`);
      } else if (requested > stock) {
        stockErrors.push(`"${prodName}" ordered (${requested} units) exceeds available stock (${stock} units).`);
      }
    }
  });

  const hasStockIssue = stockErrors.length > 0;

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

    const hasInvalidItem = items.some((item) => !item.product_id || Number(item.ordered_qty) <= 0);
    if (hasInvalidItem) {
      alert("Please select a product and valid quantity for all items.");
      return;
    }

    if (hasStockIssue) {
      alert(`⚠️ Cannot Create Order - Stock Validation Failed:\n\n${stockErrors.join("\n")}`);
      return;
    }

    const payload = items.map((item) => ({
      product_id: item.product_id || (products.length > 0 ? products[0].id : "1"),
      ordered_qty: Number(item.ordered_qty) || 1,
    }));

    onCreateSO(customerName.trim(), payload);
    setCustomerName("");
    setItems([{ product_id: products.length > 0 ? products[0].id : "", ordered_qty: 1 }]);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-slate-200 animate-scale-up space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Create Customer Order (Sales Order)</h3>
              <p className="text-xs text-slate-400">Scan & dispatch physical inventory for customer shipping</p>
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
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </button>
            </div>

            <div className="space-y-3 pr-1 pb-2">
              {items.map((item, index) => {
                const stock = getProductStock(item.product_id);
                const reqQty = Number(item.ordered_qty) || 0;
                const isOutOfStock = stock === 0;
                const isOverStock = reqQty > stock;

                return (
                  <div
                    key={index}
                    className={`flex flex-col sm:flex-row gap-3 p-3.5 rounded-2xl border transition-all ${
                      isOutOfStock || isOverStock
                        ? "bg-red-50/70 border-red-200"
                        : "bg-slate-50 border-slate-100"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Select Product
                        </label>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            isOutOfStock
                              ? "bg-red-100 text-red-700"
                              : isOverStock
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          Available: {stock} units
                        </span>
                      </div>
                      <CustomSelect
                        value={item.product_id}
                        onChange={(val) => handleItemChange(index, "product_id", val)}
                        options={
                          productOptions.length > 0
                            ? productOptions
                            : [{ value: "1", label: "Select Product", sublabel: "SKU" }]
                        }
                        placeholder="Select product..."
                      />
                      {isOutOfStock && (
                        <p className="text-[11px] font-bold text-red-600 mt-1 flex items-center gap-1">
                          ⚠️ Zero stock available in warehouse. Receive inventory before shipping.
                        </p>
                      )}
                      {!isOutOfStock && isOverStock && (
                        <p className="text-[11px] font-bold text-amber-600 mt-1 flex items-center gap-1">
                          ⚠️ Requested quantity ({reqQty}) exceeds in-stock inventory ({stock}).
                        </p>
                      )}
                    </div>
                    <div className="w-full sm:w-1/3 flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Quantity
                        </label>
                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 focus-within:border-slate-900 transition-all">
                          <button
                            type="button"
                            onClick={() => {
                              const current = Number(item.ordered_qty) || 1;
                              if (current > 1) {
                                handleItemChange(index, "ordered_qty", current - 1 > 0 ? current - 1 : 1);
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer shrink-0"
                            title="-1 unit"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={stock > 0 ? stock : 10000}
                            required
                            value={item.ordered_qty}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleItemChange(index, "ordered_qty", val === "" ? "" : Number(val));
                            }}
                            className="w-full text-center px-1 py-1 text-xs font-bold text-slate-900 outline-none bg-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = Number(item.ordered_qty) || 0;
                              const next = current + 1;
                              handleItemChange(index, "ordered_qty", stock > 0 ? Math.min(next, stock) : next);
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer shrink-0"
                            title="+1 unit"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors mb-0.5 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {hasStockIssue && (
            <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-red-700">
                <span>🚫 Stock Validation Failed:</span>
              </div>
              <ul className="list-disc list-inside text-[11px] font-semibold text-red-800 space-y-0.5">
                {stockErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

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
              disabled={hasStockIssue}
              className={`px-6 py-2.5 text-xs font-black rounded-2xl text-white shadow-md transition-all ${
                hasStockIssue
                  ? "bg-slate-400 cursor-not-allowed opacity-60"
                  : "bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-blue-600/20"
              }`}
            >
              Save & Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
