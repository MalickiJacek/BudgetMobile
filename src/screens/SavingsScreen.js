import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList,
  TouchableOpacity, Modal, TextInput, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDb, addDeposit, addWithdrawal } from '../db/database';

const today = () => new Date().toISOString().split('T')[0];

const COLORS = ['#1565C0','#6A1B9A','#2E7D32','#E65100','#AD1457','#00838F','#F57F17','#37474F'];

export default function SavingsScreen({ navigation }) {
  const [tab, setTab] = useState('accounts');
  const [accounts, setAccounts] = useState([]);
  const [operations, setOperations] = useState([]);

  const [opModal, setOpModal] = useState(false);
  const [opType, setOpType] = useState('deposit'); // 'deposit' | 'withdrawal'
  const [snapshotModal, setSnapshotModal] = useState(false);
  const [accountModal, setAccountModal] = useState(false);

  const [opForm, setOpForm] = useState({ account_id: null, amount: '', date: today(), description: '' });
  const [snapForm, setSnapForm] = useState({ account_id: null, balance: '', snapshot_date: today(), note: '' });
  const [accForm, setAccForm] = useState({ name: '', color: '#1565C0' });

  const load = useCallback(async () => {
    const db = await getDb();
    const accs = await db.getAllAsync(`
      SELECT sa.id, sa.name, sa.color,
             ss.balance as last_balance,
             ss.snapshot_date as last_date
      FROM savings_accounts sa
      LEFT JOIN savings_snapshots ss ON ss.id=(
        SELECT id FROM savings_snapshots WHERE account_id=sa.id
        ORDER BY snapshot_date DESC, id DESC LIMIT 1
      )
      ORDER BY sa.id`);

    const ops = await db.getAllAsync(`
      SELECT so.id, so.type, so.amount, so.date, so.description,
             sa.name as account_name, sa.color
      FROM savings_operations so
      JOIN savings_accounts sa ON so.account_id=sa.id
      ORDER BY so.date DESC, so.id DESC LIMIT 60`);

    setAccounts(accs);
    setOperations(ops);
    setOpForm(f => ({ ...f, account_id: accs[0]?.id || null }));
    setSnapForm(f => ({ ...f, account_id: accs[0]?.id || null }));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openOpModal = (type) => { setOpType(type); setOpModal(true); };

  const saveOp = async () => {
    if (!opForm.amount || !opForm.account_id) {
      Alert.alert('Błąd', 'Podaj kwotę i wybierz konto');
      return;
    }
    const db = await getDb();
    const account = accounts.find(a => a.id === opForm.account_id);
    const payload = {
      account_id: opForm.account_id,
      amount: parseFloat(opForm.amount.replace(',', '.')),
      date: opForm.date,
      description: opForm.description || null,
      accountName: account?.name || '',
    };
    if (opType === 'deposit') {
      await addDeposit(db, payload);
    } else {
      await addWithdrawal(db, payload);
    }
    setOpModal(false);
    setOpForm(f => ({ ...f, amount: '', description: '', date: today() }));
    load();
  };

  const saveSnapshot = async () => {
    if (!snapForm.balance || !snapForm.account_id) {
      Alert.alert('Błąd', 'Podaj stan konta i wybierz konto');
      return;
    }
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO savings_snapshots (account_id, balance, snapshot_date, note) VALUES (?,?,?,?)`,
      [snapForm.account_id, parseFloat(snapForm.balance.replace(',', '.')), snapForm.snapshot_date, snapForm.note || null]
    );
    setSnapshotModal(false);
    setSnapForm(f => ({ ...f, balance: '', note: '', snapshot_date: today() }));
    load();
  };

  const saveAccount = async () => {
    if (!accForm.name.trim()) { Alert.alert('Błąd', 'Podaj nazwę konta'); return; }
    const db = await getDb();
    await db.runAsync('INSERT INTO savings_accounts (name, color) VALUES (?,?)', [accForm.name.trim(), accForm.color]);
    setAccountModal(false);
    setAccForm({ name: '', color: '#1565C0' });
    load();
  };

  const removeOp = (item) => Alert.alert('Usuń operację', 'Na pewno?', [
    { text: 'Anuluj' },
    { text: 'Usuń', style: 'destructive', onPress: async () => {
      const db = await getDb();
      await db.runAsync('DELETE FROM savings_operations WHERE id=?', [item.id]);
      // Jeśli wypłata — usuń też auto-wygenerowany wpływ
      if (item.type === 'withdrawal') {
        await db.runAsync('DELETE FROM incomes WHERE savings_operation_id=?', [item.id]);
      }
      load();
    }}
  ]);

  const totalSavings = accounts.reduce((s, a) => s + (a.last_balance || 0), 0);

  return (
    <View style={s.container}>
      {/* Tabs */}
      <View style={s.tabs}>
        {['accounts','operations'].map(t => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.tabActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t === 'accounts' ? 'Konta' : 'Historia'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'accounts' ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          {/* Suma */}
          <View style={s.totalCard}>
            <View>
              <Text style={s.totalLabel}>Łączne oszczędności</Text>
              <Text style={s.totalHint}>wg ostatnich snapshotów</Text>
            </View>
            <Text style={s.totalVal}>{Math.round(totalSavings).toLocaleString('pl-PL')} zł</Text>
          </View>

          {accounts.map(a => (
            <TouchableOpacity key={a.id} style={s.accountCard} onPress={() =>
              navigation.navigate('AccountDetail', {
                accountId: a.id,
                accountName: a.name,
                accountColor: a.color,
              })
            }>
              <View style={[s.stripe, { backgroundColor: a.color }]} />
              <View style={s.accountBody}>
                <Text style={s.accountName}>{a.name}</Text>
                <Text style={s.accountDate}>
                  {a.last_date ? `Stan na ${a.last_date}` : 'Brak danych — dodaj stan konta 📸'}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', paddingRight: 16 }}>
                <Text style={s.accountBal}>
                  {a.last_balance != null ? `${a.last_balance.toLocaleString('pl-PL')} zł` : '—'}
                </Text>
                <Text style={{ fontSize: 11, color: '#bbb', marginTop: 3 }}>dotknij →</Text>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.addBtn} onPress={() => setAccountModal(true)}>
            <Text style={s.addBtnText}>+ Nowe konto oszczędnościowe</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={operations}
          keyExtractor={i => String(i.id)}
          ListEmptyComponent={<Text style={s.empty}>Brak operacji</Text>}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.opRow} onLongPress={() => removeOp(item)}>
              <View style={[s.opIcon, { backgroundColor: item.type === 'deposit' ? '#e3f2fd' : '#e8f5e9' }]}>
                <Text style={s.opIconText}>{item.type === 'deposit' ? '↓' : '↑'}</Text>
              </View>
              <View style={s.opBody}>
                <Text style={s.opAccount}>{item.account_name}</Text>
                <Text style={s.opDesc}>{item.description || item.date}</Text>
                {item.type === 'withdrawal' && <Text style={s.opTag}>auto-wpływ zarejestrowany</Text>}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.opAmount, { color: item.type === 'deposit' ? '#1565c0' : '#43a047' }]}>
                  {item.type === 'deposit' ? '−' : '+'}{item.amount.toLocaleString('pl-PL')} zł
                </Text>
                <Text style={s.opDate}>{item.date}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FABs */}
      <View style={s.fabs}>
        <TouchableOpacity style={[s.fabSm, { backgroundColor: '#37474f' }]} onPress={() => setSnapshotModal(true)}>
          <Text style={s.fabSmText}>📸</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.fabSm, { backgroundColor: '#43a047' }]} onPress={() => openOpModal('withdrawal')}>
          <Text style={[s.fabSmText, { fontSize: 20 }]}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.fab, { backgroundColor: '#1565C0' }]} onPress={() => openOpModal('deposit')}>
          <Text style={s.fabText}>↓</Text>
        </TouchableOpacity>
      </View>

      {/* Modal - operacja (wpłata/wypłata) */}
      <Modal visible={opModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>
            {opType === 'deposit' ? '↓ Wpłata na oszczędności' : '↑ Wypłata z oszczędności'}
          </Text>
          {opType === 'withdrawal' && (
            <View style={s.infoBox}>
              <Text style={s.infoText}>Wypłata zostanie automatycznie zarejestrowana jako wpływ w budżecie.</Text>
            </View>
          )}

          <Text style={s.label}>Konto</Text>
          <View style={s.pills}>
            {accounts.map(a => (
              <Pill key={a.id} label={a.name} active={opForm.account_id === a.id}
                color={a.color} onPress={() => setOpForm(f => ({ ...f, account_id: a.id }))} />
            ))}
          </View>

          <Text style={s.label}>Kwota (zł)</Text>
          <TextInput style={s.input} value={opForm.amount}
            onChangeText={v => setOpForm(f => ({ ...f, amount: v }))}
            keyboardType="decimal-pad" placeholder="0" autoFocus />

          <Text style={s.label}>Data</Text>
          <TextInput style={s.input} value={opForm.date}
            onChangeText={v => setOpForm(f => ({ ...f, date: v }))}
            placeholder="YYYY-MM-DD" />

          <Text style={s.label}>Opis (opcjonalnie)</Text>
          <TextInput style={s.input} value={opForm.description}
            onChangeText={v => setOpForm(f => ({ ...f, description: v }))}
            placeholder="np. comiesięczna wpłata" />

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnCancel} onPress={() => setOpModal(false)}>
              <Text style={s.btnCancelText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSave, { backgroundColor: opType === 'deposit' ? '#1565C0' : '#43a047' }]} onPress={saveOp}>
              <Text style={s.btnSaveText}>Zapisz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* Modal - snapshot */}
      <Modal visible={snapshotModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>📸 Aktualizuj stan konta</Text>
          <View style={s.infoBox}>
            <Text style={s.infoText}>Wpisz aktualny stan wybranego konta. Zyski i straty zostaną uwzględnione automatycznie.</Text>
          </View>

          <Text style={s.label}>Konto</Text>
          <View style={s.pills}>
            {accounts.map(a => (
              <Pill key={a.id} label={a.name} active={snapForm.account_id === a.id}
                color={a.color} onPress={() => setSnapForm(f => ({ ...f, account_id: a.id }))} />
            ))}
          </View>

          <Text style={s.label}>Aktualny stan (zł)</Text>
          <TextInput style={s.input} value={snapForm.balance}
            onChangeText={v => setSnapForm(f => ({ ...f, balance: v }))}
            keyboardType="decimal-pad" placeholder="np. 15420" autoFocus />

          <Text style={s.label}>Data</Text>
          <TextInput style={s.input} value={snapForm.snapshot_date}
            onChangeText={v => setSnapForm(f => ({ ...f, snapshot_date: v }))}
            placeholder="YYYY-MM-DD" />

          <Text style={s.label}>Notatka (opcjonalnie)</Text>
          <TextInput style={s.input} value={snapForm.note}
            onChangeText={v => setSnapForm(f => ({ ...f, note: v }))}
            placeholder="np. po wypłacie odsetek" />

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnCancel} onPress={() => setSnapshotModal(false)}>
              <Text style={s.btnCancelText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSave, { backgroundColor: '#37474f' }]} onPress={saveSnapshot}>
              <Text style={s.btnSaveText}>Zapisz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      {/* Modal - nowe konto */}
      <Modal visible={accountModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>Nowe konto</Text>

          <Text style={s.label}>Nazwa</Text>
          <TextInput style={s.input} value={accForm.name}
            onChangeText={v => setAccForm(f => ({ ...f, name: v }))}
            placeholder="np. IKE Plus, Lokata PKO..." autoFocus />

          <Text style={s.label}>Kolor</Text>
          <View style={s.colorRow}>
            {COLORS.map(c => (
              <TouchableOpacity key={c} style={[s.colorDot, { backgroundColor: c }, accForm.color === c && s.colorDotActive]}
                onPress={() => setAccForm(f => ({ ...f, color: c }))} />
            ))}
          </View>

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnCancel} onPress={() => setAccountModal(false)}>
              <Text style={s.btnCancelText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSave, { backgroundColor: accForm.color }]} onPress={saveAccount}>
              <Text style={s.btnSaveText}>Dodaj konto</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const Pill = ({ label, active, color, onPress }) => (
  <TouchableOpacity style={[s.pill, active && { backgroundColor: color, borderColor: color }]} onPress={onPress}>
    <Text style={[s.pillText, active && { color: '#fff', fontWeight: '700' }]}>{label}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#efefef' },
  tab: { flex: 1, paddingVertical: 15, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2.5, borderBottomColor: '#1565C0' },
  tabText: { fontSize: 15, color: '#aaa', fontWeight: '600' },
  tabTextActive: { color: '#1565C0' },
  totalCard: { margin: 16, marginBottom: 10, backgroundColor: '#1a237e', borderRadius: 18, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '700' },
  totalHint: { color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3 },
  totalVal: { color: '#fff', fontSize: 26, fontWeight: '800' },
  accountCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 5, borderRadius: 14, overflow: 'hidden', alignItems: 'center' },
  stripe: { width: 5, alignSelf: 'stretch' },
  accountBody: { flex: 1, padding: 14 },
  accountName: { fontSize: 15, fontWeight: '600', color: '#333' },
  accountDate: { fontSize: 12, color: '#aaa', marginTop: 4 },
  accountBal: { fontSize: 17, fontWeight: '800', color: '#1a237e', paddingRight: 16 },
  addBtn: { marginHorizontal: 14, marginTop: 10, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#1565C0', borderStyle: 'dashed', alignItems: 'center' },
  addBtnText: { color: '#1565C0', fontSize: 15, fontWeight: '600' },
  empty: { color: '#bbb', textAlign: 'center', marginTop: 60, fontSize: 15 },
  opRow: { backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 4, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  opIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  opIconText: { fontSize: 20, fontWeight: '800', color: '#1565c0' },
  opBody: { flex: 1 },
  opAccount: { fontSize: 14, fontWeight: '600', color: '#333' },
  opDesc: { fontSize: 12, color: '#aaa', marginTop: 2 },
  opTag: { fontSize: 10, color: '#43a047', marginTop: 3, fontWeight: '600' },
  opAmount: { fontSize: 15, fontWeight: '800' },
  opDate: { fontSize: 11, color: '#bbb', marginTop: 2 },
  fabs: { position: 'absolute', bottom: 24, right: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
  fab: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  fabText: { color: '#fff', fontSize: 26, fontWeight: '800' },
  fabSm: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  fabSmText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  modal: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginTop: 10, marginBottom: 16 },
  infoBox: { backgroundColor: '#f0f4ff', borderRadius: 10, padding: 12, marginBottom: 8 },
  infoText: { fontSize: 13, color: '#3949ab', lineHeight: 18 },
  label: { fontSize: 11, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#ececec', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fafafa' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f8f8f8' },
  pillText: { color: '#555', fontSize: 13 },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 48 },
  btnCancel: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
  btnCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
  btnSave: { flex: 2, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
