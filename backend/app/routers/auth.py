from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.auth.jwt import verify_password, create_access_token, get_password_hash
from app.auth.dependencies import get_current_user
from app.schemas.auth import LoginRequest, Token, UserOut
from pydantic import BaseModel, EmailStr
import uuid
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str

@router.post("/register", response_model=Token)
async def register_student(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Student self-registration endpoint."""
    existing = await db.execute(select(User).where(User.email == data.email.lower()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists."
        )
    user = User(
        user_id=f"usr_student_{uuid.uuid4().hex[:8]}",
        name=data.name.strip(),
        email=data.email.lower().strip(),
        password_hash=get_password_hash(data.password),
        role=UserRole.STUDENT,
        created_at=datetime.utcnow()
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    access_token = create_access_token(
        data={"sub": user.user_id, "role": user.role.value, "email": user.email}
    )
    return {"access_token": access_token, "token_type": "bearer", "user": user}

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == login_data.email.lower()))
    user = result.scalars().first()

    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": user.user_id, "role": user.role.value, "email": user.email}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
