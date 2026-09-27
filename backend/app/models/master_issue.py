from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base

class MasterIssue(Base):
    __tablename__ = "master_issues"

    issue_id = Column(String(50), primary_key=True, index=True) # e.g. #MI-1001 or ISSUE-1001
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    location = Column(String(200), nullable=False)
    status = Column(String(50), default="open", nullable=False) # open, in_progress, completed, rejected
    primary_complaint_id = Column(String(50), nullable=True) # First/anchor complaint
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    complaints = relationship("Complaint", back_populates="master_issue", lazy="selectin")

    @property
    def complaints_count(self) -> int:
        from sqlalchemy import inspect
        state = inspect(self)
        if "complaints" in state.dict:
            val = state.dict["complaints"]
            return len(val) if val else 0
        return 0

    @property
    def first_reported_at(self):
        return self.created_at

    @property
    def latest_reported_at(self):
        return self.updated_at
