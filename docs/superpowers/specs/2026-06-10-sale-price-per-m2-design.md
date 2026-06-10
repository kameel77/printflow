# Cena sprzedaży za 1 m² produktu — design

Data: 2026-06-10 · Status: zatwierdzony przez użytkownika

## Cel

Admin ustawia na produkcie (szablonie) cenę sprzedaży netto za 1 m². Gdy ustawiona,
staje się ona faktyczną ceną oferty w kalkulatorze, a marża liczona jest jako
(cena sprzedaży − koszt wytworzenia). Operator widzi cenę/m² w widoku kalkulacji.

## Decyzje (z brainstormingu)

1. **Rola ceny:** zastępuje cenę oferty — `total_price_net = cena/m² × powierzchnia × ilość`.
   Narzuty komponentów przestają wpływać na cenę końcową (gdy cena/m² ustawiona).
2. **Powierzchnia:** wymiar **netto** zamawiany przez klienta (szer × wys / 10000 m²).
3. **Kwota:** **netto**; VAT 23% doliczany jak dotychczas.
4. **Fallback:** pole opcjonalne. Gdy puste — stare zachowanie (cena z narzutów),
   a w kalkulatorze adnotacja, że cena sprzedaży/m² nie została ustalona.
5. **Korekty wyceny:** działają bez zmian na cenę końcową; marża liczona po korektach
   (istniejąca logika frontendu).

## Zmiany

### Backend (FastAPI + SQLAlchemy + Alembic)

- `ProductTemplate.sale_price_per_m2` — `Numeric(10,2)`, nullable. Migracja Alembic.
- Schematy `ProductTemplateBase/Update` — opcjonalne pole `sale_price_per_m2 >= 0`.
- `templates.py` create: przekazanie pola.
- `calculations.py` `build_db_context`: pole w dict szablonu;
  `GET /calculate/templates/{id}`: pole w odpowiedzi (dla operatora).
- `calculator.py` (silnik): po zsumowaniu komponentów, jeśli szablon ma
  `sale_price_per_m2` (nie-None), nadpisz
  `total_price = sale_price_per_m2 × (w_net/100 × h_net/100) × qty`.
  `total_cost` (COGS) bez zmian; marża istniejącym wzorem odzwierciedli nową cenę.
  Widok techniczny komponentów bez zmian. Log w debug.
- `CalculationResponse.sale_price_per_m2: Optional[float]` — echo wartości.

### Frontend (Next.js)

- **Admin (`admin/page.tsx`, TemplateModal):** pole „Cena sprzedaży / m² (netto)",
  opcjonalne; na liście produktów wiersz „Cena: X zł/m²" gdy ustawiona.
- **Kalkulator (`Calculator.tsx`):** w boxie „Produkt i wymiary" po wyborze produktu:
  „Cena sprzedaży: X zł/m² netto" lub adnotacja
  „Cena sprzedaży za 1 m² nie została ustalona — cena liczona z narzutów składników".
  Karty Cena/Marża/Koszt bez zmian (dostają nowe wartości z backendu).

### Testy

- pytest na silniku (czysty dict context): cena z ceną/m² (price, marża),
  fallback bez ceny, wiele sztuk.
- Ręczna weryfikacja UI obu wariantów.
