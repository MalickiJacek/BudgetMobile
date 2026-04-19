import { supabase } from './database';

const DEMO_ACCOUNTS = [
  { name: 'Konto mieszkaniowe Ola',   color: '#1565C0' },
  { name: 'Konto mieszkaniowe Jacek', color: '#1565C0' },
  { name: 'XTB IKE Jacek',           color: '#2E7D32' },
  { name: 'Freedom24 Jacek',         color: '#E65100' },
  { name: 'Lokaty Ola & Jacek',      color: '#AD1457' },
];

const INCOMES = [
  { cat: 'Wynagrodzenie', amount: 5800, date: '2026-01-10', desc: 'Wypłata styczeń — Jacek' },
  { cat: 'Wynagrodzenie', amount: 4500, date: '2026-01-10', desc: 'Wypłata styczeń — Ola' },
  { cat: 'Wynagrodzenie', amount: 5800, date: '2026-02-10', desc: 'Wypłata luty — Jacek' },
  { cat: 'Wynagrodzenie', amount: 4500, date: '2026-02-10', desc: 'Wypłata luty — Ola' },
  { cat: 'Premia',        amount: 3000, date: '2026-02-15', desc: 'Premia kwartalna' },
  { cat: 'Wynagrodzenie', amount: 5800, date: '2026-03-10', desc: 'Wypłata marzec — Jacek' },
  { cat: 'Wynagrodzenie', amount: 4500, date: '2026-03-10', desc: 'Wypłata marzec — Ola' },
  { cat: 'Sprzedaż',      amount: 800,  date: '2026-03-22', desc: 'Sprzedaż na OLX' },
  { cat: 'Wynagrodzenie', amount: 5800, date: '2026-04-10', desc: 'Wypłata kwiecień — Jacek' },
  { cat: 'Wynagrodzenie', amount: 4700, date: '2026-04-10', desc: 'Wypłata kwiecień — Ola (podwyżka)' },
  { cat: 'Inwestycje & dywidendy', amount: 420, date: '2026-04-05', desc: 'Dywidenda XTB' },
  { cat: 'Inwestycje & dywidendy', amount: 280, date: '2026-04-14', desc: 'Dywidenda Freedom24' },
];

const EXPENSES = [
  { cat: 'Mieszkanie',  amount: 2400, date: '2026-01-05', desc: 'Czynsz + media styczeń' },
  { cat: 'Żywność',     amount: 620,  date: '2026-01-08', desc: 'Biedronka, Lidl' },
  { cat: 'Żywność',     amount: 340,  date: '2026-01-16', desc: 'Tygodniowe zakupy' },
  { cat: 'Żywność',     amount: 185,  date: '2026-01-24', desc: 'Żywność' },
  { cat: 'Transport',   amount: 280,  date: '2026-01-03', desc: 'Paliwo' },
  { cat: 'Transport',   amount: 120,  date: '2026-01-20', desc: 'Komunikacja miejska' },
  { cat: 'Subskrypcje', amount: 56,   date: '2026-01-01', desc: 'Netflix, Spotify' },
  { cat: 'Zdrowie',     amount: 180,  date: '2026-01-14', desc: 'Wizyta lekarska + leki' },
  { cat: 'Sport',       amount: 150,  date: '2026-01-02', desc: 'Siłownia — abonament' },
  { cat: 'Rozrywka',    amount: 220,  date: '2026-01-19', desc: 'Restauracja, kino' },
  { cat: 'Inne',        amount: 95,   date: '2026-01-27', desc: 'Drobne zakupy' },
  { cat: 'Mieszkanie',  amount: 2400, date: '2026-02-05', desc: 'Czynsz + media luty' },
  { cat: 'Żywność',     amount: 590,  date: '2026-02-07', desc: 'Biedronka, Carrefour' },
  { cat: 'Żywność',     amount: 310,  date: '2026-02-18', desc: 'Zakupy tygodniowe' },
  { cat: 'Żywność',     amount: 420,  date: '2026-02-14', desc: 'Walentynkowa kolacja' },
  { cat: 'Transport',   amount: 260,  date: '2026-02-04', desc: 'Paliwo' },
  { cat: 'Odzież',      amount: 580,  date: '2026-02-20', desc: 'Wyprzedaż zimowa' },
  { cat: 'Subskrypcje', amount: 56,   date: '2026-02-01', desc: 'Netflix, Spotify' },
  { cat: 'Sport',       amount: 150,  date: '2026-02-02', desc: 'Siłownia — abonament' },
  { cat: 'Rozrywka',    amount: 160,  date: '2026-02-22', desc: 'Kino, wyjście' },
  { cat: 'Zdrowie',     amount: 85,   date: '2026-02-11', desc: 'Apteka' },
  { cat: 'Elektronika', amount: 349,  date: '2026-02-25', desc: 'Słuchawki' },
  { cat: 'Mieszkanie',  amount: 2400, date: '2026-03-05', desc: 'Czynsz + media marzec' },
  { cat: 'Żywność',     amount: 640,  date: '2026-03-06', desc: 'Lidl, Biedronka' },
  { cat: 'Żywność',     amount: 295,  date: '2026-03-17', desc: 'Zakupy' },
  { cat: 'Transport',   amount: 300,  date: '2026-03-03', desc: 'Paliwo' },
  { cat: 'Transport',   amount: 450,  date: '2026-03-15', desc: 'Przegląd auta' },
  { cat: 'Subskrypcje', amount: 56,   date: '2026-03-01', desc: 'Netflix, Spotify' },
  { cat: 'Sport',       amount: 150,  date: '2026-03-02', desc: 'Siłownia — abonament' },
  { cat: 'Zdrowie',     amount: 320,  date: '2026-03-10', desc: 'Dentysta' },
  { cat: 'Rozrywka',    amount: 380,  date: '2026-03-21', desc: 'Weekend w górach' },
  { cat: 'Odzież',      amount: 240,  date: '2026-03-25', desc: 'Buty sportowe' },
  { cat: 'Prezenty',    amount: 200,  date: '2026-03-28', desc: 'Urodziny' },
  { cat: 'Inne',        amount: 130,  date: '2026-03-29', desc: 'Drobne' },
  { cat: 'Mieszkanie',  amount: 2400, date: '2026-04-05', desc: 'Czynsz + media kwiecień' },
  { cat: 'Żywność',     amount: 550,  date: '2026-04-04', desc: 'Zakupy Wielkanoc' },
  { cat: 'Żywność',     amount: 210,  date: '2026-04-07', desc: 'Lidl' },
  { cat: 'Żywność',     amount: 180,  date: '2026-04-14', desc: 'Biedronka' },
  { cat: 'Transport',   amount: 280,  date: '2026-04-02', desc: 'Paliwo' },
  { cat: 'Transport',   amount: 85,   date: '2026-04-10', desc: 'Parking + autobus' },
  { cat: 'Subskrypcje', amount: 56,   date: '2026-04-01', desc: 'Netflix, Spotify' },
  { cat: 'Subskrypcje', amount: 35,   date: '2026-04-01', desc: 'ChatGPT Plus' },
  { cat: 'Sport',       amount: 150,  date: '2026-04-01', desc: 'Siłownia — abonament' },
  { cat: 'Rozrywka',    amount: 280,  date: '2026-04-06', desc: 'Wielkanocny wyjazd' },
  { cat: 'Zdrowie',     amount: 120,  date: '2026-04-03', desc: 'Apteka, suplementy' },
  { cat: 'Elektronika', amount: 499,  date: '2026-04-12', desc: 'Klawiatura mechaniczna' },
  { cat: 'Prezenty',    amount: 160,  date: '2026-04-15', desc: 'Prezent urodzinowy' },
];

const DEPOSITS = [
  { acc: 'Konto mieszkaniowe Ola',   amount: 500,  date: '2026-01-12', desc: 'Comiesięczna wpłata' },
  { acc: 'Konto mieszkaniowe Jacek', amount: 500,  date: '2026-01-12', desc: 'Comiesięczna wpłata' },
  { acc: 'XTB IKE Jacek',           amount: 700,  date: '2026-01-15', desc: 'IKE styczeń' },
  { acc: 'Lokaty Ola & Jacek',      amount: 1000, date: '2026-01-20', desc: 'Nowa lokata' },
  { acc: 'Konto mieszkaniowe Ola',   amount: 500,  date: '2026-02-12', desc: 'Comiesięczna wpłata' },
  { acc: 'Konto mieszkaniowe Jacek', amount: 500,  date: '2026-02-12', desc: 'Comiesięczna wpłata' },
  { acc: 'XTB IKE Jacek',           amount: 700,  date: '2026-02-15', desc: 'IKE luty' },
  { acc: 'Freedom24 Jacek',         amount: 1500, date: '2026-02-18', desc: 'Zakup ETF' },
  { acc: 'Konto mieszkaniowe Ola',   amount: 500,  date: '2026-03-12', desc: 'Comiesięczna wpłata' },
  { acc: 'Konto mieszkaniowe Jacek', amount: 500,  date: '2026-03-12', desc: 'Comiesięczna wpłata' },
  { acc: 'XTB IKE Jacek',           amount: 700,  date: '2026-03-15', desc: 'IKE marzec' },
  { acc: 'Freedom24 Jacek',         amount: 1000, date: '2026-03-20', desc: 'Zakup ETF' },
  { acc: 'Lokaty Ola & Jacek',      amount: 2000, date: '2026-03-25', desc: 'Premia na lokatę' },
  { acc: 'Konto mieszkaniowe Ola',   amount: 500,  date: '2026-04-05', desc: 'Comiesięczna wpłata' },
  { acc: 'Konto mieszkaniowe Jacek', amount: 500,  date: '2026-04-05', desc: 'Comiesięczna wpłata' },
  { acc: 'XTB IKE Jacek',           amount: 700,  date: '2026-04-06', desc: 'IKE kwiecień' },
  { acc: 'Freedom24 Jacek',         amount: 800,  date: '2026-04-10', desc: 'Zakup ETF kwiecień' },
];

const WITHDRAWAL = { acc: 'Lokaty Ola & Jacek', amount: 1200, date: '2026-03-10', desc: 'Wypłata z lokaty na remont' };

const SNAPSHOTS = [
  { acc: 'Konto mieszkaniowe Ola',   balance: 8500,  date: '2026-01-31', note: 'Koniec stycznia' },
  { acc: 'Konto mieszkaniowe Jacek', balance: 6200,  date: '2026-01-31', note: 'Koniec stycznia' },
  { acc: 'XTB IKE Jacek',           balance: 12400, date: '2026-01-31', note: 'Koniec stycznia' },
  { acc: 'Freedom24 Jacek',         balance: 9800,  date: '2026-01-31', note: 'Koniec stycznia' },
  { acc: 'Lokaty Ola & Jacek',      balance: 15200, date: '2026-01-31', note: 'Koniec stycznia' },
  { acc: 'Konto mieszkaniowe Ola',   balance: 9050,  date: '2026-02-28', note: 'Koniec lutego' },
  { acc: 'Konto mieszkaniowe Jacek', balance: 6750,  date: '2026-02-28', note: 'Koniec lutego' },
  { acc: 'XTB IKE Jacek',           balance: 13180, date: '2026-02-28', note: 'Wycena wzrosła' },
  { acc: 'Freedom24 Jacek',         balance: 11650, date: '2026-02-28', note: 'Po zakupie ETF' },
  { acc: 'Lokaty Ola & Jacek',      balance: 15340, date: '2026-02-28', note: 'Odsetki' },
  { acc: 'Konto mieszkaniowe Ola',   balance: 9590,  date: '2026-03-31', note: 'Koniec marca' },
  { acc: 'Konto mieszkaniowe Jacek', balance: 7290,  date: '2026-03-31', note: 'Koniec marca' },
  { acc: 'XTB IKE Jacek',           balance: 14050, date: '2026-03-31', note: 'Wzrost wyceny' },
  { acc: 'Freedom24 Jacek',         balance: 12820, date: '2026-03-31', note: 'Po zakupie ETF' },
  { acc: 'Lokaty Ola & Jacek',      balance: 16890, date: '2026-03-31', note: 'Premia + odsetki' },
  { acc: 'Konto mieszkaniowe Ola',   balance: 10090, date: '2026-04-15', note: 'Połowa kwietnia' },
  { acc: 'Konto mieszkaniowe Jacek', balance: 7790,  date: '2026-04-15', note: 'Połowa kwietnia' },
  { acc: 'XTB IKE Jacek',           balance: 15210, date: '2026-04-15', note: 'Wzrost po korekcie' },
  { acc: 'Freedom24 Jacek',         balance: 13950, date: '2026-04-15', note: 'Po zakupie + wzrost' },
  { acc: 'Lokaty Ola & Jacek',      balance: 17120, date: '2026-04-15', note: 'Odsetki kwartalne' },
];

export async function seedDemoData() {
  const { data: eCatsData } = await supabase.from('expenses_category').select('id, name');
  const expCats = {};
  (eCatsData || []).forEach(c => { expCats[c.name] = c.id; });

  const { data: iCatsData } = await supabase.from('incomes_category').select('id, name');
  const incCats = {};
  (iCatsData || []).forEach(c => { incCats[c.name] = c.id; });
  const withdrawalCatId = iCatsData?.find(c => c.name === 'Wypłata z oszczędności')?.id;

  // Utwórz konta demo
  for (const a of DEMO_ACCOUNTS) {
    await supabase.from('savings_accounts').insert({ name: a.name, color: a.color, is_demo: true });
  }
  const { data: accData } = await supabase.from('savings_accounts').select('id, name').eq('is_demo', true);
  const savAccs = {};
  (accData || []).forEach(a => { savAccs[a.name] = a.id; });

  // Wpływy
  await supabase.from('incomes').insert(
    INCOMES.map(i => ({ description: i.desc, category_id: incCats[i.cat], amount: i.amount, date: i.date, is_demo: true }))
  );

  // Wydatki
  await supabase.from('expenses').insert(
    EXPENSES.map(e => ({ description: e.desc, category_id: expCats[e.cat], amount: e.amount, date: e.date, is_demo: true }))
  );

  // Wpłaty
  for (const d of DEPOSITS) {
    if (!savAccs[d.acc]) continue;
    await supabase.from('savings_operations').insert({
      account_id: savAccs[d.acc], type: 'deposit', amount: d.amount, date: d.date, description: d.desc, is_demo: true,
    });
  }

  // Wypłata (auto-wpływ)
  if (savAccs[WITHDRAWAL.acc]) {
    const { data: wOp } = await supabase
      .from('savings_operations')
      .insert({ account_id: savAccs[WITHDRAWAL.acc], type: 'withdrawal', amount: WITHDRAWAL.amount, date: WITHDRAWAL.date, description: WITHDRAWAL.desc, is_demo: true })
      .select('id').single();
    if (wOp) {
      await supabase.from('incomes').insert({
        description: WITHDRAWAL.desc, category_id: withdrawalCatId,
        amount: WITHDRAWAL.amount, date: WITHDRAWAL.date, savings_operation_id: wOp.id, is_demo: true,
      });
    }
  }

  // Snapshoty
  for (const snap of SNAPSHOTS) {
    if (!savAccs[snap.acc]) continue;
    await supabase.from('savings_snapshots').insert({
      account_id: savAccs[snap.acc], balance: snap.balance, snapshot_date: snap.date, note: snap.note, is_demo: true,
    });
  }
}
