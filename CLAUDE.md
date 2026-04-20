# BudgetMobile — kontekst projektu

## O projekcie
Aplikacja mobilna do zarządzania budżetem domowym. React Native + Expo, baza **Supabase** (PostgreSQL online).
Rozwijana niezależnie od starej aplikacji webowej (AppBudget), z docelowym przeniesieniem danych ze starego systemu do nowego.

## Testowanie i wdrożenie — AKTUALNE I DOCELOWE PODEJŚCIE
- **Środowisko projektu**: Expo Snack
- **Testowanie i użytkowanie**: Expo Go na fizycznym telefonie (iOS)
- **Baza danych**: Supabase (PostgreSQL online) — dane w chmurze, nie lokalnie
- To podejście jest ustalone i niezmienne — nie zmieniamy na inne

## Stos technologiczny
- React Native + Expo (managed workflow)
- Supabase (baza danych online — PostgreSQL)
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

### Schemat bazy danych (Supabase)
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
- W DashboardScreen jest przycisk "Wczytaj demo dane" — **zostaje celowo** (przydatny do testów). Przycisk "Wyczyść dane" jest zbędny — nie usuwamy danych użytkownika.

## Pomysły na rozwój (priorytetyzowane)

### Pilne / Duże wartości
1. **Edycja wpisów** — obecnie można tylko dodać i usunąć (długie naciśnięcie), brak edycji
2. **Filtrowanie po miesiącu** w Wydatkach i Wpływach (dziś widać wszystko naraz)
3. **Zarządzanie kategoriami** — użytkownik powinien móc dodawać/usuwać własne kategorie

### Średni priorytet
4. **Budżet miesięczny (limity)** — ustawianie limitów per kategoria, alerty przy przekroczeniu
5. **Cele oszczędnościowe** — "chcę odłożyć X zł do daty Y" z paskiem postępu
6. **Wyszukiwarka / filtr** w listach transakcji
7. **Powtarzające się wpisy** — subskrypcje, stałe przelewy (np. co miesiąc)

### Długoterminowe
8. **Wykres trendu oszczędności** na osi czasu (snapshoty w czasie) — ZAIMPLEMENTOWANE w SavingsAccountDetailScreen
10. **Wiele walut** (dziś tylko PLN) — odłożone
11. **Widget na ekranie głównym** (expo-widgets, eksperymentalne) — odłożone
