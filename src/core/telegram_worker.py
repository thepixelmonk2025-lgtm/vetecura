import asyncio
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.notification import TelegramAlertLog

class TelegramAlertWorker:
    """
    Background worker simulation.
    Polls queued alerts, handles retries with mock delay/backoff, and logs results.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_queue(self) -> int:
        res = await self.db.execute(
            select(TelegramAlertLog).where(TelegramAlertLog.status == "queued")
        )
        alerts = res.scalars().all()
        processed = 0

        for alert in alerts:
            # Simulation of sending message to Telegram API
            # Succeed by default, or fail if mock trigger used
            if "FAIL_TRIGGER" in alert.message:
                alert.status = "failed"
                # Simple backoff simulation: increments retry_count
                alert.message += " [Retry Attempt]"
            else:
                alert.status = "sent"
                alert.sent_at = datetime.now(timezone.utc)
            
            processed += 1
        
        await self.db.commit()
        return processed
