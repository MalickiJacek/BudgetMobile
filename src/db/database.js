import * as SQLite from 'expo-sqlite';

let db;

export async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('budget2.db');
  }
  return db;
}

export async function initDb() {
  const db = await getDb();

  await db.execAsync(`PRAGMA journal_mode = WAL;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS expenses_category (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS incomes_category (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT NOT NULL UNIQUE,
      is_savings_withdrawal INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT,
      category_id INTEGER NOT NULL REFERENCES expenses_category(id),
      amount      REAL NOT NULL,
      date        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incomes (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      description          TEXT,
      category_id          INTEGER NOT NULL REFERENCES incomes_category(id),
      amount               REAL NOT NULL,
      date                 TEXT NOT NULL,
      savings_operation_id INTEGER,
      created_at           TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_accounts (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#1565C0'
    );

    CREATE TABLE IF NOT EXISTS savings_operations (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL REFERENCES savings_accounts(id),
      type       TEXT NOT NULL CHECK(type IN ('deposit','withdrawal')),
      amount     REAL NOT NULL,
      date       TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS savings_snapshots (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id    INTEGER NOT NULL REFERENCES savings_accounts(id),
      balance       REAL NOT NULL,
      snapshot_date TEXT NOT NULL,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );
  `);

  const { cnt } = await db.getFirstAsync('SELECT COUNT(*) as cnt FROM expenses_category');
  if (cnt === 0) {
    await db.execAsync(`
      INSERT INTO expenses_category (name) VALUES
        ('Mieszkanie'),('Żywność'),('Transport'),('Zdrowie'),
        ('Rozrywka'),('Odzież'),('Elektronika'),('Subskrypcje'),
        ('Sport'),('Wakacje & podróże'),('Prezenty'),('Inne');

      INSERT INTO incomes_category (name, is_savings_withdrawal) VALUES
        ('Wynagrodzenie', 0),
        ('Premia', 0),
        ('Inwestycje & dywidendy', 0),
        ('Sprzedaż', 0),
        ('Inne', 0),
        ('Wypłata z oszczędności', 1);

      INSERT INTO savings_accounts (name, color) VALUES
        ('Konto mieszkaniowe Ola', '#1565C0'),
        ('Konto mieszkaniowe Jacek', '#6A1B9A'),
        ('XTB IKE Jacek', '#2E7D32'),
        ('Freedom24 Jacek', '#E65100'),
        ('Lokaty Ola & Jacek', '#AD1457');
    `);
  }
}

// Dodaje wpłatę na konto oszczędnościowe
export async function addDeposit(db, { account_id, amount, date, description }) {
  await db.runAsync(
    `INSERT INTO savings_operations (account_id, type, amount, date, description)
     VALUES (?, 'deposit', ?, ?, ?)`,
    [account_id, amount, date, description || null]
  );
}

// Dodaje wypłatę z konta oszczędnościowego + auto-wpis w Wpływach
export async function addWithdrawal(db, { account_id, amount, date, description, accountName }) {
  const result = await db.runAsync(
    `INSERT INTO savings_operations (account_id, type, amount, date, description)
     VALUES (?, 'withdrawal', ?, ?, ?)`,
    [account_id, amount, date, description || null]
  );
  const opId = result.lastInsertRowId;

  const { id: catId } = await db.getFirstAsync(
    `SELECT id FROM incomes_category WHERE is_savings_withdrawal=1 LIMIT 1`
  );

  await db.runAsync(
    `INSERT INTO incomes (description, category_id, amount, date, savings_operation_id)
     VALUES (?, ?, ?, ?, ?)`,
    [description || `Wypłata z: ${accountName}`, catId, amount, date, opId]
  );
}
