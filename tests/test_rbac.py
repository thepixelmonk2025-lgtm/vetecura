import pytest
from fastapi import HTTPException
from src.api.deps import require_role
from src.models.user import User, RoleEnum
import uuid

@pytest.mark.asyncio
async def test_require_role_success():
    user = User(id=uuid.uuid4(), email="owner@test.com", role=RoleEnum.owner, is_active=True)
    dependency = require_role([RoleEnum.owner, RoleEnum.warehouse_manager])
    
    # Should not raise
    result = await dependency(current_user=user)
    assert result == user

@pytest.mark.asyncio
async def test_require_role_failure():
    user = User(id=uuid.uuid4(), email="staff@test.com", role=RoleEnum.warehouse_staff, is_active=True)
    dependency = require_role([RoleEnum.owner])
    
    with pytest.raises(HTTPException) as excinfo:
        await dependency(current_user=user)
    
    assert excinfo.value.status_code == 403
    assert excinfo.value.detail == "Not enough privileges"
