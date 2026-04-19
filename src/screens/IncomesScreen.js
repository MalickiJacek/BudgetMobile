import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  fetchIncomes, fetchIncomeCategories,
  addIncome, updateIncome, deleteIncome,
  addIncomeCategory, deleteIncomeCategory, countIncomesByCategory,
} from '../db/database';

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

export default function IncomesScreen() {
  const [allIncomes, setAllIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ description: '', amount: '', category_id: null, date: todayStr() });
  const [catModal, setCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const load = useCallback(async () => {
    const [data, cats] = await Promise.all([fetchIncomes(), fetchIncomeCategories()]);
    setAllIncomes(data);
    setCategories(cats);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const incomes = allIncomes.filter(i => i.date.startsWith(selectedMonth));
  const monthTotal = incomes.reduce((s, i) => s + i.amount, 0);
  const isCurrentMonth = selectedMonth === currentMonthStr();

  const openAdd = () => {
    setEditingItem(null);
    setForm({ description: '', amount: '', category_id: categories[0]?.id || null, date: todayStr() });
    setModalVisible(true);
  };

  const openEdit = (item) => {
    if (item.savings_operation_id) {
      Alert.alert('Wpływ z oszczędności', 'Ten wpływ jest powiązany z wypłatą z oszczędności. Edytuj go w panelu Oszczędności.');
      return;
    }
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
      await updateIncome(editingItem.id, { description: form.description || null, category_id: form.category_id, amount, date: form.date });
    } else {
      await addIncome({ description: form.description || null, category_id: form.category_id, amount, date: form.date });
    }
    setModalVisible(false);
    load();
  };

  const remove = (item) => {
    if (item.savings_operation_id) {
      Alert.alert('Uwaga', 'Ten wpływ pochodzi z wypłaty oszczędności. Usuń go w panelu Oszczędności.');
      return;
    }
    Alert.alert('Usuń wpływ', 'Na pewno?', [
      { text: 'Anuluj' },
      { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteIncome(item.id); load(); } }
    ]);
  };

  const addCat = async () => {
    const name = newCatName.trim();
    if (!name) return;
    try {
      await addIncomeCategory(name);
      setNewCatName('');
      load();
    } catch {
      Alert.alert('Błąd', 'Kategoria o tej nazwie już istnieje');
    }
  };

  const removeCat = async (cat) => {
    const cnt = await countIncomesByCategory(cat.id);
    if (cnt > 0) {
      Alert.alert('Nie można usunąć', `Kategoria "${cat.name}" ma ${cnt} wpływ${cnt === 1 ? '' : cnt < 5 ? 'y' : 'ów'}. Najpierw usuń powiązane wpisy.`);
      return;
    }
    Alert.alert('Usuń kategorię', `Usunąć "${cat.name}"?`, [
      { text: 'Anuluj' },
      { text: 'Usuń', style: 'destructive', onPress: async () => { await deleteIncomeCategory(cat.id); load(); } }
    ]);
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
          <Text style={s.headerVal}>+{fmt(monthTotal)} zł</Text>
        </View>
        <TouchableOpacity style={s.arrow} onPress={() => !isCurrentMonth && setSelectedMonth(m => shiftMonth(m, 1))}>
          <Text style={[s.arrowText, isCurrentMonth && s.arrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={incomes}
        keyExtractor={i => String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>Brak wpływów w tym miesiącu</Text>}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onPress={() => openEdit(item)} onLongPress={() => remove(item)}>
            <View style={s.rowLeft}>
              <View style={s.rowTitleRow}>
                <Text style={s.rowDesc}>{item.description || item.category}</Text>
                {item.is_savings_withdrawal === 1 && (
                  <View style={s.badge}><Text style={s.badgeText}>🏦 oszczędności</Text></View>
                )}
              </View>
              <Text style={s.rowMeta}>{item.category} · {item.date}</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowAmount}>+{item.amount.toLocaleString('pl-PL')} zł</Text>
              {!item.savings_operation_id && <Text style={s.editHint}>dotknij →</Text>}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={openAdd}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>{editingItem ? 'Edytuj wpływ' : 'Nowy wpływ'}</Text>

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
                color="#43a047" onPress={() => setForm(f => ({ ...f, category_id: c.id }))} />
            ))}
          </View>

          <Text style={s.label}>Opis (opcjonalnie)</Text>
          <TextInput style={s.input} value={form.description}
            onChangeText={v => setForm(f => ({ ...f, description: v }))}
            placeholder="np. Wypłata za kwiecień" />

          <Text style={s.label}>Data</Text>
          <TextInput style={s.input} value={form.date}
            onChangeText={v => setForm(f => ({ ...f, date: v }))}
            placeholder="YYYY-MM-DD" />

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnCancel} onPress={() => setModalVisible(false)}>
              <Text style={s.btnCancelText}>Anuluj</Text>
            </TouchableOpacity>
            {editingItem && (
              <TouchableOpacity style={s.btnDelete}
                onPress={() => { setModalVisible(false); setTimeout(() => remove(editingItem), 200); }}>
                <Text style={s.btnDeleteText}>Usuń</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[s.btnSave, { backgroundColor: '#43a047' }]} onPress={save}>
              <Text style={s.btnSaveText}>{editingItem ? 'Zapisz' : 'Dodaj'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={catModal} animationType="slide" presentationStyle="pageSheet">
        <View style={[s.modal, { flex: 1 }]}>
          <Text style={s.modalTitle}>Kategorie wpływów</Text>
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
  header: { backgroundColor: '#43a047', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  arrow: { width: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 34 },
  arrowDisabled: { opacity: 0.3 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerMonth: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  headerVal: { color: '#fff', fontSize: 24, fontWeight: '800' },
  empty: { color: '#bbb', textAlign: 'center', marginTop: 60, fontSize: 15 },
  row: { backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 4, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flex: 1, marginRight: 12 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowDesc: { fontSize: 15, color: '#333', fontWeight: '500' },
  badge: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, color: '#1565c0', fontWeight: '600' },
  rowMeta: { fontSize: 12, color: '#999', marginTop: 3 },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 16, fontWeight: '800', color: '#43a047' },
  editHint: { fontSize: 10, color: '#ccc', marginTop: 3 },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#43a047', justifyContent: 'center', alignItems: 'center', shadowColor: '#43a047', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
  modal: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginTop: 10, marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  label: { fontSize: 11, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  manageLink: { fontSize: 13, color: '#43a047', fontWeight: '600' },
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
  catAddRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  catAddBtn: { paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#43a047', borderRadius: 12, justifyContent: 'center' },
  catAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
