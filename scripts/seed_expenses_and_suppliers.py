import sqlite3
import os

appdata = os.environ.get('APPDATA', '')
db_paths = [
    os.path.join(appdata, 'tyreshop-manager', 'data', 'tyreshop.db'),
    os.path.join(appdata, 'Electron', 'data', 'tyreshop.db'),
    r'C:\Tyreshop\data\tyreshop.db'
]

print("=== Seeding Realistic Tyre Shop Expenses & Accounts Payable (Suppliers) ===")

for db_path in db_paths:
    if not os.path.exists(db_path):
        print(f"Skipping non-existent db: {db_path}")
        continue

    print(f"\n================ Populating Expenses & Suppliers into: {db_path} ================")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA foreign_keys = OFF")

        # 1. Insert Suppliers (Vendors)
        print("Inserting Tyre & Auto Spares Suppliers...")
        cursor.execute("DELETE FROM suppliers")
        suppliers = [
            (1, 'Apollo Tyres Ltd (National Distribution)', 'Apollo Tyres Ltd', '9822099887', 'sales@apollotyres.com', '27AAACA1234F1Z1', 'Plot 4, MIDC Shiroli, Kolhapur 416122', 30, 0),
            (2, 'MRF Tyres India Regional Hub', 'MRF Ltd', '9890122334', 'depot.sangli@mrf.com', '27AAACM5678G1Z2', 'Plot 18, Market Yard, Sangli 416416', 30, 0),
            (3, 'CEAT Tyres Wholesale Ltd', 'CEAT Ltd', '9763044556', 'wholesales.ceat@ceat.com', '27AAACC9012H1Z3', 'Station Road, Miraj 416410', 30, 0),
            (4, 'Castrol & Exide Automotive Distributors', 'Shree Auto Electricals', '9422011223', 'shreeauto@gmail.com', '27AAACS3456I1Z4', 'Shop 8, Auto Market, Sangli 416416', 15, 0),
        ]

        cursor.executemany("""
            INSERT INTO suppliers (id, name, company_name, phone, email, gstin, address, payment_terms_days, opening_balance, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, suppliers)

        # 2. Insert Purchases / Supplier Credit Invoices (Accounts Payable)
        print("Inserting Supplier Purchases & Credit Invoices (AP)...")
        cursor.execute("DELETE FROM purchase_items")
        cursor.execute("DELETE FROM purchases")

        purchases = [
            (1, 'PUR-2026-0001', 1, 'APL-INV-8821', '2026-07-25', 77000.0, 9625.0, 9625.0, 96250.0, 'CREDIT', 'CREDIT', 'Apollo Alnac 4G Stock Replenishment Batch', 1, '2026-07-25 11:30:00'),
            (2, 'PUR-2026-0002', 2, 'MRF-INV-4412', '2026-08-02', 64000.0, 8000.0, 8000.0, 80000.0, 'CREDIT', 'CREDIT', 'MRF ZLX Passenger Tyres Stock Replenishment', 1, '2026-08-02 14:15:00'),
            (3, 'PUR-2026-0003', 4, 'SAE-INV-1092', '2026-08-10', 36000.0, 4000.0, 4000.0, 44000.0, 'CREDIT', 'CREDIT', 'Castrol Synthetic Oil Cans & Exide Car Batteries', 1, '2026-08-10 16:45:00'),
        ]

        cursor.executemany("""
            INSERT INTO purchases (id, purchase_number, supplier_id, supplier_invoice_no, invoice_date, subtotal, cgst_amount, sgst_amount, total_amount, payment_mode, payment_status, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, purchases)

        # Purchase Items
        purchase_items = [
            (1, 1, 2, 'Apollo Alnac 4G 185/65 R15 (Car Radial Tyre)', 20, 3850.0, 28.0, 10780.0, 10780.0, 96250.0),
            (2, 2, 1, 'MRF ZLX 165/80 R14 85T (Car Radial Tyre)', 20, 3200.0, 28.0, 8960.0, 8960.0, 80000.0),
            (3, 3, 7, 'Castrol Edge 5W-40 Synthetic Engine Oil (4L)', 10, 2100.0, 18.0, 1890.0, 1890.0, 24780.0),
            (4, 3, 9, 'Exide Epiq 35Ah Maintenance-Free Battery', 5, 3200.0, 28.0, 2240.0, 2240.0, 19220.0),
        ]

        cursor.executemany("""
            INSERT INTO purchase_items (id, purchase_id, product_id, item_name, quantity, unit_cost, gst_percent, cgst_amount, sgst_amount, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, purchase_items)

        # 3. Insert Realistic Shop Expenses
        print("Inserting Shop Expenses...")
        cursor.execute("DELETE FROM expenses")
        expenses = [
            (1, 'EXP-2026-0001', 20, 2, 25000.0, '2026-08-01', 'Shop Rent', 'Sangli Commercial Complex', 'UPI', 'UPI/62819281', 0, 'Monthly Shop Rent for August 2026', 1, '2026-08-01 10:00:00'),
            (2, 'EXP-2026-0002', 21, 2, 32000.0, '2026-08-05', 'Staff Salaries & Wages', 'Counter Staff & Mechanic Wages', 'UPI', 'UPI/71928391', 0, 'Salaries for 2 Fitters & 1 Counter Assistant', 1, '2026-08-05 18:30:00'),
            (3, 'EXP-2026-0003', 22, 2, 4850.0, '2026-08-08', 'Electricity & Power Bills', 'MSEDCL Sangli', 'UPI', 'MSEB-AUG-9921', 0, 'Power Bill for Air Compressor & Wheel Balancer', 1, '2026-08-08 11:20:00'),
            (4, 'EXP-2026-0004', 23, 1, 1250.0, '2026-08-10', 'Tea, Refreshments & Counter Misc', 'Mahesh Canteen & Tea', 'CASH', 'CASH-VOUCH-14', 0, 'Daily Tea & Refreshments for Staff & Customers', 1, '2026-08-10 17:00:00'),
            (5, 'EXP-2026-0005', 24, 1, 3500.0, '2026-08-12', 'Freight, Transport & Delivery', 'VRL Logistics Transport', 'CASH', 'LR-882910', 0, 'Tyre Stock Delivery Freight from Depot', 1, '2026-08-12 15:40:00'),
            (6, 'EXP-2026-0006', 25, 1, 2400.0, '2026-08-15', 'Shop Repairs & Maintenance', 'Standard Pneumatic Services', 'CASH', 'CASH-VOUCH-19', 0, 'Air Compressor Service & Hose Valve Replacement', 1, '2026-08-15 12:10:00'),
        ]

        cursor.executemany("""
            INSERT INTO expenses (id, expense_number, expense_account_id, paid_from_account_id, amount, date, category, vendor_name, payment_mode, reference_no, is_recurring, notes, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, expenses)

        # 4. Post Double-Entry Journal Entries for Expenses & Purchases to keep General Ledger balanced
        print("Posting Double-Entry Journal Vouchers for Expenses & Purchases...")
        jv_id = 1000

        # Expenses JVs
        for exp in expenses:
            exp_id, exp_num, exp_acc_id, paid_acc_id, amt, date_val, cat, vendor, pay_mode, ref, rec, notes_val, u_id, created_at_val = exp
            jv_num = f"JV-EXP-{1000 + exp_id}"

            cursor.execute("""
                INSERT INTO journal_entries (id, entry_number, date, reference_type, reference_id, narration, total_debit, total_credit, is_system, created_by, created_at)
                VALUES (?, ?, ?, 'EXPENSE', ?, ?, ?, ?, 1, 1, ?)
            """, (jv_id, jv_num, date_val, exp_id, f"Expense {exp_num}: {cat} ({vendor})", amt, amt, created_at_val))

            # Dr Expense Account (e.g. 5020 Rent, 5030 Salary)
            cursor.execute("""
                INSERT INTO journal_lines (journal_entry_id, account_id, party_type, party_id, debit, credit, line_narration)
                VALUES (?, ?, 'NONE', NULL, ?, 0, ?)
            """, (jv_id, exp_acc_id, amt, f"{cat} - {notes_val}"))

            # Cr Cash (1010) or Bank (1020)
            cursor.execute("""
                INSERT INTO journal_lines (journal_entry_id, account_id, party_type, party_id, debit, credit, line_narration)
                VALUES (?, ?, 'NONE', NULL, 0, ?, ?)
            """, (jv_id, paid_acc_id, amt, f"Paid via {pay_mode}"))

            jv_id += 1

        # Purchases JVs
        for pur in purchases:
            p_id, pur_num, supp_id, supp_inv, inv_date, subtotal, cgst, sgst, total_amt, pay_mode, pay_stat, notes_val, u_id, created_at_val = pur
            jv_num = f"JV-PUR-{1000 + p_id}"

            cursor.execute("""
                INSERT INTO journal_entries (id, entry_number, date, reference_type, reference_id, narration, total_debit, total_credit, is_system, created_by, created_at)
                VALUES (?, ?, ?, 'PURCHASE', ?, ?, ?, ?, 1, 1, ?)
            """, (jv_id, jv_num, inv_date, p_id, f"Purchase Stock In #{pur_num} (Inv #{supp_inv})", total_amt, total_amt, created_at_val))

            # Dr Inventory Account (1040)
            cursor.execute("""
                INSERT INTO journal_lines (journal_entry_id, account_id, party_type, party_id, debit, credit, line_narration)
                VALUES (?, 4, 'NONE', NULL, ?, 0, 'Inventory Stock In')
            """, (jv_id, total_amt))

            # Cr Accounts Payable (2010) for Supplier
            cursor.execute("""
                INSERT INTO journal_lines (journal_entry_id, account_id, party_type, party_id, debit, credit, line_narration)
                VALUES (?, 6, 'SUPPLIER', ?, 0, ?, ?)
            """, (jv_id, supp_id, total_amt, f"Supplier Invoice #{supp_inv} Credit Payable"))

            jv_id += 1

        conn.commit()
        cursor.execute("PRAGMA foreign_keys = ON")
        conn.close()
        print(f"SUCCESSFULLY POPULATED EXPENSES & SUPPLIERS DATA into {db_path}!")

    except Exception as e:
        print(f"Error seeding database {db_path}: {e}")
