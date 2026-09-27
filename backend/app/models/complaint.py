import enum
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Float
from sqlalchemy.orm import relationship
from app.database import Base

class ComplaintCategory(str, enum.Enum):
    ELECTRICAL = "Electrical"
    PLUMBING = "Plumbing"
    HVAC = "HVAC"
    STRUCTURAL = "Structural"
    CIVIL = "Civil"
    FURNITURE = "Furniture"
    IT_NETWORK = "IT/Network"
    CLEANING = "Cleaning"
    OTHER = "Other"

class ComplaintPriority(str, enum.Enum):
    CRITICAL = "Critical"
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    APPROVED = "approved"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"

class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(String(50), primary_key=True, index=True) # e.g. #T-8942 or REQ-4921
    description = Column(Text, nullable=False)
    location = Column(String(200), nullable=False)
    photo_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    video_filename = Column(String(255), nullable=True)
    category = Column(String(50), nullable=False, default=ComplaintCategory.OTHER)
    priority = Column(String(50), nullable=False, default=ComplaintPriority.MEDIUM)
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.SUBMITTED, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    submitted_by_contact = Column(String(100), nullable=True)
    user_id = Column(String(50), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    # Duplicate Detection & Master Issue fields
    master_issue_id = Column(String(50), ForeignKey("master_issues.issue_id", ondelete="SET NULL"), nullable=True, index=True)
    duplicate_of = Column(String(50), nullable=True) # Matched primary complaint ID
    duplicate_status = Column(String(50), default="none", nullable=True) # none, confirmed_duplicate, possible_duplicate, dismissed
    duplicate_confidence = Column(Float, nullable=True)
    duplicate_reason = Column(Text, nullable=True)

    # Relationships
    submitter = relationship("User", foreign_keys=[user_id], lazy="selectin")
    master_issue = relationship("MasterIssue", back_populates="complaints", lazy="selectin")
    ai_analysis = relationship("AIAnalysis", back_populates="complaint", uselist=False, lazy="selectin", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="complaint", lazy="selectin", cascade="all, delete-orphan")
    history = relationship("StatusHistory", back_populates="complaint", lazy="selectin", cascade="all, delete-orphan", order_by="desc(StatusHistory.timestamp)")
