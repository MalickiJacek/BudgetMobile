import * as SQLite from 'expo-sqlite';
import { importFromAppBudget } from './migrate';

let isDemoMode = false;
let db = null;

export function setDemoMode(demo) {
  if (isDemoMode !== demo) {
    isDemoMode = demo;
    db = null;
  }
}

export async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync(isDemoMode ? 'budget_demo.db' : 'budget2.db');
    await setupTables(db);
  }
  return db;
}

async function setupTables(database) {
  await database.execAsync(`PRAGMA journal_mode = WAL;`);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_metadata (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS expenses_category (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS incomes_category (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                  TEXT NOT NULL UNIQUE,
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
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id  INTEGER NOT NULL REFERENCES savings_accounts(id),
      type        TEXT NOT NULL CHECK(type IN ('deposit','withdrawal')),
      amount      REAL NOT NULL,
      date        TEXT NOT NULL,
      description TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
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

  const { cnt } = await database.getFirstAsync('SELECT COUNT(*) as cnt FROM expenses_category');
  if (cnt === 0) {
    await database.execAsync(`
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
    `);
  }
}

export async function initDb() {
  const database = await getDb();

  if (!isDemoMode) {
    // Sprawdź czy migracja z AppBudget już się odbyła
    const meta = await database.getFirstAsync(
      "SELECT value FROM app_metadata WHERE key='real_data_imported'"
    );

    if (!meta) {
      // Wyczyść wszystkie dane (w tym demo które się zmieszało)
      await database.execAsync(`
        DELETE FROM savings_snapshots;
        DELETE FROM savings_operations;
        DELETE FROM incomes;
        DELETE FROM expenses;
        DELETE FROM savings_accounts;
      `);

      // Importuj prawdziwe dane z AppBudget
      await importFromAppBudget(database);

      // Oznacz jako wykonane — nie uruchomi się ponownie
      await database.runAsync(
        "INSERT INTO app_metadata (key, value) VALUES ('real_data_imported', '1')"
      );
    }
  }
}

export async function addDeposit(db, { account_id, amount, date, description }) {
  await db.runAsync(
    `INSERT INTO savings_operations (account_id, type, amount, date, description)
     VALUES (?, 'deposit', ?, ?, ?)`,
    [account_id, amount, date, description || null]
  );
}

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
