from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class CategoryBreakdownItem(BaseModel):
    name: str
    value: int
    percentage: float
    color: str

class TrendItem(BaseModel):
    month: str
    volume: int
    resolved: int

class WorkloadItem(BaseModel):
    day: str
    routine: int
    emergency: int

class ProviderWorkloadItem(BaseModel):
    technician_name: str
    trade: str
    active_jobs: int
    completed_jobs: int
    rating: float

class PrincipalAnalyticsOut(BaseModel):
    total_complaints: int
    in_progress: int
    completed: int
    avg_resolution_days: float
    active_providers: int
    sla_compliance_rate: float
    category_breakdown: List[CategoryBreakdownItem]
    volume_trends: List[TrendItem]
    provider_workloads: List[ProviderWorkloadItem]
    recent_complaints: List[Dict[str, Any]]

class AuthorityStatsOut(BaseModel):
    new_complaints: int
    new_complaints_today: int
    in_progress: int
    completed: int
    completed_week_growth: int
    weekly_workload: List[WorkloadItem]
    ai_insights: Optional[Dict[str, Any]] = None
    category_breakdown: List[CategoryBreakdownItem]
    volume_trends: List[TrendItem]
