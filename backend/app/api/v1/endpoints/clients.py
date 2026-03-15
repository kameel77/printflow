# Clients CRUD endpoint
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Client, User
from app.schemas.schemas import ClientCreate, ClientUpdate, ClientResponse

router = APIRouter()


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    q: Optional[str] = Query(None, description="Search by name, email or company"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all clients with optional search."""
    query = select(Client).order_by(Client.name).offset(skip).limit(limit)

    if q:
        search_term = f"%{q}%"
        query = query.where(
            (Client.name.ilike(search_term)) |
            (Client.email.ilike(search_term)) |
            (Client.company_name.ilike(search_term))
        )

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new client."""
    # Check for duplicate email
    if data.email:
        existing = await db.execute(
            select(Client).where(Client.email == data.email)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Klient z emailem {data.email} już istnieje"
            )

    client = Client(**data.model_dump())
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get client by ID."""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")
    return client


@router.patch("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update client fields."""
    result = await db.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Klient nie znaleziony")

    update_data = data.model_dump(exclude_unset=True)

    # Check email uniqueness if changed
    if "email" in update_data and update_data["email"]:
        existing = await db.execute(
            select(Client).where(
                Client.email == update_data["email"],
                Client.id != client_id
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=400,
                detail=f"Klient z emailem {update_data['email']} już istnieje"
            )

    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client
