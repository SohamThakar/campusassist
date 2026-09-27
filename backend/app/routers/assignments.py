from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.technician import Technician
from app.models.complaint import Complaint, ComplaintStatus
from app.models.assignment import Assignment, AssignmentStatus
from app.models.status_history import StatusHistory
from app.schemas.assignment import AssignmentOut, AssignmentActionRequest
from app.auth.dependencies import require_roles

router = APIRouter(prefix="/assignments", tags=["Assignments"])

@router.get("/mine", response_model=List[AssignmentOut])
async def get_my_assignments(
    current_user: User = Depends(require_roles([UserRole.PROVIDER, UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns assigned maintenance requests for the technician (or all for authority).
    """
    query = (
        select(Assignment)
        .options(
            selectinload(Assignment.complaint),
            selectinload(Assignment.technician).selectinload(Technician.user)
        )
        .order_by(desc(Assignment.assigned_at))
    )

    if current_user.role == UserRole.PROVIDER:
        tech_res = await db.execute(select(Technician).where(Technician.user_id == current_user.user_id))
        tech = tech_res.scalars().first()
        if not tech:
            return []
        query = query.where(Assignment.technician_id == tech.technician_id)

    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{assignment_id}/accept", response_model=AssignmentOut)
async def accept_assignment(
    assignment_id: int,
    action_data: AssignmentActionRequest,
    current_user: User = Depends(require_roles([UserRole.PROVIDER, UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Technician accepts an assigned request, moving status to In Progress.
    """
    result = await db.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.complaint),
            selectinload(Assignment.technician)
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Ownership check
    if current_user.role == UserRole.PROVIDER:
        if not assignment.technician or assignment.technician.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not authorized to accept assignments belonging to another technician."
            )

    assignment.status = AssignmentStatus.ACCEPTED
    assignment.accepted_at = datetime.utcnow()

    if assignment.complaint:
        assignment.complaint.status = ComplaintStatus.IN_PROGRESS

        history = StatusHistory(
            complaint_id=assignment.complaint_id,
            status="In Progress",
            changed_by=current_user.user_id,
            notes=f"Accepted by {current_user.name}. Work in progress. {action_data.notes or ''}",
            timestamp=datetime.utcnow(),
        )
        db.add(history)

    await db.commit()
    await db.refresh(assignment)
    return assignment

@router.post("/{assignment_id}/reject", response_model=AssignmentOut)
async def reject_assignment(
    assignment_id: int,
    action_data: AssignmentActionRequest,
    current_user: User = Depends(require_roles([UserRole.PROVIDER, UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Technician declines an assigned request, releasing it back for reassignment.
    """
    result = await db.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.complaint),
            selectinload(Assignment.technician)
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_user.role == UserRole.PROVIDER:
        if not assignment.technician or assignment.technician.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not authorized to decline assignments belonging to another technician."
            )

    assignment.status = AssignmentStatus.REJECTED

    if assignment.technician and assignment.technician.current_workload > 0:
        assignment.technician.current_workload -= 1

    if assignment.complaint:
        assignment.complaint.status = ComplaintStatus.SUBMITTED # Needs re-assignment

        history = StatusHistory(
            complaint_id=assignment.complaint_id,
            status="Declined by Tech",
            changed_by=current_user.user_id,
            notes=f"Declined by {current_user.name}. Reason: {action_data.notes or 'Schedule conflict'}",
            timestamp=datetime.utcnow(),
        )
        db.add(history)

    await db.commit()
    await db.refresh(assignment)
    return assignment

@router.post("/{assignment_id}/complete", response_model=AssignmentOut)
async def complete_assignment(
    assignment_id: int,
    action_data: AssignmentActionRequest,
    current_user: User = Depends(require_roles([UserRole.PROVIDER, UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Technician marks an assigned request as completed.
    """
    result = await db.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.complaint),
            selectinload(Assignment.technician)
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    if current_user.role == UserRole.PROVIDER:
        if not assignment.technician or assignment.technician.user_id != current_user.user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You are not authorized to complete assignments belonging to another technician."
            )

    assignment.status = AssignmentStatus.COMPLETED
    assignment.completed_at = datetime.utcnow()

    if assignment.technician and assignment.technician.current_workload > 0:
        assignment.technician.current_workload -= 1

    if assignment.complaint:
        assignment.complaint.status = ComplaintStatus.COMPLETED

        history = StatusHistory(
            complaint_id=assignment.complaint_id,
            status="Completed",
            changed_by=current_user.user_id,
            notes=f"Maintenance resolved by {current_user.name}. Notes: {action_data.notes or 'Work verified & completed.'}",
            timestamp=datetime.utcnow(),
        )
        db.add(history)

    await db.commit()
    await db.refresh(assignment)
    return assignment

@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority / Admin only: Deletes a specific Job / Assignment record.
    The associated Complaint and its history are safely preserved.
    """
    result = await db.execute(
        select(Assignment)
        .where(Assignment.id == assignment_id)
        .options(
            selectinload(Assignment.complaint),
            selectinload(Assignment.technician)
        )
    )
    assignment = result.scalars().first()
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job #{assignment_id} not found."
        )

    complaint_id = assignment.complaint_id
    complaint = assignment.complaint
    tech = assignment.technician

    # Reduce technician's workload if assignment was active
    if tech and tech.current_workload > 0 and assignment.status in [AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]:
        tech.current_workload -= 1

    # Keep complaint intact! If complaint was assigned / in_progress, reset status to submitted
    if complaint and complaint.status in [ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS]:
        complaint.status = ComplaintStatus.SUBMITTED

        history = StatusHistory(
            complaint_id=complaint.complaint_id,
            status="Job Deleted",
            changed_by=current_user.user_id,
            notes=f"Job #{assignment_id} deleted by Admin ({current_user.name}). Complaint {complaint.complaint_id} remains open in queue.",
            timestamp=datetime.utcnow(),
        )
        db.add(history)

    await db.delete(assignment)
    await db.commit()

    return {
        "message": f"Job #{assignment_id} deleted successfully. Complaint {complaint_id} is still available.",
        "deleted_job_id": assignment_id,
        "complaint_id": complaint_id
    }



@router.delete("/all/clear")
async def delete_all_assignments(
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority / Admin only: Bulk-deletes ALL job/assignment records.
    Complaints are preserved but reset to Submitted if they were assigned or in-progress.
    Technician workloads are also reset to 0.
    """
    result = await db.execute(
        select(Assignment).options(
            selectinload(Assignment.complaint),
            selectinload(Assignment.technician)
        )
    )
    assignments = result.scalars().all()
    count = len(assignments)

    for assignment in assignments:
        if assignment.complaint and assignment.complaint.status in [
            ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS
        ]:
            assignment.complaint.status = ComplaintStatus.SUBMITTED
            history = StatusHistory(
                complaint_id=assignment.complaint_id,
                status="Jobs Cleared",
                changed_by=current_user.user_id,
                notes=f"All jobs cleared by Admin ({current_user.name}). Complaint remains open.",
                timestamp=datetime.utcnow(),
            )
            db.add(history)

        if assignment.technician and assignment.technician.current_workload > 0:
            assignment.technician.current_workload = 0

    await db.execute(delete(Assignment))
    await db.commit()

    return {
        "message": f"All {count} job(s) have been deleted. Complaints have been preserved.",
        "deleted_count": count
    }
