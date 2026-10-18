"""001_initial_schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-25 11:35:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.String(30), nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 2. suppliers
    op.create_table(
        'suppliers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('contact_person', sa.String(100)),
        sa.Column('email', sa.String(100)),
        sa.Column('phone', sa.String(30)),
        sa.Column('address', sa.String(255)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 3. products
    op.create_table(
        'products',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sku', sa.String(60), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('category', sa.String(60)),
        sa.Column('reorder_level', sa.Integer(), default=50),
        sa.Column('unit', sa.String(20), default='unit'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 4. warehouses
    op.create_table(
        'warehouses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('address', sa.String(255)),
        sa.Column('is_damage_warehouse', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 5. racks
    op.create_table(
        'racks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('warehouse_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('warehouses.id'), nullable=False),
        sa.Column('code', sa.String(50), nullable=False, index=True),
        sa.Column('capacity_units', sa.Integer(), nullable=False),
        sa.Column('qr_label_code', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 6. purchase_orders
    op.create_table(
        'purchase_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('po_number', sa.String(60), unique=True, nullable=False, index=True),
        sa.Column('supplier_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('suppliers.id'), nullable=False),
        sa.Column('status', sa.String(30), default='draft', nullable=False, index=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('submitted_at', sa.DateTime(timezone=True)),
        sa.Column('approved_at', sa.DateTime(timezone=True))
    )

    # 7. purchase_order_items
    op.create_table(
        'purchase_order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('purchase_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('purchase_orders.id'), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('ordered_qty', sa.Integer(), nullable=False),
        sa.Column('unit_price', sa.Numeric(10, 2)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 8. goods_receipts
    op.create_table(
        'goods_receipts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('grn_number', sa.String(60), unique=True, nullable=False, index=True),
        sa.Column('purchase_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('purchase_orders.id'), nullable=False),
        sa.Column('status', sa.String(30), default='gate_entry', nullable=False, index=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('gate_entry_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True))
    )

    # 9. batches
    op.create_table(
        'batches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('batch_number', sa.String(60), nullable=False),
        sa.Column('mfg_date', sa.Date()),
        sa.Column('expiry_date', sa.Date(), index=True),
        sa.Column('received_via_grn', postgresql.UUID(as_uuid=True), sa.ForeignKey('goods_receipts.id'))
    )

    # 10. item_barcodes (with status, current_rack_id, last_scanned_at)
    op.create_table(
        'item_barcodes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('barcode_value', sa.String(120), unique=True, nullable=False, index=True),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('batches.id')),
        sa.Column('status', sa.String(30), default='available', nullable=False, index=True),
        sa.Column('current_rack_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('racks.id'), nullable=True, index=True),
        sa.Column('is_system_generated', sa.Boolean(), default=False),
        sa.Column('printed_at', sa.DateTime(timezone=True)),
        sa.Column('last_scanned_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 11. stock_ledger
    op.create_table(
        'stock_ledger',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=False, index=True),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('batches.id'), nullable=False, index=True),
        sa.Column('rack_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('racks.id'), nullable=False),
        sa.Column('quantity', sa.Integer(), default=0, nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 12. scan_events
    op.create_table(
        'scan_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_type', sa.String(20), nullable=False),
        sa.Column('barcode_value', sa.String(120), nullable=False, index=True),
        sa.Column('item_barcode_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('item_barcodes.id')),
        sa.Column('reference_id', postgresql.UUID(as_uuid=True), index=True),
        sa.Column('rack_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('racks.id')),
        sa.Column('scanned_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('scanned_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('device_info', sa.String(150))
    )

    # 13. sales_orders
    op.create_table(
        'sales_orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('order_reference', sa.String(60), unique=True, nullable=False, index=True),
        sa.Column('customer_name', sa.String(150)),
        sa.Column('status', sa.String(30), default='pending', nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 14. sales_order_items
    op.create_table(
        'sales_order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sales_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sales_orders.id'), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('ordered_qty', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 15. pick_lists
    op.create_table(
        'pick_lists',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sales_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sales_orders.id'), nullable=False),
        sa.Column('assigned_to', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(30), default='assigned', nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 16. dispatches
    op.create_table(
        'dispatches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sales_order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('sales_orders.id'), nullable=False),
        sa.Column('pick_list_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('pick_lists.id'), nullable=False),
        sa.Column('dispatched_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('scanned_count', sa.Integer(), default=0, nullable=False),
        sa.Column('expected_count', sa.Integer(), default=0, nullable=False),
        sa.Column('status', sa.String(30), default='in_progress', nullable=False, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('completed_at', sa.DateTime(timezone=True))
    )

    # 17. audit_logs
    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, index=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.String(255), nullable=False),
        sa.Column('changes', postgresql.JSONB, nullable=False),
        sa.Column('previous_hash', sa.String(64), nullable=True),
        sa.Column('current_hash', sa.String(64), unique=True, nullable=False)
    )

    # 18. damage_writeoffs
    op.create_table(
        'damage_writeoffs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('item_barcode_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('item_barcodes.id'), nullable=False),
        sa.Column('reason', sa.String(50), nullable=False),
        sa.Column('photo_proof_url', sa.Text(), nullable=False),
        sa.Column('requested_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('approved_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('resolved_at', sa.DateTime(timezone=True))
    )

    # 19. returns
    op.create_table(
        'returns',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('return_type', sa.String(20), nullable=False),
        sa.Column('reference_order_id', postgresql.UUID(as_uuid=True)),
        sa.Column('item_barcode_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('item_barcodes.id'), nullable=False),
        sa.Column('condition', sa.String(20)),
        sa.Column('routed_to_rack_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('racks.id')),
        sa.Column('inspected_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 20. cycle_counts
    op.create_table(
        'cycle_counts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rack_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('racks.id'), nullable=False),
        sa.Column('scheduled_date', sa.Date()),
        sa.Column('status', sa.String(20), default='scheduled', nullable=False),
        sa.Column('performed_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('completed_at', sa.DateTime(timezone=True))
    )

    # 21. cycle_count_variances
    op.create_table(
        'cycle_count_variances',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('cycle_count_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('cycle_counts.id'), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('products.id'), nullable=False),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('batches.id'), nullable=False),
        sa.Column('system_qty', sa.Integer(), nullable=False),
        sa.Column('counted_qty', sa.Integer(), nullable=False)
    )

    # 22. label_templates
    op.create_table(
        'label_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('preset_code', sa.String(30), unique=True, nullable=False, index=True),
        sa.Column('label_type', sa.String(20), nullable=False),
        sa.Column('width_mm', sa.Numeric(5, 2), nullable=False),
        sa.Column('height_mm', sa.Numeric(5, 2), nullable=False),
        sa.Column('dpi', sa.Integer(), default=203),
        sa.Column('symbology', sa.String(20), nullable=False),
        sa.Column('layout_json', postgresql.JSONB, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now())
    )

    # 23. printers
    op.create_table(
        'printers',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('connection_type', sa.String(20), nullable=False),
        sa.Column('protocol', sa.String(20), nullable=False),
        sa.Column('ip_address', sa.String(50)),
        sa.Column('location', sa.String(100)),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True))
    )

    # 24. print_jobs
    op.create_table(
        'print_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('label_type', sa.String(20), nullable=False),
        sa.Column('entity_type', sa.String(30), nullable=False),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('label_templates.id')),
        sa.Column('printer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('printers.id')),
        sa.Column('status', sa.String(20), default='queued', nullable=False),
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('error_message', sa.Text()),
        sa.Column('requested_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('requested_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('printed_at', sa.DateTime(timezone=True))
    )

    # 25. telegram_alerts_log
    op.create_table(
        'telegram_alerts_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('topic', sa.String(30), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('related_entity_type', sa.String(60)),
        sa.Column('related_entity_id', postgresql.UUID(as_uuid=True)),
        sa.Column('status', sa.String(20), default='queued', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('sent_at', sa.DateTime(timezone=True))
    )

    # 26. user_notification_preferences
    op.create_table(
        'user_notification_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('topic', sa.String(30), nullable=False),
        sa.Column('is_subscribed', sa.Boolean(), default=True, nullable=False)
    )

    # 27. anomaly_config
    op.create_table(
        'anomaly_config',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('rule_name', sa.String(60), unique=True, nullable=False, index=True),
        sa.Column('threshold_value', sa.Numeric(10, 2), nullable=False),
        sa.Column('window_minutes', sa.Integer()),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('updated_at', sa.DateTime(timezone=True))
    )


def downgrade() -> None:
    tables = [
        'anomaly_config',
        'user_notification_preferences',
        'telegram_alerts_log',
        'print_jobs',
        'printers',
        'label_templates',
        'cycle_count_variances',
        'cycle_counts',
        'returns',
        'damage_writeoffs',
        'audit_logs',
        'dispatches',
        'pick_lists',
        'sales_order_items',
        'sales_orders',
        'scan_events',
        'stock_ledger',
        'item_barcodes',
        'batches',
        'goods_receipts',
        'purchase_order_items',
        'purchase_orders',
        'racks',
        'warehouses',
        'products',
        'suppliers',
        'users',
    ]
    for table in tables:
        op.drop_table(table)
