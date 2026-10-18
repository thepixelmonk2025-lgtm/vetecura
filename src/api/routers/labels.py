import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, ConfigDict
from src.db.session import get_db
from src.api.deps import require_role
from src.models.user import RoleEnum, User
from src.models.label import LabelTemplate, Printer, PrintJob, PrintJobStatusEnum
from src.models.audit import AuditLog

router = APIRouter()

# ── Schemas ────────────────────────────────────────────────────────────────

class LabelTemplateCreate(BaseModel):
    preset_code: str
    label_type: str
    width_mm: float
    height_mm: float
    dpi: int = 203
    symbology: str
    layout_json: dict

class LabelTemplateOut(BaseModel):
    id: uuid.UUID
    preset_code: str
    label_type: str
    width_mm: float
    height_mm: float
    dpi: int
    symbology: str
    layout_json: dict
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class PrinterCreate(BaseModel):
    name: str
    connection_type: str
    protocol: str
    ip_address: Optional[str] = None
    location: Optional[str] = None

class PrinterOut(BaseModel):
    id: uuid.UUID
    name: str
    connection_type: str
    protocol: str
    ip_address: Optional[str]
    location: Optional[str]
    is_active: bool

    model_config = ConfigDict(from_attributes=True)

class PrintJobCreate(BaseModel):
    label_type: str
    entity_id: uuid.UUID
    printer_id: uuid.UUID
    template_preset: str
    copies: int = 1

class PrintJobOut(BaseModel):
    id: uuid.UUID
    label_type: str
    entity_type: str
    entity_id: uuid.UUID
    template_id: Optional[uuid.UUID]
    printer_id: Optional[uuid.UUID]
    status: str
    retry_count: int
    error_message: Optional[str]

    model_config = ConfigDict(from_attributes=True)

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
        entity_type="print_jobs",
        entity_id=str(entity_id),
        changes=payload,
        previous_hash=prev_hash,
    )
    log.current_hash = log.calculate_hash()
    db.add(log)

# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/templates", response_model=List[LabelTemplateOut])
async def list_templates(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    res = await db.execute(select(LabelTemplate))
    return res.scalars().all()

@router.post("/templates", response_model=LabelTemplateOut, status_code=status.HTTP_201_CREATED)
async def create_template(
    body: LabelTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    # Scan reliability validation check for small templates
    if body.preset_code == "SM-25x15":
        elements = body.layout_json.get("elements", [])
        for el in elements:
            if el.get("type") == "text" and el.get("value_field") not in ["sku"]:
                raise HTTPException(
                    status_code=422,
                    detail="SM-25x15 templates can only contain QR + SKU text for scan reliability."
                )

    tmpl = LabelTemplate(
        preset_code=body.preset_code,
        label_type=body.label_type,
        width_mm=body.width_mm,
        height_mm=body.height_mm,
        dpi=body.dpi,
        symbology=body.symbology,
        layout_json=body.layout_json,
        created_by=current_user.id
    )
    db.add(tmpl)
    await db.commit()
    await db.refresh(tmpl)
    return tmpl

@router.get("/printers", response_model=List[PrinterOut])
async def list_printers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    res = await db.execute(select(Printer))
    return res.scalars().all()

@router.post("/printers", response_model=PrinterOut, status_code=status.HTTP_201_CREATED)
async def create_printer(
    body: PrinterCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    p = Printer(
        name=body.name,
        connection_type=body.connection_type,
        protocol=body.protocol,
        ip_address=body.ip_address,
        location=body.location
    )
    db.add(p)
    await db.commit()
    await db.refresh(p)
    return p

@router.post("/print", response_model=PrintJobOut)
async def queue_print_job(
    body: PrintJobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    # Find active template for preset_code
    tmpl_res = await db.execute(select(LabelTemplate).where(LabelTemplate.preset_code == body.template_preset))
    tmpl = tmpl_res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template preset not found")

    job = PrintJob(
        label_type=body.label_type,
        entity_type="item_barcode",
        entity_id=body.entity_id,
        template_id=tmpl.id,
        printer_id=body.printer_id,
        status=PrintJobStatusEnum.queued
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

@router.post("/print-jobs/{id}/retry", response_model=PrintJobOut)
async def retry_print_job(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    result = await db.execute(select(PrintJob).where(PrintJob.id == id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")

    job.status = PrintJobStatusEnum.queued
    job.retry_count += 1
    job.error_message = None
    await db.commit()
    await db.refresh(job)
    return job

@router.post("/reprint/{entity_type}/{entity_id}", response_model=PrintJobOut)
async def reprint_label(
    entity_type: str,
    entity_id: uuid.UUID,
    printer_id: uuid.UUID,
    template_preset: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([RoleEnum.warehouse_staff, RoleEnum.warehouse_manager, RoleEnum.owner])),
):
    tmpl_res = await db.execute(select(LabelTemplate).where(LabelTemplate.preset_code == template_preset))
    tmpl = tmpl_res.scalar_one_or_none()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template preset not found")

    job = PrintJob(
        label_type=tmpl.label_type,
        entity_type=entity_type,
        entity_id=str(entity_id),
        template_id=tmpl.id,
        printer_id=printer_id,
        status=PrintJobStatusEnum.queued
    )
    db.add(job)
    await _write_audit(db, current_user.id, "label_reprinted", entity_id, {"reused": True})
    await db.commit()
    await db.refresh(job)
    return job
