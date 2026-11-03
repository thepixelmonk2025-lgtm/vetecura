"use client";

import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Download, X, CheckCircle2, AlertTriangle, RefreshCw, FileText } from "lucide-react";
import * as XLSX from "xlsx";

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "products" | "suppliers" | "customers";
  authToken?: string;
  onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  entityType,
  authToken,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [invalidCount, setInvalidCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const entityTitles = {
    products: "Bulk Import Products (3000+ SKUs)",
    suppliers: "Bulk Import Suppliers & Vendors",
    customers: "Bulk Import Customers & Clinics",
  };

  const entitySubtitles = {
    products: "Upload Excel (.xlsx, .xls) or CSV. Supports large catalogs with fast database batching.",
    suppliers: "Upload vendor directory Excel spreadsheet with contact details and GSTIN.",
    customers: "Upload list of customer hospitals, clinics, and animal healthcare centers.",
  };

  // Helper to normalize header names
  const cleanKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Download Sample Excel Template
  const handleDownloadSample = () => {
    let sampleData: any[] = [];
    let fileName = "";

    if (entityType === "products") {
      fileName = "vetecura_products_bulk_template.xlsx";
      sampleData = [
        {
          "SKU (Mandatory)": "VET-AMOX-500",
          "Product Name (Mandatory)": "Amoxicillin 500mg Capsules",
          "Category": "Pharmaceuticals",
          "Unit": "box",
          "Reorder Level": 50,
          "Unit Price (INR)": 145.0,
          "Manufacturer Barcode": "8901234567890",
          "Is Batch Tracked (YES/NO)": "YES",
        },
        {
          "SKU (Mandatory)": "VET-RABV-001",
          "Product Name (Mandatory)": "Anti-Rabies Vaccine 2ml",
          "Category": "Vaccines",
          "Unit": "vial",
          "Reorder Level": 25,
          "Unit Price (INR)": 380.0,
          "Manufacturer Barcode": "8901234567891",
          "Is Batch Tracked (YES/NO)": "YES",
        },
        {
          "SKU (Mandatory)": "VET-SURG-GLV-M",
          "Product Name (Mandatory)": "Surgical Latex Gloves (Medium)",
          "Category": "Consumables",
          "Unit": "box",
          "Reorder Level": 100,
          "Unit Price (INR)": 85.0,
          "Manufacturer Barcode": "8901234567892",
          "Is Batch Tracked (YES/NO)": "NO",
        },
        {
          "SKU (Mandatory)": "VET-IV-SAL-500",
          "Product Name (Mandatory)": "Normal Saline 0.9% IV 500ml",
          "Category": "General",
          "Unit": "bottle",
          "Reorder Level": 75,
          "Unit Price (INR)": 45.0,
          "Manufacturer Barcode": "8901234567893",
          "Is Batch Tracked (YES/NO)": "YES",
        },
      ];
    } else if (entityType === "suppliers") {
      fileName = "vetecura_suppliers_bulk_template.xlsx";
      sampleData = [
        {
          "Supplier Name (Mandatory)": "PharmaCare Laboratories",
          "Contact Person": "Dr. Rajesh Patil",
          "Phone": "+91 9822012345",
          "Email": "orders@pharmacare.com",
          "Address": "Plot 42, MIDC Industrial Area, Pune, Maharashtra",
          "GSTIN": "27AABCP1234F1Z5",
        },
        {
          "Supplier Name (Mandatory)": "BioHealth Formulations Ltd",
          "Contact Person": "Anita Kulkarni",
          "Phone": "+91 9422098765",
          "Email": "supply@biohealth.co.in",
          "Address": "Sector 18, Wagle Estate, Thane, Mumbai",
          "GSTIN": "27AAACZ9876E1ZT",
        },
      ];
    } else {
      fileName = "vetecura_customers_bulk_template.xlsx";
      sampleData = [
        {
          "Customer / Hospital Name (Mandatory)": "Regional Hospital Clinic",
          "Contact Person": "Dr. Sharma",
          "Phone": "+91 9876543210",
          "Email": "purchases@regionalclinic.org",
          "Address": "Civil Hospital Road, Nashik, Maharashtra",
          "GSTIN": "27AAACR1122C1ZR",
        },
        {
          "Customer / Hospital Name (Mandatory)": "City Care Animal Healthcare",
          "Contact Person": "Dr. Deshmukh",
          "Phone": "+91 9823055443",
          "Email": "admin@citycarevet.com",
          "Address": "Station Road, Chhatrapati Sambhajinagar",
          "GSTIN": "27AABBD4433D1ZS",
        },
      ];
    }

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, fileName);
  };

  // 2. Parse Excel or CSV File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setStatusMessage(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rawJson.length === 0) {
          setStatusMessage({ text: "The selected file contains no rows.", type: "error" });
          setIsLoading(false);
          return;
        }

        const normalized: any[] = [];
        let invalid = 0;

        rawJson.forEach((row) => {
          const keys = Object.keys(row);
          const rowMap: Record<string, any> = {};
          keys.forEach((k) => {
            rowMap[cleanKey(k)] = row[k];
          });

          if (entityType === "products") {
            const sku = String(
              rowMap["sku"] || rowMap["skumandatory"] || rowMap["itemcode"] || rowMap["productcode"] || ""
            ).trim();
            const name = String(
              rowMap["productname"] || rowMap["productnamemandatory"] || rowMap["name"] || rowMap["itemname"] || ""
            ).trim();
            const category = String(rowMap["category"] || "General").trim();
            const unit = String(rowMap["unit"] || "unit").trim().toLowerCase();
            const reorder_level = parseInt(String(rowMap["reorderlevel"] || "0"), 10) || 0;
            const unit_price = parseFloat(String(rowMap["unitprice"] || rowMap["unitpriceinr"] || rowMap["price"] || "0")) || 0;
            const manufacturer_barcode = String(rowMap["manufacturerbarcode"] || rowMap["barcode"] || "").trim();
            const batchVal = String(rowMap["isbatchtracked"] || rowMap["isbatchtrackedyesno"] || "YES").trim().toUpperCase();
            const is_batch_tracked = batchVal !== "NO" && batchVal !== "FALSE" && batchVal !== "0";

            if (sku && name) {
              normalized.push({
                sku,
                name,
                category,
                unit,
                reorder_level,
                unit_price,
                manufacturer_barcode: manufacturer_barcode || undefined,
                is_batch_tracked,
              });
            } else {
              invalid++;
            }
          } else if (entityType === "suppliers") {
            const name = String(
              rowMap["suppliername"] || rowMap["suppliernamemandatory"] || rowMap["name"] || ""
            ).trim();
            const contact_person = String(rowMap["contactperson"] || rowMap["contact"] || "").trim();
            const phone = String(rowMap["phone"] || rowMap["mobile"] || "").trim();
            const email = String(rowMap["email"] || "").trim();
            const address = String(rowMap["address"] || "").trim();
            const gstin = String(rowMap["gstin"] || rowMap["gst"] || "").trim();

            if (name) {
              normalized.push({
                name,
                contact_person: contact_person || undefined,
                phone: phone || undefined,
                email: email || undefined,
                address: address || undefined,
                gstin: gstin || undefined,
              });
            } else {
              invalid++;
            }
          } else {
            // customers
            const name = String(
              rowMap["customerhospitalname"] ||
              rowMap["customerhospitalnamemandatory"] ||
              rowMap["customername"] ||
              rowMap["name"] ||
              ""
            ).trim();
            const contact_person = String(rowMap["contactperson"] || rowMap["contact"] || "").trim();
            const phone = String(rowMap["phone"] || rowMap["mobile"] || "").trim();
            const email = String(rowMap["email"] || "").trim();
            const address = String(rowMap["address"] || "").trim();
            const gstin = String(rowMap["gstin"] || rowMap["gst"] || "").trim();

            if (name) {
              normalized.push({
                name,
                contact_person: contact_person || undefined,
                phone: phone || undefined,
                email: email || undefined,
                address: address || undefined,
                gstin: gstin || undefined,
              });
            } else {
              invalid++;
            }
          }
        });

        setParsedRows(normalized);
        setInvalidCount(invalid);
        setIsLoading(false);
      } catch (err: any) {
        setIsLoading(false);
        setStatusMessage({ text: `Failed to read Excel file: ${err.message}`, type: "error" });
      }
    };

    reader.readAsBinaryString(selected);
  };

  // 3. Submit Bulk Data in Chunks to prevent network / payload limits
  const handleUploadData = async () => {
    if (parsedRows.length === 0) return;

    setIsUploading(true);
    setStatusMessage(null);

    const token =
      authToken ||
      (typeof window !== "undefined"
        ? localStorage.getItem("vetecura_token") || sessionStorage.getItem("vetecura_token")
        : null);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const CHUNK_SIZE = 500;
    const totalItems = parsedRows.length;
    let totalInserted = 0;
    let totalUpdated = 0;

    const endpoint = `/api/v1/${entityType}/bulk`;

    try {
      for (let i = 0; i < totalItems; i += CHUNK_SIZE) {
        const chunk = parsedRows.slice(i, i + CHUNK_SIZE);
        setUploadProgress({ current: Math.min(i + chunk.length, totalItems), total: totalItems });

        const payloadKey = entityType === "products" ? "products" : entityType === "suppliers" ? "suppliers" : "customers";

        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({ [payloadKey]: chunk }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server returned error (${res.status}) on batch ${i / CHUNK_SIZE + 1}`);
        }

        const data = await res.json();
        totalInserted += data.inserted || 0;
        totalUpdated += data.updated || 0;
      }

      setStatusMessage({
        text: ` Successfully imported ${totalItems.toLocaleString("en-IN")} records (${totalInserted} inserted, ${totalUpdated} updated)!`,
        type: "success",
      });

      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setStatusMessage({ text: `Upload failed: ${err.message}`, type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{entityTitles[entityType]}</h3>
              <p className="text-xs text-slate-400">{entitySubtitles[entityType]}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Download Sample Template Card */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Step 1: Download Sample Excel Template</span>
              </p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Use our pre-formatted template with column headers and sample data.
              </p>
            </div>
            <button
              onClick={handleDownloadSample}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel</span>
            </button>
          </div>

          {/* Step 2: File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-3xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-emerald-50/20 group space-y-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 shadow-2xs mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {file ? file.name : "Click to select or drag & drop Excel / CSV file"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supports .xlsx, .xls, .csv (Handles 3000+ items seamlessly)
              </p>
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs font-bold text-slate-600">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Parsing and validating rows...</span>
            </div>
          )}

          {/* Parsed Summary and Preview */}
          {parsedRows.length > 0 && !isLoading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{parsedRows.length.toLocaleString("en-IN")} Valid Records Ready</span>
                </span>
                {invalidCount > 0 && (
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>{invalidCount} Skipped (Empty SKU/Name)</span>
                  </span>
                )}
              </div>

              {/* Mini Preview Table (First 5 Rows) */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Preview (First {Math.min(parsedRows.length, 5)} rows)
                </div>
                <div className="overflow-x-auto max-h-40 divide-y divide-slate-100 font-mono text-[11px]">
                  {parsedRows.slice(0, 5).map((r, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-4 hover:bg-slate-50">
                      <span className="font-bold text-slate-900 truncate">
                        {entityType === "products" ? `${r.sku} — ${r.name}` : r.name}
                      </span>
                      <span className="text-slate-500 text-[10px] shrink-0">
                        {entityType === "products"
                          ? `${r.unit || "unit"} · ₹${r.unit_price || 0}`
                          : r.phone || r.email || "Details ready"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar during Upload */}
          {isUploading && (
            <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Importing records to database...</span>
                <span>
                  {uploadProgress.current.toLocaleString("en-IN")} / {uploadProgress.total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full transition-all duration-300"
                  style={{
                    width: `${uploadProgress.total ? (uploadProgress.current / uploadProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                statusMessage.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50/70">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleUploadData}
            disabled={parsedRows.length === 0 || isUploading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>
                  {parsedRows.length > 0
                    ? `Import ${parsedRows.length.toLocaleString("en-IN")} Records`
                    : "Select File to Import"}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
