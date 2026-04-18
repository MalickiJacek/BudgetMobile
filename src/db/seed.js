// Dane demonstracyjne — kilka miesięcy historii
export async function seedDemoData(db) {
  // Pobierz ID kategorii
  const expCats = {};
  const eCats = await db.getAllAsync('SELECT id, name FROM expenses_category');
  eCats.forEach(c => { expCats[c.name] = c.id; });

  const incCats = {};
  const iCats = await db.getAllAsync('SELECT id, name FROM incomes_category');
  iCats.forEach(c => { incCats[c.name] = c.id; });

  const savAccs = {};
  const accs = await db.getAllAsync('SELECT id, name FROM savings_accounts');
  accs.forEach(a => { savAccs[a.name] = a.id; });

  // ─── WPŁYWY ───────────────────────────────────────────────
  const incomes = [
    // Styczeń
    { cat: 'Wynagrodzenie', amount: 5800, date: '2026-01-10', desc: 'Wypłata styczeń' },
    { cat: 'Wynagrodzenie', amount: 4500, date: '2026-01-10', desc: 'Wypłata styczeń' },
    // Luty
    { cat: 'Wynagrodzenie', amount: 5800, date: '2026-02-10', desc: 'Wypłata luty' },
    { cat: 'Wynagrodzenie', amount: 4500, date: '2026-02-10', desc: 'Wypłata luty' },
    { cat: 'Premia',        amount: 3000, date: '2026-02-15', desc: 'Premia kwartalna' },
    // Marzec
    { cat: 'Wynagrodzenie', amount: 5800, date: '2026-03-10', desc: 'Wypłata marzec' },
    { cat: 'Wynagrodzenie', amount: 4500, date: '2026-03-10', desc: 'Wypłata marzec' },
    { cat: 'Sprzedaż',      amount: 800,  date: '2026-03-22', desc: 'Sprzedaż na OLX' },
    // Kwiecień
    { cat: 'Wynagrodzenie', amount: 5800, date: '2026-04-10', desc: 'Wypłata kwiecień' },
    { cat: 'Wynagrodzenie', amount: 4700, date: '2026-04-10', desc: 'Wypłata kwiecień (podwyżka)' },
    { cat: 'Inwestycje & dywidendy', amount: 420, date: '2026-04-05', desc: 'Dywidenda XTB' },
  ];

  for (const i of incomes) {
    await db.runAsync(
      'INSERT INTO incomes (description, category_id, amount, date) VALUES (?,?,?,?)',
      [i.desc, incCats[i.cat], i.amount, i.date]
    );
  }

  // ─── WYDATKI ──────────────────────────────────────────────
  const expenses = [
    // Styczeń
    { cat: 'Mieszkanie',   amount: 2400, date: '2026-01-05', desc: 'Czynsz + media styczeń' },
    { cat: 'Żywność',      amount: 620,  date: '2026-01-08', desc: 'Biedronka, Lidl' },
    { cat: 'Żywność',      amount: 340,  date: '2026-01-16', desc: 'Tygodniowe zakupy' },
    { cat: 'Żywność',      amount: 185,  date: '2026-01-24', desc: 'Żywność' },
    { cat: 'Transport',    amount: 280,  date: '2026-01-03', desc: 'Paliwo' },
    { cat: 'Transport',    amount: 120,  date: '2026-01-20', desc: 'Komunikacja miejska' },
    { cat: 'Subskrypcje',  amount: 56,   date: '2026-01-01', desc: 'Netflix, Spotify' },
    { cat: 'Zdrowie',      amount: 180,  date: '2026-01-14', desc: 'Wizyta lekarska + leki' },
    { cat: 'Sport',        amount: 150,  date: '2026-01-02', desc: 'Siłownia — abonament' },
    { cat: 'Rozrywka',     amount: 220,  date: '2026-01-19', desc: 'Restauracja, kino' },
    { cat: 'Inne',         amount: 95,   date: '2026-01-27', desc: 'Drobne zakupy' },

    // Luty
    { cat: 'Mieszkanie',   amount: 2400, date: '2026-02-05', desc: 'Czynsz + media luty' },
    { cat: 'Żywność',      amount: 590,  date: '2026-02-07', desc: 'Biedronka, Carrefour' },
    { cat: 'Żywność',      amount: 310,  date: '2026-02-18', desc: 'Zakupy tygodniowe' },
    { cat: 'Żywność',      amount: 420,  date: '2026-02-14', desc: 'Walentynkowa kolacja' },
    { cat: 'Transport',    amount: 260,  date: '2026-02-04', desc: 'Paliwo' },
    { cat: 'Odzież',       amount: 580,  date: '2026-02-20', desc: 'Wyprzedaż zimowa' },
    { cat: 'Subskrypcje',  amount: 56,   date: '2026-02-01', desc: 'Netflix, Spotify' },
    { cat: 'Sport',        amount: 150,  date: '2026-02-02', desc: 'Siłownia — abonament' },
    { cat: 'Rozrywka',     amount: 160,  date: '2026-02-22', desc: 'Kino, wyjście' },
    { cat: 'Zdrowie',      amount: 85,   date: '2026-02-11', desc: 'Apteka' },
    { cat: 'Elektronika',  amount: 349,  date: '2026-02-25', desc: 'Słuchawki' },

    // Marzec
    { cat: 'Mieszkanie',   amount: 2400, date: '2026-03-05', desc: 'Czynsz + media marzec' },
    { cat: 'Żywność',      amount: 640,  date: '2026-03-06', desc: 'Lidl, Biedronka' },
    { cat: 'Żywność',      amount: 295,  date: '2026-03-17', desc: 'Zakupy' },
    { cat: 'Transport',    amount: 300,  date: '2026-03-03', desc: 'Paliwo' },
    { cat: 'Transport',    amount: 450,  date: '2026-03-15', desc: 'Przegląd auta' },
    { cat: 'Subskrypcje',  amount: 56,   date: '2026-03-01', desc: 'Netflix, Spotify' },
    { cat: 'Sport',        amount: 150,  date: '2026-03-02', desc: 'Siłownia — abonament' },
    { cat: 'Zdrowie',      amount: 320,  date: '2026-03-10', desc: 'Dentysta' },
    { cat: 'Rozrywka',     amount: 380,  date: '2026-03-21', desc: 'Weekend w górach' },
    { cat: 'Odzież',       amount: 240,  date: '2026-03-25', desc: 'Buty sportowe' },
    { cat: 'Prezenty',     amount: 200,  date: '2026-03-28', desc: 'Urodziny' },
    { cat: 'Inne',         amount: 130,  date: '2026-03-29', desc: 'Drobne' },

    // Kwiecień (bieżący)
    { cat: 'Mieszkanie',   amount: 2400, date: '2026-04-05', desc: 'Czynsz + media kwiecień' },
    { cat: 'Żywność',      amount: 550,  date: '2026-04-04', desc: 'Zakupy Wielkanoc' },
    { cat: 'Żywność',      amount: 210,  date: '2026-04-07', desc: 'Lidl' },
    { cat: 'Transport',    amount: 280,  date: '2026-04-02', desc: 'Paliwo' },
    { cat: 'Subskrypcje',  amount: 56,   date: '2026-04-01', desc: 'Netflix, Spotify' },
    { cat: 'Sport',        amount: 150,  date: '2026-04-01', desc: 'Siłownia — abonament' },
    { cat: 'Rozrywka',     amount: 280,  date: '2026-04-06', desc: 'Wielkanocny wyjazd' },
    { cat: 'Zdrowie',      amount: 120,  date: '2026-04-03', desc: 'Apteka, suplementy' },
  ];

  for (const e of expenses) {
    await db.runAsync(
      'INSERT INTO expenses (description, category_id, amount, date) VALUES (?,?,?,?)',
      [e.desc, expCats[e.cat], e.amount, e.date]
    );
  }

  // ─── OSZCZĘDNOŚCI — WPŁATY ────────────────────────────────
  const withdrawalCatId = incCats['Wypłata z oszczędności'];

  const deposits = [
    // Styczeń
    { acc: 'Konto mieszkaniowe Ola',     amount: 500,  date: '2026-01-12', desc: 'Comiesięczna wpłata' },
    { acc: 'Konto mieszkaniowe Jacek',   amount: 500,  date: '2026-01-12', desc: 'Comiesięczna wpłata' },
    { acc: 'XTB IKE Jacek',             amount: 700,  date: '2026-01-15', desc: 'IKE styczeń' },
    { acc: 'Lokaty Ola & Jacek',         amount: 1000, date: '2026-01-20', desc: 'Nowa lokata' },
    // Luty
    { acc: 'Konto mieszkaniowe Ola',     amount: 500,  date: '2026-02-12', desc: 'Comiesięczna wpłata' },
    { acc: 'Konto mieszkaniowe Jacek',   amount: 500,  date: '2026-02-12', desc: 'Comiesięczna wpłata' },
    { acc: 'XTB IKE Jacek',             amount: 700,  date: '2026-02-15', desc: 'IKE luty' },
    { acc: 'Freedom24 Jacek',           amount: 1500, date: '2026-02-18', desc: 'Zakup ETF' },
    // Marzec
    { acc: 'Konto mieszkaniowe Ola',     amount: 500,  date: '2026-03-12', desc: 'Comiesięczna wpłata' },
    { acc: 'Konto mieszkaniowe Jacek',   amount: 500,  date: '2026-03-12', desc: 'Comiesięczna wpłata' },
    { acc: 'XTB IKE Jacek',             amount: 700,  date: '2026-03-15', desc: 'IKE marzec' },
    { acc: 'Freedom24 Jacek',           amount: 1000, date: '2026-03-20', desc: 'Zakup ETF' },
    { acc: 'Lokaty Ola & Jacek',         amount: 2000, date: '2026-03-25', desc: 'Premia na lokatę' },
    // Kwiecień
    { acc: 'Konto mieszkaniowe Ola',     amount: 500,  date: '2026-04-05', desc: 'Comiesięczna wpłata' },
    { acc: 'Konto mieszkaniowe Jacek',   amount: 500,  date: '2026-04-05', desc: 'Comiesięczna wpłata' },
    { acc: 'XTB IKE Jacek',             amount: 700,  date: '2026-04-06', desc: 'IKE kwiecień' },
  ];

  for (const d of deposits) {
    await db.runAsync(
      `INSERT INTO savings_operations (account_id, type, amount, date, description)
       VALUES (?, 'deposit', ?, ?, ?)`,
      [savAccs[d.acc], d.amount, d.date, d.desc]
    );
  }

  // ─── OSZCZĘDNOŚCI — WYPŁATA (auto-wpływ) ─────────────────
  const withdrawal = {
    acc: 'Lokaty Ola & Jacek', amount: 1200, date: '2026-03-10', desc: 'Wypłata z lokaty na remont'
  };
  const wResult = await db.runAsync(
    `INSERT INTO savings_operations (account_id, type, amount, date, description)
     VALUES (?, 'withdrawal', ?, ?, ?)`,
    [savAccs[withdrawal.acc], withdrawal.amount, withdrawal.date, withdrawal.desc]
  );
  await db.runAsync(
    'INSERT INTO incomes (description, category_id, amount, date, savings_operation_id) VALUES (?,?,?,?,?)',
    [withdrawal.desc, withdrawalCatId, withdrawal.amount, withdrawal.date, wResult.lastInsertRowId]
  );

  // ─── SNAPSHOTY STANU KONT ─────────────────────────────────
  const snapshots = [
    // Styczeń (koniec)
    { acc: 'Konto mieszkaniowe Ola',   balance: 8500,  date: '2026-01-31', note: 'Koniec stycznia' },
    { acc: 'Konto mieszkaniowe Jacek', balance: 6200,  date: '2026-01-31', note: 'Koniec stycznia' },
    { acc: 'XTB IKE Jacek',           balance: 12400, date: '2026-01-31', note: 'Koniec stycznia' },
    { acc: 'Freedom24 Jacek',         balance: 9800,  date: '2026-01-31', note: 'Koniec stycznia' },
    { acc: 'Lokaty Ola & Jacek',      balance: 15200, date: '2026-01-31', note: 'Koniec stycznia' },
    // Luty (koniec)
    { acc: 'Konto mieszkaniowe Ola',   balance: 9050,  date: '2026-02-28', note: 'Koniec lutego' },
    { acc: 'Konto mieszkaniowe Jacek', balance: 6750,  date: '2026-02-28', note: 'Koniec lutego' },
    { acc: 'XTB IKE Jacek',           balance: 13180, date: '2026-02-28', note: 'Wycena wzrosła' },
    { acc: 'Freedom24 Jacek',         balance: 11650, date: '2026-02-28', note: 'Po zakupie ETF' },
    { acc: 'Lokaty Ola & Jacek',      balance: 15340, date: '2026-02-28', note: 'Odsetki' },
    // Marzec (koniec)
    { acc: 'Konto mieszkaniowe Ola',   balance: 9590,  date: '2026-03-31', note: 'Koniec marca' },
    { acc: 'Konto mieszkaniowe Jacek', balance: 7290,  date: '2026-03-31', note: 'Koniec marca' },
    { acc: 'XTB IKE Jacek',           balance: 14050, date: '2026-03-31', note: 'Wzrost wyceny' },
    { acc: 'Freedom24 Jacek',         balance: 12820, date: '2026-03-31', note: 'Po zakupie ETF' },
    { acc: 'Lokaty Ola & Jacek',      balance: 16890, date: '2026-03-31', note: 'Premia + odsetki' },
  ];

  for (const snap of snapshots) {
    await db.runAsync(
      'INSERT INTO savings_snapshots (account_id, balance, snapshot_date, note) VALUES (?,?,?,?)',
      [savAccs[snap.acc], snap.balance, snap.date, snap.note]
    );
  }
}

export async function clearAllData(db) {
  await db.execAsync(`
    DELETE FROM savings_snapshots;
    DELETE FROM savings_operations;
    DELETE FROM incomes WHERE savings_operation_id IS NOT NULL;
    DELETE FROM incomes;
    DELETE FROM expenses;
  `);
}
