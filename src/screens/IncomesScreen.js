import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ScrollView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDb } from '../db/database';

const today = () => new Date().toISOString().split('T')[0];

export default function IncomesScreen() {
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category_id: null, date: today() });

  const load = useCallback(async () => {
    const db = await getDb();
    const data = await db.getAllAsync(`
      SELECT i.id, i.description, i.amount, i.date,
             ic.name as category, ic.is_savings_withdrawal,
             i.savings_operation_id
      FROM incomes i
      JOIN incomes_category ic ON i.category_id=ic.id
      ORDER BY i.date DESC, i.id DESC`);
    // Kategorie manualne (nie auto-withdrawal)
    const cats = await db.getAllAsync(
      'SELECT * FROM incomes_category WHERE is_savings_withdrawal=0 ORDER BY name');
    setIncomes(data);
    setCategories(cats);
    setForm(f => ({ ...f, category_id: cats[0]?.id || null }));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const save = async () => {
    if (!form.amount || !form.category_id || !form.date) {
      Alert.alert('Błąd', 'Wypełnij kwotę, kategorię i datę');
      return;
    }
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO incomes (description, category_id, amount, date) VALUES (?,?,?,?)`,
      [form.description || null, form.category_id, parseFloat(form.amount.replace(',', '.')), form.date]
    );
    setModalVisible(false);
    setForm(f => ({ ...f, description: '', amount: '', date: today() }));
    load();
  };

  const remove = (item) => {
    if (item.savings_operation_id) {
      Alert.alert('Uwaga', 'Ten wpływ pochodzi z wypłaty oszczędności. Usuń go w panelu Oszczędności.');
      return;
    }
    Alert.alert('Usuń wpływ', 'Na pewno?', [
      { text: 'Anuluj' },
      { text: 'Usuń', style: 'destructive', onPress: async () => {
        const db = await getDb();
        await db.runAsync('DELETE FROM incomes WHERE id=?', [item.id]);
        load();
      }}
    ]);
  };

  const monthTotal = incomes
    .filter(i => i.date.startsWith(new Date().toISOString().slice(0,7)))
    .reduce((s, i) => s + i.amount, 0);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerLabel}>Ten miesiąc</Text>
        <Text style={s.headerVal}>+{Math.round(monthTotal).toLocaleString('pl-PL')} zł</Text>
      </View>

      <FlatList
        data={incomes}
        keyExtractor={i => String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>Brak wpływów — dodaj pierwszy!</Text>}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.row} onLongPress={() => remove(item)}>
            <View style={s.rowLeft}>
              <View style={s.rowTitleRow}>
                <Text style={s.rowDesc}>{item.description || item.category}</Text>
                {item.is_savings_withdrawal === 1 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>🏦 oszczędności</Text>
                  </View>
                )}
              </View>
              <Text style={s.rowMeta}>{item.category} · {item.date}</Text>
            </View>
            <Text style={s.rowAmount}>+{item.amount.toLocaleString('pl-PL')} zł</Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)}>
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={s.modal} keyboardShouldPersistTaps="handled">
          <Text style={s.modalTitle}>Nowy wpływ</Text>

          <Text style={s.label}>Kwota (zł)</Text>
          <TextInput style={s.input} value={form.amount}
            onChangeText={v => setForm(f => ({ ...f, amount: v }))}
            keyboardType="decimal-pad" placeholder="0" autoFocus />

          <Text style={s.label}>Kategoria</Text>
          <View style={s.pills}>
            {categories.map(c => (
              <Pill key={c.id} label={c.name} active={form.category_id === c.id}
                color="#43a047" onPress={() => setForm(f => ({ ...f, category_id: c.id }))} />
            ))}
          </View>

          <Text style={s.label}>Opis (opcjonalnie)</Text>
          <TextInput style={s.input} value={form.description}
            onChangeText={v => setForm(f => ({ ...f, description: v }))}
            placeholder="np. Wypłata za marzec" />

          <Text style={s.label}>Data</Text>
          <TextInput style={s.input} value={form.date}
            onChangeText={v => setForm(f => ({ ...f, date: v }))}
            placeholder="YYYY-MM-DD" />

          <View style={s.btnRow}>
            <TouchableOpacity style={s.btnCancel} onPress={() => setModalVisible(false)}>
              <Text style={s.btnCancelText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btnSave, { backgroundColor: '#43a047' }]} onPress={save}>
              <Text style={s.btnSaveText}>Zapisz</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const Pill = ({ label, active, color, onPress }) => (
  <TouchableOpacity
    style={[s.pill, active && { backgroundColor: color, borderColor: color }]}
    onPress={onPress}>
    <Text style={[s.pillText, active && { color: '#fff', fontWeight: '700' }]}>{label}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  header: { backgroundColor: '#43a047', paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  headerVal: { color: '#fff', fontSize: 22, fontWeight: '800' },
  empty: { color: '#bbb', textAlign: 'center', marginTop: 60, fontSize: 15 },
  row: { backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 4, borderRadius: 12, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLeft: { flex: 1, marginRight: 12 },
  rowTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rowDesc: { fontSize: 15, color: '#333', fontWeight: '500' },
  badge: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, color: '#1565c0', fontWeight: '600' },
  rowMeta: { fontSize: 12, color: '#999', marginTop: 3 },
  rowAmount: { fontSize: 16, fontWeight: '800', color: '#43a047' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#43a047', justifyContent: 'center', alignItems: 'center', shadowColor: '#43a047', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontSize: 30, lineHeight: 34 },
  modal: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#333', marginTop: 10, marginBottom: 20 },
  label: { fontSize: 11, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#ececec', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fafafa' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f8f8f8' },
  pillText: { color: '#555', fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 32, marginBottom: 48 },
  btnCancel: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
  btnCancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
  btnSave: { flex: 2, padding: 16, borderRadius: 14, alignItems: 'center' },
  btnSaveText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
