import enum
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database import Base

class AssignmentStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(50), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False)
    technician_id = Column(String(50), ForeignKey("technicians.technician_id", ondelete="CASCADE"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    status = Column(
        SQLEnum(AssignmentStatus, values_callable=lambda x: [e.value for e in x]),
        default=AssignmentStatus.PENDING,
        nullable=False
    )

    # Relationships
    complaint = relationship("Complaint", back_populates="assignments", lazy="selectin")
    technician = relationship("Technician", back_populates="assignments", lazy="selectin")
