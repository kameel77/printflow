# Offers CRUD endpoint (authenticated)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from decimal import Decimal

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, OfferStatus
from app.schemas.schemas import (
    OfferCreate, OfferUpdate, OfferResponse, OfferListResponse,
    OfferStatus as OfferStatusSchema,
)
from app.services.offer_service import (
    create_offer, get_offer_by_id, list_offers, update_offer,
    mark_offer_sent, duplicate_offer,
)

router = APIRouter()


@router.get("", response_model=List[OfferListResponse])
async def api_list_offers(
    status: Optional[str] = Query(None, description="Filter by status"),
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all offers with optional status filter."""
    offers = await list_offers(db, status=status, skip=skip, limit=limit)
    result = []
    for offer in offers:
        # Calculate total value from first variant (or sum)
        total_net = None
        variant_count = len(offer.variants) if offer.variants else 0
        if offer.variants:
            total_net = max(
                (v.total_price_net for v in offer.variants),
                default=None
            )

        result.append(OfferListResponse(
            id=offer.id,
            token=offer.token,
            client=offer.client,
            status=OfferStatusSchema(offer.status.value),
            title=offer.title,
            view_count=offer.view_count or 0,
            total_value_net=total_net,
            variant_count=variant_count,
            sent_at=offer.sent_at,
            viewed_at=offer.viewed_at,
            responded_at=offer.responded_at,
            created_at=offer.created_at,
        ))
    return result


@router.post("", response_model=OfferResponse, status_code=201)
async def api_create_offer(
    data: OfferCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new offer (draft or send immediately)."""
    offer = await create_offer(db, data, user_id=current_user.id)

    if data.send_immediately:
        offer = await mark_offer_sent(db, offer)
        # TODO: Send email via Gmail API

    return offer


@router.get("/{offer_id}", response_model=OfferResponse)
async def api_get_offer(
    offer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get offer details by ID."""
    offer = await get_offer_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")
    return offer


@router.patch("/{offer_id}", response_model=OfferResponse)
async def api_update_offer(
    offer_id: int,
    data: OfferUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update offer (only drafts can be fully edited)."""
    offer = await get_offer_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")

    if offer.status != OfferStatus.DRAFT and data.status is None:
        raise HTTPException(
            status_code=400,
            detail="Tylko szkice ofert mogą być edytowane"
        )

    return await update_offer(db, offer, data)


@router.post("/{offer_id}/send", response_model=OfferResponse)
async def api_send_offer(
    offer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send offer to client via email."""
    offer = await get_offer_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")

    if not offer.client_id:
        raise HTTPException(
            status_code=400,
            detail="Oferta musi mieć przypisanego klienta"
        )

    if not offer.client or not offer.client.email:
        raise HTTPException(
            status_code=400,
            detail="Klient musi mieć adres email"
        )

    if not offer.variants:
        raise HTTPException(
            status_code=400,
            detail="Oferta musi mieć co najmniej jeden wariant"
        )

    offer = await mark_offer_sent(db, offer)
    # TODO: Send email via Gmail API

    return offer


@router.post("/{offer_id}/resend", response_model=OfferResponse)
async def api_resend_offer(
    offer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resend offer email."""
    offer = await get_offer_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")

    if offer.status not in (OfferStatus.SENT, OfferStatus.VIEWED):
        raise HTTPException(
            status_code=400,
            detail="Tylko wysłane oferty mogą być wysłane ponownie"
        )

    # TODO: Send email via Gmail API

    return offer


@router.post("/{offer_id}/duplicate", response_model=OfferResponse, status_code=201)
async def api_duplicate_offer(
    offer_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Duplicate an existing offer as a new draft."""
    offer = await get_offer_by_id(db, offer_id)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")

    return await duplicate_offer(db, offer, user_id=current_user.id)
