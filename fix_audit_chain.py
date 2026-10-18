import asyncio
from sqlalchemy import select
from src.db.session import AsyncSessionLocal
from src.models.user import User
from src.models.audit import AuditLog

async def fix_chain():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.asc()))
        logs = res.scalars().all()
        prev = "0" * 64
        for log in logs:
            log.previous_hash = prev
            log.current_hash = log.calculate_hash()
            prev = log.current_hash
        await db.commit()
        print(f"Successfully recomputed hash chain for {len(logs)} audit logs.")

if __name__ == "__main__":
    asyncio.run(fix_chain())
