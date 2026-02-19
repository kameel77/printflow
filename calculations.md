# Algorytm Kalkulacji PrintFlow MIS

Dokumentacja techniczna silnika kalkulacji (Engine) znajdującego się w `backend/app/engine/calculator.py`.

## 1. Wyznaczenie Wymiarów Brutto (Produkcyjnych)
Algorytm nie liczy kosztów na wymiarach netto podanych przez klienta. Najpierw wyznacza **wymiary brutto**, doliczając wszystkie niezbędne naddatki (spady).

- **Wymiar Netto:** Podany przez użytkownika (np. 140x110 cm).
- **Spady Produktu:** Definiowane w szablonie (`default_margin_w_cm`, `default_margin_h_cm`). Dodawane z obu stron (x2).
- **Spady Procesów:** Silnik sprawdza wszystkie wybrane procesy (np. Cięcie, Laminowanie) i wybiera **największy** wymagany naddatek dla każdego boku.
- **Wynik:** `W_gross = W_net + (Margines_Produktu * 2) + (Max_Margines_Procesów * 2)`

## 2. Algorytm Best-Fit (Dobór Materiału)
To serce systemu. Silnik szuka najtańszej opcji wykonania zlecenia spośród wszystkich dostępnych wariantów (szerokości rolek).

### Proces decyzyjny (Pętla):
Dla każdej dostępnej szerokości materiału w bazie:
1.  **Analiza Orientacji:** Silnik próbuje ułożyć produkt w dwóch wersjach: **pionowo** oraz **poziomo** (rotacja 90°).
2.  **Panelowanie (Splitting):** Jeśli produkt (w danej orientacji) jest szerszy niż rolka, silnik dzieli go na bryty.
    - Liczy `Liczba_Paneli = ceil(Szerokość_Produktu / Efektywna_Szerokość_Rolki)`.
    - Szerokość brytu = `(Szerokość_Produktu / Liczba_Paneli) + Zakładka`.
3.  **Nesting (Upakowanie):** Silnik sprawdza, ile paneli zmieści się obok siebie na szerokości rolki.
    - Jeśli rolka ma 140 cm, a panel ma 40 cm, silnik upakuje 3 panele obok siebie, znacznie oszczędzając mb materiału.
4.  **Koszty:** Sumuje metr bieżący (mb) potrzebny do wydrukowania wszystkich paneli i mnoży go przez cenę zakupu wariantu.

**Kryterium wyboru:** Silnik wybiera ten wariant i tę orientację, która generuje **najniższy koszt całkowity (COGS)**.

## 3. Wyliczenia Kosztów i Ceny (Finanse)
Po wybraniu materiału i orientacji, silnik przelicza wszystko na pieniądze:

- **COGS (Koszt Własny):**
  - Materiał: `Szerokość_Rolki * Długość_Zużyta * Cena_Zakupu_m2`.
  - Procesy: Koszt wewnętrzny procesu (np. praca maszyny).
- **Cena Netto (Dla Klienta):**
  - Materiał: `Koszt_Materiału * (1 + Marża_Materiału)`.
  - Procesy: `Ilość * Cena_Jednostkowa_Procesu` (z bazy danych).
- **Marża %:** `((Suma_Cen - Suma_Kosztów) / Suma_Cen) * 100`.

## 4. Metody Obliczania Procesów
Procesy (np. cięcie, montaż) mogą być liczone na dwa sposoby:

1.  **AREA (Powierzchnia):** Liczone od m² produktu brutto (np. laminowanie całego arkusza).
2.  **LINEAR (Obwód/Długość):** Liczone od mb (metrów bieżących). 
    - **Ważne:** W przypadku dzielenia na bryty, metoda LINEAR sumuje obwody **wszystkich paneli z osobna**, co poprawnie uwzględnia np. większą ilość cięcia przy wielu brytach.

---

## Przykład Analizy (z logów):
`[CALC] Wybrano wariant: 140.0cm, koszt: 70.07`

Przy produkcie 140x110 (netto) i spadach 1.5cm:
- Brutto: 143x113 cm.
- Silnik widzi, że 143 cm nie wejdzie na rolkę 140 cm.
- Robi rotację: 113 cm mieści się na rolce 140 cm.
- Zużywa 1.43 mb rolki 140 cm.
- Powierzchnia do zakupu: `1.4m * 1.43m = 2.002 m²`.
- Jeśli m² kosztuje 35 zł -> `2.002 * 35 = 70.07 zł` (To jest właśnie koszt z loga).
