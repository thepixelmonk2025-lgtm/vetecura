import asyncio
import os
from datetime import date, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from src.core.config import settings
from src.models.user import User, RoleEnum
from src.models.supplier import Supplier
from src.models.product import Product
from src.models.inbound import Warehouse, Rack, PurchaseOrder, PurchaseOrderItem, POStatusEnum
from src.models.stock import Batch, ItemBarcode, StockLedger, ItemBarcodeStatusEnum
from src.models.dispatch import SalesOrder, SalesOrderItem, PickList, Dispatch, SalesOrderStatusEnum, PickListStatusEnum, DispatchStatusEnum
from src.models.audit import AuditLog
from src.core.security import get_password_hash

async def seed_db():
    print("Connecting to DB for Tyre Shop Demo Seeding...")
    engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)
    AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with AsyncSessionLocal() as session:
        # 1. Create Users for each RBAC Role
        print("Checking RBAC users...")
        users_to_seed = [
            ("admin@vetecura.com", RoleEnum.owner),
            ("owner@vetecura.com", RoleEnum.owner),
            ("manager@vetecura.com", RoleEnum.warehouse_manager),
            ("staff@vetecura.com", RoleEnum.warehouse_staff),
            ("purchase@vetecura.com", RoleEnum.purchase_team),
        ]
        for email, role in users_to_seed:
            res = await session.execute(select(User).where(User.email == email))
            u = res.scalar_one_or_none()
            if not u:
                u = User(email=email, hashed_password=get_password_hash("password123" if email != "admin@vetecura.com" else "admin123"), role=role)
                session.add(u)
        await session.commit()
        
        res = await session.execute(select(User).where(User.email == "admin@vetecura.com"))
        user = res.scalar_one()

        # 2. Create Real-Life Tyre & Auto Suppliers
        print("Seeding Tyre Shop Suppliers...")
        result = await session.execute(select(Supplier))
        suppliers = result.scalars().all()
        if not suppliers:
            supplier1 = Supplier(name="Apollo Tyres Ltd (National Distribution)", contact_person="Rajesh Kumar - Head Logistics")
            supplier2 = Supplier(name="MRF Tyres India Regional Hub", contact_person="Suresh Nair - Regional Depot Manager")
            supplier3 = Supplier(name="Michelin India Wholesale Logistics", contact_person="Vikram Malhotra - Supply Chain Dir")
            supplier4 = Supplier(name="Castrol Lubricants & Fluids India", contact_person="Anil Mehta - Auto Spares Lead")
            session.add_all([supplier1, supplier2, supplier3, supplier4])
            await session.commit()
            suppliers = [supplier1, supplier2, supplier3, supplier4]

        # 3. Create Real-Life Tyre & Auto Products
        print("Seeding Tyre & Auto Products...")
        result = await session.execute(select(Product))
        products = result.scalars().all()
        if not products:
            prod1 = Product(sku="TYRE-APL-185", name="Apollo Alnac 4G 185/65 R15 (Car Radial Tyre)", category="Passenger Tyres")
            prod2 = Product(sku="TYRE-MRF-175", name="MRF ZVTV 175/65 R14 (Hatchback Tyre)", category="Passenger Tyres")
            prod3 = Product(sku="TYRE-MCH-205", name="Michelin Primacy 4ST 205/55 R16 (Premium Sedan Tyre)", category="Premium Tyres")
            prod4 = Product(sku="TYRE-BRG-265", name="Bridgestone Dueler D684 265/65 R17 (SUV All-Terrain)", category="SUV & Truck Tyres")
            prod5 = Product(sku="OIL-CAS-5W40", name="Castrol Edge 5W-40 Synthetic Engine Oil (4L Can)", category="Lubricants & Fluids")
            prod6 = Product(sku="BAT-EXD-35AH", name="Exide Epiq 35Ah Maintenance-Free Car Battery", category="Batteries & Electricals")
            session.add_all([prod1, prod2, prod3, prod4, prod5, prod6])
            await session.commit()
            products = [prod1, prod2, prod3, prod4, prod5, prod6]

        # 4. Create 1-Month Purchase Orders (POs)
        print("Seeding 1-Month Purchase Orders...")
        result = await session.execute(select(PurchaseOrder))
        pos = result.scalars().all()
        if not pos:
            po1 = PurchaseOrder(
                po_number="PO-2026-AUG-01",
                supplier_id=suppliers[0].id,
                status=POStatusEnum.approved,
                created_by=user.id
            )
            po2 = PurchaseOrder(
                po_number="PO-2026-AUG-02",
                supplier_id=suppliers[1].id,
                status=POStatusEnum.approved,
                created_by=user.id
            )
            po3 = PurchaseOrder(
                po_number="PO-2026-AUG-03",
                supplier_id=suppliers[2].id,
                status=POStatusEnum.submitted,
                created_by=user.id
            )
            session.add_all([po1, po2, po3])
            await session.commit()

            poi1 = PurchaseOrderItem(purchase_order_id=po1.id, product_id=products[0].id, ordered_qty=500, unit_price="4500.00")
            poi2 = PurchaseOrderItem(purchase_order_id=po2.id, product_id=products[1].id, ordered_qty=1200, unit_price="3800.00")
            poi3 = PurchaseOrderItem(purchase_order_id=po3.id, product_id=products[2].id, ordered_qty=250, unit_price="8900.00")
            session.add_all([poi1, poi2, poi3])
            await session.commit()

        # 5. Create Sales Orders & Outbound Dispatches
        print("Seeding 1-Month Sales Orders & Dispatches...")
        result = await session.execute(select(SalesOrder))
        sos = result.scalars().all()
        if not sos:
            so1 = SalesOrder(order_reference="SO-AUG-8801", customer_name="Quick Fit Auto Station - Pune Central", status=SalesOrderStatusEnum.ready)
            so2 = SalesOrder(order_reference="SO-AUG-8802", customer_name="Apex Logistics Heavy Fleet Depot", status=SalesOrderStatusEnum.picking)
            so3 = SalesOrder(order_reference="SO-AUG-8803", customer_name="Metro Car Care & Wheel Alignment", status=SalesOrderStatusEnum.picking)
            session.add_all([so1, so2, so3])
            await session.commit()

            soi1 = SalesOrderItem(sales_order_id=so1.id, product_id=products[0].id, ordered_qty=150)
            soi2 = SalesOrderItem(sales_order_id=so2.id, product_id=products[3].id, ordered_qty=80)
            soi3 = SalesOrderItem(sales_order_id=so3.id, product_id=products[2].id, ordered_qty=40)
            session.add_all([soi1, soi2, soi3])
            await session.commit()

            pl1 = PickList(sales_order_id=so1.id, assigned_to=user.id, status=PickListStatusEnum.assigned)
            pl2 = PickList(sales_order_id=so2.id, assigned_to=user.id, status=PickListStatusEnum.assigned)
            pl3 = PickList(sales_order_id=so3.id, assigned_to=user.id, status=PickListStatusEnum.assigned)
            session.add_all([pl1, pl2, pl3])
            await session.commit()

            disp1 = Dispatch(sales_order_id=so1.id, pick_list_id=pl1.id, dispatched_by=user.id, scanned_count=150, expected_count=150, status=DispatchStatusEnum.completed)
            disp2 = Dispatch(sales_order_id=so2.id, pick_list_id=pl2.id, dispatched_by=user.id, scanned_count=78, expected_count=80, status=DispatchStatusEnum.in_progress)
            disp3 = Dispatch(sales_order_id=so3.id, pick_list_id=pl3.id, dispatched_by=user.id, scanned_count=40, expected_count=40, status=DispatchStatusEnum.completed)
            session.add_all([disp1, disp2, disp3])
            await session.commit()

        # 6. Warehouses & Racks
        print("Seeding Warehouses and Racks...")
        res_wh = await session.execute(select(Warehouse).where(Warehouse.name == "Main Warehouse"))
        main_wh = res_wh.scalars().first()
        if not main_wh:
            main_wh = Warehouse(name="Main Warehouse", address="100 Logistics Blvd", is_damage_warehouse=False)
            session.add(main_wh)
            await session.flush()

        res_dmg = await session.execute(select(Warehouse).where(Warehouse.is_damage_warehouse == True))
        dmg_wh = res_dmg.scalars().first()
        if not dmg_wh:
            dmg_wh = Warehouse(name="Damage Warehouse", address="100 Logistics Blvd - Secure Hold", is_damage_warehouse=True)
            session.add(dmg_wh)
            await session.flush()

        racks = [
            ("Rack T-01", 500, "RACK-T01-QR", main_wh.id),
            ("Rack T-02", 500, "RACK-T02-QR", main_wh.id),
            ("Damage Hold", 50, "RACK-DMG-QR", dmg_wh.id),
        ]
        created_racks = {}
        for code, cap, qr_code, wh_id in racks:
            res_r = await session.execute(select(Rack).where(Rack.code == code))
            r = res_r.scalars().first()
            if not r:
                r = Rack(warehouse_id=wh_id, code=code, capacity_units=cap, qr_label_code=qr_code)
                session.add(r)
                await session.flush()
            created_racks[code] = r

        # 7. Batches & Initial Item Barcodes
        print("Seeding Batches, StockLedger and Item Barcodes...")
        for p in products:
            res_b = await session.execute(select(Batch).where(Batch.product_id == p.id))
            b = res_b.scalars().first()
            if not b:
                b = Batch(
                    product_id=p.id,
                    batch_number=f"BAT-{p.sku}-01",
                    mfg_date=date.today() - timedelta(days=30),
                    expiry_date=date.today() + timedelta(days=365),
                )
                session.add(b)
                await session.flush()

                rack_t01 = created_racks.get("Rack T-01")
                if rack_t01:
                    sl = StockLedger(
                        product_id=p.id,
                        batch_id=b.id,
                        rack_id=rack_t01.id,
                        quantity=25,
                    )
                    session.add(sl)

                    for i in range(1, 26):
                        bc = ItemBarcode(
                            barcode_value=f"VET-{p.sku}-{i:06d}",
                            product_id=p.id,
                            batch_id=b.id,
                            status=ItemBarcodeStatusEnum.available.value,
                            current_rack_id=rack_t01.id,
                            is_system_generated=True,
                        )
                        session.add(bc)

        await session.commit()

        # 8. Seed Audit Chain Logs
        print("Seeding Cryptographic Audit Chain...")
        res = await session.execute(select(AuditLog))
        if not res.scalars().all():
            prev = "0" * 64
            audit_events = [
                ("stock_in_scan", "products", "TYRE-APL-185", {"qty": 500, "rack": "Rack T-01", "batch": "APL-2026-08"}),
                ("po_approved", "purchase_orders", "PO-2026-AUG-01", {"approved_by": "admin@vetecura.com", "total_val": 2250000}),
                ("stock_out_scan", "dispatches", "SO-AUG-8801", {"dispatch_qty": 150, "client": "Quick Fit Auto Station"}),
                ("writeoff_requested", "damage_writeoffs", "TYRE-BRG-265", {"reason": "Sidewall Puncture in Transit", "photo": "https://vetecura.com/proofs/punctured_tyre.jpg"}),
                ("return_inspected", "returns", "SO-AUG-8803", {"condition": "good", "action": "Re-entered Rack T-01"}),
            ]
            for action, etype, eid, payload in audit_events:
                log = AuditLog(
                    user_id=str(user.id),
                    action=action,
                    entity_type=etype,
                    entity_id=eid,
                    changes=payload,
                    previous_hash=prev
                )
                log.current_hash = log.calculate_hash()
                prev = log.current_hash
                session.add(log)
            await session.commit()

        print("Tyre Shop 1-Month Demo Seeding Complete!")

if __name__ == "__main__":
    asyncio.run(seed_db())
