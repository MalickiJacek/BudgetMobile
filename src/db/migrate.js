import { supabase } from './database';

const USD = 3.64;
const EUR = 4.26;

const RAW_EXPENSES = [
  { cat: 'Rozrywka',    amount: 130,    date: '2025-09-13', desc: 'Imprezka' },
  { cat: 'Rozrywka',    amount: 352,    date: '2025-09-13', desc: 'Restauracja rodzice' },
  { cat: 'Żywność',     amount: 79,     date: '2025-09-11', desc: 'Biedronka' },
  { cat: 'Żywność',     amount: 6,      date: '2025-09-11', desc: 'Żabka' },
  { cat: 'Rozrywka',    amount: 106,    date: '2025-09-10', desc: 'Multisport' },
  { cat: 'Mieszkanie',  amount: 590.43, date: '2025-09-10', desc: 'Czynsz' },
  { cat: 'Mieszkanie',  amount: 10,     date: '2025-09-10', desc: 'Castorama' },
  { cat: 'Mieszkanie',  amount: 7,      date: '2025-09-08', desc: 'Castorama' },
  { cat: 'Żywność',     amount: 86,     date: '2025-09-04', desc: 'Biedronka' },
  { cat: 'Mieszkanie',  amount: 205,    date: '2025-09-04', desc: 'Wiertarka' },
  { cat: 'Transport',   amount: 200,    date: '2025-09-07', desc: 'Paliwo' },
  { cat: 'Zdrowie',     amount: 250,    date: '2025-09-05', desc: 'Doktor' },
  { cat: 'Zdrowie',     amount: 450,    date: '2025-09-01', desc: 'Szczepienia' },
  { cat: 'Odzież',      amount: 170,    date: '2025-09-17', desc: 'Koszulki' },
  { cat: 'Żywność',     amount: 80,     date: '2025-09-17', desc: 'Auchan' },
  { cat: 'Żywność',     amount: 104,    date: '2025-09-22', desc: 'Sushi' },
  { cat: 'Żywność',     amount: 20,     date: '2025-09-22', desc: 'Auchan' },
  { cat: 'Transport',   amount: 110,    date: '2025-09-22', desc: 'PKP' },
  { cat: 'Transport',   amount: 200,    date: '2025-09-22', desc: 'Paliwo' },
  { cat: 'Zdrowie',     amount: 250,    date: '2025-09-22', desc: 'Doktor' },
  { cat: 'Żywność',     amount: 82,     date: '2025-09-24', desc: 'Biedronka' },
  { cat: 'Subskrypcje', amount: 25,     date: '2025-10-01', desc: 'Spotify' },
  { cat: 'Rozrywka',    amount: 7,      date: '2025-10-01', desc: 'Piłka parking' },
  { cat: 'Transport',   amount: 70,     date: '2025-10-01', desc: 'Pociąg Kraków' },
  { cat: 'Rozrywka',    amount: 133,    date: '2025-10-01', desc: 'Energylandia' },
  { cat: 'Rozrywka',    amount: 12.50,  date: '2025-10-01', desc: 'Piłka' },
  { cat: 'Żywność',     amount: 35,     date: '2025-10-01', desc: 'Biedronka' },
];

const RAW_INCOMES = [
  { cat: 'Wynagrodzenie', amount: 5739.29, date: '2025-09-08', desc: 'Wypłata — Ola' },
  { cat: 'Wynagrodzenie', amount: 5150.00, date: '2025-09-09', desc: 'Wypłata — Jacek' },
  { cat: 'Inne',          amount: 13.00,   date: '2025-09-08', desc: 'Spotify Adam' },
];

const TARGET_ACCOUNTS = [
  { name: 'Konto mieszkaniowe', color: '#1565C0' },
  { name: 'XTB IKE',           color: '#2E7D32' },
  { name: 'XTB',               color: '#6A1B9A' },
  { name: 'Freedom24',         color: '#E65100' },
  { name: 'Lokaty',            color: '#AD1457' },
  { name: 'PPK Jacek',         color: '#4527A0' },
];

const RAW_SAVINGS_OPS = [
  { acc: 'Konto mieszkaniowe', type: 'deposit',    amount: 24000.00, date: '2025-03-01', desc: 'Wpłaty Ola — historyczne' },
  { acc: 'Konto mieszkaniowe', type: 'deposit',    amount: 438.00,   date: '2025-09-14', desc: 'Odsetki — Ola' },
  { acc: 'Konto mieszkaniowe', type: 'deposit',    amount: 10000.00, date: '2024-10-10', desc: 'Wpłaty Jacek 2024' },
  { acc: 'Konto mieszkaniowe', type: 'deposit',    amount: 18000.00, date: '2025-04-14', desc: 'Wpłaty Jacek 2025' },
  { acc: 'Konto mieszkaniowe', type: 'deposit',    amount: 536.53,   date: '2025-09-14', desc: 'Odsetki — Jacek' },
  { acc: 'XTB IKE',           type: 'deposit',    amount: 7259.29,  date: '2025-08-12', desc: 'Kapitał wpłacony' },
  { acc: 'XTB IKE',           type: 'withdrawal', amount: 594.27,   date: '2025-09-29', desc: 'Wypłata' },
  { acc: 'XTB',               type: 'deposit',    amount: +(216.56 * EUR).toFixed(2), date: '2025-07-16', desc: 'Kapitał startowy XTB EURO (216.56 EUR)' },
  { acc: 'XTB',               type: 'deposit',    amount: 30000.00, date: '2021-06-14', desc: 'Środki u Bartka — start' },
  { acc: 'Freedom24',         type: 'deposit',    amount: +(681.94 * USD).toFixed(2), date: '2025-08-18', desc: 'Kapitał startowy (681.94 USD)' },
  { acc: 'Lokaty',            type: 'deposit',    amount: 81678.00, date: '2025-09-14', desc: 'Stan lokat' },
  { acc: 'PPK Jacek',         type: 'deposit',    amount: 1236.00,  date: '2025-04-01', desc: 'Wpłaty — start' },
  { acc: 'PPK Jacek',         type: 'deposit',    amount: 250.00,   date: '2025-09-14', desc: 'Dopłata Państwa' },
  { acc: 'PPK Jacek',         type: 'deposit',    amount: 927.00,   date: '2025-09-14', desc: 'Wpłaty pracodawcy' },
];

const RAW_SNAPSHOTS = [
  { acc: 'Konto mieszkaniowe', balance: 10000.00, date: '2024-10-31', note: 'Import AppBudget — Jacek' },
  { acc: 'Konto mieszkaniowe', balance: 34000.00, date: '2025-03-31', note: 'Import AppBudget — Ola + Jacek' },
  { acc: 'Konto mieszkaniowe', balance: 52000.00, date: '2025-04-30', note: 'Import AppBudget' },
  { acc: 'Konto mieszkaniowe', balance: 52974.53, date: '2025-09-30', note: 'Import AppBudget (z odsetkami)' },
  { acc: 'XTB IKE',           balance: 7781.24,  date: '2025-08-31', note: 'Import AppBudget (wycena netto PLN)' },
  { acc: 'XTB IKE',           balance: 8663.32,  date: '2025-09-30', note: 'Import AppBudget (wycena netto, po wypłacie)' },
  { acc: 'XTB',               balance: 30926.62, date: '2025-07-31', note: 'Import AppBudget (Bartek + XTB EURO 217,61 EUR)' },
  { acc: 'XTB',               balance: 30983.89, date: '2025-08-31', note: 'Import AppBudget (Bartek + XTB EURO 230,96 EUR)' },
  { acc: 'XTB',               balance: 58983.89, date: '2025-09-30', note: 'Import AppBudget (Bartek zwrot + XTB EURO)' },
  { acc: 'XTB',               balance: 59205.92, date: '2025-10-31', note: 'Import AppBudget (XTB EURO 283,08 EUR po zysku AMD)' },
  { acc: 'Freedom24',         balance: 2939.85,  date: '2025-08-31', note: 'Import AppBudget (807,65 USD × 3,64)' },
  { acc: 'Freedom24',         balance: 3320.37,  date: '2025-09-30', note: 'Import AppBudget (912,19 USD × 3,64)' },
  { acc: 'Lokaty',            balance: 81678.00, date: '2025-09-30', note: 'Import AppBudget' },
  { acc: 'PPK Jacek',         balance: 1236.00,  date: '2025-04-30', note: 'Import AppBudget — wpłaty startowe' },
  { acc: 'PPK Jacek',         balance: 2621.00,  date: '2025-09-30', note: 'Import AppBudget (z zyskami %)' },
];

export async function importFromAppBudget() {
  // Pobierz kategorie
  const { data: eCatsData } = await supabase.from('expenses_category').select('id, name');
  const eCats = {};
  (eCatsData || []).forEach(c => { eCats[c.name] = c.id; });

  const { data: iCatsData } = await supabase.from('incomes_category').select('id, name, is_savings_withdrawal');
  const iCats = {};
  (iCatsData || []).forEach(c => { iCats[c.name] = c.id; });
  const savWithdrawalCatId = iCatsData?.find(c => c.is_savings_withdrawal)?.id;

  // Utwórz konta docelowe
  for (const a of TARGET_ACCOUNTS) {
    await supabase.from('savings_accounts').insert({ name: a.name, color: a.color, is_demo: false });
  }

  const { data: accData } = await supabase.from('savings_accounts').select('id, name').eq('is_demo', false);
  const accMap = {};
  (accData || []).forEach(a => { accMap[a.name] = a.id; });

  // Wydatki
  await supabase.from('expenses').insert(
    RAW_EXPENSES.map(e => ({ description: e.desc, category_id: eCats[e.cat], amount: e.amount, date: e.date, is_demo: false }))
  );

  // Wpływy
  await supabase.from('incomes').insert(
    RAW_INCOMES.map(i => ({ description: i.desc, category_id: iCats[i.cat], amount: i.amount, date: i.date, is_demo: false }))
  );

  // Operacje oszczędnościowe
  for (const op of RAW_SAVINGS_OPS) {
    const accId = accMap[op.acc];
    if (!accId) continue;
    const { data: opData } = await supabase
      .from('savings_operations')
      .insert({ account_id: accId, type: op.type, amount: op.amount, date: op.date, description: op.desc, is_demo: false })
      .select('id')
      .single();
    if (op.type === 'withdrawal' && opData) {
      await supabase.from('incomes').insert({
        description: op.desc, category_id: savWithdrawalCatId,
        amount: op.amount, date: op.date, savings_operation_id: opData.id, is_demo: false,
      });
    }
  }

  // Snapshoty
  const snapshots = RAW_SNAPSHOTS.map(s => ({
    account_id: accMap[s.acc], balance: s.balance, snapshot_date: s.date, note: s.note, is_demo: false,
  })).filter(s => s.account_id);
  if (snapshots.length) await supabase.from('savings_snapshots').insert(snapshots);
}
