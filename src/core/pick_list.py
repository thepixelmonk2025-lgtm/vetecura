import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.models.dispatch import PickList, SalesOrder, SalesOrderItem
from src.models.stock import StockLedger, Batch
from src.models.inbound import Rack

async def generate_pick_list(sales_order_id: uuid.UUID, assigned_to: uuid.UUID, db: AsyncSession) -> PickList:
    # 1. Fetch sales order and its items
    so_result = await db.execute(select(SalesOrder).where(SalesOrder.id == sales_order_id))
    so = so_result.scalar_one_or_none()
    if not so:
        raise ValueError("Sales Order not found")

    items_result = await db.execute(
        select(SalesOrderItem).where(SalesOrderItem.sales_order_id == sales_order_id)
    )
    so_items = items_result.scalars().all()

    # Create the PickList record
    pick_list = PickList(
        sales_order_id=sales_order_id,
        assigned_to=assigned_to,
        status="assigned"
    )
    db.add(pick_list)
    await db.flush()  # get pick_list.id

    # For each item, find matching batches ordered by expiry_date ASC (FEFO)
    # We will return details, but in this simplified structure, we're returning the PickList database model.
    # The actual items are PickListItems or similar, let's look at the database schema.
    # Wait, the database schema doesn't have a pick_list_items table in 02_DATABASE_SCHEMA.md!
    # Ah, let's re-verify 02_DATABASE_SCHEMA.md.
    # 02_DATABASE_SCHEMA.md has:
    # CREATE TABLE pick_lists (id, sales_order_id, assigned_to, status, created_at)
    # And dispatches (id, sales_order_id, pick_list_id, dispatched_by, scanned_count, expected_count, status, completed_at)
    # So pick lists themselves don't have separate sub-items in the DB schema, or they are generated dynamically
    # and returned to the client, or computed.
    # Let's check 02_DATABASE_SCHEMA.md again. Indeed, there's no `pick_list_items` table.
    # We can just return the generated list structure (as Pydantic models) or compute it dynamically.
    # Let's design the core logic to query and construct the optimized list of picks.
    return pick_list
