// Central TypeScript definitions for Vetecura IMS

export type NavTab = 
  | 'overview'
  | 'inbound'
  | 'outbound'
  | 'inventory'
  | 'security'
  | 'analytics'
  | 'users'
  | 'labels';

export type UserRole = 'owner' | 'warehouse_manager' | 'warehouse_staff' | 'purchase_team';

export interface Supplier {
  id: string;
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  rating?: number;
  contact_person?: string;
  gstin?: string;
  address?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode_format?: string;
  reorder_level?: number;
  category?: string;
  manufacturer_barcode?: string;
  unit?: string;
}

export interface PurchaseOrderItem {
  id?: string;
  product_id: string;
  ordered_qty: number;
  received_qty?: number;
  unit_price?: number;
}

export interface POOut {
  id: string;
  po_number: string;
  supplier_id: string;
  status: string;
  created_at: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderRow {
  id?: string;
  po_number: string;
  supplier: string;
  expected_units: number;
  scanned_units: number;
  status: "Draft" | "In Progress" | "Completed & Verified";
  created_at?: string;
  items?: any[];
}

export interface SalesOrderRow {
  id: string;
  order_reference: string;
  customer_name: string;
  expected_count: number;
  scanned_count: number;
  status: "Ready to Ship" | "In Progress" | "Mismatch (Block)";
  created_at?: string;
  items?: any[];
}

export interface RackItem {
  id: string;
  warehouse_id?: string;
  code: string;
  capacity_units?: number;
  qr_label_code?: string;
  current_occupancy: number;
}

export interface TelegramAlertLog {
  id: string;
  topic: string;
  message: string;
  status?: string;
  time?: string;
  sent_at?: string;
}

export interface ExpiryRiskRow {
  product_name: string;
  batch_number: string;
  expiry_date: string;
  stock_qty: number;
  risk_score: number;
}

export interface LowStockRow {
  product_name: string;
  sku: string;
  stock_qty: number;
  reorder_level: number;
  suggested_reorder_qty: number;
}

export interface SystemUser {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  user_email: string;
  user_id?: string;
  entity_type?: string;
  entity_id?: string;
  timestamp: string;
  details?: string;
  current_hash: string;
  previous_hash: string;
}

export interface DashboardMetrics {
  totalValuation: number;
  dispatchedUnits: number;
  anomalies: number;
  expiryAlerts: string;
}

export interface ChainVerificationData {
  status: string;
  total_logs: number;
  verified_count: number;
  chain_intact: boolean;
  message: string;
  tampered_entries?: Array<{ index: number; id: string; reason: string }>;
}

export interface DamageWriteoffItem {
  id: string;
  item: string;
  reason: string;
  photo_url: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  created_at?: string;
}
