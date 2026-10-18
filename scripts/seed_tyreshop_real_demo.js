const path = require('path');
const fs = require('fs');

// Require better-sqlite3 from C:\Tyreshop\node_modules\better-sqlite3
const Database = require('C:/Tyreshop/node_modules/better-sqlite3');

const dbPaths = [
  path.join(process.env.APPDATA || '', 'tyreshop-manager', 'data', 'tyreshop.db'),
  path.join(process.env.APPDATA || '', 'Electron', 'data', 'tyreshop.db'),
  'C:/Tyreshop/data/tyreshop.db'
];

console.log('Starting 1-Month Real-Life Tyre Shop Database Seed...');

for (const dbPath of dbPaths) {
  if (!fs.existsSync(dbPath)) {
    console.log(`Skipping non-existent db at: ${dbPath}`);
    continue;
  }

  console.log(`\n================ Populating Tyre Shop Data into: ${dbPath} ================`);
  const db = new Database(dbPath);

  // Enable WAL and foreign keys
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF'); // Turn off temporarily during re-seed

  try {
    const seedTx = db.transaction(() => {
      // 1. Update Settings
      console.log('Setting Shop Details to Tyre & Alignment Store...');
      const settingsMap = {
        'shop_name': 'Royal Heritage Tyres & Wheel Alignment',
        'shop_address': 'Plot No. 12, Main Highway Bypass Road, Near Bus Stand, Sangli 416416',
        'shop_phone': '9822012345',
        'shop_email': 'contact@royalheritagetyres.com',
        'shop_gstin': '27AAACR1234F1ZM',
        'bill_prefix': 'RHT',
        'terms_conditions': '1. Goods once sold will not be accepted back without valid bill.\n2. Tyre & Battery warranty claims subject to manufacturer policy.\n3. All disputes subject to Sangli jurisdiction.',
      };

      const setStmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
      for (const [k, v] of Object.entries(settingsMap)) {
        setStmt.run(k, v);
      }

      // 2. Clean out old Garment Products, Bills, Customers, Ledger
      console.log('Clearing old garment sample products & transactions...');
      db.prepare('DELETE FROM bill_items').run();
      db.prepare('DELETE FROM bills').run();
      db.prepare('DELETE FROM customer_ledger').run();
      db.prepare('DELETE FROM stock_transactions').run();
      db.prepare('DELETE FROM customers').run();
      db.prepare('DELETE FROM products').run();

      // 3. Insert Real-Life Tyre Shop Products Master
      console.log('Inserting 14 Real-Life Tyre & Auto Spares Products...');
      const products = [
        { id: 1, name: 'MRF ZLX 165/80 R14 85T (Car Radial Tyre)', brand: 'MRF', category: 'Tyres', size: '165/80 R14', hsn_code: '40111010', barcode: '8901234001', cost_price: 3200, selling_price: 3950, wholesale_price: 3600, gst_percent: 28, current_stock: 48, low_stock_threshold: 10 },
        { id: 2, name: 'Apollo Alnac 4G 185/65 R15 (Car Radial Tyre)', brand: 'Apollo', category: 'Tyres', size: '185/65 R15', hsn_code: '40111010', barcode: '8901234002', cost_price: 3850, selling_price: 4850, wholesale_price: 4400, gst_percent: 28, current_stock: 35, low_stock_threshold: 8 },
        { id: 3, name: 'CEAT SecuraDrive 195/60 R15 (High Speed Tyre)', brand: 'CEAT', category: 'Tyres', size: '195/60 R15', hsn_code: '40111010', barcode: '8901234003', cost_price: 3600, selling_price: 4450, wholesale_price: 4000, gst_percent: 28, current_stock: 28, low_stock_threshold: 6 },
        { id: 4, name: 'Michelin Primacy 4ST 205/55 R16 (Premium Tyre)', brand: 'Michelin', category: 'Tyres', size: '205/55 R16', hsn_code: '40111010', barcode: '8901234004', cost_price: 7100, selling_price: 8900, wholesale_price: 8200, gst_percent: 28, current_stock: 16, low_stock_threshold: 4 },
        { id: 5, name: 'Bridgestone Dueler D684 265/65 R17 (SUV Tyre)', brand: 'Bridgestone', category: 'Tyres', size: '265/65 R17', hsn_code: '40112010', barcode: '8901234005', cost_price: 10200, selling_price: 12800, wholesale_price: 11800, gst_percent: 28, current_stock: 12, low_stock_threshold: 4 },
        { id: 6, name: 'CEAT Secura Zoom 90/90-12 54J (Scooter Tyre)', brand: 'CEAT', category: 'Tyres', size: '90/90-12', hsn_code: '40114000', barcode: '8901234006', cost_price: 1150, selling_price: 1550, wholesale_price: 1350, gst_percent: 28, current_stock: 42, low_stock_threshold: 10 },
        { id: 7, name: 'Castrol Edge 5W-40 Synthetic Engine Oil (4L)', brand: 'Castrol', category: 'Lubricants & Oils', size: '4 Litre Can', hsn_code: '27101980', barcode: '8901234007', cost_price: 2100, selling_price: 2850, wholesale_price: 2500, gst_percent: 18, current_stock: 30, low_stock_threshold: 5 },
        { id: 8, name: 'Shell Helix Ultra 0W-20 Engine Oil (3.5L)', brand: 'Shell', category: 'Lubricants & Oils', size: '3.5 Litre Can', hsn_code: '27101980', barcode: '8901234008', cost_price: 2400, selling_price: 3200, wholesale_price: 2800, gst_percent: 18, current_stock: 25, low_stock_threshold: 5 },
        { id: 9, name: 'Exide Epiq 35Ah Maintenance-Free Battery', brand: 'Exide', category: 'Batteries', size: '35Ah Car', hsn_code: '85071000', barcode: '8901234009', cost_price: 3200, selling_price: 4300, wholesale_price: 3800, gst_percent: 28, current_stock: 18, low_stock_threshold: 3 },
        { id: 10, name: 'Amaron Hi-Way 100Ah Heavy Battery', brand: 'Amaron', category: 'Batteries', size: '100Ah Truck', hsn_code: '85071000', barcode: '8901234010', cost_price: 6500, selling_price: 8500, wholesale_price: 7600, gst_percent: 28, current_stock: 10, low_stock_threshold: 2 },
        { id: 11, name: 'JK Tyre Butyl Inner Tube 90/90-12', brand: 'JK Tyre', category: 'Tubes', size: '90/90-12', hsn_code: '40139049', barcode: '8901234011', cost_price: 220, selling_price: 350, wholesale_price: 280, gst_percent: 18, current_stock: 60, low_stock_threshold: 15 },
        { id: 12, name: 'Brass Tubeless Tyre Valve (Set of 4)', brand: 'Generic', category: 'Accessories', size: 'Standard', hsn_code: '84818090', barcode: '8901234012', cost_price: 60, selling_price: 150, wholesale_price: 100, gst_percent: 18, current_stock: 120, low_stock_threshold: 20 },
        { id: 13, name: '3D Computerized Alignment & Wheel Balancing', brand: 'In-House', category: 'Services', size: '4 Wheels', hsn_code: '998729', barcode: 'SERV001', cost_price: 0, selling_price: 600, wholesale_price: 600, gst_percent: 18, current_stock: 999, low_stock_threshold: 0 },
        { id: 14, name: 'Nitrogen Air Purge & Refill (All 4 Tyres)', brand: 'In-House', category: 'Services', size: 'All Tyres', hsn_code: '998729', barcode: 'SERV002', cost_price: 0, selling_price: 200, wholesale_price: 200, gst_percent: 18, current_stock: 999, low_stock_threshold: 0 },
      ];

      const prodStmt = db.prepare(`
        INSERT INTO products (id, name, brand, category, size, hsn_code, barcode, cost_price, selling_price, wholesale_price, gst_percent, current_stock, low_stock_threshold, is_active)
        VALUES (@id, @name, @brand, @category, @size, @hsn_code, @barcode, @cost_price, @selling_price, @wholesale_price, @gst_percent, @current_stock, @low_stock_threshold, 1)
      `);
      for (const p of products) {
        prodStmt.run(p);
      }

      // 4. Insert Customers
      console.log('Inserting Customers...');
      const customers = [
        { id: 1, name: 'Rahul Deshmukh', phone: '9822144556', address: 'Vishrambag, Sangli', vehicle_number: 'MH-10-AZ-4412', vehicle_model: 'Hyundai Creta' },
        { id: 2, name: 'Vikram Patil', phone: '9890233441', address: 'College Corner, Sangli', vehicle_number: 'MH-10-BX-9901', vehicle_model: 'Toyota Innova Crysta' },
        { id: 3, name: 'Amit Shah', phone: '9763188200', address: 'Market Yard, Sangli', vehicle_number: 'MH-10-CQ-1234', vehicle_model: 'Honda City' },
        { id: 4, name: 'Suresh Kadam (Kadam Logistics)', phone: '9422055112', address: 'MIDC Kupwad, Sangli', vehicle_number: 'MH-10-CR-8899', vehicle_model: 'Mahindra Bolero Pickup' },
        { id: 5, name: 'Prakash Jadhav', phone: '9823411223', address: 'Miraj Road, Sangli', vehicle_number: 'MH-10-DJ-5566', vehicle_model: 'Maruti Swift Dzire' },
        { id: 6, name: 'Mahesh Shinde', phone: '9970177889', address: 'Gaon Bhag, Sangli', vehicle_number: 'MH-10-EK-3321', vehicle_model: 'Honda Activa 6G' },
      ];

      const custStmt = db.prepare(`
        INSERT INTO customers (id, name, phone, address, vehicle_number, vehicle_model)
        VALUES (@id, @name, @phone, @address, @vehicle_number, @vehicle_model)
      `);
      for (const c of customers) {
        custStmt.run(c);
      }

      // 5. Generate 1-Month Daily Real-Life Bills (Past 30 Days: July 20, 2026 to Aug 18, 2026)
      console.log('Generating 1 Month (30 Days) of Realistic Tyre Sales Bills...');
      const billStmt = db.prepare(`
        INSERT INTO bills (id, bill_number, customer_id, is_gst, subtotal, discount_type, discount_value, discount_amount, cgst_amount, sgst_amount, total_amount, payment_mode, payment_status, created_by, is_cancelled, created_at)
        VALUES (@id, @bill_number, @customer_id, 1, @subtotal, 'FLAT', 0, 0, @cgst_amount, @sgst_amount, @total_amount, @payment_mode, @payment_status, 1, 0, @created_at)
      `);

      const itemStmt = db.prepare(`
        INSERT INTO bill_items (bill_id, product_id, item_name, hsn_code, quantity, rate, cost_price_snapshot, gst_percent, line_discount, line_total)
        VALUES (@bill_id, @product_id, @item_name, @hsn_code, @quantity, @rate, @cost_price_snapshot, @gst_percent, 0, @line_total)
      `);

      const ledgerStmt = db.prepare(`
        INSERT INTO customer_ledger (customer_id, bill_id, type, amount, note, created_at)
        VALUES (@customer_id, @bill_id, @type, @amount, @note, @created_at)
      `);

      const stockTxStmt = db.prepare(`
        INSERT INTO stock_transactions (product_id, type, quantity, reason, reference_bill_id, performed_by, created_at)
        VALUES (@product_id, 'OUT', @quantity, 'Customer Sale', @bill_id, 1, @created_at)
      `);

      let billId = 1;
      const today = new Date('2026-08-18T10:00:00');

      // Generate 30 daily transactions
      for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
        const txDate = new Date(today.getTime() - dayOffset * 24 * 60 * 60 * 1000);
        const dateStr = txDate.toISOString().replace('T', ' ').substring(0, 19);

        // 1 to 2 bills per day
        const dailyBillCount = (dayOffset % 3 === 0) ? 2 : 1;

        for (let b = 0; b < dailyBillCount; b++) {
          const cust = customers[(billId + b) % customers.length];
          const bNum = `RHT-${1000 + billId}`;

          // Pick 1 to 3 items per bill
          let billItems = [];
          if (billId % 4 === 1) {
            billItems = [
              { prod: products[1], qty: 4 }, // Apollo Alnac 4G
              { prod: products[12], qty: 1 }, // 3D Alignment & Balancing
              { prod: products[13], qty: 1 }, // Nitrogen Air
            ];
          } else if (billId % 4 === 2) {
            billItems = [
              { prod: products[4], qty: 4 }, // Bridgestone SUV
              { prod: products[12], qty: 1 }, // Alignment
            ];
          } else if (billId % 4 === 3) {
            billItems = [
              { prod: products[5], qty: 2 }, // Scooter Tyre
              { prod: products[10], qty: 2 }, // Tube
            ];
          } else {
            billItems = [
              { prod: products[6], qty: 1 }, // Castrol Oil
              { prod: products[8], qty: 1 }, // Exide Battery
            ];
          }

          let subtotal = 0;
          let totalGst = 0;

          const preparedItems = billItems.map(it => {
            const lineTotal = it.prod.selling_price * it.qty;
            const lineGst = lineTotal * (it.prod.gst_percent / 100);
            subtotal += lineTotal;
            totalGst += lineGst;
            return {
              bill_id: billId,
              product_id: it.prod.id,
              item_name: it.prod.name,
              hsn_code: it.prod.hsn_code,
              quantity: it.qty,
              rate: it.prod.selling_price,
              cost_price_snapshot: it.prod.cost_price,
              gst_percent: it.prod.gst_percent,
              line_total: lineTotal
            };
          });

          const cgst = Math.round(totalGst / 2);
          const sgst = Math.round(totalGst / 2);
          const total = subtotal;

          const isCredit = (cust.name.includes('Logistics') && billId % 2 === 0);
          const payMode = isCredit ? 'CREDIT' : (billId % 3 === 0 ? 'UPI' : 'CASH');
          const payStatus = isCredit ? 'CREDIT' : 'PAID';

          billStmt.run({
            id: billId,
            bill_number: bNum,
            customer_id: cust.id,
            subtotal: subtotal,
            cgst_amount: cgst,
            sgst_amount: sgst,
            total_amount: total,
            payment_mode: payMode,
            payment_status: payStatus,
            created_at: dateStr
          });

          for (const itemData of preparedItems) {
            itemStmt.run(itemData);
            stockTxStmt.run({
              product_id: itemData.product_id,
              quantity: itemData.quantity,
              bill_id: billId,
              created_at: dateStr
            });
          }

          if (isCredit) {
            ledgerStmt.run({
              customer_id: cust.id,
              bill_id: billId,
              type: 'DEBIT',
              amount: total,
              note: `Udhaar Bill #${bNum} - Vehicle ${cust.vehicle_number}`,
              created_at: dateStr
            });
          }

          billId++;
        }
      }

      console.log(`Successfully generated ${billId - 1} Tyre & Auto Spares Sales Bills across 30 Days!`);
    });

    seedTx();
    db.pragma('foreign_keys = ON');
    db.close();
    console.log(`DONE! ${dbPath} updated successfully.`);
  } catch (err) {
    console.error(`Error populating database at ${dbPath}:`, err);
  }
}
