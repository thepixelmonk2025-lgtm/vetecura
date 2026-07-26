import pytest
from src.models.audit import AuditLog
from src.models.user import User, RoleEnum
import uuid
from datetime import datetime, timezone

def test_audit_log_hash_calculation():
    user_id = uuid.uuid4()
    audit = AuditLog(
        id=uuid.uuid4(),
        timestamp=datetime.now(timezone.utc),
        user_id=user_id,
        action="CREATE",
        entity_type="Item",
        entity_id="123",
        changes={"name": "test"},
        previous_hash=None
    )
    
    hash_val = audit.calculate_hash()
    assert hash_val is not None
    assert len(hash_val) == 64  # sha256 hex length
    
    # Verify deterministic calculation
    assert audit.calculate_hash() == hash_val
    
    # Change a field should change the hash
    audit.action = "UPDATE"
    assert audit.calculate_hash() != hash_val

def test_audit_log_chaining():
    user_id = uuid.uuid4()
    log1 = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        action="CREATE",
        entity_type="Item",
        entity_id="1",
        changes={},
        previous_hash=None
    )
    log1.current_hash = log1.calculate_hash()
    
    log2 = AuditLog(
        id=uuid.uuid4(),
        user_id=user_id,
        action="UPDATE",
        entity_type="Item",
        entity_id="1",
        changes={"status": "active"},
        previous_hash=log1.current_hash
    )
    log2.current_hash = log2.calculate_hash()
    
    assert log2.previous_hash == log1.current_hash
