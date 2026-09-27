from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from app.models.technician import TechnicianStatus

class TechnicianBase(BaseModel):
    business_name: Optional[str] = None
    skills: List[str] = []
    service_area: str = "Main Campus"
    availability: Dict[str, Any] = {}
    status: TechnicianStatus = TechnicianStatus.VERIFIED
    rating: float = 4.8
    current_workload: int = 0

class TechnicianCreate(TechnicianBase):
    user_id: str

class TechnicianRegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    business_name: Optional[str] = None
    skills: List[str]
    service_area: str = "Main Campus"

class TechnicianOut(TechnicianBase):
    technician_id: str
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True
