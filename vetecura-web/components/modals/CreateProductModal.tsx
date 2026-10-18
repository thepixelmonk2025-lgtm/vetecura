import React, { useState } from "react";
import { Package, X } from "lucide-react";
import { CustomSelect } from "../CustomSelect";

export interface ProductCreationData {
  sku: string;
  name: string;
  category?: string;
  unit: string;
  reorder_level: number;
  manufacturer_barcode?: string;
  is_batch_tracked?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: "Pharmaceuticals", label: "Pharmaceuticals", sublabel: "Tablets, capsules & syrups" },
  { value: "Vaccines", label: "Vaccines (Cold-Chain)", sublabel: "2°C - 8°C stored biologics" },
  { value: "Consumables", label: "Consumables & Surgical", sublabel: "Gloves, syringes & gauze" },
  { value: "Diagnostics", label: "Diagnostics & Kits", sublabel: "Blood & antigen test strips" },
  { value: "Veterinary Care", label: "Veterinary Care", sublabel: "Animal health formulations" },
  { value: "General", label: "General Inventory", sublabel: "Miscellaneous warehouse goods" },
];

const UNIT_OPTIONS = [
  { value: "unit", label: "Units / Pieces" },
  { value: "box", label: "Boxes" },
  { value: "bottle", label: "Bottles" },
  { value: "strip", label: "Strips" },
  { value: "vial", label: "Vials" },
  { value: "ampoule", label: "Ampoules" },
  { value: "tube", label: "Tubes" },
  { value: "pack", label: "Packs" },
  { value: "kg", label: "Kilograms (Kg)" },
  { value: "liter", label: "Liters (L)" },
  { value: "__custom__", label: "✏️ + Type Custom Unit..." },
];

interface CreateProductModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (data: ProductCreationData) => Promise<void>;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({ isOpen = true, onClose, onSubmit }) => {
  if (isOpen === false) return null;

  const [formData, setFormData] = useState<ProductCreationData>({
    name: "",
    sku: "",
    category: "Pharmaceuticals",
    unit: "unit",
    reorder_level: 20,
    manufacturer_barcode: "",
    is_batch_tracked: true,
  });
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "reorder_level") {
      setFormData((prev) => ({ ...prev, [name]: Number(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNameBlur = () => {
    // If SKU is empty, auto-generate a suggested SKU based on product name
    if (!formData.sku && formData.name.trim()) {
      const clean = formData.name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 12);
      setFormData((prev) => ({ ...prev, sku: `SKU-${clean}` }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Product Name is required.");
      return;
    }
    if (!formData.sku.trim()) {
      setError("Product SKU / Code is required.");
      return;
    }
    if (!formData.unit || !formData.unit.trim()) {
      setError("Unit of Measurement is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-3xl">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">Add New Product (SKU)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                onBlur={handleNameBlur}
                placeholder="e.g. Amoxicillin 500mg Capsules"
                className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  SKU Code *
                </label>
                <input
                  type="text"
                  name="sku"
                  required
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g. MED-AMOX-500"
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <CustomSelect
                  value={formData.category || "Pharmaceuticals"}
                  onChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
                  options={CATEGORY_OPTIONS}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Unit of Measurement *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomUnit(!isCustomUnit);
                      if (!isCustomUnit) {
                        setFormData((prev) => ({ ...prev, unit: "" }));
                      } else {
                        setFormData((prev) => ({ ...prev, unit: "unit" }));
                      }
                    }}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    {isCustomUnit ? "← Presets" : "+ Custom"}
                  </button>
                </div>

                {isCustomUnit ? (
                  <input
                    type="text"
                    name="unit"
                    required
                    autoFocus
                    value={formData.unit}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="e.g. Kg, Tube, Ampoule, Roll..."
                    className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-emerald-50/50 border border-emerald-300 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                ) : (
                  <CustomSelect
                    value={formData.unit}
                    onChange={(val) => {
                      if (val === "__custom__") {
                        setIsCustomUnit(true);
                        setFormData((prev) => ({ ...prev, unit: "" }));
                      } else {
                        setFormData((prev) => ({ ...prev, unit: val }));
                      }
                    }}
                    options={UNIT_OPTIONS}
                  />
                )}
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Low Stock Reorder Alert Level
                </label>
                <input
                  type="number"
                  name="reorder_level"
                  min="0"
                  value={formData.reorder_level}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>
            </div>

          </div>

          <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-2xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
