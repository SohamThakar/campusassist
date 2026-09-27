import enum
from sqlalchemy import Column, String, Float, Integer, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class TechnicianStatus(str, enum.Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    SUSPENDED = "suspended"

class Technician(Base):
    __tablename__ = "technicians"

    technician_id = Column(String(50), primary_key=True, index=True)
    user_id = Column(String(50), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, unique=True)
    business_name = Column(String(150), nullable=True)
    skills = Column(JSON, default=list, nullable=False)  # e.g. ["Plumbing", "HVAC"]
    service_area = Column(String(100), default="Main Campus", nullable=False)
    availability = Column(JSON, default=dict, nullable=False) # e.g. {"mon": "9am-5pm", "status": "available"}
    status = Column(SQLEnum(TechnicianStatus), default=TechnicianStatus.VERIFIED, nullable=False)
    rating = Column(Float, default=4.8, nullable=False)
    current_workload = Column(Integer, default=0, nullable=False)

    # Relationships
    user = relationship("User", back_populates="technician_profile", lazy="selectin")
    assignments = relationship("Assignment", back_populates="technician", lazy="selectin")
    recommendations = relationship("AIAnalysis", back_populates="recommended_technician", lazy="selectin")
