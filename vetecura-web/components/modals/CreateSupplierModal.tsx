import React, { useState } from "react";
import { Building2, X } from "lucide-react";

export interface SupplierCreationData {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
}

interface CreateSupplierModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierCreationData) => Promise<void>;
}

export const CreateSupplierModal: React.FC<CreateSupplierModalProps> = ({ isOpen = true, onClose, onSubmit }) => {
  if (isOpen === false) return null;
  const [formData, setFormData] = useState<SupplierCreationData>({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    gstin: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError("Supplier Name is required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create supplier");
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
        className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-black text-slate-900">Add New Supplier</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-5">
          {error && (
            <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Supplier Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. PharmaCare Ltd"
                className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. +1 234 567 890"
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="supplier@example.com"
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN / Tax ID</label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="Tax ID if applicable"
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Address</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Full operational address..."
                rows={2}
                className="w-full px-4 py-2.5 text-sm font-semibold rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-2xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Adding..." : "Add Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
};
