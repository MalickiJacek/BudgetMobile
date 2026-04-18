/**
 * Migracja danych z AppBudget (PostgreSQL backup) do BudgetMobile (SQLite)
 *
 * Kursy walut (jednorazowe, z backupu AppBudget):
 *   USD = 3.64 PLN
 *   EUR = 4.26 PLN
 *
 * Tylko PLN w bazie. Zyski/straty z inwestycji → tylko snapshot końcowy.
 *
 * Docelowe konta oszczędnościowe:
 *   Konto mieszkaniowe  — Ola + Jacek zsumowane
 *   XTB IKE             — dawniej XTB IKE Jacek
 *   XTB                 — XTB EURO Jacek (EUR→PLN) + Bartek
 *   Freedom24           — dawniej Freedom24 Jacek (USD→PLN)
 *   Lokaty              — dawniej Lokaty Ola & Jacek
 *   PPK Jacek
 */

const USD = 3.64;
const EUR = 4.26;

// ─── WYDATKI ────────────────────────────────────────────────────────────────
// Rekreacja → Rozrywka (sport też)
// Dom → Mieszkanie
const RAW_EXPENSES = [
  { cat: 'Rozrywka',   amount: 130,    date: '2025-09-13', desc: 'Imprezka' },
  { cat: 'Rozrywka',   amount: 352,    date: '2025-09-13', desc: 'Restauracja rodzice' },
  { cat: 'Żywność',    amount: 79,     date: '2025-09-11', desc: 'Biedronka' },
  { cat: 'Żywność',    amount: 6,      date: '2025-09-11', desc: 'Żabka' },
  { cat: 'Rozrywka',   amount: 106,    date: '2025-09-10', desc: 'Multisport' },
  { cat: 'Mieszkanie', amount: 590.43, date: '2025-09-10', desc: 'Czynsz' },
  { cat: 'Mieszkanie', amount: 10,     date: '2025-09-10', desc: 'Castorama' },
  { cat: 'Mieszkanie', amount: 7,      date: '2025-09-08', desc: 'Castorama' },
  { cat: 'Żywność',    amount: 86,     date: '2025-09-04', desc: 'Biedronka' },
  { cat: 'Mieszkanie', amount: 205,    date: '2025-09-04', desc: 'Wiertarka' },
  { cat: 'Transport',  amount: 200,    date: '2025-09-07', desc: 'Paliwo' },
  { cat: 'Zdrowie',    amount: 250,    date: '2025-09-05', desc: 'Doktor' },
  { cat: 'Zdrowie',    amount: 450,    date: '2025-09-01', desc: 'Szczepienia' },
  { cat: 'Odzież',     amount: 170,    date: '2025-09-17', desc: 'Koszulki' },
  { cat: 'Żywność',    amount: 80,     date: '2025-09-17', desc: 'Auchan' },
  { cat: 'Żywność',    amount: 104,    date: '2025-09-22', desc: 'Sushi' },
  { cat: 'Żywność',    amount: 20,     date: '2025-09-22', desc: 'Auchan' },
  { cat: 'Transport',  amount: 110,    date: '2025-09-22', desc: 'PKP' },
  { cat: 'Transport',  amount: 200,    date: '2025-09-22', desc: 'Paliwo' },
  { cat: 'Zdrowie',    amount: 250,    date: '2025-09-22', desc: 'Doktor' },
  { cat: 'Żywność',    amount: 82,     date: '2025-09-24', desc: 'Biedronka' },
  { cat: 'Subskrypcje',amount: 25,     date: '2025-10-01', desc: 'Spotify' },
  { cat: 'Rozrywka',   amount: 7,      date: '2025-10-01', desc: 'Piłka parking' },
  { cat: 'Transport',  amount: 70,     date: '2025-10-01', desc: 'Pociąg Kraków' },
  { cat: 'Rozrywka',   amount: 133,    date: '2025-10-01', desc: 'Energylandia' },
  { cat: 'Rozrywka',   amount: 12.50,  date: '2025-10-01', desc: 'Piłka' },
  { cat: 'Żywność',    amount: 35,     date: '2025-10-01', desc: 'Biedronka' },
];

// ─── WPŁYWY ─────────────────────────────────────────────────────────────────
const RAW_INCOMES = [
  { cat: 'Wynagrodzenie', amount: 5739.29, date: '2025-09-08', desc: 'Wypłata — Ola' },
  { cat: 'Wynagrodzenie', amount: 5150.00, date: '2025-09-09', desc: 'Wypłata — Jacek' },
  { cat: 'Inne',          amount: 13.00,   date: '2025-09-08', desc: 'Spotify Adam' },
];

// ─── DOCELOWE KONTA ──────────────────────────────────────────────────────────
const TARGET_ACCOUNTS = [
  { name: 'Konto mieszkaniowe', color: '#1565C0' },
  { name: 'XTB IKE',           color: '#2E7D32' },
  { name: 'XTB',               color: '#6A1B9A' },
  { name: 'Freedom24',         color: '#E65100' },
  { name: 'Lokaty',            color: '#AD1457' },
  { name: 'PPK Jacek',         color: '#4527A0' },
];

// Stare nazwy do usunięcia/zastąpienia (jeśli są w DB bez danych)
const OLD_ACCOUNT_NAMES = [
  'Konto mieszkaniowe Ola',
  'Konto mieszkaniowe Jacek',
  'XTB IKE Jacek',
  'Freedom24 Jacek',
  'Lokaty Ola & Jacek',
];

// ─── OPERACJE OSZCZĘDNOŚCIOWE (tylko wpłata/wypłata, tylko PLN) ──────────────
// Rekreacja/strata z XTB i Freedom24 → tylko snapshot końcowy
// XTB EURO: 216.56 EUR × 4.26 = 922.55 PLN (wpłata startowa)
// Freedom24: 681.94 USD × 3.64 = 2482.26 PLN (wpłata startowa)
const RAW_SAVINGS_OPS = [
  // Konto mieszkaniowe (Ola + Jacek razem)
  { acc: 'Konto mieszkaniowe', type: 'deposit', amount: 24000.00, date: '2025-03-01', desc: 'Wpłaty Ola — historyczne' },
  { acc: 'Konto mieszkaniowe', type: 'deposit', amount: 438.00,   date: '2025-09-14', desc: 'Odsetki — Ola' },
  { acc: 'Konto mieszkaniowe', type: 'deposit', amount: 10000.00, date: '2024-10-10', desc: 'Wpłaty Jacek 2024' },
  { acc: 'Konto mieszkaniowe', type: 'deposit', amount: 18000.00, date: '2025-04-14', desc: 'Wpłaty Jacek 2025' },
  { acc: 'Konto mieszkaniowe', type: 'deposit', amount: 536.53,   date: '2025-09-14', desc: 'Odsetki — Jacek' },

  // XTB IKE (tylko wpłacony kapitał PLN; zyski/straty w snapshot)
  { acc: 'XTB IKE', type: 'deposit',    amount: 7259.29, date: '2025-08-12', desc: 'Kapitał wpłacony' },
  { acc: 'XTB IKE', type: 'withdrawal', amount: 594.27,  date: '2025-09-29', desc: 'Wypłata' },

  // XTB = XTB EURO Jacek (EUR→PLN, wpłata startowa) + Bartek
  { acc: 'XTB', type: 'deposit', amount: +(216.56 * EUR).toFixed(2), date: '2025-07-16', desc: 'Kapitał startowy XTB EURO (216.56 EUR)' },
  { acc: 'XTB', type: 'deposit', amount: 30000.00,                   date: '2021-06-14', desc: 'Środki u Bartka — start' },

  // Freedom24 (USD→PLN, tylko wpłata startowa)
  { acc: 'Freedom24', type: 'deposit', amount: +(681.94 * USD).toFixed(2), date: '2025-08-18', desc: 'Kapitał startowy (681.94 USD)' },

  // Lokaty
  { acc: 'Lokaty', type: 'deposit', amount: 81678.00, date: '2025-09-14', desc: 'Stan lokat' },

  // PPK Jacek
  { acc: 'PPK Jacek', type: 'deposit', amount: 1236.00, date: '2025-04-01', desc: 'Wpłaty — start' },
  { acc: 'PPK Jacek', type: 'deposit', amount: 250.00,  date: '2025-09-14', desc: 'Dopłata Państwa' },
  { acc: 'PPK Jacek', type: 'deposit', amount: 927.00,  date: '2025-09-14', desc: 'Wpłaty pracodawcy' },
];

// ─── SNAPSHOTY MIESIĘCZNE ────────────────────────────────────────────────────
// Wyliczone ręcznie z wszystkich operacji (wpłata/wypłata/zysk/strata) z backupu.
// Wszystkie wartości w PLN; USD×3.64, EUR×4.26.
//
// KONTO MIESZKANIOWE (Ola + Jacek):
//   2024-10: Jacek +10 000                           → 10 000,00
//   2025-03: +Ola 24 000                             → 34 000,00
//   2025-04: +Jacek 18 000                           → 52 000,00
//   2025-09: +Ola odsetki 438 + Jacek odsetki 536,53 → 52 974,53
//
// XTB IKE (PLN, zysk/strata przeliczone narastająco):
//   2025-08: wpłata 7259,29 + zyski/straty netto +521,95 → 7 781,24
//   2025-09: zyski/straty netto +882,08 − wypłata 594,27 → 8 663,32
//
// XTB = XTB EURO Jacek (EUR→PLN) + Bartek (PLN):
//   Bartek: 30 000 (2021-06), Zwrot+zysk 28 000 (2025-09-01)
//   XTB EURO: początek 216,56 EUR; zyski/straty narastające
//   2025-07: Bartek 30 000 + XTB EURO (217,61 EUR × 4,26)  = 30 926,62
//   2025-08: Bartek 30 000 + XTB EURO (230,96 EUR × 4,26)  = 30 983,89
//   2025-09: Bartek 58 000 + XTB EURO (230,96 EUR × 4,26)  = 58 983,89
//   2025-10: Bartek 58 000 + XTB EURO (283,08 EUR × 4,26)  = 59 205,92
//
// FREEDOM24 (USD→PLN, zyski/straty narastające):
//   2025-08: 807,65 USD × 3,64  = 2 939,85
//   2025-09: 912,19 USD × 3,64  = 3 320,37
//
// LOKATY: jedna wpłata 2025-09-14 → 81 678,00
//
// PPK JACEK:
//   2025-04: start 1 236,00
//   2025-09: +250 (Państwo) +927 (pracodawca) +208 (zyski %) = 2 621,00
const RAW_SNAPSHOTS = [
  // Konto mieszkaniowe
  { acc: 'Konto mieszkaniowe', balance: 10000.00, date: '2024-10-31', note: 'Import AppBudget — Jacek' },
  { acc: 'Konto mieszkaniowe', balance: 34000.00, date: '2025-03-31', note: 'Import AppBudget — Ola + Jacek' },
  { acc: 'Konto mieszkaniowe', balance: 52000.00, date: '2025-04-30', note: 'Import AppBudget' },
  { acc: 'Konto mieszkaniowe', balance: 52974.53, date: '2025-09-30', note: 'Import AppBudget (z odsetkami)' },

  // XTB IKE
  { acc: 'XTB IKE', balance: 7781.24, date: '2025-08-31', note: 'Import AppBudget (wycena netto PLN)' },
  { acc: 'XTB IKE', balance: 8663.32, date: '2025-09-30', note: 'Import AppBudget (wycena netto, po wypłacie)' },

  // XTB (XTB EURO EUR→PLN + Bartek PLN)
  { acc: 'XTB', balance: 30926.62, date: '2025-07-31', note: 'Import AppBudget (Bartek + XTB EURO 217,61 EUR)' },
  { acc: 'XTB', balance: 30983.89, date: '2025-08-31', note: 'Import AppBudget (Bartek + XTB EURO 230,96 EUR)' },
  { acc: 'XTB', balance: 58983.89, date: '2025-09-30', note: 'Import AppBudget (Bartek zwrot + XTB EURO)' },
  { acc: 'XTB', balance: 59205.92, date: '2025-10-31', note: 'Import AppBudget (XTB EURO 283,08 EUR po zysku AMD)' },

  // Freedom24
  { acc: 'Freedom24', balance: 2939.85, date: '2025-08-31', note: 'Import AppBudget (807,65 USD × 3,64)' },
  { acc: 'Freedom24', balance: 3320.37, date: '2025-09-30', note: 'Import AppBudget (912,19 USD × 3,64)' },

  // Lokaty
  { acc: 'Lokaty', balance: 81678.00, date: '2025-09-30', note: 'Import AppBudget' },

  // PPK Jacek
  { acc: 'PPK Jacek', balance: 1236.00, date: '2025-04-30', note: 'Import AppBudget — wpłaty startowe' },
  { acc: 'PPK Jacek', balance: 2621.00, date: '2025-09-30', note: 'Import AppBudget (z zyskami %)' },
];

// ────────────────────────────────────────────────────────────────────────────

export async function importFromAppBudget(db) {
  // Usuń stare domyślne konta (tylko jeśli nie mają operacji)
  for (const name of OLD_ACCOUNT_NAMES) {
    const acc = await db.getFirstAsync('SELECT id FROM savings_accounts WHERE name=?', [name]);
    if (acc) {
      const { cnt } = await db.getFirstAsync(
        'SELECT COUNT(*) as cnt FROM savings_operations WHERE account_id=?', [acc.id]
      );
      if (cnt === 0) {
        await db.runAsync('DELETE FROM savings_accounts WHERE id=?', [acc.id]);
      }
    }
  }

  // Utwórz docelowe konta (jeśli jeszcze nie istnieją)
  for (const a of TARGET_ACCOUNTS) {
    const existing = await db.getFirstAsync('SELECT id FROM savings_accounts WHERE name=?', [a.name]);
    if (!existing) {
      await db.runAsync('INSERT INTO savings_accounts (name, color) VALUES (?,?)', [a.name, a.color]);
    }
  }

  // Mapowanie kategorii
  const eCats = {};
  (await db.getAllAsync('SELECT id, name FROM expenses_category')).forEach(c => { eCats[c.name] = c.id; });
  const iCats = {};
  (await db.getAllAsync('SELECT id, name FROM incomes_category')).forEach(c => { iCats[c.name] = c.id; });
  const accMap = {};
  (await db.getAllAsync('SELECT id, name FROM savings_accounts')).forEach(a => { accMap[a.name] = a.id; });

  // Wydatki
  for (const e of RAW_EXPENSES) {
    const catId = eCats[e.cat];
    if (!catId) throw new Error(`Brak kategorii wydatku: "${e.cat}"`);
    await db.runAsync(
      'INSERT INTO expenses (description, category_id, amount, date) VALUES (?,?,?,?)',
      [e.desc, catId, e.amount, e.date]
    );
  }

  // Wpływy
  for (const i of RAW_INCOMES) {
    const catId = iCats[i.cat];
    if (!catId) throw new Error(`Brak kategorii wpływu: "${i.cat}"`);
    await db.runAsync(
      'INSERT INTO incomes (description, category_id, amount, date) VALUES (?,?,?,?)',
      [i.desc, catId, i.amount, i.date]
    );
  }

  // Operacje oszczędnościowe
  const savWithdrawalCat = await db.getFirstAsync(
    'SELECT id FROM incomes_category WHERE is_savings_withdrawal=1 LIMIT 1'
  );
  for (const op of RAW_SAVINGS_OPS) {
    const accId = accMap[op.acc];
    if (!accId) throw new Error(`Brak konta: "${op.acc}"`);
    if (op.type === 'withdrawal') {
      const result = await db.runAsync(
        `INSERT INTO savings_operations (account_id, type, amount, date, description) VALUES (?, 'withdrawal', ?, ?, ?)`,
        [accId, op.amount, op.date, op.desc]
      );
      await db.runAsync(
        'INSERT INTO incomes (description, category_id, amount, date, savings_operation_id) VALUES (?,?,?,?,?)',
        [op.desc, savWithdrawalCat.id, op.amount, op.date, result.lastInsertRowId]
      );
    } else {
      await db.runAsync(
        `INSERT INTO savings_operations (account_id, type, amount, date, description) VALUES (?, 'deposit', ?, ?, ?)`,
        [accId, op.amount, op.date, op.desc]
      );
    }
  }

  // Snapshoty
  for (const snap of RAW_SNAPSHOTS) {
    const accId = accMap[snap.acc];
    if (!accId) throw new Error(`Brak konta dla snapshotu: "${snap.acc}"`);
    await db.runAsync(
      'INSERT INTO savings_snapshots (account_id, balance, snapshot_date, note) VALUES (?,?,?,?)',
      [accId, snap.balance, snap.date, snap.note]
    );
  }
}
