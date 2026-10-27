from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, autoincrement=True)
    complaint_id = Column(String(50), ForeignKey("complaints.complaint_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    technician_id = Column(String(50), ForeignKey("technicians.technician_id", ondelete="SET NULL"), nullable=True, index=True)
    rating = Column(Integer, nullable=False)  # 1 to 5 stars
    comment = Column(Text, nullable=True)     # Review / feedback text about worker & work done
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    complaint = relationship("Complaint", back_populates="review", lazy="selectin")
    technician = relationship("Technician", back_populates="reviews", lazy="selectin")
