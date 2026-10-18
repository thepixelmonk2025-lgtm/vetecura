import sqlite3
import os
from datetime import datetime, timedelta

appdata = os.environ.get('APPDATA', '')
db_paths = [
    os.path.join(appdata, 'tyreshop-manager', 'data', 'tyreshop.db'),
    os.path.join(appdata, 'Electron', 'data', 'tyreshop.db'),
    r'C:\Tyreshop\data\tyreshop.db'
]

print("=== Starting 1-Month Real-Life Tyre Shop Balanced Accounting SQLite Seeding ===")

for db_path in db_paths:
    if not os.path.exists(db_path):
        print(f"Skipping non-existent db: {db_path}")
        continue

    print(f"\n================ Populating Tyre Shop Data into: {db_path} ================")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        cursor.execute("PRAGMA foreign_keys = OFF")

        # 1. Update Settings
        print("Updating Store Settings...")
        settings_map = {
            'shop_name': 'Royal Heritage Tyres & Wheel Alignment',
            'shop_address': 'Plot No. 12, Main Highway Bypass Road, Near Bus Stand, Sangli 416416',
            'shop_phone': '9822012345',
            'shop_email': 'contact@royalheritagetyres.com',
            'shop_gstin': '27AAACR1234F1ZM',
            'bill_prefix': 'RHT',
            'terms_conditions': '1. Goods once sold will not be accepted back without valid bill.\n2. Tyre & Battery warranty claims subject to manufacturer policy.\n3. All disputes subject to Sangli jurisdiction.'
        }
        for k, v in settings_map.items():
            cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))

        # 2. Clear old data and journal entries to ensure clean accounting ledger sync
        print("Clearing old data and journal entries...")
        cursor.execute("DELETE FROM journal_lines")
        cursor.execute("DELETE FROM journal_entries")
        cursor.execute("DELETE FROM bill_items")
        cursor.execute("DELETE FROM bills")
        cursor.execute("DELETE FROM customer_ledger")
        cursor.execute("DELETE FROM stock_transactions")
        cursor.execute("DELETE FROM customers")
        cursor.execute("DELETE FROM products")

        # 3. Insert Real-Life Tyre Shop Products Master
        print("Inserting 14 Real-Life Tyre & Auto Spares Products...")
        products = [
            (1, 'MRF ZLX 165/80 R14 85T (Car Radial Tyre)', 'MRF', 'Tyres', '165/80 R14', '40111010', '8901234001', 3200, 3950, 3600, 28, 48, 10),
            (2, 'Apollo Alnac 4G 185/65 R15 (Car Radial Tyre)', 'Apollo', 'Tyres', '185/65 R15', '40111010', '8901234002', 3850, 4850, 4400, 28, 35, 8),
            (3, 'CEAT SecuraDrive 195/60 R15 (High Speed Tyre)', 'CEAT', 'Tyres', '195/60 R15', '40111010', '8901234003', 3600, 4450, 4000, 28, 28, 6),
            (4, 'Michelin Primacy 4ST 205/55 R16 (Premium Tyre)', 'Michelin', 'Tyres', '205/55 R16', '40111010', '8901234004', 7100, 8900, 8200, 28, 16, 4),
            (5, 'Bridgestone Dueler D684 265/65 R17 (SUV Tyre)', 'Bridgestone', 'Tyres', '265/65 R17', '40112010', '8901234005', 10200, 12800, 11800, 28, 12, 4),
            (6, 'CEAT Secura Zoom 90/90-12 54J (Scooter Tyre)', 'CEAT', 'Tyres', '90/90-12', '40114000', '8901234006', 1150, 1550, 1350, 28, 42, 10),
            (7, 'Castrol Edge 5W-40 Synthetic Engine Oil (4L)', 'Castrol', 'Lubricants & Oils', '4 Litre Can', '27101980', '8901234007', 2100, 2850, 2500, 18, 30, 5),
            (8, 'Shell Helix Ultra 0W-20 Engine Oil (3.5L)', 'Shell', 'Lubricants & Oils', '3.5 Litre Can', '27101980', '8901234008', 2400, 3200, 2800, 18, 25, 5),
            (9, 'Exide Epiq 35Ah Maintenance-Free Battery', 'Exide', 'Batteries', '35Ah Car', '85071000', '8901234009', 3200, 4300, 3800, 28, 18, 3),
            (10, 'Amaron Hi-Way 100Ah Heavy Battery', 'Amaron', 'Batteries', '100Ah Truck', '85071000', '8901234010', 6500, 8500, 7600, 28, 10, 2),
            (11, 'JK Tyre Butyl Inner Tube 90/90-12', 'JK Tyre', 'Tubes', '90/90-12', '40139049', '8901234011', 220, 350, 280, 18, 60, 15),
            (12, 'Brass Tubeless Tyre Valve (Set of 4)', 'Generic', 'Accessories', 'Standard', '84818090', '8901234012', 60, 150, 100, 18, 120, 20),
            (13, '3D Computerized Alignment & Wheel Balancing', 'In-House', 'Services', '4 Wheels', '998729', 'SERV001', 0, 600, 600, 18, 999, 0),
            (14, 'Nitrogen Air Purge & Refill (All 4 Tyres)', 'In-House', 'Services', 'All Tyres', '998729', 'SERV002', 0, 200, 200, 18, 999, 0)
        ]

        cursor.executemany("""
            INSERT INTO products (id, name, brand, category, size, hsn_code, barcode, cost_price, selling_price, wholesale_price, gst_percent, current_stock, low_stock_threshold, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, products)

        # 4. Insert Customers
        print("Inserting Customers...")
        customers = [
            (1, 'Rahul Deshmukh', '9822144556', 'Vishrambag, Sangli', 'MH-10-AZ-4412', 'Hyundai Creta'),
            (2, 'Vikram Patil', '9890233441', 'College Corner, Sangli', 'MH-10-BX-9901', 'Toyota Innova Crysta'),
            (3, 'Amit Shah', '9763188200', 'Market Yard, Sangli', 'MH-10-CQ-1234', 'Honda City'),
            (4, 'Suresh Kadam (Kadam Logistics)', '9422055112', 'MIDC Kupwad, Sangli', 'MH-10-CR-8899', 'Mahindra Bolero Pickup'),
            (5, 'Prakash Jadhav', '9823411223', 'Miraj Road, Sangli', 'MH-10-DJ-5566', 'Maruti Swift Dzire'),
            (6, 'Mahesh Shinde', '9970177889', 'Gaon Bhag, Sangli', 'MH-10-EK-3321', 'Honda Activa 6G')
        ]

        cursor.executemany("""
            INSERT INTO customers (id, name, phone, address, vehicle_number, vehicle_model)
            VALUES (?, ?, ?, ?, ?, ?)
        """, customers)

        # 5. Generate 1-Month Balanced Accounting Bills
        print("Generating 1 Month (30 Days) of Balanced Double-Entry Tyre Sales Bills...")
        today = datetime(2026, 8, 18, 10, 0, 0)
        prod_by_id = {p[0]: p for p in products}

        bill_id = 1
        for day_offset in range(30, -1, -1):
            tx_date = today - timedelta(days=day_offset)
            date_str = tx_date.strftime("%Y-%m-%d %H:%M:%S")

            daily_count = 2 if (day_offset % 3 == 0) else 1

            for b in range(daily_count):
                cust_idx = (bill_id + b) % len(customers)
                cust = customers[cust_idx]
                b_num = f"RHT-{1000 + bill_id}"

                if bill_id % 4 == 1:
                    bill_items_spec = [(2, 4), (13, 1), (14, 1)]
                elif bill_id % 4 == 2:
                    bill_items_spec = [(5, 4), (13, 1)]
                elif bill_id % 4 == 3:
                    bill_items_spec = [(6, 2), (11, 2)]
                else:
                    bill_items_spec = [(7, 1), (9, 1)]

                gross_total = 0.0
                total_cgst = 0.0
                total_sgst = 0.0
                subtotal_taxable = 0.0

                item_rows = []

                for pid, qty in bill_items_spec:
                    p = prod_by_id[pid]
                    name, hsn, cost, retail_price, gst_pct = p[1], p[5], p[7], p[8], p[10]

                    line_gross = float(retail_price * qty)
                    # Taxable pre-tax rate = line_gross / (1 + gst_pct / 100)
                    taxable_rate = round(float(retail_price) / (1.0 + gst_pct / 100.0), 2)
                    line_taxable = round(taxable_rate * qty, 2)
                    line_gst = round(line_gross - line_taxable, 2)
                    line_cgst = round(line_gst / 2.0, 2)
                    line_sgst = round(line_gst / 2.0, 2)

                    subtotal_taxable += line_taxable
                    total_cgst += line_cgst
                    total_sgst += line_sgst
                    gross_total += line_gross

                    item_rows.append((bill_id, pid, name, hsn, qty, taxable_rate, float(cost), gst_pct, line_taxable))

                # Double entry relation: total_amount = subtotal_taxable + total_cgst + total_sgst
                subtotal_taxable = round(subtotal_taxable, 2)
                total_cgst = round(total_cgst, 2)
                total_sgst = round(total_sgst, 2)
                total_amount = round(subtotal_taxable + total_cgst + total_sgst, 2)

                is_credit = ("Logistics" in cust[1] and bill_id % 2 == 0)
                pay_mode = 'CREDIT' if is_credit else ('UPI' if bill_id % 3 == 0 else 'CASH')
                pay_status = 'CREDIT' if is_credit else 'PAID'

                cursor.execute("""
                    INSERT INTO bills (id, bill_number, customer_id, is_gst, subtotal, discount_type, discount_value, discount_amount, cgst_amount, sgst_amount, total_amount, payment_mode, payment_status, created_by, is_cancelled, created_at)
                    VALUES (?, ?, ?, 1, ?, 'FLAT', 0, 0, ?, ?, ?, ?, ?, 1, 0, ?)
                """, (bill_id, b_num, cust[0], subtotal_taxable, total_cgst, total_sgst, total_amount, pay_mode, pay_status, date_str))

                for it in item_rows:
                    cursor.execute("""
                        INSERT INTO bill_items (bill_id, product_id, item_name, hsn_code, quantity, rate, cost_price_snapshot, gst_percent, line_discount, line_total)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
                    """, it)

                    cursor.execute("""
                        INSERT INTO stock_transactions (product_id, type, quantity, reason, reference_bill_id, performed_by, created_at)
                        VALUES (?, 'OUT', ?, 'Customer Sale', ?, 1, ?)
                    """, (it[1], it[4], bill_id, date_str))

                if is_credit:
                    cursor.execute("""
                        INSERT INTO customer_ledger (customer_id, bill_id, type, amount, note, created_at)
                        VALUES (?, ?, 'DEBIT', ?, ?, ?)
                    """, (cust[0], bill_id, total_amount, f"Udhaar Bill #{b_num} - Vehicle {cust[4]}", date_str))

                bill_id += 1

        conn.commit()
        cursor.execute("PRAGMA foreign_keys = ON")
        conn.close()
        print(f"SUCCESSFULLY UPDATED {db_path} with {bill_id - 1} Balanced Bills!")

    except Exception as e:
        print(f"Error seeding database {db_path}: {e}")
