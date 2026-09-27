from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from app.models.complaint import ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.schemas.technician import TechnicianOut

class AIAnalysisOut(BaseModel):
    id: int
    category: str
    priority: str
    recommended_provider_id: Optional[str] = None
    recommended_technician: Optional[TechnicianOut] = None
    confidence: float
    reasoning: Optional[str] = None
    duplicate_of: Optional[str] = None
    metadata_info: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StatusHistoryOut(BaseModel):
    id: int
    status: str
    changed_by: Optional[str] = None
    notes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class ComplaintCreate(BaseModel):
    category: str # Manual selection by user
    description: str
    location: str
    submitted_by_contact: Optional[str] = None
    photo_url: Optional[str] = None
    video_url: Optional[str] = None
    video_filename: Optional[str] = None

class ComplaintApproveRequest(BaseModel):
    technician_id: str # Admin manually selects technician
    notes: Optional[str] = None
    priority: Optional[str] = None # Admin manually assigns priority

class ComplaintRejectRequest(BaseModel):
    reason: str

class ComplaintReassignRequest(BaseModel):
    technician_id: str
    notes: Optional[str] = None

class AssignmentBriefOut(BaseModel):
    id: int
    complaint_id: str
    technician_id: str
    assigned_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: Any
    technician: Optional[TechnicianOut] = None

    class Config:
        from_attributes = True

class ConfirmDuplicateRequest(BaseModel):
    matched_complaint_id: Optional[str] = None
    notes: Optional[str] = None

class ComplaintSimpleOut(BaseModel):
    complaint_id: str
    description: str
    location: str
    photo_url: Optional[str] = None
    video_url: Optional[str] = None
    video_filename: Optional[str] = None
    category: str
    priority: str
    status: ComplaintStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitted_by_contact: Optional[str] = None
    user_id: Optional[str] = None

    # Duplicate & Master Issue fields
    master_issue_id: Optional[str] = None
    duplicate_of: Optional[str] = None
    duplicate_status: Optional[str] = "none"
    duplicate_confidence: Optional[float] = None
    duplicate_reason: Optional[str] = None

    class Config:
        from_attributes = True

class MasterIssueBriefOut(BaseModel):
    issue_id: str
    title: str
    category: str
    location: str
    status: str
    primary_complaint_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    complaints_count: int = 0
    first_reported_at: Optional[datetime] = None
    latest_reported_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MasterIssueDetailOut(MasterIssueBriefOut):
    complaints: List[ComplaintSimpleOut] = []

    class Config:
        from_attributes = True

class ComplaintOut(ComplaintSimpleOut):
    ai_analysis: Optional[AIAnalysisOut] = None
    master_issue: Optional[MasterIssueBriefOut] = None
    history: List[StatusHistoryOut] = []
    assignments: List[AssignmentBriefOut] = []

    class Config:
        from_attributes = True

class ComplaintSubmitResponse(BaseModel):
    complaint_id: str
    message: str
    status: ComplaintStatus
    category: str
    priority: str
    ai_analysis: Optional[AIAnalysisOut] = None
    duplicate_detected: Optional[bool] = False
    duplicate_status: Optional[str] = "none"
    matched_complaint_id: Optional[str] = None
    master_issue_id: Optional[str] = None
