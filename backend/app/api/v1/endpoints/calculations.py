# Calculation endpoint
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any

from app.core.database import get_db
from app.schemas.schemas import CalculationRequest, CalculationResponse
from app.engine.calculator import PrintFlowEngine

router = APIRouter()

# Mock database for local testing - replace with real DB queries
MOCK_DB = {
    "processes": {
        1: {
            "id": 1,
            "name": "Cięcie CNC",
            "method": "LINEAR",
            "unit_price": 5.0,
            "internal_cost": 2.0,
            "setup_fee": 10,
            "margin_w_cm": 0.5,
            "margin_h_cm": 0.5,
            "unit": "mb"
        },
        2: {
            "id": 2,
            "name": "Laminowanie",
            "method": "AREA",
            "unit_price": 15.0,
            "internal_cost": 8.0,
            "setup_fee": 5,
            "margin_w_cm": 0.0,
            "margin_h_cm": 0.0,
            "unit": "m2"
        }
    },
    "material_variants": {
        1: [
            {
                "id": 1,
                "material_id": 1,
                "width_cm": 100,
                "cost_price_per_unit": 20.0,
                "markup_percentage": 100.0,
                "margin_w_cm": 2.0,
                "unit": "m2"
            },
            {
                "id": 2,
                "material_id": 1,
                "width_cm": 137,
                "cost_price_per_unit": 28.0,
                "markup_percentage": 100.0,
                "margin_w_cm": 2.0,
                "unit": "m2"
            }
        ],
        2: [
            {
                "id": 3,
                "material_id": 2,
                "width_cm": 140,
                "cost_price_per_unit": 35.0,
                "markup_percentage": 80.0,
                "margin_w_cm": 1.0,
                "unit": "m2"
            }
        ]
    },
    "templates": {
        1: {
            "id": 1,
            "name": "Fototapeta Lateksowa",
            "default_margin_w_cm": 0.5,
            "default_margin_h_cm": 0.5,
            "default_overlap_cm": 1.5,
            "components": [
                {"id": 1, "name": "Papier Lateksowy", "material_id": 1, "is_required": True},
                {"id": 2, "name": "Cięcie CNC", "process_id": 1, "is_required": True}
            ]
        },
        2: {
            "id": 2,
            "name": "Tablica Magnetyczna",
            "default_margin_w_cm": 1.0,
            "default_margin_h_cm": 1.0,
            "default_overlap_cm": 2.0,
            "components": [
                {"id": 3, "name": "Folia Magnetyczna", "material_id": 2, "is_required": True},
                {"id": 4, "name": "Laminowanie", "process_id": 2, "is_required": False},
                {"id": 5, "name": "Cięcie CNC", "process_id": 1, "is_required": True}
            ]
        }
    },
    "materials": {
        1: {"id": 1, "name": "Papier Lateksowy", "category": "Papier"},
        2: {"id": 2, "name": "Folia Magnetyczna", "category": "Folia"}
    }
}


@router.post("", response_model=CalculationResponse)
async def calculate_quote(
    request: CalculationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate quote based on dimensions, template, and selected options.
    
    Returns both client view (marketing) and tech view (production) data.
    """
    try:
        engine = PrintFlowEngine(MOCK_DB)
        result = engine.run(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@router.get("/templates")
async def list_templates(
    db: AsyncSession = Depends(get_db)
):
    """List available product templates"""
    return {
        "templates": [
            {
                "id": tid,
                "name": t["name"],
                "description": f"Template with {len(t['components'])} components"
            }
            for tid, t in MOCK_DB["templates"].items()
        ]
    }


@router.get("/templates/{template_id}")
async def get_template(
    template_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get template details with components"""
    template = MOCK_DB["templates"].get(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template
