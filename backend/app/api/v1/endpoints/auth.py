# Authentication endpoints — Google OAuth2
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.models import User, UserRole

router = APIRouter()


# --------------- Schemas ---------------

class GoogleAuthRequest(BaseModel):
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str | None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# --------------- Helpers ---------------

async def _exchange_code_for_id_token(code: str) -> dict:
    """Exchange the authorization code for tokens and return the decoded id_token."""
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to exchange code with Google: {token_response.text}",
        )

    tokens = token_response.json()
    raw_id_token = tokens.get("id_token")
    if not raw_id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No id_token returned by Google",
        )

    try:
        id_info = google_id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {e}",
        )

    return id_info


async def _find_or_create_user(db: AsyncSession, id_info: dict) -> User:
    """Find existing user by google_id or email, or create a new one."""
    google_id = id_info["sub"]
    email = id_info["email"]
    full_name = id_info.get("name", "")

    # Check if there are any active ADMIN users
    admin_count_result = await db.execute(
        select(func.count(User.id)).where(User.role == UserRole.ADMIN, User.is_active == True)
    )
    admin_count = admin_count_result.scalar() or 0
    needs_admin = admin_count == 0

    # Try by google_id first
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Try by email (user may have been pre-created without google_id)
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user is not None:
            # Link existing user to Google account
            user.google_id = google_id
            if not user.full_name:
                user.full_name = full_name
            # If no active admins exist, auto-promote this existing user
            if needs_admin:
                user.role = UserRole.ADMIN
                user.is_active = True
        else:
            # Brand-new user
            user = User(
                email=email,
                full_name=full_name,
                google_id=google_id,
                role=UserRole.ADMIN if needs_admin else UserRole.SALES,
                is_active=needs_admin,  # active if they become admin, otherwise needs manual activation
            )
            db.add(user)
    else:
        # Found by google_id
        # If no active admins exist, auto-promote this existing user
        if needs_admin:
            user.role = UserRole.ADMIN
            user.is_active = True

    await db.commit()
    await db.refresh(user)
    return user


# --------------- Endpoints ---------------

@router.post("/google", response_model=TokenResponse)
async def google_auth(
    body: GoogleAuthRequest,
    db: AsyncSession = Depends(get_db),
):
    """Exchange a Google authorization code for a PrintFlow JWT."""
    id_info = await _exchange_code_for_id_token(body.code)
    user = await _find_or_create_user(db, id_info)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "account_pending",
                "message": "Twoje konto oczekuje na aktywację przez administratora.",
                "email": user.email,
            },
        )

    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
        role=user.role.value,
    )

    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
        },
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the currently authenticated user."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_active=current_user.is_active,
    )
