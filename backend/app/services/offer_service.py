# Offer business logic service
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, List

from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.models import (
    Offer, OfferVariant, OfferVariantComponent, OfferTracking,
    Client, OfferStatus,
)
from app.schemas.schemas import (
    OfferCreate, OfferUpdate, OfferVariantCreate,
    ClientCreate,
)


async def generate_offer_token() -> str:
    """Generate unique token for public offer link."""
    return uuid.uuid4().hex


async def create_offer(
    db: AsyncSession,
    data: OfferCreate,
    user_id: int,
) -> Offer:
    """Create a new offer with variants and components."""
    token = await generate_offer_token()

    # Handle inline client creation
    client_id = data.client_id
    if data.client and not client_id:
        client = Client(
            name=data.client.name,
            email=data.client.email,
            phone=data.client.phone,
            company_name=data.client.company_name,
            company_nip=data.client.company_nip,
            company_address=data.client.company_address,
            notes=data.client.notes,
        )
        db.add(client)
        await db.flush()
        client_id = client.id

    # Default validity: 14 days
    valid_until = data.valid_until
    if not valid_until:
        valid_until = datetime.now(timezone.utc) + timedelta(
            days=settings.OFFER_DEFAULT_VALIDITY_DAYS
        )

    offer = Offer(
        token=token,
        client_id=client_id,
        user_id=user_id,
        status=OfferStatus.DRAFT,
        title=data.title,
        internal_note=data.internal_note,
        valid_until=valid_until,
    )
    db.add(offer)
    await db.flush()

    # Create variants
    for v_data in data.variants:
        variant = OfferVariant(
            offer_id=offer.id,
            name=v_data.name,
            is_recommended=v_data.is_recommended,
            template_id=v_data.template_id,
            width_cm=v_data.width_cm,
            height_cm=v_data.height_cm,
            quantity=v_data.quantity,
            total_price_net=v_data.total_price_net,
            total_price_gross=v_data.total_price_gross,
            calculation_snapshot=v_data.calculation_snapshot,
            sort_order=v_data.sort_order,
        )
        db.add(variant)
        await db.flush()

        for c_data in v_data.components:
            component = OfferVariantComponent(
                variant_id=variant.id,
                name_snapshot=c_data.name_snapshot,
                type=c_data.type,
                quantity=c_data.quantity,
                unit=c_data.unit,
                unit_price=c_data.unit_price,
                total_price=c_data.total_price,
                visible_to_client=c_data.visible_to_client,
            )
            db.add(component)

    await db.commit()
    await db.refresh(offer)

    # Reload with relationships
    result = await db.execute(
        select(Offer)
        .options(
            selectinload(Offer.client),
            selectinload(Offer.variants).selectinload(OfferVariant.components),
            selectinload(Offer.tracking_events),
        )
        .where(Offer.id == offer.id)
    )
    return result.scalar_one()


async def get_offer_by_id(db: AsyncSession, offer_id: int) -> Optional[Offer]:
    """Get offer by ID with all relationships."""
    result = await db.execute(
        select(Offer)
        .options(
            selectinload(Offer.client),
            selectinload(Offer.variants).selectinload(OfferVariant.components),
            selectinload(Offer.tracking_events),
        )
        .where(Offer.id == offer_id)
    )
    return result.scalar_one_or_none()


async def get_offer_by_token(db: AsyncSession, token: str) -> Optional[Offer]:
    """Get offer by public token with all relationships."""
    result = await db.execute(
        select(Offer)
        .options(
            selectinload(Offer.client),
            selectinload(Offer.variants).selectinload(OfferVariant.components),
            selectinload(Offer.tracking_events),
        )
        .where(Offer.token == token)
    )
    return result.scalar_one_or_none()


async def list_offers(
    db: AsyncSession,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Offer]:
    """List offers with optional status filter."""
    query = (
        select(Offer)
        .options(
            selectinload(Offer.client),
            selectinload(Offer.variants),
        )
        .order_by(Offer.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if status:
        query = query.where(Offer.status == OfferStatus(status))

    result = await db.execute(query)
    return list(result.scalars().all())


async def update_offer(
    db: AsyncSession,
    offer: Offer,
    data: OfferUpdate,
) -> Offer:
    """Update an existing offer (draft only)."""
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(offer, field, value)

    await db.commit()
    await db.refresh(offer)
    return await get_offer_by_id(db, offer.id)


async def mark_offer_sent(db: AsyncSession, offer: Offer) -> Offer:
    """Mark offer as sent."""
    offer.status = OfferStatus.SENT
    offer.sent_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(offer)
    return offer


async def record_tracking_event(
    db: AsyncSession,
    offer: Offer,
    event_type: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> OfferTracking:
    """Record a tracking event for an offer."""
    tracking = OfferTracking(
        offer_id=offer.id,
        event_type=event_type,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(tracking)

    # Update offer view tracking
    if event_type == "LINK_CLICKED":
        offer.view_count = (offer.view_count or 0) + 1
        if not offer.viewed_at:
            offer.viewed_at = datetime.now(timezone.utc)
        if offer.status == OfferStatus.SENT:
            offer.status = OfferStatus.VIEWED

    await db.commit()
    return tracking


async def accept_offer(
    db: AsyncSession,
    offer: Offer,
    variant_id: Optional[int],
    comment: Optional[str],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Offer:
    """Client accepts the offer."""
    offer.status = OfferStatus.ACCEPTED
    offer.accepted_variant_id = variant_id
    offer.client_comment = comment
    offer.responded_at = datetime.now(timezone.utc)
    await record_tracking_event(db, offer, "ACCEPTED", ip_address, user_agent)
    await db.commit()
    await db.refresh(offer)
    return offer


async def reject_offer(
    db: AsyncSession,
    offer: Offer,
    comment: Optional[str],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> Offer:
    """Client rejects the offer."""
    offer.status = OfferStatus.REJECTED
    offer.client_comment = comment
    offer.responded_at = datetime.now(timezone.utc)
    await record_tracking_event(db, offer, "REJECTED", ip_address, user_agent)
    await db.commit()
    await db.refresh(offer)
    return offer


async def duplicate_offer(
    db: AsyncSession,
    offer: Offer,
    user_id: int,
) -> Offer:
    """Duplicate an existing offer (creates new draft)."""
    token = await generate_offer_token()

    new_offer = Offer(
        token=token,
        client_id=offer.client_id,
        user_id=user_id,
        status=OfferStatus.DRAFT,
        title=f"{offer.title} (kopia)" if offer.title else "Kopia oferty",
        internal_note=offer.internal_note,
        valid_until=datetime.now(timezone.utc) + timedelta(
            days=settings.OFFER_DEFAULT_VALIDITY_DAYS
        ),
    )
    db.add(new_offer)
    await db.flush()

    for v in offer.variants:
        new_variant = OfferVariant(
            offer_id=new_offer.id,
            name=v.name,
            is_recommended=v.is_recommended,
            template_id=v.template_id,
            width_cm=v.width_cm,
            height_cm=v.height_cm,
            quantity=v.quantity,
            total_price_net=v.total_price_net,
            total_price_gross=v.total_price_gross,
            calculation_snapshot=v.calculation_snapshot,
            sort_order=v.sort_order,
        )
        db.add(new_variant)
        await db.flush()

        for c in v.components:
            new_component = OfferVariantComponent(
                variant_id=new_variant.id,
                name_snapshot=c.name_snapshot,
                type=c.type,
                quantity=c.quantity,
                unit=c.unit,
                unit_price=c.unit_price,
                total_price=c.total_price,
                visible_to_client=c.visible_to_client,
            )
            db.add(new_component)

    await db.commit()
    return await get_offer_by_id(db, new_offer.id)
