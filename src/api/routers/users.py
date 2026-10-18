import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.audit import AuditLog
from src.core.security import get_password_hash

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: str
    password: str
    role: RoleEnum = RoleEnum.warehouse_staff

class RoleUpdate(BaseModel):
    role: RoleEnum

class StatusUpdate(BaseModel):
    is_active: bool

class UserUpdate(BaseModel):
    email: str
    role: RoleEnum
    password: Optional[str] = None

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    role: RoleEnum
    is_active: bool

    class Config:
        from_attributes = True

# ── Helpers ────────────────────────────────────────────────────────────────

async def _write_audit(db, user_id, action, entity_id, payload):
    last = await db.execute(
        select(AuditLog).order_by(AuditLog.id.desc()).limit(1).with_for_update()
    )
    last_log = last.scalar_one_or_none()
    prev_hash = last_log.current_hash if last_log else "0" * 64
    uid = user_id if isinstance(user_id, uuid.UUID) else uuid.UUID(str(user_id))
    log = AuditLog(
        user_id=uid,
        action=action,
        entity_type="users",
        entity_id=str(entity_id),
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("", response_model=List[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    res = await db.execute(select(User).order_by(User.email.asc()))
    return res.scalars().all()

@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    res = await db.execute(select(User).where(User.email == body.email))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=get_password_hash(body.password),
        role=body.role,
        is_active=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _write_audit(db, current_user.id, "user_created", user.id, {"email": user.email, "role": user.role})
    await db.commit()

    return user

@router.patch("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_role = user.role
    user.role = body.role
    await _write_audit(db, current_user.id, "user_role_changed", user.id, {"old_role": old_role, "new_role": body.role})
    await db.commit()
    await db.refresh(user)
    return user

@router.patch("/{user_id}/status", response_model=UserOut)
async def update_user_status(
    user_id: uuid.UUID,
    body: StatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = body.is_active
    await _write_audit(db, current_user.id, "user_status_changed", user.id, {"is_active": body.is_active})
    await db.commit()
    await db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    uid = uuid.UUID(user_id)
    res = await db.execute(select(User).where(User.id == uid))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.email = body.email
    user.role = body.role
    if body.password:
        user.hashed_password = get_password_hash(body.password)

    await _write_audit(db, current_user.id, "user_updated", user.id, {"email": user.email, "role": user.role, "password_changed": bool(body.password)})
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.owner])),
):
    uid = uuid.UUID(user_id)
    res = await db.execute(select(User).where(User.id == uid))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await _write_audit(db, current_user.id, "user_deleted", user_id, {"email": user.email})
    await db.commit()
    return None
