from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.assignment import AssignmentStatus
from app.schemas.complaint import ComplaintSimpleOut
from app.schemas.technician import TechnicianOut

class AssignmentOut(BaseModel):
    id: int
    complaint_id: str
    technician_id: str
    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: AssignmentStatus
    complaint: Optional[ComplaintSimpleOut] = None
    technician: Optional[TechnicianOut] = None

    class Config:
        from_attributes = True

class AssignmentActionRequest(BaseModel):
    notes: Optional[str] = None
