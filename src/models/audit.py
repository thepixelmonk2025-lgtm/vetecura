import uuid
from datetime import datetime, timezone
import hashlib
import json
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from src.db.session import Base
from sqlalchemy.orm import validates

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(255), nullable=False)
    changes = Column(JSONB, nullable=False, default=dict)
    
    # The hash of the previous log entry
    previous_hash = Column(String(64), nullable=True)
    # The hash of this log entry
    current_hash = Column(String(64), nullable=False, unique=True)

    def calculate_hash(self) -> str:
        # Create a deterministic string representation of the log entry
        changes_str = json.dumps(self.changes, sort_keys=True)
        # Ensure timestamp is formatted consistently
        ts_str = self.timestamp.isoformat() if isinstance(self.timestamp, datetime) else str(self.timestamp)
        
        data_string = f"{ts_str}{self.user_id}{self.action}{self.entity_type}{self.entity_id}{changes_str}{self.previous_hash}"
        return hashlib.sha256(data_string.encode('utf-8')).hexdigest()
