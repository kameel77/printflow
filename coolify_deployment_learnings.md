# PrintFlow — Deployment & Operations Guide

> **Cel**: Kompletny drogowskaz dla developera i AI agenta — jak działa deployment, jak zarządzać bazą danych, jak dodawać zmiany schematu, i jak rozwiązywać typowe problemy.

---

## Spis treści
1. [Architektura i infrastruktura](#1-architektura-i-infrastruktura)
2. [Networking — Coolify + Traefik](#2-networking--coolify--traefik)
3. [Baza danych (PostgreSQL)](#3-baza-danych-postgresql)
4. [Migracje Alembic](#4-migracje-alembic)
5. [Seed (dane początkowe)](#5-seed-dane-początkowe)
6. [Panel Admin — CRUD i Tooltipy](#6-panel-admin--crud-i-tooltipy)
7. [Frontend (Next.js)](#7-frontend-nextjs)
8. [Sekwencja startowa aplikacji](#8-sekwencja-startowa-aplikacji)
9. [Deployment workflow (krok po kroku)](#9-deployment-workflow-krok-po-kroku)
10. [Troubleshooting](#10-troubleshooting)
11. [Mapa plików konfiguracyjnych](#11-mapa-plików-konfiguracyjnych)

---

## 1. Architektura i infrastruktura

| Element          | Technologia                  | Uwagi                                  |
| ---------------- | ---------------------------- | -------------------------------------- |
| **Platform**     | Coolify (self-hosted PaaS)   | Na Hetzner VPS                         |
| **Proxy**        | Traefik (wbudowany w Coolify)| Automatyczne SSL (Let's Encrypt)       |
| **Deployment**   | Docker Compose               | Plik: `docker-compose.dev.yml`         |
| **Backend**      | FastAPI (Python 3.11)        | 2 workers uvicorn                      |
| **Frontend**     | Next.js 14 (App Router)     | Build-time SSR                         |
| **Database**     | PostgreSQL 15 Alpine         | Zarządzana przez Coolify jako osobny serwis |
| **Cache**        | Redis 7 Alpine               | Sesje, kolejki                         |
| **Migrations**   | Alembic                      | Automatyczne przy starcie              |

### Sieć Docker
```
┌─────────────────────────────────────────────┐
│  coolify (external network)                 │
│  ├── Traefik → frontend:3000               │
│  └── Traefik → backend:8000                │
├─────────────────────────────────────────────┤
│  printflow (internal bridge)                │
│  ├── frontend ↔ backend (http://backend:8000) │
│  ├── backend ↔ postgres                    │
│  └── backend ↔ redis                       │
└─────────────────────────────────────────────┘
```

---

## 2. Networking — Coolify + Traefik

### Krytyczne zasady (bez nich → 503)

1. **Dwie sieci**: Serwisy publiczne (frontend, backend) muszą być podłączone do **obu** sieci: `coolify` (routing Traefik) + `printflow` (komunikacja wewnętrzna).

2. **`traefik.docker.network=coolify`**: BEZ tego labela Traefik próbuje połączyć się przez wewnętrzny IP → 503.

3. **`expose` zamiast `ports`**: Nie używaj `ports: ["3000:3000"]` — koliduje z hostem. Używaj `expose: ["3000"]`.

4. **Healthcheck frontend**: Wyłącz inherited healthcheck z Dockerfile — Traefik traktuje "unhealthy" jako "nie routuj" → 503.
   ```yaml
   healthcheck:
     test: ["NONE"]
   ```

### Wzorcowa konfiguracja labels (frontend)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=coolify"
  - "traefik.http.routers.frontend-printflow-custom.rule=Host(`${SERVICE_FQDN_FRONTEND}`)"
  - "traefik.http.routers.frontend-printflow-custom.entrypoints=websecure"
  - "traefik.http.routers.frontend-printflow-custom.tls=true"
  - "traefik.http.routers.frontend-printflow-custom.tls.certresolver=letsencrypt"
  - "traefik.http.services.frontend-printflow-custom.loadbalancer.server.port=3000"
```

---

## 3. Baza danych (PostgreSQL)

### Konfiguracja na Coolify
- **Typ serwisu**: PostgreSQL (standalone database w Coolify)
- **Persistent Storage**: Volume Mount →  Destination Path: `/var/lib/postgresql/data`
- **Credentials**: Ustawione w Environment Variables serwisu bazy

### ⚠️ Zasada #1: Hasło ustawiane TYLKO przy pierwszym starcie
PostgreSQL zapisuje hasło do plików bazy przy **pierwszej inicjalizacji**. Zmiana `POSTGRES_PASSWORD` w ENV nie zmienia hasła w istniejącej bazie!

**Jeśli trzeba zmienić hasło:**
1. Coolify → Database → **Persistent Storage**
2. **Delete** istniejący volume
3. **+ Add** → Volume Mount → nowa nazwa (np. `printflow_db_v3`) → Destination: `/var/lib/postgresql/data`
4. **Start** — baza się zainicjalizuje od zera z nowym hasłem

> ⚠️ **To kasuje WSZYSTKIE dane!** Seed wstawi dane początkowe, ale ręcznie dodane dane zostaną utracone.

### Backup (zalecany)
- Coolify → Database → **Backups** → skonfiguruj S3 lub lokalne backupy
- Zalecany harmonogram: co 6h

---

## 4. Migracje Alembic

### Struktura plików
```
backend/
├── alembic.ini                    # Konfiguracja Alembic
├── alembic/
│   ├── env.py                     # Async engine (asyncpg + aiosqlite)
│   ├── script.py.mako             # Template migracji
│   └── versions/
│       └── 001_initial.py         # Pełny schemat bazowy
```

### Jak to działa
- `env.py` czyta `DATABASE_URL` z `app.core.config.settings` — nie trzeba konfigurować URL w `alembic.ini`
- Obsługuje **PostgreSQL** (asyncpg) i **SQLite** (aiosqlite) — lokalnie można pracować na SQLite
- Przy starcie kontenera automatycznie jest uruchamiane `alembic upgrade head`
- Jeśli tabele istnieją ale nie ma `alembic_version` → fallback do `alembic stamp head`

### Jak dodać zmianę schematu (nowa kolumna, tabela itp.)

```bash
# 1. Zmień model w backend/app/models/models.py
#    np. dodaj kolumnę: tooltip_new = Column(String(500))

# 2. Wygeneruj migrację automatycznie
cd backend
source venv/bin/activate  # lub w Docker: docker exec -it backend sh
alembic revision --autogenerate -m "add tooltip_new to processes"

# 3. Przejrzyj wygenerowany plik w alembic/versions/
#    Sprawdź czy upgrade() i downgrade() wyglądają sensownie

# 4. Przetestuj lokalnie
alembic upgrade head

# 5. Commit + push → deployment automatycznie uruchomi alembic upgrade head
git add -A && git commit -m "feat: add tooltip_new to processes" && git push origin dev
```

### Przydatne komendy Alembic
```bash
alembic current          # Pokaż aktualną rewizję bazy
alembic heads            # Pokaż najnowszą dostępną rewizję
alembic history          # Historia migracji
alembic check            # Czy schemat modeli == schemat bazy? (autogenerate diff)
alembic upgrade head     # Zastosuj wszystkie pending migracje
alembic downgrade -1     # Cofnij ostatnią migrację
alembic stamp head       # Oznacz bazę jako "aktualna" bez uruchamiania migracji
```

### ⚠️ Ważna zasada
**Nigdy nie używaj `Base.metadata.create_all()`** w kodzie produkcyjnym — Alembic jest jedynym źródłem prawdy o schemacie. `create_all` jest usunięte z `seed.py`.

---

## 5. Seed (dane początkowe)

### Plik: `backend/app/seed.py`

- **Idempotentny**: sprawdza `SELECT * FROM materials` — jeśli coś istnieje, pomija
- **Uruchamiany**: automatycznie po `alembic upgrade head` przy starcie kontenera
- **Zawartość**: materiały (z wariantami + tooltipami), procesy, szablony produktów

### Kiedy seed NIE zadziała
- Baza **już ma dane** (stare, bez tooltipów) → seed jest pomijany
- **Rozwiązanie**: reset bazy (usunięcie volume) LUB ręczna edycja przez panel admin

### Dodawanie nowych danych seedowych
Edytuj `backend/app/seed.py` — ale pamiętaj, że seed zadziała **tylko na pustej bazie**. Dla istniejących instalacji nowe dane trzeba dodawać przez panel admin lub migrację Alembic (data migration).

---

## 6. Panel Admin — CRUD i Tooltipy

### Dostęp
- URL: `https://<frontend-domain>/admin`

### Możliwości
| Zakładka     | Operacje                          | Tooltipy                  |
| ------------ | --------------------------------- | ------------------------- |
| **Szablony** | Dodaj / Edytuj / Usuń            | margines W, margines H, overlap |
| **Materiały**| Dodaj / Edytuj / Usuń + warianty | narzut %, margines W/H    |
| **Procesy**  | Dodaj / Edytuj / Usuń            | metoda, cena, setup, koszt, marginesy |

### Jak zmienić opisy tooltipów
1. Wejdź w panel admin → zakładka **Materiały** lub **Procesy**  
2. Kliknij **ikonę ołówka** ✏️ przy wybranym elemencie
3. W modalu edycji rozwiń sekcję **"Tooltipy (opisy pól)"** (na dole formularza)
4. Wpisz / zmień tekst tooltipów
5. Kliknij **Zapisz**

Tooltipy zapisywane są bezpośrednio w bazie danych i wyświetlane natychmiast przy nagłówkach tabel jako ikony ℹ️.

> **Uwaga**: Ikona tooltipa przy nagłówku kolumny pojawia się **tylko gdy tooltip ma treść**. Jeśli pole jest puste (`null`), ikona nie jest renderowana.

---

## 7. Frontend (Next.js)

### Build-time vs Runtime
| Zmienna                | Kiedy jest czytana | Jak zaktualizować      |
| ---------------------- | ------------------- | ---------------------- |
| `NEXT_PUBLIC_API_URL`  | **Build-time** (baked into JS) | **Redeploy** (Rebuild) — restart NIE wystarczy |
| `BACKEND_URL`          | Runtime (SSR)       | Restart wystarczy      |
| `NODE_ENV`             | Runtime             | Restart wystarczy      |

### ⚠️ Zasada krytyczna
Zmienne `NEXT_PUBLIC_*` są wkompilowane w JavaScript przy buildzie. Po zmianie w Coolify musisz zrobić **pełny Redeploy** (Build), nie sam Restart!

---

## 8. Sekwencja startowa aplikacji

```
docker-compose up
  │
  ├── postgres → healthcheck (pg_isready) → READY
  ├── redis    → healthcheck (redis-cli ping) → READY
  │
  └── backend (czeka na postgres + redis healthy)
        │
        ├── sleep 3s (DNS propagation)
        ├── python -c 'import asyncpg' (weryfikacja drivera)
        ├── alembic upgrade head (schemat bazy)
        │   └── fallback: alembic stamp head (jeśli tabele istnieją)
        ├── python -m app.seed (dane początkowe, idempotent)
        └── uvicorn app.main:app --port 8000 --workers 2
  
  └── frontend (czeka na backend started)
        └── next start → port 3000
```

---

## 9. Deployment workflow (krok po kroku)

### Standardowy deploy (zmiana kodu)
```bash
# 1. Wprowadź zmiany
git add -A
git commit -m "feat: opis zmiany"
git push origin dev

# 2. Coolify automatycznie wykryje push na branch dev
#    i uruchomi Build + Deploy
#    LUB: ręcznie kliknij Redeploy w Coolify UI
```

### Deploy ze zmianą schematu bazy
```bash
# 1. Zmień model w app/models/models.py
# 2. Wygeneruj migrację
cd backend && alembic revision --autogenerate -m "opis"
# 3. Sprawdź wygenerowany plik
# 4. Commit + push
git add -A && git commit -m "feat: migration - opis" && git push origin dev
# 5. Deploy — alembic upgrade head uruchomi się automatycznie
```

### Deploy z resetem bazy (ostateczność)
1. Coolify → Database → Persistent Storage → **Delete** volume
2. **+ Add** → Volume Mount → nowa nazwa → `/var/lib/postgresql/data`
3. **Start** database
4. **Redeploy** backend (uruchmi alembic + seed)

---

## 10. Troubleshooting

### A. 503 Service Unavailable
| Przyczyna | Rozwiązanie |
| --------- | ----------- |
| Brak `traefik.docker.network=coolify` | Dodaj label do serwisu |
| Healthcheck fails → container "unhealthy" | Dodaj `healthcheck: test: ["NONE"]` |
| Serwis nie jest w sieci `coolify` | Dodaj `networks: [printflow, coolify]` |

### B. InvalidPasswordError (PostgreSQL)
**Przyczyna**: Hasło w ENV zostało zmienione, ale nie w bazie (PostgreSQL ignoruje nowe hasło na istniejącym volume).  
**Fix**: Usuń volume → dodaj nowy → restart (patrz sekcja 3).

### C. "volumes must be a array"
**Przyczyna**: Usunięto wszystkie volumes z serwisu bazy.  
**Fix**: Dodaj nowy Volume Mount z Destination `/var/lib/postgresql/data`.

### D. Frontend: błąd kalkulacji / "localhost:8000" w konsoli
**Przyczyna**: `NEXT_PUBLIC_API_URL` nie jest ustawione lub nieaktualne.  
**Fix**: Ustaw poprawny URL → **Redeploy** (Build, nie Restart!).

### E. Tooltipy nie wyświetlają się na UI
**Przyczyna**: Pola `tooltip_*` w bazie mają wartość `NULL` — seed nie przeszedł, bo baza miała dane sprzed dodania tooltipów.  
**Fix**:  
- **Opcja 1**: Reset bazy (usuń volume) → seed wstawi dane z tooltipami  
- **Opcja 2**: Edytuj materiały/procesy przez Admin Panel → sekcja "Tooltipy"

### F. Alembic: "table already exists"
**Przyczyna**: Tabele stworzone przez `create_all`, ale brak tabeli `alembic_version`.  
**Fix**: `alembic stamp head` — oznacz bazę jako "aktualną" bez uruchamiania migracji. (Startup command robi to automatycznie jako fallback).

### G. Tooltip ucięty / niewidoczny w tabeli
**Przyczyna**: Kontener tabeli ma `overflow-hidden`, które obcina absolutnie pozycjonowane elementy.  
**Fix**: Usuń `overflow-hidden` z div-ów opakowujących tabele (patrz sekcja 6).

---

## 11. Mapa plików konfiguracyjnych

| Plik | Opis |
| ---- | ---- |
| `docker-compose.dev.yml` | Główna konfiguracja deploymentu (dev/Coolify) |
| `docker-compose.yml` | Produkcyjna konfiguracja (pełna) |
| `backend/alembic.ini` | Konfiguracja Alembic |
| `backend/alembic/env.py` | Async Alembic env (PostgreSQL + SQLite) |
| `backend/alembic/versions/` | Pliki migracji |
| `backend/app/seed.py` | Dane początkowe (idempotent) |
| `backend/app/core/config.py` | Settings (DATABASE_URL, JWT, CORS) |
| `backend/app/core/database.py` | SQLAlchemy engine + session factory |
| `backend/app/models/models.py` | Modele bazodanowe (schema source of truth) |
| `backend/Dockerfile.dev` | Dockerfile dev (bez WeasyPrint) |
| `backend/Dockerfile` | Dockerfile prod (z WeasyPrint) |
| `.env.example` | Wzorcowe zmienne środowiskowe |
| `AGENTS.md` | Guidelines dla AI agentów |
| `coolify_deployment_learnings.md` | **TEN PLIK** — deployment & operations guide |
