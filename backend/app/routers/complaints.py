import os
import random
import uuid
import shutil
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.config import settings
from app.models.user import User, UserRole
from app.models.complaint import Complaint, ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.models.master_issue import MasterIssue
from app.models.technician import Technician
from app.models.assignment import Assignment, AssignmentStatus
from app.models.status_history import StatusHistory
from app.models.ai_analysis import AIAnalysis
from app.schemas.complaint import (
    ComplaintCreate,
    ComplaintOut,
    ComplaintSubmitResponse,
    ComplaintApproveRequest,
    ComplaintRejectRequest,
    ComplaintReassignRequest,
    ConfirmDuplicateRequest,
    MasterIssueBriefOut,
    MasterIssueDetailOut,
)
from app.ai.duplicate_service import process_complaint_duplicates, link_to_master_issue
from app.auth.dependencies import require_roles, get_current_user_optional, get_current_user

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def generate_complaint_id() -> str:
    """Generates user-friendly complaint IDs like #T-8942 or #REQ-4921"""
    num = random.randint(1000, 9999)
    prefix = random.choice(["#T-", "#REQ-"])
    return f"{prefix}{num}"

@router.post("/upload")
async def upload_photo(file: UploadFile = File(...)):
    """Uploads photo evidence (max 5MB, JPG/PNG/WEBP) safely with chunked stream writing"""
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image format '{ext}'. Supported formats: JPG, JPEG, PNG, WEBP."
        )

    # Validate Content-Type header if provided
    if file.content_type and not (file.content_type.startswith("image/") or file.content_type == "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid image format."
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    max_size = getattr(settings, "MAX_PHOTO_SIZE_BYTES", 5 * 1024 * 1024)
    written = 0
    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(64 * 1024):
                written += len(chunk)
                if written > max_size:
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Photo exceeds the maximum allowed size of 5MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded photo: {str(e)}"
        )

    return {"photo_url": f"/uploads/{filename}", "filename": filename}

@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Uploads video evidence (max 50MB, MP4/MOV/AVI/WEBM/MKV) safely with chunked stream writing"""
    allowed_exts = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid video format '{ext}'. Supported formats: MP4, MOV, AVI, WEBM, MKV."
        )

    if file.content_type and not (file.content_type.startswith("video/") or file.content_type == "application/octet-stream"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must be a valid video format."
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filename = f"vid_{uuid.uuid4().hex[:12]}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, filename)

    max_size = getattr(settings, "MAX_VIDEO_SIZE_BYTES", 50 * 1024 * 1024)
    written = 0
    try:
        with open(file_path, "wb") as buffer:
            while chunk := await file.read(256 * 1024):
                written += len(chunk)
                if written > max_size:
                    buffer.close()
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Video exceeds the maximum allowed size of 50MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded video: {str(e)}"
        )

    return {
        "video_url": f"/uploads/{filename}",
        "filename": file.filename or filename,
        "stored_filename": filename
    }

@router.post("", response_model=ComplaintSubmitResponse)
async def submit_complaint(
    complaint_in: ComplaintCreate,
    simulate_ai_failure: bool = Query(False),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Public student/staff endpoint to submit a maintenance complaint.
    Saves complaint, runs intelligent duplicate detection, and establishes Master Issue links if applicable.
    """
    complaint_id = generate_complaint_id()
    
    # Ensure uniqueness of complaint ID
    existing = await db.execute(select(Complaint).where(Complaint.complaint_id == complaint_id))
    while existing.scalars().first():
        complaint_id = generate_complaint_id()
        existing = await db.execute(select(Complaint).where(Complaint.complaint_id == complaint_id))

    complaint = Complaint(
        complaint_id=complaint_id,
        description=complaint_in.description.strip(),
        location=complaint_in.location.strip(),
        category=complaint_in.category or "Other",
        priority="Medium", # Default until reviewed by admin
        status=ComplaintStatus.SUBMITTED,
        photo_url=complaint_in.photo_url,
        video_url=complaint_in.video_url,
        video_filename=complaint_in.video_filename,
        submitted_by_contact=complaint_in.submitted_by_contact,
        user_id=current_user.user_id if current_user else None,
        created_at=datetime.utcnow(),
    )
    db.add(complaint)
    await db.flush()

    # Log initial status history
    history = StatusHistory(
        complaint_id=complaint.complaint_id,
        status="Submitted",
        notes="Maintenance request submitted via Student/Staff Portal.",
        timestamp=datetime.utcnow(),
    )
    db.add(history)

    await db.commit()
    await db.refresh(complaint)

    # Run AI-based duplicate detection (Non-blocking, gracefully handles AI failure without failing submission)
    await process_complaint_duplicates(db, complaint, simulate_ai_failure=simulate_ai_failure)
    await db.refresh(complaint)

    return {
        "complaint_id": complaint.complaint_id,
        "message": "Maintenance request submitted successfully.",
        "status": complaint.status,
        "category": complaint.category,
        "priority": complaint.priority,
        "ai_analysis": None,
        "duplicate_detected": (complaint.duplicate_status == "confirmed_duplicate"),
        "duplicate_status": complaint.duplicate_status or "none",
        "matched_complaint_id": complaint.duplicate_of,
        "master_issue_id": complaint.master_issue_id,
    }

# ──────────────────────────────────────────────────────────────────────────────
# STUDENT TRACKING ENDPOINTS (Placed before /{complaint_id} for proper routing)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/my", response_model=List[ComplaintOut])
async def list_my_complaints(
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: AsyncSession = Depends(get_db)
):
    """
    Student: List all complaints submitted by the currently authenticated student.
    Returns complaints associated with this student's user_id.
    """
    result = await db.execute(
        select(Complaint)
        .where(Complaint.user_id == current_user.user_id)
        .options(
            selectinload(Complaint.history).selectinload(StatusHistory.user),
            selectinload(Complaint.assignments),
            selectinload(Complaint.ai_analysis),
            selectinload(Complaint.master_issue)
        )
        .order_by(desc(Complaint.created_at))
    )
    return result.scalars().all()


@router.get("/my/{complaint_id}", response_model=ComplaintOut)
async def get_my_complaint_detail(
    complaint_id: str,
    current_user: User = Depends(require_roles([UserRole.STUDENT])),
    db: AsyncSession = Depends(get_db)
):
    """
    Student: Get a specific complaint's full detail including status history.
    Enforces ownership — students can only view their own complaints.
    """
    normalized_id = complaint_id.strip()
    if not normalized_id.startswith("#") and (normalized_id.startswith("T-") or normalized_id.startswith("REQ-")):
        normalized_id = f"#{normalized_id}"

    result = await db.execute(
        select(Complaint)
        .where(
            (Complaint.complaint_id == normalized_id) | (Complaint.complaint_id == complaint_id)
        )
        .options(
            selectinload(Complaint.history).selectinload(StatusHistory.user),
            selectinload(Complaint.assignments).selectinload(Assignment.technician).selectinload(Technician.user),
            selectinload(Complaint.ai_analysis),
            selectinload(Complaint.master_issue).selectinload(MasterIssue.complaints)
        )
    )
    complaint = result.scalars().first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    # Enforce ownership: student can only see their own complaint
    if complaint.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="You are not authorized to view this complaint.")

    return complaint

# ──────────────────────────────────────────────────────────────────────────────
# MASTER ISSUE & DUPLICATE INTELLIGENCE ENDPOINTS (Placed before /{complaint_id})
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/master-issues", response_model=List[MasterIssueBriefOut])
async def list_master_issues(
    current_user: User = Depends(require_roles([UserRole.AUTHORITY, UserRole.PRINCIPAL])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority/Principal: List all master issues with aggregated metrics (student complaint counts, first/latest reports).
    """
    result = await db.execute(
        select(MasterIssue)
        .options(selectinload(MasterIssue.complaints))
        .order_by(desc(MasterIssue.updated_at))
    )
    issues = result.scalars().all()
    out = []
    for issue in issues:
        cmps = issue.complaints or []
        dates = [c.created_at for c in cmps if c.created_at]
        first_d = min(dates) if dates else issue.created_at
        latest_d = max(dates) if dates else issue.updated_at
        out.append(MasterIssueBriefOut(
            issue_id=issue.issue_id,
            title=issue.title,
            category=issue.category,
            location=issue.location,
            status=issue.status,
            primary_complaint_id=issue.primary_complaint_id,
            created_at=issue.created_at,
            updated_at=issue.updated_at,
            complaints_count=len(cmps),
            first_reported_at=first_d,
            latest_reported_at=latest_d,
        ))
    return out

@router.get("/master-issues/{issue_id}", response_model=MasterIssueDetailOut)
async def get_master_issue_detail(
    issue_id: str,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY, UserRole.PRINCIPAL])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority/Principal: Get specific master issue detail and full list of intact linked student complaints.
    """
    clean_id = issue_id.strip()
    result = await db.execute(
        select(MasterIssue)
        .where(
            (MasterIssue.issue_id == clean_id) |
            (MasterIssue.issue_id == f"#{clean_id.lstrip('#')}") |
            (MasterIssue.issue_id == clean_id.lstrip("#"))
        )
        .options(selectinload(MasterIssue.complaints))
    )
    issue = result.scalars().first()
    if not issue:
        raise HTTPException(status_code=404, detail="Master issue not found.")

    cmps = issue.complaints or []
    dates = [c.created_at for c in cmps if c.created_at]
    first_d = min(dates) if dates else issue.created_at
    latest_d = max(dates) if dates else issue.updated_at

    return MasterIssueDetailOut(
        issue_id=issue.issue_id,
        title=issue.title,
        category=issue.category,
        location=issue.location,
        status=issue.status,
        primary_complaint_id=issue.primary_complaint_id,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        complaints_count=len(cmps),
        complaints=cmps,
        first_reported_at=first_d,
        latest_reported_at=latest_d,
    )

@router.get("/{complaint_id}", response_model=ComplaintOut)
async def get_complaint_by_id(complaint_id: str, db: AsyncSession = Depends(get_db)):
    """
    Lookup complaint by ID for authority review, technician dispatch, and public student tracking.
    Supports IDs with or without '#' prefix, and case-insensitive matching.
    """
    clean_id = complaint_id.strip()
    raw_id = clean_id.lstrip("#")
    hash_id = f"#{raw_id}"

    result = await db.execute(
        select(Complaint)
        .where(
            (Complaint.complaint_id == clean_id) |
            (Complaint.complaint_id == hash_id) |
            (Complaint.complaint_id == raw_id) |
            (Complaint.complaint_id.ilike(hash_id)) |
            (Complaint.complaint_id.ilike(raw_id))
        )
        .options(
            selectinload(Complaint.history).selectinload(StatusHistory.user),
            selectinload(Complaint.assignments).selectinload(Assignment.technician).selectinload(Technician.user),
            selectinload(Complaint.ai_analysis),
            selectinload(Complaint.master_issue).selectinload(MasterIssue.complaints)
        )
    )
    complaint = result.scalars().first()

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Maintenance request with ID '{complaint_id}' not found."
        )

    return complaint

@router.get("", response_model=List[ComplaintOut])
async def list_complaints(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    search: Optional[str] = Query(None),
    limit: int = 100,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY, UserRole.PRINCIPAL])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority / Admin complaint list queue with filters.
    """
    query = (
        select(Complaint)
        .options(
            selectinload(Complaint.history),
            selectinload(Complaint.assignments),
            selectinload(Complaint.ai_analysis),
            selectinload(Complaint.master_issue).selectinload(MasterIssue.complaints)
        )
        .order_by(
            desc(Complaint.created_at)
        )
    )

    if status_filter:
        query = query.where(Complaint.status == status_filter.lower())
    if category_filter:
        query = query.where(Complaint.category == category_filter)

    result = await db.execute(query.limit(limit))
    complaints = result.scalars().all()

    if search:
        s = search.lower()
        complaints = [
            c for c in complaints 
            if s in c.complaint_id.lower() or s in c.description.lower() or s in c.location.lower() or s in c.category.lower()
        ]

    return complaints

async def get_complaint_full(db: AsyncSession, complaint_id: str) -> Optional[Complaint]:
    res = await db.execute(
        select(Complaint)
        .where((Complaint.complaint_id == complaint_id) | (Complaint.complaint_id == f"#{complaint_id}"))
        .options(
            selectinload(Complaint.history).selectinload(StatusHistory.user),
            selectinload(Complaint.assignments).selectinload(Assignment.technician).selectinload(Technician.user),
            selectinload(Complaint.ai_analysis),
            selectinload(Complaint.master_issue)
        )
    )
    return res.scalars().first()

@router.post("/{complaint_id}/approve", response_model=ComplaintOut)
async def approve_complaint(
    complaint_id: str,
    approve_data: ComplaintApproveRequest,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority action: Approves maintenance request and manually assigns to a technician.
    """
    complaint = await get_complaint_full(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    tech_id = approve_data.technician_id
    if not tech_id:
        raise HTTPException(status_code=400, detail="Please select a technician to assign.")

    # Retrieve technician
    tech_res = await db.execute(select(Technician).where(Technician.technician_id == tech_id).options(selectinload(Technician.user)))
    tech = tech_res.scalars().first()
    if not tech:
        raise HTTPException(status_code=404, detail="Selected technician not found")

    # Update Complaint
    complaint.status = ComplaintStatus.ASSIGNED

    # Create Assignment
    assignment = Assignment(
        complaint_id=complaint.complaint_id,
        technician_id=tech.technician_id,
        assigned_at=datetime.utcnow(),
        status=AssignmentStatus.PENDING,
    )
    db.add(assignment)

    # Increase technician workload
    tech.current_workload = (tech.current_workload or 0) + 1

    # Add to status history
    history_note = f"Approved by {current_user.name}. Assigned to {tech.user.name if tech.user else tech.business_name}."
    if approve_data.notes:
        history_note += f" Notes: {approve_data.notes}"

    history = StatusHistory(
        complaint_id=complaint.complaint_id,
        status="Assigned",
        changed_by=current_user.user_id,
        notes=history_note,
        timestamp=datetime.utcnow(),
    )
    db.add(history)

    # Add assignment to complaint collection
    complaint.assignments.append(assignment)

    await db.commit()
    return await get_complaint_full(db, complaint.complaint_id)

@router.post("/{complaint_id}/reject", response_model=ComplaintOut)
async def reject_complaint(
    complaint_id: str,
    reject_data: ComplaintRejectRequest,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority action: Rejects maintenance request with reason.
    """
    complaint = await get_complaint_full(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    complaint.status = ComplaintStatus.REJECTED

    history = StatusHistory(
        complaint_id=complaint.complaint_id,
        status="Rejected",
        changed_by=current_user.user_id,
        notes=f"Rejected by {current_user.name}. Reason: {reject_data.reason}",
        timestamp=datetime.utcnow(),
    )
    db.add(history)

    await db.commit()
    return await get_complaint_full(db, complaint.complaint_id)

@router.post("/{complaint_id}/reassign", response_model=ComplaintOut)
async def reassign_complaint(
    complaint_id: str,
    reassign_data: ComplaintReassignRequest,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority action: Reassigns maintenance request to a different technician.
    """
    complaint = await get_complaint_full(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    tech = (await db.execute(select(Technician).where(Technician.technician_id == reassign_data.technician_id).options(selectinload(Technician.user)))).scalars().first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    # Mark older pending assignments as rejected/reassigned
    for assign in complaint.assignments:
        if assign.status in [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]:
            assign.status = AssignmentStatus.REJECTED

    # Create new assignment
    new_assign = Assignment(
        complaint_id=complaint.complaint_id,
        technician_id=tech.technician_id,
        assigned_at=datetime.utcnow(),
        status=AssignmentStatus.PENDING,
    )
    db.add(new_assign)
    complaint.assignments.append(new_assign)
    complaint.status = ComplaintStatus.ASSIGNED

    history = StatusHistory(
        complaint_id=complaint.complaint_id,
        status="Reassigned",
        changed_by=current_user.user_id,
        notes=f"Reassigned to {tech.user.name if tech.user else tech.business_name}. {reassign_data.notes or ''}",
        timestamp=datetime.utcnow(),
    )
    db.add(history)

    await db.commit()
    return await get_complaint_full(db, complaint.complaint_id)

@router.post("/{complaint_id}/confirm-duplicate", response_model=ComplaintOut)
async def confirm_complaint_duplicate(
    complaint_id: str,
    body: Optional[ConfirmDuplicateRequest] = None,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority action: Confirms a complaint as a duplicate and links it to a Master Issue.
    """
    complaint = await get_complaint_full(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    target_id = (body.matched_complaint_id if body and body.matched_complaint_id else complaint.duplicate_of)
    if not target_id:
        raise HTTPException(status_code=400, detail="Please specify the target complaint to link as duplicate.")

    complaint.duplicate_status = "confirmed_duplicate"
    complaint.duplicate_of = target_id
    if body and body.notes:
        complaint.duplicate_reason = (complaint.duplicate_reason or "") + f" [Admin Note: {body.notes}]"

    await link_to_master_issue(
        db,
        duplicate_complaint=complaint,
        matched_complaint_id=target_id,
        action_by_note=f"Duplicate confirmed by Authority Admin {current_user.name}."
    )
    await db.commit()
    return await get_complaint_full(db, complaint.complaint_id)

@router.post("/{complaint_id}/dismiss-duplicate", response_model=ComplaintOut)
async def dismiss_complaint_duplicate(
    complaint_id: str,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority action: Dismisses duplicate suggestion and marks complaint as independent.
    """
    complaint = await get_complaint_full(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found.")

    old_target = complaint.duplicate_of
    complaint.duplicate_status = "dismissed"
    complaint.duplicate_of = None
    # If not the primary anchor of the master issue, unlink from master issue
    if complaint.master_issue and complaint.master_issue.primary_complaint_id != complaint.complaint_id:
        complaint.master_issue_id = None

    db.add(StatusHistory(
        complaint_id=complaint.complaint_id,
        status=complaint.status.value if hasattr(complaint.status, "value") else str(complaint.status),
        changed_by=current_user.user_id,
        notes=f"Duplicate suggestion dismissed by {current_user.name}. Marked as separate request.",
        timestamp=datetime.utcnow()
    ))
    await db.commit()
    return await get_complaint_full(db, complaint.complaint_id)






@router.delete("/all/clear")
async def delete_all_complaints(
    status_filter: str = "submitted",
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority / Admin only: Bulk-deletes ALL complaint records matching the given status.
    status_filter options: submitted, approved, rejected, completed, all
    Cascade deletes linked assignments, status history, and AI analysis automatically.
    """
    from sqlalchemy import delete as sql_delete

    query = select(Complaint)

    if status_filter == "all":
        pass  # delete everything
    elif status_filter == "submitted":
        query = query.where(Complaint.status == ComplaintStatus.SUBMITTED)
    elif status_filter == "approved":
        query = query.where(Complaint.status == ComplaintStatus.APPROVED)
    elif status_filter == "rejected":
        query = query.where(Complaint.status == ComplaintStatus.REJECTED)
    elif status_filter == "completed":
        query = query.where(Complaint.status == ComplaintStatus.COMPLETED)
    elif status_filter == "pending":
        # pending = submitted + approved (not yet assigned/active)
        query = query.where(Complaint.status.in_([ComplaintStatus.SUBMITTED, ComplaintStatus.APPROVED]))
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status_filter '{status_filter}'. Use: submitted, approved, rejected, completed, pending, all"
        )

    result = await db.execute(query)
    complaints_to_delete = result.scalars().all()
    count = len(complaints_to_delete)

    if count == 0:
        return {"message": "No complaints found matching the given filter.", "deleted_count": 0}

    complaint_ids = [c.complaint_id for c in complaints_to_delete]

    # Use individual deletes to trigger cascades properly (assignments, history, ai_analysis)
    for complaint in complaints_to_delete:
        await db.delete(complaint)

    await db.commit()

    return {
        "message": f"Successfully deleted {count} complaint(s) with status '{status_filter}'.",
        "deleted_count": count,
        "deleted_ids": complaint_ids
    }
