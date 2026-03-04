# Calculation Engine - The Core
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Optional, Any
import math
from pydantic import BaseModel

from app.schemas.schemas import (
    CalculationRequest, 
    CalculationResponse, 
    ComponentResult,
    CalculationMethod,
    PanelInfo,
    PanelMethodResult
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
        self.logs: List[str] = []
    
    def log(self, msg: str):
        """Add log message"""
        print(f"[CALC] {msg}")
        self.logs.append(msg)
    
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
        self.log(f"Wymiary netto: {w_net:.2f}x{h_net:.2f} cm")
        
        # Product margins
        p_margin_w = self._q(template.get('default_margin_w_cm', 0)) if template else Decimal("0")
        p_margin_h = self._q(template.get('default_margin_h_cm', 0)) if template else Decimal("0")
        self.log(f"Spady produktu: {p_margin_w:.2f}x{p_margin_h:.2f} cm")
        
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
        
        self.log(f"Max spady procesu: {max_proc_w:.2f}x{max_proc_h:.2f} cm")
        w_gross = w_net + (p_margin_w * 2) + (max_proc_w * 2)
        h_gross = h_net + (p_margin_h * 2) + (max_proc_h * 2)
        
        self.log(f"Wymiary brutto (produkcyjne): {w_gross:.2f}x{h_gross:.2f} cm")
        return w_gross, h_gross
    
    def calculate_nesting_and_splitting(
        self,
        w_g: Decimal,
        h_g: Decimal,
        qty: int,
        material_id: int,
        overlap: Decimal
    ) -> Optional[Dict]:
        """Best-Fit algorithm: select optimal material variant and orientation"""
        variants = self.db.get('material_variants', {}).get(material_id, [])
        best_v = None
        min_total_cost = Decimal("Infinity")
        
        
        self.log(f"Szukanie materiału {material_id} dla wymiaru {w_g:.2f}x{h_g:.2f} cm, ilość: {qty}, zakładka: {overlap:.2f} cm")
        
        # Try both orientations to find the most efficient fit
        orientations = [(w_g, h_g)]
        if w_g != h_g:
            orientations.append((h_g, w_g))
            
        for cur_w, cur_h in orientations:
            for v in variants:
                v_width = self._q(v['width_cm'])
                effective_v_w = v_width - (self._q(v.get('margin_w_cm', 0)) * 2)
                
                # Splitting logic
                if cur_w > effective_v_w:
                    num_p = math.ceil(cur_w / effective_v_w)
                    panel_w = (cur_w / num_p) + overlap
                else:
                    num_p = 1
                    panel_w = cur_w
                
                # Nesting logic
                panels_side_by_side = math.floor(effective_v_w / panel_w)
                if panels_side_by_side == 0:
                    continue
                
                total_panels = num_p * qty
                rows = math.ceil(total_panels / panels_side_by_side)
                total_len_cm = rows * cur_h
                
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
                        "cost": cost,
                        "used_w": cur_w,
                        "used_h": cur_h,
                        "is_rotated": cur_w == h_g and cur_h == w_g and w_g != h_g
                    }
        
        return best_v
    
    def calculate_panels_standard(
        self,
        w_g: Decimal,
        h_g: Decimal,
        effective_roll_w: Decimal,
        overlap: Decimal
    ) -> PanelMethodResult:
        """Standard method: equal-width panels"""
        if w_g <= effective_roll_w:
            panels = [PanelInfo(width_cm=float(w_g), height_cm=float(h_g), quantity=1)]
            waste = float((effective_roll_w - w_g) * h_g)
            return PanelMethodResult(method="standard", panels=panels, total_waste_cm2=waste, num_panels=1)
        
        num_p = math.ceil(float(w_g / effective_roll_w))
        panel_w = (w_g / num_p) + overlap
        panels = [PanelInfo(width_cm=float(panel_w), height_cm=float(h_g), quantity=num_p)]
        waste_per_panel = float(effective_roll_w - panel_w)
        total_waste = waste_per_panel * num_p * float(h_g)
        return PanelMethodResult(method="standard", panels=panels, total_waste_cm2=max(0, total_waste), num_panels=num_p)
    
    def calculate_panels_effective(
        self,
        w_g: Decimal,
        h_g: Decimal,
        effective_roll_w: Decimal,
        overlap: Decimal
    ) -> PanelMethodResult:
        """Effective method: variable-width panels that minimize waste.
        
        First panel uses maximum roll width, subsequent panels use the
        remaining width. This leaves larger leftover strips from the last
        roll for future production use.
        """
        if w_g <= effective_roll_w:
            panels = [PanelInfo(width_cm=float(w_g), height_cm=float(h_g), quantity=1)]
            waste = float((effective_roll_w - w_g) * h_g)
            return PanelMethodResult(method="effective", panels=panels, total_waste_cm2=waste, num_panels=1)
        
        panels: list[PanelInfo] = []
        remaining_w = w_g
        total_waste = Decimal("0")
        panel_count = 0
        
        while remaining_w > Decimal("0"):
            if remaining_w <= effective_roll_w:
                # Last panel — fits on one roll, add overlap only if not the first panel
                actual_w = remaining_w + (overlap if panel_count > 0 else Decimal("0"))
                waste_this = (effective_roll_w - actual_w) * h_g
                total_waste += max(Decimal("0"), waste_this)
                panels.append(PanelInfo(width_cm=float(actual_w), height_cm=float(h_g), quantity=1))
                panel_count += 1
                remaining_w = Decimal("0")
            else:
                # Full-width panel — use entire effective roll width
                actual_w = effective_roll_w
                panels.append(PanelInfo(width_cm=float(actual_w), height_cm=float(h_g), quantity=1))
                panel_count += 1
                # Subtract used width, accounting for overlap on the next panel
                remaining_w -= (effective_roll_w - overlap)
        
        return PanelMethodResult(method="effective", panels=panels, total_waste_cm2=float(max(Decimal("0"), total_waste)), num_panels=panel_count)
    
    def run(self, req: CalculationRequest) -> CalculationResponse:
        """Main calculation entry point"""
        template = self.db.get('templates', {}).get(req.template_id) if req.template_id else None
        
        # Resolve overlap
        if req.overlap_override_cm is not None:
            overlap = self._q(req.overlap_override_cm)
        else:
            overlap = self._q(template.get('default_overlap_cm', 2.0)) if template else Decimal("2.0")
        
        self.log(f"--- START KALKULACJI: {template.get('name') if template else 'Brak szablonu'} ---")
        self.log(f"Zakładka przyjęta do kalkulacji: {overlap:.2f} cm")
        
        # Calculate gross dimensions
        w_g, h_g = self.resolve_gross_dimensions(req, template)
        
        tech_view = []
        total_price = Decimal("0")
        total_cost = Decimal("0")
        is_split = False
        num_panels = 1
        
        # Dimensions used for calculation (may be swapped if auto-rotated)
        cur_w_g, cur_h_g = w_g, h_g
        
        # Get active components
        active_comps = []
        if template:
            for c in template.get('components', []):
                if c.get('is_required', True) or c['id'] in req.selected_options:
                    active_comps.append(c)
        
        # Process materials first to establish orientation
        # (In a more complex engine, we'd pre-calculate the best orientation for all materials)
        for comp in active_comps:
            if comp.get('material_id'):
                res = self.calculate_nesting_and_splitting(
                    w_g, h_g, req.quantity, comp['material_id'], overlap
                )
                
                if not res:
                    raise ValueError(
                        f"Material {comp.get('name', 'Unknown')} too narrow for {w_g}cm"
                    )
                
                # Update orientation based on the best fit found
                is_split = res['num_p'] > 1
                num_panels = res['num_p']
                cur_w_g = res['used_w']
                cur_h_g = res['used_h']
                
                price = res['cost'] * (1 + self._q(res['markup_percentage']) / 100)
                self.log(f"Wybrano wariant: {res.get('width_cm'):.1f}cm, koszt: {res['cost']:.2f} | Cena: {price:.2f}")
                
                total_cost += res['cost']
                total_price += price
                
                rotated_flag = res.get('is_rotated', False)
                rot_text = "tak" if rotated_flag else "nie"

                tech_view.append(ComponentResult(
                    name=f"{comp.get('name', 'Material')} (Rolka {res['width_cm']}cm)",
                    type="MATERIAL",
                    qty=float(res['area']),
                    unit="m2",
                    price_net=self._money(price),
                    details=f"Bryty: {num_panels}, Zakładka: {overlap}cm, Szer. brytu: {res['panel_w']:.1f}cm, Rotacja: {rot_text}",
                    is_rotated=rotated_flag
                ))
            
            elif comp.get('process_id'):
                proc = self.db.get('processes', {}).get(comp['process_id'])
                if not proc:
                    continue
                
                # Calculate process quantity using the active orientation
                if proc['method'] == CalculationMethod.LINEAR:
                    # For linear, we sum perimeters of all panels
                    panel_w_with_overlap = (cur_w_g / num_panels) + (overlap if is_split else 0)
                    p_qty = (2 * (panel_w_with_overlap + cur_h_g)) / 100 * num_panels * req.quantity
                else:  # AREA
                    p_qty = (cur_w_g / 100) * (cur_h_g / 100) * req.quantity
                
                cost = (p_qty * self._q(proc.get('internal_cost', 0))) + self._q(proc.get('setup_fee', 0))
                price = (p_qty * self._q(proc['unit_price'])) + self._q(proc.get('setup_fee', 0))
                
                total_cost += cost
                total_price += price
                
                self.log(f"Proces {proc['name']}: {p_qty:.2f} {proc.get('unit')} | Koszt: {cost:.2f} | Cena: {price:.2f}")

                rotated_flag = cur_w_g == h_g and cur_h_g == w_g and w_g != h_g
                rot_text = "tak" if rotated_flag else "nie"

                tech_view.append(ComponentResult(
                    name=proc['name'],
                    type="PROCESS",
                    qty=float(p_qty),
                    unit=proc.get('unit', 'szt'),
                    price_net=self._money(price),
                    details=f"Metoda: {proc['method']}, Naddatek: {proc.get('margin_w_cm', 0)}cm, Rotacja: {rot_text}",
                    is_rotated=rotated_flag
                ))
        
        # Calculate margin
        margin_pct = ((total_price - total_cost) / total_price * 100) if total_price > 0 else Decimal("0")
        
        # Calculate panel methods (standard + effective) for the primary material
        panel_methods = []
        # Find the effective roll width from the best material variant found
        for comp in active_comps:
            if comp.get('material_id'):
                res = self.calculate_nesting_and_splitting(
                    w_g, h_g, req.quantity, comp['material_id'], overlap
                )
                if res:
                    v_width = self._q(res['width_cm'])
                    effective_v_w = v_width - (self._q(res.get('margin_w_cm', 0)) * 2)
                    
                    std = self.calculate_panels_standard(cur_w_g, cur_h_g, effective_v_w, overlap)
                    eff = self.calculate_panels_effective(cur_w_g, cur_h_g, effective_v_w, overlap)
                    panel_methods = [std, eff]
                    
                    self.log(f"--- METODA STANDARDOWA ({res['width_cm']}cm rolka) ---")
                    for p in std.panels:
                        self.log(f"  Ilość: {p.quantity}, Rozmiar: {p.width_cm:.1f}×{p.height_cm:.1f} cm")
                    self.log(f"  Odpad: {std.total_waste_cm2:.0f} cm²")
                    
                    self.log(f"--- METODA EFEKTYWNA ({res['width_cm']}cm rolka) ---")
                    for p in eff.panels:
                        self.log(f"  Ilość: {p.quantity}, Rozmiar: {p.width_cm:.1f}×{p.height_cm:.1f} cm")
                    self.log(f"  Odpad: {eff.total_waste_cm2:.0f} cm²")
                break  # Only use the first (primary) material
        
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
            tech_view=tech_view,
            panel_methods=panel_methods,
            debug=self.logs
        )

