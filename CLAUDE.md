# BudgetMobile — kontekst projektu

## O projekcie
Aplikacja mobilna do zarządzania budżetem domowym. React Native + Expo, baza SQLite (expo-sqlite).
Rozwijana niezależnie od starej aplikacji webowej (AppBudget), z docelowym przeniesieniem danych ze starego systemu do nowego.

## Testowanie i wdrożenie
- **Testowanie**: Expo Go na fizycznym telefonie
- **Wdrożenie produkcyjne**: Signulous (pozwala zarejestrować aplikację iOS bez Apple Developer Account)
- **Baza danych**: SQLite lokalna na urządzeniu — plik `budget2.db`

## Stos technologiczny
- React Native + Expo (managed workflow)
- expo-sqlite (async API)
- @react-navigation/native + bottom-tabs + stack
- react-native-chart-kit (wykresy BarChart, PieChart)

## Struktura aplikacji

### Nawigacja (App.js)
- **Tab 1 — Podsumowanie** (DashboardNavigator stack):
  - DashboardScreen (główny dashboard)
  - MonthlyBalancesScreen (historia bilansów miesięcznych)
  - YearlyDetailScreen (podsumowanie roczne, wybór roku)
  - SavingsPieScreen (podział oszczędności — wykres kołowy)
  - ExpenseCategoryDetailScreen (wydatki wg kategorii, filtry miesięcy)
- **Tab 2 — Wydatki** (ExpensesScreen)
- **Tab 3 — Wpływy** (IncomesScreen)
- **Tab 4 — Oszczędności** (SavingsNavigator stack):
  - SavingsScreen (lista kont + historia operacji)
  - SavingsAccountDetailScreen (szczegóły konta: snapshoty + operacje)

### Schemat bazy danych (src/db/database.js)
```
expenses_category   — kategorie wydatków (12 domyślnych)
incomes_category    — kategorie wpływów, flaga is_savings_withdrawal
expenses            — wpisy wydatków (date TEXT YYYY-MM-DD)
incomes             — wpisy wpływów, opcjonalne savings_operation_id
savings_accounts    — konta oszczędnościowe z kolorem
savings_operations  — operacje: deposit / withdrawal
savings_snapshots   — ręczne snapshoty stanu konta (do śledzenia wzrostu)
```

### Kluczowe logiki
- Wypłata z oszczędności → automatycznie tworzy wpis w tabeli `incomes` (powiązany przez `savings_operation_id`)
- Bilans miesiąca = Wpływy − Wydatki − Wpłaty na oszczędności
- Stan oszczędności oparty na ostatnim snapshot (nie sumie operacji)
- DEV: w DashboardScreen są przyciski "Wczytaj demo dane" i "Wyczyść dane" — do usunięcia przed produkcją

## Stara aplikacja webowa — AppBudget
Lokalizacja: `C:/Users/48793/Desktop/programy/AppBudget/`
Stack: React + Node.js/Express + PostgreSQL
Funkcje których nie ma jeszcze w mobilnej: zadania (Tasks), dokumenty zdrowotne (Health), walory, osoby

### Plan migracji danych (przyszłość)
- Źródło: PostgreSQL (AppBudget)
- Cel: SQLite (BudgetMobile)
- Wymagane mapowanie: kategorie, osoby, waluty → kategorie mobilne
- Backup SQL dostępny: `AppBudget/budget_backup.sql`

## Problem zmiany telefonu
**SQLite jest przechowywane lokalnie na urządzeniu.** Przy zmianie telefonu dane przepadną jeśli nie ma mechanizmu backupu.
Do zaimplementowania: eksport/import danych (JSON lub SQLite file share).
Na Expo można użyć `expo-sharing` + `expo-file-system` do eksportu pliku `.db` lub `.json`.

## Pomysły na rozwój (priorytetyzowane)

### Pilne / Duże wartości
1. **Edycja wpisów** — obecnie można tylko dodać i usunąć (długie naciśnięcie), brak edycji
2. **Filtrowanie po miesiącu** w Wydatkach i Wpływach (dziś widać wszystko naraz)
3. **Eksport / backup danych** — ochrona przed utratą przy zmianie telefonu (expo-sharing + expo-file-system)
4. **Zarządzanie kategoriami** — użytkownik powinien móc dodawać/usuwać własne kategorie

### Średni priorytet
5. **Budżet miesięczny (limity)** — ustawianie limitów per kategoria, alerty przy przekroczeniu
6. **Cele oszczędnościowe** — "chcę odłożyć X zł do daty Y" z paskiem postępu
7. **Wyszukiwarka / filtr** w listach transakcji
8. **Powtarzające się wpisy** — subskrypcje, stałe przelewy (np. co miesiąc)

### Długoterminowe
9. **Migracja z AppBudget** — NA KOŃCU po pełnym rozwoju aplikacji. Skrypt import danych z PostgreSQL backup (`AppBudget/budget_backup.sql`) do SQLite.
10. **Wykres trendu oszczędności** na osi czasu (snapshoty w czasie) — ZAIMPLEMENTOWANE w SavingsAccountDetailScreen
11. **Eksport / backup danych** — zostawiony w opcjach na przyszłość (expo-sharing + expo-file-system)
12. **Wiele walut** (dziś tylko PLN) — odłożone
13. **Widget na ekranie głównym** (expo-widgets, eksperymentalne) — odłożone
