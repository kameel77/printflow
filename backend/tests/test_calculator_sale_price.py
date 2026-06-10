import pytest

from app.engine.calculator import PrintFlowEngine
from app.schemas.schemas import CalculationRequest


def make_db_context(sale_price_per_m2=None):
    """Template with a single AREA process: unit_price 10, internal_cost 5, no margins."""
    return {
        "processes": {
            1: {
                "id": 1,
                "name": "Druk testowy",
                "method": "AREA",
                "unit_price": 10.0,
                "internal_cost": 5.0,
                "setup_fee": 0.0,
                "markup_percentage": 0.0,
                "margin_w_cm": 0.0,
                "margin_h_cm": 0.0,
                "unit": "m2",
                "labor_entries": [],
            }
        },
        "materials": {},
        "material_variants": {},
        "templates": {
            1: {
                "id": 1,
                "name": "Produkt testowy",
                "default_margin_w_cm": 0.0,
                "default_margin_h_cm": 0.0,
                "default_overlap_cm": 1.0,
                "max_bryt_width_cm": None,
                "sale_price_per_m2": sale_price_per_m2,
                "labor_entries": [],
                "components": [
                    {"id": 1, "is_required": True, "process_id": 1, "name": "Druk testowy"}
                ],
            }
        },
        "labor_rate_settings": {},
    }


def run_engine(sale_price_per_m2, width=100, height=100, quantity=1):
    engine = PrintFlowEngine(make_db_context(sale_price_per_m2))
    req = CalculationRequest(
        width_cm=width, height_cm=height, quantity=quantity, template_id=1
    )
    return engine.run(req)


def test_fallback_without_sale_price():
    """No sale price set -> price comes from component markups (old behavior)."""
    res = run_engine(None)
    assert res.total_price_net == 10.0  # 1 m² × 10 PLN/m² unit_price
    assert res.total_cost_cogs == 5.0
    assert res.margin_percentage == 50.0
    assert res.sale_price_per_m2 is None


def test_sale_price_overrides_total_price():
    """Sale price set -> total_price = price/m² × net area × qty."""
    res = run_engine(40.0)
    assert res.total_price_net == 40.0  # 40 PLN/m² × 1 m² × 1 szt.
    assert res.total_cost_cogs == 5.0  # COGS unchanged
    assert res.margin_percentage == 87.5  # (40 - 5) / 40
    assert res.sale_price_per_m2 == 40.0


def test_sale_price_uses_net_area_and_quantity():
    """120×90 cm, 2 szt. -> 1.08 m² × 2 × 40 PLN."""
    res = run_engine(40.0, width=120, height=90, quantity=2)
    assert res.total_price_net == pytest.approx(40.0 * 1.08 * 2)  # 86.40
    assert res.sale_price_per_m2 == 40.0


def test_sale_price_ignores_product_margins_for_price():
    """Production margins increase gross dims (cost) but price uses net dims."""
    ctx = make_db_context(40.0)
    ctx["templates"][1]["default_margin_w_cm"] = 2.5
    ctx["templates"][1]["default_margin_h_cm"] = 2.5
    engine = PrintFlowEngine(ctx)
    req = CalculationRequest(width_cm=100, height_cm=100, quantity=1, template_id=1)
    res = engine.run(req)
    assert res.total_price_net == 40.0  # net 1 m², not gross 1.1025 m²
    assert res.total_cost_cogs == 5.51  # cost on gross area (5.5125 rounded to grosze)
