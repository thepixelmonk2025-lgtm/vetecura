import os

project_md_path = r'C:\Tyreshop\PROJECT.md'

print("=== Updating C:\\Tyreshop\\PROJECT.md with latest Core Accounting Engine & Demo Data Specs ===")

new_project_md_content = """# TyreShop Manager — Smart Billing, Inventory & Double-Entry Accounting System

**Commercial Production Release (v1.0.0) — By The Pixel Monk**

TyreShop Manager is a high-performance, 100% offline desktop application built for tyre retailers, auto alignment centers, and battery distributors. It features an integrated barcode-first billing engine, automated inventory tracking, customer credit (udhaar) ledger, CA-ready double-entry accounting engine, node-locked hardware licensing, and automated Telegram store management alerts.

---

## 1. Key Features & Capabilities

### ⚡ 1. Barcode & Fast Counter Billing
- **Lightning-Fast Counter Billing:** Dedicated keyboard-driven POS interface (`F2` to start, `F12` to complete) with instant barcode scanner support.
- **Auto Stock Deduction:** Stock is automatically deducted from SQLite inventory upon invoice generation.
- **Insufficient Stock Guard:** Real-time prevention of negative stock selling.

### 💰 2. Flexible Multi-Tender & Split Payments
- **Payment Modes:** Cash, Bank / UPI (QR Scan), Credit (Customer Udhaar), and Split Tender (e.g. ₹5,000 Cash + ₹4,600 UPI).
- **Customer Udhaar Ledger:** Automated balance calculation and passbook tracking for regular fleet customers.

### 📊 3. Core Double-Entry Accounting Engine (CA-Ready)
- **Automatic General Ledger Posting:** Synchronous double-entry journal creation (`journal_entries`, `journal_lines`) for every sales bill, purchase invoice, and shop expense.
- **Standard Indian Chart of Accounts (COA):** Pre-seeded COA codes (Cash `1010`, Bank `1020`, AR `1030`, Stock `1040`, AP `2010`, CGST `2020`/`2022`, SGST `2021`/`2023`, Sales Revenue `4010`, Shop Rent `5020`, Salaries `5030`, Power `5040`, Freight `5060`, Maintenance `5070`).
- **5 Integrated Accounting Sub-Modules:**
  1. **Daybook & General Ledger:** View all debit/credit vouchers with date filters and manual journal voucher (JV) creation.
  2. **Expenses & Payments:** One-click quick presets (Rent, Salary, Electricity, Tea/Refreshments, Transport, Maintenance) with expense register.
  3. **Accounts Payable (Suppliers):** Manage tyre vendors (Apollo, MRF, CEAT, Castrol/Exide), inward purchase invoices, and pending vendor dues.
  4. **Financial Statements:** Live CA-ready Profit & Loss (P&L), Balance Sheet (BS), Trial Balance (TB), and GSTR-3B Tax Reconciliation.
  5. **Cash Drawer Count & CA Export:** Daily denomination counter (₹500, ₹200, ₹100, ₹50, ₹20, ₹10, Coins), system discrepancy calculation, and complete multi-sheet Excel package export (`.xlsx`).
- **React Tab Error Boundary:** Built-in isolated error boundary (`TabErrorBoundary`) guaranteeing 100% crash recovery and zero white/black screens.

### 🚗 4. Pre-Seeded Real-Life Client Demo Dataset (Sangli Tyre Retailer)
- **Store Identity:** Royal Heritage Tyres & Wheel Alignment, Sangli (`27AAACR1234F1ZM`).
- **Real-Life Products (14 Items):** MRF ZLX, Apollo Alnac 4G, CEAT SecuraDrive, Michelin Primacy 4ST, Bridgestone Dueler, Scooter tyres, Castrol & Shell engine oils, Exide & Amaron batteries, tubeless valves, and 3D computerized wheel alignment & nitrogen refill.
- **1-Month Historical Sales Bills (42 Invoices):** Populated across July 20, 2026 – Aug 18, 2026 with 100% balanced revenue journals (`Total Debits == Total Credits`).
- **Regular Customers (6 Accounts):** Rahul Deshmukh (`MH-10-AZ-4412`), Vikram Patil (`MH-10-BN-9988`), Kadam Logistics (`MH-10-CR-5544`), etc.
- **Real Shop Expenses (6 Vouchers):** Shop Rent (₹25k), Staff Salaries (₹32k), Power Bill (₹4.85k), Tea/Snacks (₹1.25k), Transport Freight (₹3.5k), and Compressor Maintenance (₹2.4k).
- **Accounts Payable / Suppliers (4 Vendors & ₹2.20L Dues):** Apollo Tyres (₹96.25k), MRF Tyres Hub (₹80k), Castrol/Exide Distributors (₹44k), and CEAT Tyres.

### 🛡️ 5. Commercial Security & Node-Locked Hardening
- **Server-Side IPC Authorization:** Strict Main-process session guards (`requireAuth()`, `requireAdmin()`, `requirePermission()`).
- **Granular Staff Permissions:** Staff accounts independently restricted from viewing confidential profit margins (`Ctrl+Shift+P`), cost prices, and financial statement reports.
- **Hardware-Bound Hardware Lock & AES-256 Vault:** License keys and backups bound to physical CPU, Motherboard, and Disk UUID using 150,000 PBKDF2 iterations.

---

## 2. Technology Stack & Architecture

| Layer | Technology | Details |
|---|---|---|
| **Desktop Shell** | Electron (v31+) | Secure IPC contextBridge, native print API, before-quit hooks |
| **Frontend UI** | React 18 + Vite | Tailwind CSS, Lucide Icons, ErrorBoundary, responsive light theme |
| **Database** | SQLite (`better-sqlite3`) | Encrypted local database, WAL mode, foreign keys, transaction rollbacks |
| **Accounting Engine** | Custom JS / SQLite | Double-entry journal engine, P&L, Balance Sheet, Trial Balance, GST |
| **Excel Generator** | SheetJS (`xlsx`) | Multi-sheet CA accounting workbook export |
| **Security & Auth** | `bcrypt` + `crypto` (AES-256-GCM) | Password hashing, PBKDF2 150k rounds, hardware license locks |
| **Branding & Vendor** | **The Pixel Monk** | Commercial edition white-labeling & license distribution |
| **Packaging** | **electron-builder** | Standalone Windows NSIS executable installer (`.exe`) |

---

## 3. Directory Structure

```
C:/Tyreshop/
├── electron/
│   ├── main.js                 # Electron main entry point & window management
│   ├── preload.js              # Secure IPC bridge (contextBridge)
│   ├── db/
│   │   ├── db.js               # SQLite instance with WAL mode
│   │   ├── migrationRunner.js  # Automated schema versioning & migration runner
│   │   ├── test_db.js          # Core database & security QA test suite
│   │   ├── migrations/         # 001_initial to 005_core_accounting_engine
│   │   └── seed.js             # Initial seeder
│   ├── ipc/
│   │   ├── auth.ipc.js         # Authentication & permissions
│   │   ├── billing.ipc.js      # Bill creation & profit overlay
│   │   ├── inventory.ipc.js    # Products, stock in, adjustments
│   │   ├── customer.ipc.js     # Customers & udhaar ledger
│   │   ├── accounting.ipc.js   # Double-entry ledger, expenses, suppliers & reconciliation
│   │   ├── reports.ipc.js      # GSTR-1, P&L, sales analytics
│   │   ├── export.ipc.js       # Admin-guarded multi-sheet Excel workbooks
│   │   ├── license.ipc.js      # Machine activation & deactivation
│   │   ├── test_billing.js     # Billing & profit QA test script
│   │   ├── test_inventory.js   # Inventory QA test script
│   │   └── test_reports.js     # Reports & financial QA test script
│   └── services/
│       ├── accountingService.js # Double-entry accounting engine & general ledger
│       ├── sessionService.js   # Main-process session & permission enforcer
│       ├── printService.js     # Native A4 invoice printing
│       └── backupService.js    # SQLite backup & rotation
│
├── src/                        # React Frontend (Vite)
│   ├── pages/
│   │   ├── Dashboard.jsx       # Executive & operational dashboard
│   │   ├── Billing/            # New Bill (F2), History, Profit Overlay
│   │   ├── Inventory/          # Products, Stock IN, Adjustments
│   │   ├── Customers/          # Directory & Udhaar Passbook Ledger
│   │   ├── Accounting/         # Daybook, Expenses, Suppliers, Statements, Cash Count
│   │   ├── Reports/            # GSTR-1, Sales, P&L, Stock Velocity
│   │   └── Settings/           # Shop Details, GST Master, Backups
│   └── components/ui/          # Reusable UI primitives
│
├── package.json
└── vite.config.js
```

---

## 4. Default Credentials & Shortcuts

### Default Login Accounts:
- **Admin (Shop Owner):** Username: `admin` | Password: `admin123` *(Full access to profit margins, financial statements, reports, settings)*
- **Staff (Counter Staff):** Username: `staff` | Password: `staff123` *(Operational counter billing & stock access)*

### Keyboard Shortcuts:
- `F2` — Open New Bill Screen
- `F12` — Confirm and Save Bill
- `Ctrl + Shift + P` — Toggle Hidden Profit Margin Overlay (Admin Only)

---

## 5. Development & Automated QA Commands

```powershell
# 1. Run local development mode (React Vite + Electron)
npm run dev

# 2. Run Database & Security QA Tests
npx electron electron/db/test_db.js

# 3. Run Core Billing & Profit QA Tests
npx electron electron/ipc/test_billing.js

# 4. Run Inventory & Barcode QA Tests
npx electron electron/ipc/test_inventory.js

# 5. Run Financial Reports & Statements QA Tests
npx electron electron/ipc/test_reports.js

# 6. Build standalone Windows .exe installer
npm run dist:win
```
"""

with open(project_md_path, 'w', encoding='utf-8') as f:
    f.write(new_project_md_content)

print("SUCCESS: C:\\Tyreshop\\PROJECT.md updated successfully!")
