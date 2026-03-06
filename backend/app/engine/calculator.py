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
        overlap: Decimal,
        quantity: int
    ) -> PanelMethodResult:
        """Standard method: equal-width panels, same for every product"""
        if w_g <= effective_roll_w:
            panels = [PanelInfo(width_cm=float(w_g), height_cm=float(h_g), quantity=1 * quantity)]
            waste_cm2 = (effective_roll_w - w_g) * h_g * quantity
            return PanelMethodResult(
                method="standard",
                panels=panels,
                total_waste_m2=round(float(waste_cm2) / 10000, 2),
                num_panels=1 * quantity
            )
        
        num_p = math.ceil(float(w_g / effective_roll_w))
        # Zakładka tylko gdy > 1 bryt
        panel_w = (w_g / num_p) + (overlap if num_p > 1 else Decimal("0"))
        panels = [PanelInfo(width_cm=float(panel_w), height_cm=float(h_g), quantity=num_p * quantity)]
        waste_per_panel_cm2 = max(Decimal("0"), (effective_roll_w - panel_w) * h_g)
        total_waste_cm2 = waste_per_panel_cm2 * num_p * quantity
        return PanelMethodResult(
            method="standard",
            panels=panels,
            total_waste_m2=round(float(total_waste_cm2) / 10000, 2),
            num_panels=num_p * quantity
        )
    
    def calculate_panels_effective(
        self,
        w_g: Decimal,
        h_g: Decimal,
        effective_roll_w: Decimal,
        overlap: Decimal,
        quantity: int
    ) -> PanelMethodResult:
        """Effective method: variable-width panels that minimize waste.
        
        Simulates production sequentially across all products (quantity).
        After each product, tracks leftover roll width and reuses it
        for the next product's first panel when possible.
        """
        all_panels: list[PanelInfo] = []
        total_waste_cm2 = Decimal("0")
        total_panel_count = 0
        leftover_w = Decimal("0")  # leftover width from previous product's last roll
        
        for product_idx in range(quantity):
            remaining_w = w_g
            product_panels: list[PanelInfo] = []
            is_first_panel_of_product = True
            
            while remaining_w > Decimal("0"):
                if is_first_panel_of_product and leftover_w > Decimal("0"):
                    # Try to use leftover from previous product's roll
                    if leftover_w >= remaining_w:
                        # Entire remaining width fits on leftover roll
                        actual_w = remaining_w
                        new_leftover = leftover_w - actual_w
                        total_waste_cm2 += Decimal("0")  # no waste, leftover continues
                        product_panels.append(PanelInfo(width_cm=float(actual_w), height_cm=float(h_g), quantity=1))
                        total_panel_count += 1
                        leftover_w = new_leftover
                        remaining_w = Decimal("0")
                    else:
                        # Leftover roll is not enough for remaining width, use what we can
                        actual_w = leftover_w
                        product_panels.append(PanelInfo(width_cm=float(actual_w), height_cm=float(h_g), quantity=1))
                        total_panel_count += 1
                        remaining_w -= (leftover_w - overlap)  # overlap for joining
                        leftover_w = Decimal("0")
                        # no waste from this leftover — we used it all
                    is_first_panel_of_product = False
                elif remaining_w <= effective_roll_w:
                    # Last panel — fits on one new roll
                    actual_w = remaining_w + (overlap if not is_first_panel_of_product else Decimal("0"))
                    leftover_w = effective_roll_w - actual_w
                    # The leftover is NOT waste — it can be used for the next product
                    product_panels.append(PanelInfo(width_cm=float(actual_w), height_cm=float(h_g), quantity=1))
                    total_panel_count += 1
                    remaining_w = Decimal("0")
                    is_first_panel_of_product = False
                else:
                    # Full-width panel — use entire effective roll width
                    actual_w = effective_roll_w
                    product_panels.append(PanelInfo(width_cm=float(actual_w), height_cm=float(h_g), quantity=1))
                    total_panel_count += 1
                    remaining_w -= (effective_roll_w - overlap)
                    leftover_w = Decimal("0")
                    is_first_panel_of_product = False
            
            all_panels.extend(product_panels)
        
        # After all products, the final leftover is waste (nothing more to produce)
        total_waste_cm2 += leftover_w * h_g
        
        # Aggregate panels with same dimensions
        aggregated = self._aggregate_panels(all_panels)
        
        return PanelMethodResult(
            method="wycena_masowa",
            panels=aggregated,
            total_waste_m2=round(float(total_waste_cm2) / 10000, 2),
            num_panels=total_panel_count
        )
    
    def calculate_panels_efektywna(
        self,
        w_g: Decimal,
        h_g: Decimal,
        roll_width: Decimal,
        variant_margin_w: Decimal,
        overlap: Decimal,
        quantity: int,
        max_bryt_width_cm: Optional[Decimal] = None,
    ) -> PanelMethodResult:
        """Metoda Efektywna: minimalizacja odpadu metodą pełnych brytów.

        Zasady:
        - 1 bryt: brak zakładki, odpad = (roll - w_g) * h_g.
        - >1 bryt: każdy pełny bryt zajmuje całą szer. rolki;
          ostatni bryt = pozostałość + 2*margin + zakładka;
          odpad tylko z ostatniego brytu.
        - max_bryt_width_cm ogranicza fizyczną szer. brytu.
        """
        effective_roll_w = roll_width - (variant_margin_w * 2)  # fizycznie dostępne
        usable_bryt_w = effective_roll_w
        if max_bryt_width_cm and max_bryt_width_cm > Decimal("0"):
            usable_bryt_w = min(usable_bryt_w, max_bryt_width_cm)

        # --- 1-bryt case: cały produkt mieści się na jednej rolce ---
        if w_g <= usable_bryt_w:
            waste_w = effective_roll_w - w_g
            total_waste = waste_w * h_g * quantity
            return PanelMethodResult(
                method="efektywna",
                panels=[PanelInfo(width_cm=float(w_g), height_cm=float(h_g), quantity=quantity)],
                total_waste_m2=round(float(total_waste) / 10000, 4),
                num_panels=quantity,
            )

        # --- >1 bryt: kalkulacja wzorca dla 1 egzemplarza ---
        # Ile druku mieści się na 1 pełnym brycie (effective - zakładka)
        max_print_per_full_bryt = usable_bryt_w - overlap

        panel_physical_widths: list[Decimal] = []
        remaining = w_g

        while remaining > Decimal("0"):
            if remaining <= max_print_per_full_bryt:
                # Ostatni bryt: rzeczywisty druk + 2*margines + zakładka
                last_physical = remaining + (variant_margin_w * 2) + overlap
                panel_physical_widths.append(last_physical)
                remaining = Decimal("0")
            else:
                # Pełny bryt: zajmuje całą szer. rolki (usable_bryt_w)
                panel_physical_widths.append(usable_bryt_w)
                remaining -= max_print_per_full_bryt

        # Odpad: tylko z ostatniego brytu (roll_width - last_bryt_physical)
        last_physical_w = panel_physical_widths[-1]
        waste_per_product = max(Decimal("0"), roll_width - last_physical_w) * h_g
        total_waste = waste_per_product * quantity

        # Buduj listę paneli (pattern × quantity)
        all_widths = panel_physical_widths * quantity
        aggregated = self._aggregate_panels([
            PanelInfo(width_cm=float(w.quantize(Decimal("0.01"))), height_cm=float(h_g), quantity=1)
            for w in all_widths
        ])

        return PanelMethodResult(
            method="efektywna",
            panels=aggregated,
            total_waste_m2=round(float(total_waste) / 10000, 4),
            num_panels=len(all_widths),
        )

    def _select_optimal_variant_efektywna(
        self,
        w_g: Decimal,
        h_g: Decimal,
        material_id: int,
        overlap: Decimal,
        quantity: int,
        max_bryt_width_cm: Optional[Decimal],
    ) -> Optional[tuple[dict, PanelMethodResult]]:
        """Wybiera wariant materiału z najmniejszym odpadem (metoda efektywna).
        Remis w odpadzie: wygrywa wariant z mniejszą liczbą brytów.
        """
        variants = self.db.get('material_variants', {}).get(material_id, [])
        best_variant = None
        best_result: Optional[PanelMethodResult] = None

        for v in variants:
            if not v.get('width_cm'):
                continue
            roll_w = self._q(v['width_cm'])
            margin_w = self._q(v.get('margin_w_cm', 0))
            result = self.calculate_panels_efektywna(
                w_g, h_g, roll_w, margin_w, overlap, quantity, max_bryt_width_cm
            )
            if best_result is None:
                best_variant, best_result = v, result
                continue
            # Mniejszy odpad wygrywa; remis -> mniej brytów
            if (result.total_waste_m2 < best_result.total_waste_m2 or
                    (result.total_waste_m2 == best_result.total_waste_m2 and
                     result.num_panels < best_result.num_panels)):
                best_variant, best_result = v, result

        return (best_variant, best_result) if best_variant else None

    def _aggregate_panels(self, panels: list[PanelInfo]) -> list[PanelInfo]:
        """Aggregate panels with the same dimensions, summing quantities."""
        size_map: dict[tuple[float, float], int] = {}
        for p in panels:
            key = (round(p.width_cm, 1), round(p.height_cm, 1))
            size_map[key] = size_map.get(key, 0) + p.quantity
        return [
            PanelInfo(width_cm=w, height_cm=h, quantity=qty)
            for (w, h), qty in size_map.items()
        ]
    
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
                    details=f"Bryty: {num_panels}, Zakładka: {overlap}cm" + (f" (stosowana)" if num_panels > 1 else " (brak – 1 bryt)") + f", Szer. brytu: {res['panel_w']:.1f}cm, Rotacja: {rot_text}",
                    is_rotated=rotated_flag
                ))
            
            elif comp.get('process_id'):
                proc = self.db.get('processes', {}).get(comp['process_id'])
                if not proc:
                    continue
                
                # Calculate process quantity using the active orientation
                if proc['method'] == CalculationMethod.LINEAR:
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
        
        # --- Metody kalkulacji brytów dla materiału głównego ---
        panel_methods = []
        max_bryt_cm = self._q(template.get('max_bryt_width_cm', 0)) if template and template.get('max_bryt_width_cm') else None

        for comp in active_comps:
            if comp.get('material_id'):
                res = self.calculate_nesting_and_splitting(
                    w_g, h_g, req.quantity, comp['material_id'], overlap
                )
                if res:
                    v_width = self._q(res['width_cm'])
                    effective_v_w = v_width - (self._q(res.get('margin_w_cm', 0)) * 2)

                    # Metoda standardowa
                    std = self.calculate_panels_standard(cur_w_g, cur_h_g, effective_v_w, overlap, req.quantity)
                    self.log(f"--- METODA STANDARDOWA ({res['width_cm']}cm rolka, {req.quantity} szt.) ---")
                    for p in std.panels:
                        self.log(f"  Ilość: {p.quantity}, Rozmiar: {p.width_cm:.1f}×{p.height_cm:.1f} cm")
                    self.log(f"  Łączna liczba brytów: {std.num_panels}")
                    self.log(f"  Odpad: {std.total_waste_m2} m²")

                    # Wycena masowa (poprzednia metoda efektywna)
                    eff = self.calculate_panels_effective(cur_w_g, cur_h_g, effective_v_w, overlap, req.quantity)
                    self.log(f"--- WYCENA MASOWA ({res['width_cm']}cm rolka, {req.quantity} szt.) ---")
                    for p in eff.panels:
                        self.log(f"  Ilość: {p.quantity}, Rozmiar: {p.width_cm:.1f}×{p.height_cm:.1f} cm")
                    self.log(f"  Łączna liczba brytów: {eff.num_panels}")
                    self.log(f"  Odpad: {eff.total_waste_m2} m²")

                    # Metoda efektywna: optymalny wybór wariantu
                    eff2_opt = self._select_optimal_variant_efektywna(
                        cur_w_g, cur_h_g, comp['material_id'], overlap, req.quantity, max_bryt_cm
                    )
                    if eff2_opt:
                        optimal_v, eff2 = eff2_opt
                        self.log(f"--- METODA EFEKTYWNA (optymalna rolka: {optimal_v['width_cm']}cm, {req.quantity} szt.) ---")
                        if max_bryt_cm:
                            self.log(f"  Max szerokość brytu: {max_bryt_cm:.1f} cm")
                        for p in eff2.panels:
                            self.log(f"  Ilość: {p.quantity}, Rozmiar: {p.width_cm:.2f}×{p.height_cm:.1f} cm")
                        self.log(f"  Łączna liczba brytów: {eff2.num_panels}")
                        self.log(f"  Odpad: {eff2.total_waste_m2} m²")
                        panel_methods = [std, eff, eff2]
                    else:
                        panel_methods = [std, eff]
                break
        
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

