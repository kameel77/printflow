# Mirror Repo — Dwukierunkowa synchronizacja repozytoriów

## Architektura

```
Repo A (kameel77/printflow)  ⇄  Repo B (wally-sklep/printflow)
```

Mirrorowane branche: `dev`, `staging` oraz wszystkie tagi.

---

## 1. Repo A → Repo B (już skonfigurowane)

**Plik:** `kameel77/printflow/.github/workflows/mirror-to-b.yml`

GitHub Action wypycha zmiany z repo A do repo B automatycznie przy każdym pushu na `dev`, `staging` lub przy tworzeniu tagów.

### Wymagane secrety w repo A (`kameel77/printflow`)

| Secret          | Opis                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `MIRROR_TOKEN`  | Personal Access Token (classic) z konta mającego dostęp do repo B    |

### Wymagane scope'y tokena

- ✅ **`repo`** — pełny dostęp do repozytoriów
- ✅ **`workflow`** — pozwala na wypychanie plików z `.github/workflows/`

### Kod YML (Repo A → Repo B)

```yaml
# .github/workflows/mirror-to-b.yml
name: Mirror dev/staging and tags to repo B

on:
  push:
    branches:
      - dev
      - staging
    tags:
      - "*"
  workflow_dispatch: {}

jobs:
  mirror:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout full history
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Configure git
        run: |
          git config user.name "mirror-bot"
          git config user.email "mirror-bot@users.noreply.github.com"

      - name: Check if token is set
        run: |
          if [ -z "${{ secrets.MIRROR_TOKEN }}" ]; then
            echo "Error: MIRROR_TOKEN secret is empty or not set in the repository settings!"
            exit 1
          fi

      - name: Add target remote (repo B)
        run: |
          git remote add target https://${{ secrets.MIRROR_TOKEN }}@github.com/wally-sklep/printflow.git
          git remote -v

      - name: Push to target
        run: |
          if [ "${{ github.ref_type }}" = "branch" ]; then
            echo "Pushing branch ${{ github.ref_name }}..."
            git push target HEAD:refs/heads/${{ github.ref_name }} --force
          elif [ "${{ github.ref_type }}" = "tag" ]; then
            echo "Pushing tag ${{ github.ref_name }}..."
            git push target HEAD:refs/tags/${{ github.ref_name }} --force
          else
            echo "Manual dispatch, pushing branch ${{ github.ref_name }}..."
            git push target HEAD:refs/heads/${{ github.ref_name }} --force
          fi
```

---

## 2. Repo B → Repo A (reverse mirror)

Jeśli chcesz, aby zmiany wprowadzone w repo B automatycznie wracały do repo A, dodaj poniższy plik do repozytorium `wally-sklep/printflow`.

### Wymagane secrety w repo B (`wally-sklep/printflow`)

| Secret          | Opis                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `MIRROR_TOKEN`  | Personal Access Token (classic) z konta mającego dostęp do repo A    |

### Wymagane scope'y tokena

- ✅ **`repo`**
- ✅ **`workflow`**

### Kod YML (Repo B → Repo A)

Utwórz plik `.github/workflows/mirror-to-a.yml` w repozytorium `wally-sklep/printflow`:

```yaml
# .github/workflows/mirror-to-a.yml
name: Mirror dev/staging and tags to repo A

on:
  push:
    branches:
      - dev
      - staging
    tags:
      - "*"
  workflow_dispatch: {}

jobs:
  mirror:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout full history
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Configure git
        run: |
          git config user.name "mirror-bot"
          git config user.email "mirror-bot@users.noreply.github.com"

      - name: Check if token is set
        run: |
          if [ -z "${{ secrets.MIRROR_TOKEN }}" ]; then
            echo "Error: MIRROR_TOKEN secret is empty or not set in the repository settings!"
            exit 1
          fi

      - name: Add target remote (repo A)
        run: |
          git remote add target https://${{ secrets.MIRROR_TOKEN }}@github.com/kameel77/printflow.git
          git remote -v

      - name: Push to target
        run: |
          if [ "${{ github.ref_type }}" = "branch" ]; then
            echo "Pushing branch ${{ github.ref_name }}..."
            git push target HEAD:refs/heads/${{ github.ref_name }} --force
          elif [ "${{ github.ref_type }}" = "tag" ]; then
            echo "Pushing tag ${{ github.ref_name }}..."
            git push target HEAD:refs/tags/${{ github.ref_name }} --force
          else
            echo "Manual dispatch, pushing branch ${{ github.ref_name }}..."
            git push target HEAD:refs/heads/${{ github.ref_name }} --force
          fi
```

---

## 3. Ręczne ściąganie zmian z Repo B do Repo A (lokalnie)

Jeśli nie chcesz automatycznego reverse mirrora, możesz ręcznie ściągnąć zmiany z repo B.

### Jednorazowa konfiguracja (dodanie remote'a)

```bash
cd /Users/kamiltonkowicz/Documents/Coding/github/printflow
git remote add repo-b https://github.com/wally-sklep/printflow.git
```

### Ściąganie zmian z Repo B

```bash
# Pobierz najnowsze dane z repo B
git fetch repo-b

# Przełącz się na branch, który chcesz zaktualizować
git checkout dev

# Scal zmiany z repo B
git merge repo-b/dev

# Wypchnij zaktualizowany branch do repo A
git push origin dev
```

Analogicznie dla brancha `staging`:

```bash
git checkout staging
git merge repo-b/staging
git push origin staging
```

---

## 4. Uwaga: zapobieganie pętli (przy dwukierunkowym mirrorze)

Jeśli skonfigurujesz oba Action'y (A→B i B→A), mogą one tworzyć **nieskończoną pętlę** — push z A odpala Action w B, który pushuje z powrotem do A itd.

### Rozwiązanie: filtrowanie commitów mirror-bota

Dodaj warunek `if` do jobu w obu plikach YAML, aby pominąć commity wykonane przez mirror-bota:

```yaml
jobs:
  mirror:
    runs-on: ubuntu-latest
    if: github.actor != 'mirror-bot' && !contains(github.event.head_commit.message, '[mirror]')
    steps:
      # ...
```

Lub użyj prostszego podejścia — **skonfiguruj reverse mirror tylko ręcznie** (Opcja 3 powyżej), a automatyczny Action zostaw tylko w jednym kierunku (A→B).

---

## 5. Troubleshooting

| Błąd | Przyczyna | Rozwiązanie |
|------|-----------|-------------|
| `Repository not found` | Token nie ma dostępu do docelowego repo | Sprawdź, czy token jest wygenerowany z konta z dostępem |
| `Permission denied to github-actions[bot]` | `actions/checkout` nadpisuje token | Dodaj `persist-credentials: false` |
| `refusing to allow a PAT to create or update workflow without 'workflow' scope` | Brak scope'a `workflow` na tokenie | Zaktualizuj token, dodając scope `workflow` |
| `MIRROR_TOKEN secret is empty` | Secret nie jest ustawiony | Dodaj secret w Settings → Secrets → Actions |
