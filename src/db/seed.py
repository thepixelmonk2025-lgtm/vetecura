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
            ("VD2207", "Vitamin D3 Softgels 2000IU", "Nutraceutical", 50, 10.0),
            ("VAC-RAB-01", "Rabies Vaccine Cold-Chain", "Vaccine", 100, 25.0),
            ("GLV-SURG-L", "Surgical Gloves Latex Pack", "Medical Consumable", 200, 5.0),
        ]
        for sku, name, cat, min_stock, price in products:
            result = await db.execute(select(Product).where(Product.sku == sku))
            existing = result.scalars().first()
            if not existing:
                p = Product(sku=sku, name=name, category=cat, min_stock_level=min_stock, unit_price=price)
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

        racks = [
            ("Rack A-01", 500, "RACK-A01-QR"),
            ("Rack B-12", 200, "RACK-B12-QR"),
            ("Damage Hold", 50, "RACK-DMG-QR"),
        ]
        for code, cap, qr_code in racks:
            result = await db.execute(select(Rack).where(Rack.code == code))
            existing = result.scalars().first()
            if not existing:
                r = Rack(warehouse_id=main_wh.id, code=code, capacity_units=cap, qr_label_code=qr_code)
                db.add(r)
                print(f"  + Rack created: {code}")

        await db.commit()
        print("✅ Database seeding complete!")

if __name__ == "__main__":
    asyncio.run(seed_data())
