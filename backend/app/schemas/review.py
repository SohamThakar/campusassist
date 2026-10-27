from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    comment: Optional[str] = None
    technician_id: Optional[str] = None

class ReviewOut(BaseModel):
    id: int
    complaint_id: str
    technician_id: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    technician_name: Optional[str] = None

    class Config:
        from_attributes = True
