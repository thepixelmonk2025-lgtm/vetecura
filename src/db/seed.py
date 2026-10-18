import asyncio
from sqlalchemy.future import select
from src.db.session import AsyncSessionLocal, engine, Base

# Import all model modules so SQLAlchemy Base registers all tables
import src.models.user
import src.models.supplier
import src.models.product
import src.models.inbound
import src.models.dispatch
import src.models.stock
import src.models.audit
import src.models.antitheft
import src.models.label
import src.models.notification

from src.models.user import User, RoleEnum
from src.models.supplier import Supplier
from src.models.product import Product
from src.models.inbound import Warehouse, Rack
from src.core.security import get_password_hash

async def seed_data():
    # 0. Automatically create all database tables if they do not exist
    async with engine.begin() as conn:
        print("🔨 Creating database tables if missing...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully.")

    async with AsyncSessionLocal() as db:
        print("🌱 Seeding Vetecura IMS initial database records...")

        # 1. Users
        users = [
            ("owner@vetecura.com", RoleEnum.owner),
            ("manager@vetecura.com", RoleEnum.warehouse_manager),
            ("staff@vetecura.com", RoleEnum.warehouse_staff),
            ("purchase@vetecura.com", RoleEnum.purchase_team),
        ]
        
        for email, role in users:
            result = await db.execute(select(User).where(User.email == email))
            existing = result.scalars().first()
            if not existing:
                u = User(
                    email=email,
                    hashed_password=get_password_hash("password123"),
                    role=role,
                    is_active=True,
                )
                db.add(u)
                print(f"  + User created: {email} ({role.value})")

        # 2. Suppliers
        suppliers = [
            ("PharmaCare Ltd", "contact@pharmacare.com", "123 Pharma Way"),
            ("MediSupply Global", "sales@medisupply.com", "456 Medical Ave"),
        ]
        for name, email, addr in suppliers:
            result = await db.execute(select(Supplier).where(Supplier.name == name))
            existing = result.scalars().first()
            if not existing:
                s = Supplier(name=name, email=email, address=addr)
                db.add(s)
                print(f"  + Supplier created: {name}")

        # 3. Products
        products = [
            ("VD2207", "Vitamin D3 Softgels 2000IU", "Nutraceutical", 50, "bottle"),
            ("VAC-RAB-01", "Rabies Vaccine Cold-Chain", "Vaccine", 100, "vial"),
            ("GLV-SURG-L", "Surgical Gloves Latex Pack", "Medical Consumable", 200, "box"),
        ]
        for sku, name, cat, reorder_lvl, unit in products:
            result = await db.execute(select(Product).where(Product.sku == sku))
            existing = result.scalars().first()
            if not existing:
                p = Product(sku=sku, name=name, category=cat, reorder_level=reorder_lvl, unit=unit)
                db.add(p)
                print(f"  + Product created: {sku} - {name}")

        # 4. Warehouse & Racks
        result = await db.execute(select(Warehouse).where(Warehouse.name == "Main Warehouse"))
        main_wh = result.scalars().first()
        if not main_wh:
            main_wh = Warehouse(name="Main Warehouse", address="100 Logistics Blvd", is_damage_warehouse=False)
            db.add(main_wh)
            await db.flush()
            print("  + Warehouse created: Main Warehouse")

        result = await db.execute(select(Warehouse).where(Warehouse.is_damage_warehouse == True))
        dmg_wh = result.scalars().first()
        if not dmg_wh:
            dmg_wh = Warehouse(name="Damage Warehouse", address="100 Logistics Blvd - Secure Hold", is_damage_warehouse=True)
            db.add(dmg_wh)
            await db.flush()
            print("  + Warehouse created: Damage Warehouse")

        racks = [
            ("Rack A-01", 500, "RACK-A01-QR", main_wh.id),
            ("Rack B-12", 200, "RACK-B12-QR", main_wh.id),
            ("Damage Hold", 50, "RACK-DMG-QR", dmg_wh.id),
        ]
        created_racks = {}
        for code, cap, qr_code, wh_id in racks:
            result = await db.execute(select(Rack).where(Rack.code == code))
            existing = result.scalars().first()
            if not existing:
                existing = Rack(warehouse_id=wh_id, code=code, capacity_units=cap, qr_label_code=qr_code)
                db.add(existing)
                await db.flush()
                print(f"  + Rack created: {code}")
            created_racks[code] = existing

        # 5. Batches & Initial Item Barcodes
        from src.models.stock import Batch, ItemBarcode, StockLedger, ItemBarcodeStatusEnum
        from datetime import date, timedelta
        
        prod_result = await db.execute(select(Product))
        all_prods = prod_result.scalars().all()
        for p in all_prods:
            batch_result = await db.execute(select(Batch).where(Batch.product_id == p.id))
            b = batch_result.scalars().first()
            if not b:
                b = Batch(
                    product_id=p.id,
                    batch_number=f"BAT-{p.sku}-01",
                    mfg_date=date.today() - timedelta(days=30),
                    expiry_date=date.today() + timedelta(days=365),
                )
                db.add(b)
                await db.flush()

                rack_a01 = created_racks.get("Rack A-01")
                if rack_a01:
                    # Seed StockLedger
                    sl = StockLedger(
                        product_id=p.id,
                        batch_id=b.id,
                        rack_id=rack_a01.id,
                        quantity=10,
                    )
                    db.add(sl)

                    # Seed 10 ItemBarcodes
                    for i in range(1, 11):
                        bc = ItemBarcode(
                            barcode_value=f"VET-{p.sku}-{i:06d}",
                            product_id=p.id,
                            batch_id=b.id,
                            status=ItemBarcodeStatusEnum.available.value,
                            current_rack_id=rack_a01.id,
                            is_system_generated=True,
                        )
                        db.add(bc)
                    print(f"  + 10 ItemBarcodes seeded for {p.sku} on Rack A-01 (Status: available)")

        await db.commit()
        print("✅ Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_data())
