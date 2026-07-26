import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.preferences import UserNotificationPreference
from src.models.notification import TelegramAlertLog
from src.core.notifications import NotificationService

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class PreferenceUpdate(BaseModel):
    topic: str
    is_subscribed: bool

class PreferenceOut(BaseModel):
    id: uuid.UUID
    topic: str
    is_subscribed: bool

    class Config:
        from_attributes = True

class AlertLogOut(BaseModel):
    id: uuid.UUID
    topic: str
    message: str
    status: str

    class Config:
        from_attributes = True

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/preferences", response_model=List[PreferenceOut])
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team])),
):
    res = await db.execute(
        select(UserNotificationPreference).where(UserNotificationPreference.user_id == current_user.id)
    )
    return res.scalars().all()

@router.patch("/preferences", response_model=PreferenceOut)
async def update_preferences(
    body: PreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager, RoleEnum.warehouse_staff, RoleEnum.purchase_team])),
):
    res = await db.execute(
        select(UserNotificationPreference).where(
            UserNotificationPreference.user_id == current_user.id,
            UserNotificationPreference.topic == body.topic
        )
    )
    pref = res.scalar_one_or_none()
    if not pref:
        pref = UserNotificationPreference(
            user_id=current_user.id,
            topic=body.topic,
            is_subscribed=body.is_subscribed
        )
        db.add(pref)
    else:
        pref.is_subscribed = body.is_subscribed

    await db.commit()
    await db.refresh(pref)
    return pref

@router.get("/log", response_model=List[AlertLogOut])
async def get_alerts_log(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner, RoleEnum.warehouse_manager])),
):
    res = await db.execute(select(TelegramAlertLog).order_by(TelegramAlertLog.created_at.desc()))
    return res.scalars().all()

@router.post("/test")
async def send_test_notification(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    alert = await NotificationService.enqueue(db, "security_audit", "Test alert triggered by Owner.")
    await db.commit()
    return {"status": "enqueued", "alert_id": alert.id}
