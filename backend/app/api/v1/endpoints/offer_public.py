# Public offer endpoints (no authentication required)
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.config import settings
from app.models.models import OfferStatus
from app.schemas.schemas import OfferPublicResponse, OfferClientAction, OfferVariantResponse
from app.services.offer_service import (
    get_offer_by_token, record_tracking_event,
    accept_offer, reject_offer,
)

router = APIRouter()

# 1x1 transparent PNG pixel for email tracking
TRACKING_PIXEL = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01"
    b"\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
    b"\r\n\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _get_client_ip(request: Request) -> str:
    """Extract client IP from request."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.get("/offer/{token}", response_model=OfferPublicResponse)
async def public_get_offer(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Get offer for client view. Records link click tracking."""
    offer = await get_offer_by_token(db, token)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")

    # Check if expired
    if offer.status == OfferStatus.EXPIRED:
        raise HTTPException(status_code=410, detail="Oferta wygasła")

    # Record tracking event
    ip = _get_client_ip(request)
    ua = request.headers.get("user-agent", "")
    await record_tracking_event(db, offer, "LINK_CLICKED", ip, ua)

    # Build public response (no internal fields)
    return OfferPublicResponse(
        token=offer.token,
        title=offer.title,
        company_name=settings.COMPANY_NAME if hasattr(settings, "COMPANY_NAME") else None,
        company_phone=settings.COMPANY_PHONE if hasattr(settings, "COMPANY_PHONE") else None,
        company_email=settings.COMPANY_EMAIL if hasattr(settings, "COMPANY_EMAIL") else None,
        valid_until=offer.valid_until,
        status=offer.status.value,
        client_name=offer.client.name if offer.client else None,
        variants=[
            OfferVariantResponse.model_validate(v) for v in offer.variants
        ],
        accepted_variant_id=offer.accepted_variant_id,
        client_comment=offer.client_comment,
    )


@router.post("/offer/{token}/accept")
async def public_accept_offer(
    token: str,
    action: OfferClientAction,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Client accepts the offer."""
    offer = await get_offer_by_token(db, token)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")

    if offer.status in (OfferStatus.ACCEPTED, OfferStatus.REJECTED):
        raise HTTPException(
            status_code=400,
            detail="Oferta została już rozpatrzona"
        )

    if offer.status == OfferStatus.EXPIRED:
        raise HTTPException(status_code=410, detail="Oferta wygasła")

    ip = _get_client_ip(request)
    ua = request.headers.get("user-agent", "")

    await accept_offer(
        db, offer,
        variant_id=action.variant_id,
        comment=action.comment,
        ip_address=ip,
        user_agent=ua,
    )

    return {"status": "accepted", "message": "Oferta została zaakceptowana"}


@router.post("/offer/{token}/reject")
async def public_reject_offer(
    token: str,
    action: OfferClientAction,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Client rejects the offer."""
    offer = await get_offer_by_token(db, token)
    if not offer:
        raise HTTPException(status_code=404, detail="Oferta nie znaleziona")

    if offer.status in (OfferStatus.ACCEPTED, OfferStatus.REJECTED):
        raise HTTPException(
            status_code=400,
            detail="Oferta została już rozpatrzona"
        )

    ip = _get_client_ip(request)
    ua = request.headers.get("user-agent", "")

    await reject_offer(
        db, offer,
        comment=action.comment,
        ip_address=ip,
        user_agent=ua,
    )

    return {"status": "rejected", "message": "Oferta została odrzucona"}


@router.get("/offer/{token}/pixel.png")
async def tracking_pixel(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Tracking pixel for email open tracking. Returns 1x1 transparent PNG."""
    offer = await get_offer_by_token(db, token)
    if offer:
        ip = _get_client_ip(request)
        ua = request.headers.get("user-agent", "")
        await record_tracking_event(db, offer, "EMAIL_OPENED", ip, ua)

    return Response(
        content=TRACKING_PIXEL,
        media_type="image/png",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )
