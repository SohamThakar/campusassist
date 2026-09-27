from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(50), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False, unique=True)
    category = Column(String(50), nullable=False)
    priority = Column(String(50), nullable=False)
    recommended_provider_id = Column(String(50), ForeignKey("technicians.technician_id", ondelete="SET NULL"), nullable=True)
    confidence = Column(Float, default=0.95, nullable=False) # e.g. 0.98 for 98%
    reasoning = Column(Text, nullable=True)
    duplicate_of = Column(String(50), nullable=True) # Complaint ID if suspected duplicate
    metadata_info = Column(JSON, default=dict, nullable=True) # Extra agent outputs (e.g. estimated completion time, top_matches)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    complaint = relationship("Complaint", back_populates="ai_analysis", lazy="selectin")
    recommended_technician = relationship("Technician", back_populates="recommendations", lazy="selectin")
