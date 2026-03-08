# Database Models
from sqlalchemy import Column, Integer, String, Numeric, Boolean, DateTime, ForeignKey, Enum, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from decimal import Decimal
import enum

from app.core.database import Base


class CalculationMethod(enum.Enum):
    AREA = "AREA"
    LINEAR = "LINEAR"
    TIME = "TIME"
    UNIT = "UNIT"


class QuoteStatus(enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class OfferStatus(enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


class UserRole(enum.Enum):
    ADMIN = "ADMIN"
    SALES = "SALES"
    PRODUCTION = "PRODUCTION"


class Material(Base):
    __tablename__ = "materials"
    
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Tooltips
    tooltip_external_id = Column(String(500))
    
    variants = relationship("MaterialVariant", back_populates="material", cascade="all, delete-orphan")


class MaterialVariant(Base):
    __tablename__ = "material_variants"
    
    id = Column(Integer, primary_key=True, index=True)
    external_id = Column(String(255), index=True, nullable=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="CASCADE"))
    width_cm = Column(Numeric(10, 2))
    length_cm = Column(Numeric(10, 2))
    cost_price_per_unit = Column(Numeric(10, 2), nullable=False)
    markup_percentage = Column(Numeric(5, 2), default=Decimal("0.00"))
    unit = Column(String(10), nullable=False)  # 'm2', 'mb', 'pcs'
    margin_w_cm = Column(Numeric(10, 2), default=Decimal("0.0"))
    margin_h_cm = Column(Numeric(10, 2), default=Decimal("0.0"))
    is_active = Column(Boolean, default=True)
    
    # Tooltips
    tooltip_external_id = Column(String(500))
    tooltip_margin_w_cm = Column(String(500))
    tooltip_margin_h_cm = Column(String(500))
    tooltip_markup_percentage = Column(String(500))
    
    material = relationship("Material", back_populates="variants")


class Process(Base):
    __tablename__ = "processes"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    method = Column(Enum(CalculationMethod), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    setup_fee = Column(Numeric(10, 2), default=Decimal("0.00"))
    internal_cost = Column(Numeric(10, 2))
    margin_w_cm = Column(Numeric(10, 2), default=Decimal("0.0"))
    margin_h_cm = Column(Numeric(10, 2), default=Decimal("0.0"))
    unit = Column(String(10))
    is_active = Column(Boolean, default=True)
    
    # Tooltips
    tooltip_method = Column(String(500))
    tooltip_unit_price = Column(String(500))
    tooltip_setup_fee = Column(String(500))
    tooltip_internal_cost = Column(String(500))
    tooltip_margin_w_cm = Column(String(500))
    tooltip_margin_h_cm = Column(String(500))


class ProductTemplate(Base):
    __tablename__ = "product_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    default_margin_w_cm = Column(Numeric(10, 2), default=Decimal("0.0"))
    default_margin_h_cm = Column(Numeric(10, 2), default=Decimal("0.0"))
    default_overlap_cm = Column(Numeric(10, 2), default=Decimal("1.0"))
    max_bryt_width_cm = Column(Numeric(10, 2), nullable=True)
    is_active = Column(Boolean, default=True)
    
    # Tooltips
    tooltip_margin_w_cm = Column(String(500))
    tooltip_margin_h_cm = Column(String(500))
    tooltip_overlap_cm = Column(String(500))
    
    components = relationship("TemplateComponent", back_populates="template", cascade="all, delete-orphan")


class TemplateComponent(Base):
    __tablename__ = "template_components"
    
    id = Column(Integer, primary_key=True, index=True)
    template_id = Column(Integer, ForeignKey("product_templates.id", ondelete="CASCADE"))
    material_id = Column(Integer, ForeignKey("materials.id"))
    process_id = Column(Integer, ForeignKey("processes.id"))
    is_required = Column(Boolean, default=True)
    group_name = Column(String(100))
    option_label = Column(String(255))
    default_quantity_formula = Column(String(255))
    sort_order = Column(Integer, default=0)
    
    template = relationship("ProductTemplate", back_populates="components")
    material = relationship("Material")
    process = relationship("Process")


class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True)
    phone = Column(String(50))
    company_name = Column(String(255))
    company_nip = Column(String(20))
    company_address = Column(Text)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Quote(Base):
    __tablename__ = "quotes"
    
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(QuoteStatus), default=QuoteStatus.DRAFT)
    lead_time_raw = Column(String(255))
    total_price_net = Column(Numeric(12, 2))
    margin_value = Column(Numeric(12, 2))
    follow_up_count = Column(Integer, default=0)
    last_follow_up_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    client = relationship("Client")
    user = relationship("User")
    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    __tablename__ = "quote_items"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_id = Column(Integer, ForeignKey("quotes.id", ondelete="CASCADE"))
    product_name = Column(String(255))
    width_cm = Column(Numeric(10, 2))
    height_cm = Column(Numeric(10, 2))
    quantity = Column(Integer, default=1)
    template_id = Column(Integer, ForeignKey("product_templates.id"))
    
    quote = relationship("Quote", back_populates="items")
    components = relationship("QuoteComponent", back_populates="quote_item", cascade="all, delete-orphan")


class QuoteComponent(Base):
    __tablename__ = "quote_components"
    
    id = Column(Integer, primary_key=True, index=True)
    quote_item_id = Column(Integer, ForeignKey("quote_items.id", ondelete="CASCADE"))
    variant_id = Column(Integer, ForeignKey("material_variants.id"))
    process_id = Column(Integer, ForeignKey("processes.id"))
    
    # Snapshots
    name_snapshot = Column(String(255))
    calculated_quantity = Column(Numeric(12, 4))
    unit_price_snapshot = Column(Numeric(10, 2))
    total_price = Column(Numeric(10, 2))
    
    # Flags
    is_from_option = Column(Boolean, default=False)
    tech_margin_applied_w = Column(Numeric(10, 2))
    tech_margin_applied_h = Column(Numeric(10, 2))
    
    quote_item = relationship("QuoteItem", back_populates="components")
    variant = relationship("MaterialVariant")
    process = relationship("Process")


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255))
    role = Column(Enum(UserRole), default=UserRole.SALES)
    is_active = Column(Boolean, default=True)
    google_id = Column(String(255), unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    quotes = relationship("Quote", back_populates="user")
    offers = relationship("Offer", back_populates="user")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(255))
    target_type = Column(String(50))
    target_id = Column(Integer)
    changes = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User")


# ────────── Offer Management Models ──────────

class Offer(Base):
    __tablename__ = "offers"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(64), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(Enum(OfferStatus), default=OfferStatus.DRAFT)
    title = Column(String(500))
    internal_note = Column(Text)
    valid_until = Column(DateTime(timezone=True))
    client_comment = Column(Text)
    accepted_variant_id = Column(Integer, nullable=True)
    sent_at = Column(DateTime(timezone=True))
    viewed_at = Column(DateTime(timezone=True))
    view_count = Column(Integer, default=0)
    responded_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    client = relationship("Client")
    user = relationship("User", back_populates="offers")
    variants = relationship("OfferVariant", back_populates="offer", cascade="all, delete-orphan")
    tracking_events = relationship("OfferTracking", back_populates="offer", cascade="all, delete-orphan")


class OfferVariant(Base):
    __tablename__ = "offer_variants"
    
    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id", ondelete="CASCADE"))
    name = Column(String(255))
    is_recommended = Column(Boolean, default=False)
    template_id = Column(Integer, ForeignKey("product_templates.id"), nullable=True)
    width_cm = Column(Numeric(10, 2))
    height_cm = Column(Numeric(10, 2))
    quantity = Column(Integer)
    total_price_net = Column(Numeric(12, 2))
    total_price_gross = Column(Numeric(12, 2))
    calculation_snapshot = Column(JSON)
    sort_order = Column(Integer, default=0)
    
    offer = relationship("Offer", back_populates="variants")
    components = relationship("OfferVariantComponent", back_populates="variant", cascade="all, delete-orphan")


class OfferVariantComponent(Base):
    __tablename__ = "offer_variant_components"
    
    id = Column(Integer, primary_key=True, index=True)
    variant_id = Column(Integer, ForeignKey("offer_variants.id", ondelete="CASCADE"))
    name_snapshot = Column(String(255))
    type = Column(String(20))  # MATERIAL / PROCESS / ADJUSTMENT
    quantity = Column(Numeric(12, 4))
    unit = Column(String(20))
    unit_price = Column(Numeric(10, 2))
    total_price = Column(Numeric(10, 2))
    visible_to_client = Column(Boolean, default=True)
    
    variant = relationship("OfferVariant", back_populates="components")


class OfferTracking(Base):
    __tablename__ = "offer_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers.id", ondelete="CASCADE"))
    event_type = Column(String(50))  # EMAIL_OPENED, LINK_CLICKED, ACCEPTED, REJECTED
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    offer = relationship("Offer", back_populates="tracking_events")
