import uuid
import enum
from sqlalchemy import Column, String, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID
from src.db.session import Base

class RoleEnum(str, enum.Enum):
    owner = "owner"
    warehouse_manager = "warehouse_manager"
    warehouse_staff = "warehouse_staff"
    purchase_team = "purchase_team"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), default=RoleEnum.warehouse_staff, nullable=False)
    is_active = Column(Boolean, default=True)
