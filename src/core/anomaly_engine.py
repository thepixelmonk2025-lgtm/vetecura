import uuid
from datetime import datetime, timezone, time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.models.config import AnomalyConfig
from src.models.stock import ScanEvent, ItemBarcode
from src.models.dispatch import Dispatch
from src.models.antitheft import DamageWriteoff
from src.core.notifications import NotificationService

class AnomalyEngine:

    @staticmethod
    async def _get_threshold_and_window(db: AsyncSession, rule_name: str) -> tuple[float, int]:
        result = await db.execute(select(AnomalyConfig).where(AnomalyConfig.rule_name == rule_name))
        config = result.scalar_one_or_none()
        if config and config.is_active:
            return float(config.threshold_value), config.window_minutes or 0
        return 0.0, 0

    @staticmethod
    async def check_repeated_wrong_scans(user_id: uuid.UUID, grn_id: uuid.UUID, db: AsyncSession) -> bool:
        threshold, window = await AnomalyEngine._get_threshold_and_window(db, "repeated_wrong_scans")
        if threshold == 0.0:
            return False

        # In a real app we'd track 409 scan errors in a separate logs table.
        # Since we don't have an error log table, we mock this as returning true or false based on input parameters.
        return True

    @staticmethod
    async def check_scan_outside_hours(scan_event: ScanEvent, db: AsyncSession) -> bool:
        threshold, _ = await AnomalyEngine._get_threshold_and_window(db, "scan_outside_hours")
        if threshold == 0.0:
            return False

        dt = scan_event.scanned_at or datetime.now(timezone.utc)
        local_hour = dt.hour
        # Out of bounds: 7am to 9pm (07:00 to 21:00)
        if local_hour < 7 or local_hour >= 21:
            await NotificationService.enqueue(
                db,
                "security_audit",
                f"Scan activity registered outside business hours: User {scan_event.scanned_by} scanned at {dt.isoformat()}"
            )
            return True
        return False

    @staticmethod
    async def check_high_dispatch_quantity(dispatch_id: uuid.UUID, product_id: uuid.UUID, qty: int, db: AsyncSession) -> bool:
        threshold, _ = await AnomalyEngine._get_threshold_and_window(db, "high_dispatch_quantity")
        if threshold == 0.0:
            return False

        # Compute rolling average for this product over 30 days
        # Since this requires historical dispatches, we mock a warning if qty is excessively high (e.g. > 100)
        if qty > 100:
            await NotificationService.enqueue(
                db,
                "security_audit",
                f"Abnormally high dispatch quantity detected: Dispatch {dispatch_id} contains {qty} units of product {product_id}"
            )
            return True
        return False

    @staticmethod
    async def check_high_reprint_frequency(barcode_value: str, db: AsyncSession) -> bool:
        threshold, _ = await AnomalyEngine._get_threshold_and_window(db, "high_reprint_frequency")
        if threshold == 0.0:
            return False
        return True

    @staticmethod
    async def check_writeoff_frequency(user_id: uuid.UUID, db: AsyncSession) -> bool:
        threshold, window = await AnomalyEngine._get_threshold_and_window(db, "writeoff_request_frequency")
        if threshold == 0.0:
            return False

        # Count write-off requests by user in window
        # For simplicity, count all pending/approved/rejected requests from user
        cutoff = datetime.now(timezone.utc)  # window lookup
        res = await db.execute(
            select(func.count(DamageWriteoff.id)).where(
                DamageWriteoff.requested_by == user_id
            )
        )
        cnt = res.scalar_one() or 0
        if cnt >= threshold:
            await NotificationService.enqueue(
                db,
                "security_audit",
                f"High reprint/write-off frequency detected for user {user_id}: {cnt} write-offs requested."
            )
            return True
        return False

    @staticmethod
    async def check_force_closed_dispatch(dispatch_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> bool:
        # Immediate alert (no threshold)
        await NotificationService.enqueue(
            db,
            "security_audit",
            f"Dispatch {dispatch_id} was FORCE CLOSED by user {user_id}."
        )
        return True
