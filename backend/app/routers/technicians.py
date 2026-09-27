import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User, UserRole
from app.models.technician import Technician, TechnicianStatus
from app.models.assignment import Assignment
from app.schemas.technician import TechnicianOut, TechnicianRegisterRequest
from app.auth.jwt import get_password_hash
from app.auth.dependencies import require_roles

router = APIRouter(prefix="/technicians", tags=["Technicians"])

@router.get("", response_model=List[TechnicianOut])
async def list_technicians(
    skill: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Technician).options(selectinload(Technician.user))
    
    if status_filter:
        query = query.where(Technician.status == status_filter.lower())
    
    result = await db.execute(query)
    technicians = result.scalars().all()

    response_list = []
    for tech in technicians:
        if skill and not any(skill.lower() in s.lower() for s in tech.skills):
            continue
        response_list.append(
            TechnicianOut(
                technician_id=tech.technician_id,
                user_id=tech.user_id,
                user_name=tech.user.name if tech.user else None,
                user_email=tech.user.email if tech.user else None,
                business_name=tech.business_name,
                skills=tech.skills,
                service_area=tech.service_area,
                availability=tech.availability,
                status=tech.status,
                rating=tech.rating,
                current_workload=tech.current_workload,
            )
        )
    return response_list

@router.post("/register", response_model=TechnicianOut)
async def register_technician(
    req: TechnicianRegisterRequest,
    db: AsyncSession = Depends(get_db)
):
    # Check if email exists
    existing = await db.execute(select(User).where(User.email == req.email.lower()))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"usr_{uuid.uuid4().hex[:8]}"
    user = User(
        user_id=user_id,
        name=req.name,
        email=req.email.lower(),
        password_hash=get_password_hash(req.password),
        role=UserRole.PROVIDER,
        created_at=datetime.utcnow()
    )
    db.add(user)
    await db.flush()

    technician_id = f"tech_{uuid.uuid4().hex[:8]}"
    tech = Technician(
        technician_id=technician_id,
        user_id=user.user_id,
        business_name=req.business_name or f"{req.name}'s Services",
        skills=req.skills,
        service_area=req.service_area,
        status=TechnicianStatus.VERIFIED, # Default verified for easy demo
        rating=4.9,
        current_workload=0,
        availability={"status": "available", "schedule": "Mon-Fri 8am-6pm"}
    )
    db.add(tech)
    await db.commit()
    await db.refresh(tech)

    return TechnicianOut(
        technician_id=tech.technician_id,
        user_id=user.user_id,
        user_name=user.name,
        user_email=user.email,
        business_name=tech.business_name,
        skills=tech.skills,
        service_area=tech.service_area,
        availability=tech.availability,
        status=tech.status,
        rating=tech.rating,
        current_workload=tech.current_workload
    )

@router.post("/{technician_id}/verify", response_model=TechnicianOut)
async def verify_technician(
    technician_id: str,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Technician)
        .where(Technician.technician_id == technician_id)
        .options(selectinload(Technician.user))
    )
    tech = result.scalars().first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    tech.status = TechnicianStatus.VERIFIED
    await db.commit()
    await db.refresh(tech)

    return TechnicianOut(
        technician_id=tech.technician_id,
        user_id=tech.user_id,
        user_name=tech.user.name if tech.user else None,
        user_email=tech.user.email if tech.user else None,
        business_name=tech.business_name,
        skills=tech.skills,
        service_area=tech.service_area,
        availability=tech.availability,
        status=tech.status,
        rating=tech.rating,
        current_workload=tech.current_workload
    )

@router.delete("/{technician_id}")
async def delete_technician(
    technician_id: str,
    current_user: User = Depends(require_roles([UserRole.AUTHORITY])),
    db: AsyncSession = Depends(get_db)
):
    """
    Authority / Admin only: Permanently deletes a technician and their user account.
    Any open assignments for this technician are also deleted first.
    """
    result = await db.execute(
        select(Technician)
        .where(Technician.technician_id == technician_id)
        .options(selectinload(Technician.user))
    )
    tech = result.scalars().first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    user_id = tech.user_id
    user_name = tech.user.name if tech.user else technician_id

    # Delete all assignments belonging to this technician first
    await db.execute(
        delete(Assignment).where(Assignment.technician_id == technician_id)
    )

    # Delete the technician record (cascade will clean up via FK)
    await db.delete(tech)

    # Delete the linked user account
    user_res = await db.execute(select(User).where(User.user_id == user_id))
    user = user_res.scalars().first()
    if user:
        await db.delete(user)

    await db.commit()

    return {
        "message": f"Technician '{user_name}' ({technician_id}) has been permanently deleted.",
        "deleted_technician_id": technician_id,
        "deleted_user_id": user_id
    }
