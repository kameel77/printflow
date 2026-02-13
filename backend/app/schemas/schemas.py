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
    category: Optional[str] = None
    description: Optional[str] = None


class MaterialVariantBase(BaseModel):
    width_cm: Optional[Decimal] = None
    length_cm: Optional[Decimal] = None
    cost_price_per_unit: Decimal
    markup_percentage: Decimal = Decimal("0.00")
    unit: str
    margin_w_cm: Decimal = Decimal("0.0")
    margin_h_cm: Decimal = Decimal("0.0")
    is_active: bool = True


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
    is_active: bool = True


class ProductTemplateCreate(ProductTemplateBase):
    components: List[TemplateComponentCreate] = []


class ProductTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_margin_w_cm: Optional[Decimal] = None
    default_margin_h_cm: Optional[Decimal] = None
    default_overlap_cm: Optional[Decimal] = None
    is_active: Optional[bool] = None
    components: Optional[List[TemplateComponentCreate]] = None


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
    company_details: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientResponse(ClientBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
