import asyncio
import os
import httpx
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.notification import TelegramAlertLog
from src.db.session import AsyncSessionLocal

from dotenv import load_dotenv
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Multi-Group Routing: allows 3 separate groups for Operations, Alerts, and Security/Management
GROUP_CHAT_MAPPINGS = {
    "stock_in": os.getenv("TELEGRAM_CHAT_ID_OPERATIONS") or os.getenv("TELEGRAM_CHAT_ID_STOCK_IN"),
    "stock_out": os.getenv("TELEGRAM_CHAT_ID_OPERATIONS") or os.getenv("TELEGRAM_CHAT_ID_STOCK_OUT"),
    "inventory_alerts": os.getenv("TELEGRAM_CHAT_ID_ALERTS") or os.getenv("TELEGRAM_CHAT_ID_INVENTORY"),
    "security_audit": os.getenv("TELEGRAM_CHAT_ID_SECURITY") or os.getenv("TELEGRAM_CHAT_ID_OWNER"),
    "management_reports": os.getenv("TELEGRAM_CHAT_ID_SECURITY") or os.getenv("TELEGRAM_CHAT_ID_REPORTS") or os.getenv("TELEGRAM_CHAT_ID_OWNER"),
}

TOPIC_MAPPINGS = {
    "stock_in": os.getenv("TELEGRAM_TOPIC_ID_STOCK_IN"),
    "stock_out": os.getenv("TELEGRAM_TOPIC_ID_STOCK_OUT"),
    "inventory_alerts": os.getenv("TELEGRAM_TOPIC_ID_ALERTS"),
    "security_audit": os.getenv("TELEGRAM_TOPIC_ID_SECURITY"),
    "management_reports": os.getenv("TELEGRAM_TOPIC_ID_REPORTS")
}

class TelegramAlertWorker:
    """
    Background worker that polls queued alerts and sends them via the Telegram Bot API.
    Supports routing across multiple groups or forum topics.
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_queue(self) -> int:
        res = await self.db.execute(
            select(TelegramAlertLog).where(TelegramAlertLog.status == "queued")
        )
        alerts = res.scalars().all()
        processed = 0

        if not alerts:
            return 0

        async with httpx.AsyncClient() as client:
            for alert in alerts:
                # Determine target Chat ID (Group specific -> Fallback default)
                target_chat_id = GROUP_CHAT_MAPPINGS.get(alert.topic) or TELEGRAM_CHAT_ID

                if not TELEGRAM_BOT_TOKEN or not target_chat_id:
                    print(f"TELEGRAM_BOT_TOKEN or target chat ID missing for topic '{alert.topic}'. Marking as failed.")
                    alert.status = "failed"
                    alert.message = "[Missing Credentials] " + alert.message
                    processed += 1
                    continue
                
                url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
                payload = {
                    "chat_id": target_chat_id,
                    "text": f"<b>[{alert.topic.upper()}]</b>\n\n{alert.message}",
                    "parse_mode": "HTML",
                }
                
                # Apply Topic mapping if configured
                topic_id = TOPIC_MAPPINGS.get(alert.topic)
                if topic_id:
                    payload["message_thread_id"] = int(topic_id)
                
                try:
                    response = await client.post(url, json=payload, timeout=10.0)
                    response.raise_for_status()
                    
                    alert.status = "sent"
                    alert.sent_at = datetime.now(timezone.utc)
                except httpx.HTTPStatusError as e:
                    # Fallback: if Telegram rejects due to HTML entity formatting, strip tags and send as plain text
                    if e.response.status_code == 400:
                        import re
                        plain_text = re.sub(r'<[^>]+>', '', payload["text"])
                        payload["text"] = plain_text
                        payload.pop("parse_mode", None)
                        try:
                            fallback_res = await client.post(url, json=payload, timeout=10.0)
                            fallback_res.raise_for_status()
                            alert.status = "sent"
                            alert.sent_at = datetime.now(timezone.utc)
                        except Exception as fb_err:
                            alert.status = "failed"
                            alert.message += f"\n[Error: {str(fb_err)}]"
                    else:
                        alert.status = "failed"
                        alert.message += f"\n[Error: {str(e)}]"
                except Exception as e:
                    print(f"Failed to send Telegram message: {e}")
                    alert.status = "failed"
                    alert.message += f"\n[Error: {str(e)}]"
                
                processed += 1
        
        await self.db.commit()
        return processed

async def main():
    print("🚀 Telegram Worker starting...")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                worker = TelegramAlertWorker(db)
                processed = await worker.process_queue()
                if processed > 0:
                    print(f"Processed {processed} Telegram alerts.")
        except Exception as e:
            print(f"Error in Telegram worker loop: {e}")
        
        await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
