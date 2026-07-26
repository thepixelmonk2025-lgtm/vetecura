"""
NotificationService — async-only notification enqueueing.

IMPORTANT: Never call the Telegram API directly from a business endpoint.
Every Telegram alert MUST go through this service. The background worker
(Phase 5) reads queued rows and dispatches them.
"""
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.notification import TelegramAlertLog

VALID_TOPICS = {
    "stock_in", "stock_out", "inventory_alerts", "security_audit", "management_reports"
}


class NotificationService:

    @staticmethod
    async def enqueue(
        db: AsyncSession,
        topic: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
    ) -> TelegramAlertLog:
        """
        Enqueue a Telegram alert. Inserts a row into telegram_alerts_log with status='queued'.
        The Phase 5 background worker picks it up and delivers it asynchronously.

        Args:
            db: async database session
            topic: one of stock_in, stock_out, inventory_alerts, security_audit, management_reports
            message: human-readable alert message
            entity_type: optional — the model name related to this alert (e.g. 'goods_receipts')
            entity_id: optional — UUID of the related entity

        Returns:
            The created TelegramAlertLog row
        """
        if topic not in VALID_TOPICS:
            raise ValueError(f"Invalid topic '{topic}'. Must be one of: {VALID_TOPICS}")

        alert = TelegramAlertLog(
            topic=topic,
            message=message,
            related_entity_type=entity_type,
            related_entity_id=entity_id,
            status="queued",
        )
        db.add(alert)
        await db.flush()  # get the ID without committing (caller commits)
        return alert
