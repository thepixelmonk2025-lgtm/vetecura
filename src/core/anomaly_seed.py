from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.config import AnomalyConfig

DEFAULT_SEEDS = [
    {"rule_name": "repeated_wrong_scans", "threshold_value": 3.0, "window_minutes": 10},
    {"rule_name": "scan_outside_hours", "threshold_value": 1.0, "window_minutes": None},
    {"rule_name": "high_dispatch_quantity", "threshold_value": 3.0, "window_minutes": 43200},
    {"rule_name": "high_reprint_frequency", "threshold_value": 3.0, "window_minutes": 10080},
    {"rule_name": "writeoff_request_frequency", "threshold_value": 5.0, "window_minutes": 1440},
]

async def seed_anomaly_configs(db: AsyncSession):
    for seed in DEFAULT_SEEDS:
        result = await db.execute(
            select(AnomalyConfig).where(AnomalyConfig.rule_name == seed["rule_name"])
        )
        existing = result.scalar_one_or_none()
        if not existing:
            config = AnomalyConfig(
                rule_name=seed["rule_name"],
                threshold_value=seed["threshold_value"],
                window_minutes=seed["window_minutes"]
            )
            db.add(config)
    await db.commit()
