import pytest
import uuid
from fastapi import HTTPException
from src.api.routers.labels import create_template, LabelTemplateCreate
from src.models.user import User, RoleEnum

@pytest.mark.asyncio
async def test_scan_reliability_validation_for_small_labels():
    owner = User(id=uuid.uuid4(), email="manager@vetecura.com", role=RoleEnum.warehouse_manager)

    # Invalid SM-25x15 template (has text other than SKU, violating scan reliability floor)
    invalid_body = LabelTemplateCreate(
        preset_code="SM-25x15",
        label_type="ITEM",
        width_mm=25.0,
        height_mm=15.0,
        dpi=203,
        symbology="QR",
        layout_json={
            "elements": [{"type": "text", "value_field": "product_name"}]
        }
    )

    with pytest.raises(HTTPException) as exc_info:
        await create_template(body=invalid_body, db=None, current_user=owner)

    assert exc_info.value.status_code == 422
    assert "SM-25x15 templates can only contain QR + SKU text" in exc_info.value.detail
