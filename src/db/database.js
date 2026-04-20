import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lmiamituhrcnnzhsvlhe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxtaWFtaXR1aHJjbm56aHN2bGhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTM5MTIsImV4cCI6MjA5MjE4OTkxMn0.aMx8eVq_nPp0l1cDgXhrn4W3yXloJJ7aQoYPhOLOS0E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let _demo = false;
export const setDemoMode = (v) => { _demo = v; };
export const isDemoActive = () => _demo;

// ── INIT ─────────────────────────────────────────────────────────────────────

export async function initDb() {
  const { error } = await supabase.from('expenses_category').select('id').limit(1);
  if (error) throw new Error('Brak połączenia z bazą danych: ' + error.message);
}


// ── EXPENSES ─────────────────────────────────────────────────────────────────

export async function fetchExpenses() {
  const { data } = await supabase
    .from('expenses')
    .select('id, description, amount, date, category_id, expenses_category(name)')
    .eq('is_demo', _demo)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  return (data || []).map(e => ({
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    date: e.date,
    category_id: e.category_id,
    category: e.expenses_category?.name,
  }));
}

export async function fetchExpenseCategories() {
  const { data } = await supabase
    .from('expenses_category')
    .select('id, name')
    .order('name');
  return data || [];
}

export async function addExpense({ description, category_id, amount, date }) {
  await supabase.from('expenses').insert({ description: description || null, category_id, amount, date, is_demo: _demo });
}

export async function updateExpense(id, { description, category_id, amount, date }) {
  await supabase.from('expenses').update({ description: description || null, category_id, amount, date }).eq('id', id);
}

export async function deleteExpense(id) {
  await supabase.from('expenses').delete().eq('id', id);
}

export async function addExpenseCategory(name) {
  const { error } = await supabase.from('expenses_category').insert({ name });
  if (error) throw error;
}

export async function deleteExpenseCategory(id) {
  await supabase.from('expenses_category').delete().eq('id', id);
}

export async function countExpensesByCategory(categoryId) {
  const { count } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('is_demo', _demo);
  return count || 0;
}

// ── INCOMES ──────────────────────────────────────────────────────────────────

export async function fetchIncomes() {
  const { data } = await supabase
    .from('incomes')
    .select('id, description, amount, date, category_id, savings_operation_id, incomes_category(name, is_savings_withdrawal)')
    .eq('is_demo', _demo)
    .order('date', { ascending: false })
    .order('id', { ascending: false });
  return (data || []).map(i => ({
    id: i.id,
    description: i.description,
    amount: Number(i.amount),
    date: i.date,
    category_id: i.category_id,
    savings_operation_id: i.savings_operation_id,
    category: i.incomes_category?.name,
    is_savings_withdrawal: i.incomes_category?.is_savings_withdrawal ? 1 : 0,
  }));
}

export async function fetchIncomeCategories() {
  const { data } = await supabase
    .from('incomes_category')
    .select('id, name, is_savings_withdrawal')
    .eq('is_savings_withdrawal', false)
    .order('name');
  return data || [];
}

export async function addIncome({ description, category_id, amount, date }) {
  await supabase.from('incomes').insert({ description: description || null, category_id, amount, date, is_demo: _demo });
}

export async function updateIncome(id, { description, category_id, amount, date }) {
  await supabase.from('incomes').update({ description: description || null, category_id, amount, date }).eq('id', id);
}

export async function deleteIncome(id) {
  await supabase.from('incomes').delete().eq('id', id);
}

export async function addIncomeCategory(name) {
  const { error } = await supabase.from('incomes_category').insert({ name, is_savings_withdrawal: false });
  if (error) throw error;
}

export async function deleteIncomeCategory(id) {
  await supabase.from('incomes_category').delete().eq('id', id);
}

export async function countIncomesByCategory(categoryId) {
  const { count } = await supabase
    .from('incomes')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('is_demo', _demo);
  return count || 0;
}

// ── SAVINGS ACCOUNTS ─────────────────────────────────────────────────────────

export async function fetchSavingsAccounts() {
  const [{ data: accounts }, { data: snapshots }] = await Promise.all([
    supabase.from('savings_accounts').select('id, name, color').eq('is_demo', _demo).order('id'),
    supabase.from('savings_snapshots').select('account_id, balance, snapshot_date').eq('is_demo', _demo)
      .order('snapshot_date', { ascending: false }).order('id', { ascending: false }),
  ]);

  const latestSnap = {};
  (snapshots || []).forEach(s => {
    if (!latestSnap[s.account_id]) latestSnap[s.account_id] = s;
  });

  return (accounts || []).map(a => ({
    ...a,
    last_balance: latestSnap[a.id] ? Number(latestSnap[a.id].balance) : null,
    last_date: latestSnap[a.id]?.snapshot_date ?? null,
  }));
}

export async function addSavingsAccount({ name, color }) {
  await supabase.from('savings_accounts').insert({ name, color, is_demo: _demo });
}

// ── SAVINGS OPERATIONS ───────────────────────────────────────────────────────

export async function fetchSavingsOperations({ accountId = null, limit = 60 } = {}) {
  let query = supabase
    .from('savings_operations')
    .select('id, type, amount, date, description, account_id, savings_accounts(name, color)')
    .eq('is_demo', _demo)
    .order('date', { ascending: false })
    .order('id', { ascending: false });

  if (accountId) query = query.eq('account_id', accountId);
  if (limit) query = query.limit(limit);

  const { data } = await query;
  return (data || []).map(op => ({
    id: op.id,
    type: op.type,
    amount: Number(op.amount),
    date: op.date,
    description: op.description,
    account_id: op.account_id,
    account_name: op.savings_accounts?.name,
    color: op.savings_accounts?.color,
  }));
}

export async function addDeposit({ account_id, amount, date, description }) {
  await supabase.from('savings_operations').insert({
    account_id, type: 'deposit', amount, date,
    description: description || null,
    is_demo: _demo,
  });
}

export async function addWithdrawal({ account_id, amount, date, description, accountName }) {
  const { data: op } = await supabase
    .from('savings_operations')
    .insert({ account_id, type: 'withdrawal', amount, date, description: description || null, is_demo: _demo })
    .select('id')
    .single();

  const { data: cat } = await supabase
    .from('incomes_category')
    .select('id')
    .eq('is_savings_withdrawal', true)
    .single();

  await supabase.from('incomes').insert({
    description: description || `Wypłata z: ${accountName}`,
    category_id: cat.id,
    amount,
    date,
    savings_operation_id: op.id,
    is_demo: _demo,
  });
}

export async function deleteOperation(id, type) {
  await supabase.from('savings_operations').delete().eq('id', id);
  if (type === 'withdrawal') {
    await supabase.from('incomes').delete().eq('savings_operation_id', id);
  }
}

// ── SAVINGS SNAPSHOTS ────────────────────────────────────────────────────────

export async function fetchSavingsSnapshots(accountId) {
  const { data } = await supabase
    .from('savings_snapshots')
    .select('id, balance, snapshot_date, account_id')
    .eq('account_id', accountId)
    .eq('is_demo', _demo)
    .order('snapshot_date', { ascending: true })
    .order('id', { ascending: true });
  return (data || []).map(s => ({ ...s, balance: Number(s.balance) }));
}

export async function fetchAllSnapshots() {
  const { data } = await supabase
    .from('savings_snapshots')
    .select('account_id, balance, snapshot_date')
    .eq('is_demo', _demo)
    .order('snapshot_date', { ascending: true })
    .order('id', { ascending: true });
  return (data || []).map(s => ({ ...s, balance: Number(s.balance) }));
}

export async function addSnapshot({ account_id, balance, snapshot_date, note }) {
  await supabase.from('savings_snapshots').insert({
    account_id, balance, snapshot_date,
    note: note || null,
    is_demo: _demo,
  });
}

// ── DEMO ─────────────────────────────────────────────────────────────────────

export async function countDemoExpenses() {
  const { count } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('is_demo', true);
  return count || 0;
}

export async function reassignExpensesCategory(oldId, newId) {
  await supabase.from('expenses').update({ category_id: newId }).eq('category_id', oldId).eq('is_demo', _demo);
}

export async function reassignIncomesCategory(oldId, newId) {
  await supabase.from('incomes').update({ category_id: newId }).eq('category_id', oldId).eq('is_demo', _demo);
}

export async function clearDemoData() {
  await supabase.from('savings_snapshots').delete().eq('is_demo', true);
  await supabase.from('savings_operations').delete().eq('is_demo', true);
  await supabase.from('incomes').delete().eq('is_demo', true);
  await supabase.from('expenses').delete().eq('is_demo', true);
  await supabase.from('savings_accounts').delete().eq('is_demo', true);
}
