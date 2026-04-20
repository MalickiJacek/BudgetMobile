import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchExpenses, fetchExpenseCategories,
  addExpense, updateExpense, deleteExpense,
  addExpenseCategory, deleteExpenseCategory, countExpensesByCategory,
  reassignExpensesCategory,
} from '../db/database';
import DateInput from '../components/DateInput';

const todayStr = () => new Date().toISOString().split('T')[0];
const currentMonthStr = () => new Date().toISOString().slice(0, 7);

const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const fmtMonthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const label = new Date(y, m - 1, 1).toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export default function ExpensesScreen() {
  const [allExpenses, setAllExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ description: '', amount: '', category_id: null, date: todayStr() });
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [reassignModal, setReassignModal] = useState(false);
  const [reassignSource, setReassignSource] = useState(null);
  const [reassignTarget, setReassignTarget] = useState(null);

  const load = useCallback(async () => {
    const [data, cats] = await Promise.all([fetchExpenses(), fetchExpenseCategories()]);
    setAllExpenses(data);
    setCategories(cats);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const expenses = allExpenses.filter(e => e.date.startsWith(selectedMonth));
  const monthTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const isCurrentMonth = selectedMonth === currentMonthStr();

  const openAdd = () => {
    setEditingItem(null);
    setForm({ description: '', amount: '', category_id: categories[0]?.id || null, date: todayStr() });
    setModalVisible(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({ description: item.description || '', amount: String(item.amount), category_id: item.category_id, date: item.date });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.amount || !form.category_id || !form.date) {
      Alert.alert('Błąd', 'Wypełnij kwotę, kategorię i datę');
      return;
    }
    const amount = parseFloat(String(form.amount).replace(',', '.'));
    if (editingItem) {
      await updateExpense(editingItem.id, { description: form.description || null, category_id: form.category_id, amount, date: form.date });
    } else {
      await addExpense({ description: form.description || null, category_id: form.category_id, amount, date: form.date });
    }
    setModalVisible(false);
    load();
  };

  const remove = (id) => Alert.alert('Usuń wydatek', 'Na pewno?', [
    { text: 'Anuluj' },
    { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteExpense(id); load(); } }
  ]);

  const addCat = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await addExpenseCategory(name);
      setNewCatName('');
      load();
    } catch {
      Alert.alert('Błąd', 'Kategoria o tej nazwie już istnieje');
    }
  };

  const removeCat = async (cat) => {
    const cnt = await countExpensesByCategory(cat.id);
    if (cnt > 0) {
      const otherCats = categories.filter(c => c.id !== cat.id);
      setReassignSource({ ...cat, cnt });
      setReassignTarget(otherCats[0]?.id || null);
      setReassignModal(true);
      return;
    }
    Alert.alert('Usuń kategorię', `Usunąć "${cat.name}"?`, [
      { text: 'Anuluj' },
      { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteExpenseCategory(cat.id); load(); } }
    ]);
  };

  const confirmReassign = async () => {
    if (!reassignTarget) return;
    await reassignExpensesCategory(reassignSource.id, reassignTarget);
    await deleteExpenseCategory(reassignSource.id);
    setReassignModal(false);
    load();
  };

  const fmt = v => Math.round(v).toLocaleString('pl-PL');

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.arrow} onPress={() => setSelectedMonth(m => shiftMonth(m, -1))}>
          <Text style={s.arrowText}>‹</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerMonth}>{fmtMonthLabel(selectedMonth)}</Text>
          <Text style={s.headerVal}>-{fmt(monthTotal)} zł</Text>
        </View>
        <TouchableOpacity style={s.arrow} onPress={() => !isCurrentMonth && setSelectedMonth(m => shiftMonth(m, 1))}>
          <Text style={[s.arrowText, isCurrentMonth && s.arrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={i => String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>Brak wydatków w tym miesiącu</Text>}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => openEdit(item)} onLongPress={() => remove(item.id)}>
            <View style={s.rowLeft}>
              <Text style={s.rowDesc}>{item.description || item.category}</Text>
              <Text style={s.rowMeta}>{item.category} · {item.date}</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowAmount}>-{item.amount.toLocaleString('pl-PL')} zł</Text>
              <Text style={s.editHint}>dotknij →</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={openAdd}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
            <Text style={s.modalTitle}>{editingItem ? 'Edytuj wydatek' : 'Nowy wydatek'}</Text>

            <Text style={s.label}>Kwota (zł)</Text>
            <TextInput style={s.input} value={form.amount}
              onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              keyboardType="decimal-pad" placeholder="0" autoFocus />

            <View style={s.labelRow}>
              <Text style={s.label}>Kategoria</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setTimeout(() => setCatModal(true), 350); }}>
                <Text style={s.manageLink}>Zarządzaj ›</Text>
              </TouchableOpacity>
            </View>
            <View style={s.pills}>
              {categories.map(c => (
                <Pill key={c.id} label={c.name} active={form.category_id === c.id}
                  color="#e53935" onPress={() => setForm(f => ({ ...f, category_id: c.id }))} />
              ))}
            </View>

            <Text style={s.label}>Opis (opcjonalnie)</Text>
            <TextInput style={s.input} value={form.description}
              onChangeText={v => setForm(f => ({ ...f, description: v }))}
              placeholder="np. Biedronka, paliwo..." />

            <Text style={s.label}>Data</Text>
            <DateInput value={form.date} onChange={v => setForm(f => ({ ...f, date: v }))} inputStyle={s.input} />

            <View style={s.btnRow}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setModalVisible(false)}>
                <Text style={s.btnCancelText}>Anuluj</Text>
              </TouchableOpacity>
              {editingItem && (
                <TouchableOpacity style={s.btnDelete}
                  onPress={() => { setModalVisible(false); setTimeout(() => remove(editingItem.id), 200); }}>
                  <Text style={s.btnDeleteText}>Usuń</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.btnSave, { backgroundColor: '#e53935' }]} onPress={save}>
                <Text style={s.btnSaveText}>{editingItem ? 'Zapisz' : 'Dodaj'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={catModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modal, { flex: 1 }]}>
            <Text style={s.modalTitle}>Kategorie wydatków</Text>
            <ScrollView style={{ flex: 1 }}>
              {categories.map(cat => (
                <View key={cat.id} style={s.catRow}>
                  <Text style={s.catRowName}>{cat.name}</Text>
                  <TouchableOpacity style={s.catDelBtn} onPress={() => removeCat(cat)}>
                    <Text style={s.catDelText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <View style={s.catAddRow}>
              <TextInput style={[s.input, { flex: 1 }]} value={newCatName}
                onChangeText={setNewCatName} placeholder="Nazwa nowej kategorii..."
                onSubmitEditing={addCat} />
              <TouchableOpacity style={s.catAddBtn} onPress={addCat}>
                <Text style={s.catAddBtnText}>Dodaj</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[s.btnCancel, { marginTop: 14, marginBottom: 40 }]}
              onPress={() => { setCatModal(false); setTimeout(() => setModalVisible(true), 350); }}>
              <Text style={s.btnCancelText}>Zamknij</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={reassignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { flex: 1 }]}>
          <Text style={s.modalTitle}>Usuń kategorię</Text>
          <View style={s.infoBox}>
            <Text style={s.infoText}>
              Kategoria „{reassignSource?.name}" ma {reassignSource?.cnt} wydatk{reassignSource?.cnt === 1 ? '' : reassignSource?.cnt < 5 ? 'i' : 'ów'}.{'\n'}
              Wybierz kategorię, na którą mamy przepiąć te wydatki:
            </Text>
          </View>
          <ScrollView style={{ flex: 1 }}>
            <View style={[s.pills, { marginTop: 12 }]}>
              {categories.filter(c => c.id !== reassignSource?.id).map(c => (
                <Pill key={c.id} label={c.name} active={reassignTarget === c.id}
                  color="#e53935" onPress={() => setReassignTarget(c.id)} />
              ))}
            </View>
          </ScrollView>
          <View style={[s.btnRow, { marginTop: 16, marginBottom: 40 }]}>
            <TouchableOpacity style={s.btnCancel} onPress={() => setReassignModal(false)}>
              <Text style={s.btnCancelText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSave, { backgroundColor: '#e53935' }]} onPress={confirmReassign}>
              <Text style={s.btnSaveText}>Przenieś i usuń</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  header: { backgroundColor: '#e53935', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  arrow: { width: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 34 },
  arrowDisabled: { opacity: 0.3 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerMonth: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  headerVal: { color: '#fff', fontSize: 24, fontWeight: '800' },
  empty: { color: '#bbb', textAlign: 'center', marginTop: 60, fontSize: 15 },
  row: { backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 4, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flex: 1, marginRight: 12 },
  rowDesc: { fontSize: 15, color: '#333', fontWeight: '500' },
  rowMeta: { fontSize: 12, color: '#999', marginTop: 3 },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 16, fontWeight: '800', color: '#e53935' },
  editHint: { fontSize: 10, color: '#ccc', marginTop: 3 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#e53935', justifyContent: 'center', alignItems: 'center', shadowColor: '#e53935', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
  modal: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginTop: 10, marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  label: { fontSize: 11, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  manageLink: { fontSize: 13, color: '#e53935', fontWeight: '600' },
  input: { borderWidth: 1.5, borderColor: '#ececec', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fafafa' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f8f8f8' },
  pillText: { color: '#555', fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 32, marginBottom: 48 },
  btnCancel: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
  btnCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
  btnDelete: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e53935', alignItems: 'center' },
  btnDeleteText: { color: '#e53935', fontSize: 15, fontWeight: '600' },
  btnSave: { flex: 2, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  catRowName: { flex: 1, fontSize: 15, color: '#333' },
  catDelBtn: { padding: 8 },
  catDelText: { fontSize: 16, color: '#ccc', fontWeight: '600' },
  infoBox: { backgroundColor: '#fff3f3', borderRadius: 10, padding: 12, marginBottom: 8 },
  infoText: { fontSize: 13, color: '#c62828', lineHeight: 20 },
  catAddRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  catAddBtn: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#e53935', borderRadius: 12, justifyContent: 'center' },
  catAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
