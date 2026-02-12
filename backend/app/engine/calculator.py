# Calculation Engine - The Core
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Optional, Any
import math
from pydantic import BaseModel

from app.schemas.schemas import (
    CalculationRequest, 
    CalculationResponse, 
    ComponentResult,
    CalculationMethod
)


class PrintFlowEngine:
    """Core calculation engine for PrintFlow MIS
    
    Implements:
    - Best-Fit algorithm for material selection
    - Automatic paneling (splitting) with overlap
    - Hierarchical margins (Product > Process > Material)
    - COGS and margin calculation
    """
    
    def __init__(self, db_context: Dict):
        self.db = db_context
    
    def _q(self, val: Any) -> Decimal:
        """Convert to Decimal for financial precision"""
        return Decimal(str(val)).quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)
    
    def _money(self, val: Decimal) -> float:
        """Final rounding to currency"""
        return float(val.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    
    def resolve_gross_dimensions(
        self, 
        req: CalculationRequest, 
        template: Optional[Dict]
    ) -> tuple[Decimal, Decimal]:
        """Calculate production dimensions including all margins"""
        w_net = self._q(req.width_cm)
        h_net = self._q(req.height_cm)
        
        # Product margins
        p_margin_w = self._q(template.get('default_margin_w_cm', 0)) if template else Decimal("0")
        p_margin_h = self._q(template.get('default_margin_h_cm', 0)) if template else Decimal("0")
        
        # Max process margins
        max_proc_w = Decimal("0")
        max_proc_h = Decimal("0")
        
        if template:
            for comp in template.get('components', []):
                if comp.get('process_id'):
                    proc = self.db.get('processes', {}).get(comp['process_id'])
                    if proc:
                        max_proc_w = max(max_proc_w, self._q(proc.get('margin_w_cm', 0)))
                        max_proc_h = max(max_proc_h, self._q(proc.get('margin_h_cm', 0)))
        
        w_gross = w_net + (p_margin_w * 2) + (max_proc_w * 2)
        h_gross = h_net + (p_margin_h * 2) + (max_proc_h * 2)
        
        return w_gross, h_gross
    
    def calculate_nesting_and_splitting(
        self,
        w_g: Decimal,
        h_g: Decimal,
        qty: int,
        material_id: int,
        overlap: Decimal
    ) -> Optional[Dict]:
        """Best-Fit algorithm: select optimal material variant"""
        variants = self.db.get('material_variants', {}).get(material_id, [])
        best_v = None
        min_total_cost = Decimal("Infinity")
        
        for v in variants:
            v_width = self._q(v['width_cm'])
            effective_v_w = v_width - (self._q(v.get('margin_w_cm', 0)) * 2)
            
            # Splitting logic
            if w_g > effective_v_w:
                num_p = math.ceil(w_g / effective_v_w)
                panel_w = (w_g / num_p) + overlap
            else:
                num_p = 1
                panel_w = w_g
            
            # Nesting logic
            panels_side_by_side = math.floor(effective_v_w / panel_w)
            if panels_side_by_side == 0:
                continue
            
            total_panels = num_p * qty
            rows = math.ceil(total_panels / panels_side_by_side)
            total_len_cm = rows * h_g
            
            # Cost calculation
            area_m2 = (v_width / 100) * (total_len_cm / 100)
            cost = area_m2 * self._q(v['cost_price_per_unit'])
            
            if cost < min_total_cost:
                min_total_cost = cost
                best_v = {
                    **v,
                    "num_p": num_p,
                    "total_len": total_len_cm,
                    "area": area_m2,
                    "panel_w": panel_w,
                    "cost": cost
                }
        
        return best_v
    
    def run(self, req: CalculationRequest) -> CalculationResponse:
        """Main calculation entry point"""
        template = self.db.get('templates', {}).get(req.template_id) if req.template_id else None
        
        # Resolve overlap
        if req.overlap_override_cm is not None:
            overlap = self._q(req.overlap_override_cm)
        else:
            overlap = self._q(template.get('default_overlap_cm', 2.0)) if template else Decimal("2.0")
        
        # Calculate gross dimensions
        w_g, h_g = self.resolve_gross_dimensions(req, template)
        
        tech_view = []
        total_price = Decimal("0")
        total_cost = Decimal("0")
        is_split = False
        num_panels = 1
        
        # Get active components
        active_comps = []
        if template:
            for c in template.get('components', []):
                if c.get('is_required', True) or c['id'] in req.selected_options:
                    active_comps.append(c)
        
        # Process components
        for comp in active_comps:
            if comp.get('material_id'):
                res = self.calculate_nesting_and_splitting(
                    w_g, h_g, req.quantity, comp['material_id'], overlap
                )
                
                if not res:
                    raise ValueError(
                        f"Material {comp.get('name', 'Unknown')} too narrow for {w_g}cm"
                    )
                
                is_split = res['num_p'] > 1
                num_panels = res['num_p']
                
                price = res['cost'] * (1 + self._q(res['markup_percentage']) / 100)
                
                total_cost += res['cost']
                total_price += price
                
                tech_view.append(ComponentResult(
                    name=f"{comp.get('name', 'Material')} (Rolka {res['width_cm']}cm)",
                    type="MATERIAL",
                    qty=float(res['area']),
                    unit="m2",
                    price_net=self._money(price),
                    details=f"Bryty: {num_panels}, Zakładka: {overlap}cm, Szer. brytu: {res['panel_w']:.1f}cm"
                ))
            
            elif comp.get('process_id'):
                proc = self.db.get('processes', {}).get(comp['process_id'])
                if not proc:
                    continue
                
                # Calculate process quantity
                if proc['method'] == CalculationMethod.LINEAR:
                    panel_w_with_overlap = (w_g / num_panels) + (overlap if is_split else 0)
                    p_qty = (2 * (panel_w_with_overlap + h_g)) / 100 * num_panels * req.quantity
                else:  # AREA
                    p_qty = (w_g / 100) * (h_g / 100) * req.quantity
                
                cost = (p_qty * self._q(proc.get('internal_cost', 0))) + self._q(proc.get('setup_fee', 0))
                price = (p_qty * self._q(proc['unit_price'])) + self._q(proc.get('setup_fee', 0))
                
                total_cost += cost
                total_price += price
                
                tech_view.append(ComponentResult(
                    name=proc['name'],
                    type="PROCESS",
                    qty=float(p_qty),
                    unit=proc.get('unit', 'szt'),
                    price_net=self._money(price),
                    details=f"Metoda: {proc['method']}, Naddatek: {proc.get('margin_w_cm', 0)}cm"
                ))
        
        # Calculate margin
        margin_pct = ((total_price - total_cost) / total_price * 100) if total_price > 0 else Decimal("0")
        
        return CalculationResponse(
            total_price_net=self._money(total_price),
            total_cost_cogs=self._money(total_cost),
            margin_percentage=float(margin_pct.quantize(Decimal("0.1"))),
            gross_dimensions={"width": float(w_g), "height": float(h_g)},
            is_split=is_split,
            num_panels=num_panels,
            overlap_used_cm=float(overlap),
            client_view=[{
                "desc": template.get('name', 'Produkt Ad Hoc') if template else 'Produkt Ad Hoc',
                "qty": req.quantity,
                "total": self._money(total_price)
            }],
            tech_view=tech_view
        )
