import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from fastapi import HTTPException
from src.api.routers.writeoffs import request_writeoff, WriteoffCreate
from src.models.user import User

@pytest.mark.asyncio
async def test_writeoff_request_without_photo_rejected():
    db = AsyncMock()
    body = WriteoffCreate(
        item_barcode_id=uuid.uuid4(),
        reason="damaged",
        photo_proof_url=""  # Empty url should be rejected
    )
    current_user = MagicMock(spec=User)
    current_user.id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await request_writeoff(body, db, current_user)

    assert exc_info.value.status_code == 422
    assert "photo_proof_url" in exc_info.value.detail.lower()
