# Pydantic Schemas
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from decimal import Decimal
from datetime import datetime
from enum import Enum


class CalculationMethod(str, Enum):
    AREA = "AREA"
    LINEAR = "LINEAR"
    TIME = "TIME"
    UNIT = "UNIT"


class QuoteStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


# Material Schemas
class MaterialBase(BaseModel):
    name: str
    external_id: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tooltip_external_id: Optional[str] = None


class MaterialVariantBase(BaseModel):
    external_id: Optional[str] = None
    width_cm: Optional[Decimal] = None
    length_cm: Optional[Decimal] = None
    weight_kg: Decimal = Decimal("0.00")
    cost_price_per_unit: Decimal
    markup_percentage: Decimal = Decimal("0.00")
    unit: str
    margin_w_cm: Decimal = Decimal("0.0")
    margin_h_cm: Decimal = Decimal("0.0")
    is_active: bool = True
    tooltip_external_id: Optional[str] = None
    tooltip_margin_w_cm: Optional[str] = None
    tooltip_margin_h_cm: Optional[str] = None
    tooltip_markup_percentage: Optional[str] = None


class MaterialVariantCreate(MaterialVariantBase):
    pass


class MaterialVariantResponse(MaterialVariantBase):
    id: int
    material_id: int
    
    class Config:
        from_attributes = True


class MaterialCreate(MaterialBase):
    variants: List[MaterialVariantCreate] = []


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    tooltip_external_id: Optional[str] = None
    variants: Optional[List[MaterialVariantCreate]] = None


class MaterialResponse(MaterialBase):
    id: int
    variants: List[MaterialVariantResponse] = []
    created_at: datetime
    
    class Config:
        from_attributes = True


# Process Schemas
class ProcessBase(BaseModel):
    name: str
    method: CalculationMethod
    unit_price: Decimal
    setup_fee: Decimal = Decimal("0.00")
    internal_cost: Optional[Decimal] = None
    margin_w_cm: Decimal = Decimal("0.0")
    margin_h_cm: Decimal = Decimal("0.0")
    unit: Optional[str] = None
    is_active: bool = True
    tooltip_method: Optional[str] = None
    tooltip_unit_price: Optional[str] = None
    tooltip_setup_fee: Optional[str] = None
    tooltip_internal_cost: Optional[str] = None
    tooltip_margin_w_cm: Optional[str] = None
    tooltip_margin_h_cm: Optional[str] = None


class ProcessCreate(ProcessBase):
    pass


class ProcessUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[CalculationMethod] = None
    unit_price: Optional[Decimal] = None
    setup_fee: Optional[Decimal] = None
    internal_cost: Optional[Decimal] = None
    margin_w_cm: Optional[Decimal] = None
    margin_h_cm: Optional[Decimal] = None
    unit: Optional[str] = None
    is_active: Optional[bool] = None
    tooltip_method: Optional[str] = None
    tooltip_unit_price: Optional[str] = None
    tooltip_setup_fee: Optional[str] = None
    tooltip_internal_cost: Optional[str] = None
    tooltip_margin_w_cm: Optional[str] = None
    tooltip_margin_h_cm: Optional[str] = None


class ProcessResponse(ProcessBase):
    id: int
    
    class Config:
        from_attributes = True


# Template Schemas
class TemplateComponentBase(BaseModel):
    material_id: Optional[int] = None
    process_id: Optional[int] = None
    is_required: bool = True
    group_name: Optional[str] = None
    option_label: Optional[str] = None
    default_quantity_formula: Optional[str] = None
    sort_order: int = 0


class TemplateComponentCreate(TemplateComponentBase):
    pass


class TemplateComponentResponse(TemplateComponentBase):
    id: int
    template_id: int
    
    class Config:
        from_attributes = True


class ProductTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    default_margin_w_cm: Decimal = Decimal("0.0")
    default_margin_h_cm: Decimal = Decimal("0.0")
    default_overlap_cm: Decimal = Decimal("1.0")
    max_bryt_width_cm: Optional[Decimal] = None
    is_active: bool = True
    tooltip_margin_w_cm: Optional[str] = None
    tooltip_margin_h_cm: Optional[str] = None
    tooltip_overlap_cm: Optional[str] = None


class ProductTemplateCreate(ProductTemplateBase):
    components: List[TemplateComponentCreate] = []


class ProductTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_margin_w_cm: Optional[Decimal] = None
    default_margin_h_cm: Optional[Decimal] = None
    default_overlap_cm: Optional[Decimal] = None
    max_bryt_width_cm: Optional[Decimal] = None
    is_active: Optional[bool] = None
    components: Optional[List[TemplateComponentCreate]] = None
    tooltip_margin_w_cm: Optional[str] = None
    tooltip_margin_h_cm: Optional[str] = None
    tooltip_overlap_cm: Optional[str] = None


class ProductTemplateResponse(ProductTemplateBase):
    id: int
    components: List[TemplateComponentResponse] = []
    
    class Config:
        from_attributes = True


# Calculation Schemas
class CalculationRequest(BaseModel):
    width_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    template_id: Optional[int] = None
    selected_options: List[int] = []
    overlap_override_cm: Optional[float] = None


class ComponentResult(BaseModel):
    name: str
    type: str  # 'MATERIAL' | 'PROCESS'
    qty: float
    unit: str
    price_net: float
    details: str
    is_rotated: bool = False


class PanelInfo(BaseModel):
    width_cm: float
    height_cm: float
    quantity: int


class PanelMethodResult(BaseModel):
    method: str  # 'standard' | 'effective'
    panels: List[PanelInfo]
    total_waste_m2: float
    num_panels: int


class CalculationResponse(BaseModel):
    total_price_net: float
    total_cost_cogs: float
    margin_percentage: float
    gross_dimensions: Dict[str, float]
    is_split: bool
    num_panels: int
    overlap_used_cm: float
    client_view: List[Dict[str, Any]]
    tech_view: List[ComponentResult]
    panel_methods: List[PanelMethodResult] = []
    debug: List[str] = []


# Quote Schemas
class QuoteItemBase(BaseModel):
    product_name: Optional[str] = None
    width_cm: Decimal
    height_cm: Decimal
    quantity: int = 1
    template_id: Optional[int] = None


class QuoteItemCreate(QuoteItemBase):
    pass


class QuoteComponentBase(BaseModel):
    name_snapshot: str
    calculated_quantity: Decimal
    unit_price_snapshot: Decimal
    total_price: Decimal
    is_from_option: bool = False
    tech_margin_applied_w: Optional[Decimal] = None
    tech_margin_applied_h: Optional[Decimal] = None


class QuoteItemResponse(QuoteItemBase):
    id: int
    quote_id: int
    components: List[QuoteComponentBase] = []
    
    class Config:
        from_attributes = True


class QuoteBase(BaseModel):
    client_id: Optional[int] = None
    lead_time_raw: Optional[str] = None
    status: QuoteStatus = QuoteStatus.DRAFT


class QuoteCreate(QuoteBase):
    items: List[QuoteItemCreate] = []


class QuoteResponse(QuoteBase):
    id: int
    total_price_net: Optional[Decimal] = None
    margin_value: Optional[Decimal] = None
    items: List[QuoteItemResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Client Schemas
class ClientBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    company_nip: Optional[str] = None
    company_address: Optional[str] = None
    notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    company_nip: Optional[str] = None
    company_address: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ────────── Offer Schemas ──────────

class OfferStatus(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class OfferVariantComponentBase(BaseModel):
    name_snapshot: str
    type: str  # MATERIAL / PROCESS / ADJUSTMENT
    quantity: Optional[Decimal] = None
    unit: Optional[str] = None
    unit_price: Optional[Decimal] = None
    total_price: Decimal
    visible_to_client: bool = True


class OfferVariantComponentResponse(OfferVariantComponentBase):
    id: int
    variant_id: int

    class Config:
        from_attributes = True


class OfferVariantBase(BaseModel):
    name: str
    is_recommended: bool = False
    template_id: Optional[int] = None
    width_cm: Optional[Decimal] = None
    height_cm: Optional[Decimal] = None
    quantity: Optional[int] = None
    total_price_net: Decimal
    total_price_gross: Decimal
    calculation_snapshot: Optional[Dict[str, Any]] = None
    sort_order: int = 0


class OfferVariantCreate(OfferVariantBase):
    components: List[OfferVariantComponentBase] = []


class OfferVariantResponse(OfferVariantBase):
    id: int
    offer_id: int
    components: List[OfferVariantComponentResponse] = []

    class Config:
        from_attributes = True


class OfferTrackingResponse(BaseModel):
    id: int
    event_type: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OfferCreate(BaseModel):
    client_id: Optional[int] = None
    client: Optional[ClientCreate] = None  # inline new client
    title: Optional[str] = None
    internal_note: Optional[str] = None
    valid_until: Optional[datetime] = None
    variants: List[OfferVariantCreate] = []
    send_immediately: bool = False


class OfferUpdate(BaseModel):
    title: Optional[str] = None
    internal_note: Optional[str] = None
    valid_until: Optional[datetime] = None
    client_id: Optional[int] = None
    status: Optional[OfferStatus] = None
    variants: Optional[List[OfferVariantCreate]] = None
    send_immediately: bool = False


class OfferResponse(BaseModel):
    id: int
    token: str
    client_id: Optional[int] = None
    client: Optional[ClientResponse] = None
    user_id: Optional[int] = None
    status: OfferStatus
    title: Optional[str] = None
    internal_note: Optional[str] = None
    valid_until: Optional[datetime] = None
    client_comment: Optional[str] = None
    accepted_variant_id: Optional[int] = None
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    view_count: int = 0
    responded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    variants: List[OfferVariantResponse] = []
    tracking_events: List[OfferTrackingResponse] = []

    class Config:
        from_attributes = True


class OfferListResponse(BaseModel):
    id: int
    token: str
    client: Optional[ClientResponse] = None
    status: OfferStatus
    title: Optional[str] = None
    view_count: int = 0
    total_value_net: Optional[Decimal] = None
    variant_count: int = 0
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OfferPublicResponse(BaseModel):
    """Public view for client — no internal fields"""
    token: str
    title: Optional[str] = None
    company_name: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    valid_until: Optional[datetime] = None
    status: OfferStatus
    client_name: Optional[str] = None
    variants: List[OfferVariantResponse] = []
    accepted_variant_id: Optional[int] = None
    client_comment: Optional[str] = None


class OfferClientAction(BaseModel):
    variant_id: Optional[int] = None
    comment: Optional[str] = None
