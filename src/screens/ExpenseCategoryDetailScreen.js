import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import { fetchExpenses } from '../db/database';

const W = Dimensions.get('window').width;
const COLORS = ['#e53935','#1e88e5','#43a047','#fb8c00','#8e24aa','#00897b','#f4511e','#3949ab','#00acc1','#7cb342','#fdd835','#6d4c41'];

const PERIODS = [
  { key: 'month',    label: 'Ten miesiąc' },
  { key: '3months',  label: 'Ostatnie 3 mies.' },
  { key: 'year',     label: 'Ten rok' },
  { key: 'lastyear', label: 'Poprzedni rok' },
];

function filterByPeriod(expenses, key) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const ym = `${y}-${m}`;

  if (key === 'month') return expenses.filter(e => e.date.startsWith(ym));
  if (key === '3months') {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-01`;
    return expenses.filter(e => e.date >= fromStr);
  }
  if (key === 'year') return expenses.filter(e => e.date.startsWith(String(y)));
  if (key === 'lastyear') return expenses.filter(e => e.date.startsWith(String(y - 1)));
  return expenses;
}

export default function ExpenseCategoryDetailScreen() {
  const [period, setPeriod] = useState('month');
  const [cats, setCats] = useState([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [allExpenses, setAllExpenses] = useState([]);

  const load = useCallback(async (p = period) => {
    const all = await fetchExpenses();
    setAllExpenses(all);
    computeCats(all, p);
  }, []);

  const computeCats = (all, p) => {
    const filtered = filterByPeriod(all, p);
    const catMap = {};
    filtered.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const data = Object.entries(catMap).map(([name, total]) => ({ name, total })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
    setCats(data);
    setTotal(data.reduce((s, c) => s + c.total, 0));
  };

  useFocusEffect(useCallback(() => { load(period); }, [period]));
  const onRefresh = async () => { setRefreshing(true); await load(period); setRefreshing(false); };

  const handlePeriod = (p) => {
    setPeriod(p);
    computeCats(allExpenses, p);
  };

  const fmt = v => Math.round(v).toLocaleString('pl-PL');

  const pieData = cats.slice(0, 8).map((c, i) => ({
    name: c.name, population: Math.round(c.total),
    color: COLORS[i % COLORS.length], legendFontColor: '#555', legendFontSize: 11,
  }));

  const chartConfig = {
    color: () => '#333', labelColor: () => '#666',
    backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
  };

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={s.periodBar} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {PERIODS.map(p => (
          <TouchableOpacity key={p.key} style={[s.periodBtn, period === p.key && s.periodBtnActive]} onPress={() => handlePeriod(p.key)}>
            <Text style={[s.periodText, period === p.key && s.periodTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.totalCard}>
        <Text style={s.totalLabel}>{PERIODS.find(p => p.key === period)?.label}</Text>
        <Text style={s.totalVal}>{fmt(total)} zł</Text>
        <Text style={s.totalHint}>łączne wydatki</Text>
      </View>

      {pieData.length > 0 ? (
        <>
          <View style={s.section}>
            <PieChart data={pieData} width={W - 32} height={200} chartConfig={chartConfig}
              accessor="population" backgroundColor="transparent" paddingLeft="8" />
          </View>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Podział wydatków</Text>
            {cats.map((c, i) => {
              const pct = total > 0 ? (c.total / total) * 100 : 0;
              return (
                <View key={i} style={s.catRow}>
                  <View style={[s.dot, { backgroundColor: COLORS[i % COLORS.length] }]} />
                  <View style={s.catBody}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                      <Text style={s.catName}>{c.name}</Text>
                      <Text style={s.catVal}>{fmt(c.total)} zł</Text>
                    </View>
                    <View style={s.barWrap}>
                      <View style={[s.bar, { width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }]} />
                    </View>
                    <Text style={s.pct}>{pct.toFixed(1)}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <Text style={s.empty}>Brak wydatków w wybranym okresie</Text>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  periodBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f5f5f5' },
  periodBtnActive: { backgroundColor: '#e53935', borderColor: '#e53935' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#888' },
  periodTextActive: { color: '#fff' },
  totalCard: { backgroundColor: '#e53935', margin: 16, borderRadius: 18, padding: 20, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalVal: { color: '#fff', fontSize: 34, fontWeight: '800', marginVertical: 6 },
  totalHint: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 14 },
  empty: { color: '#bbb', textAlign: 'center', marginTop: 40, fontSize: 14 },
  catRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10, marginTop: 3 },
  catBody: { flex: 1 },
  catName: { fontSize: 14, fontWeight: '600', color: '#333' },
  catVal: { fontSize: 14, fontWeight: '800', color: '#333' },
  barWrap: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 },
  bar: { height: 6, borderRadius: 3 },
  pct: { fontSize: 11, color: '#aaa', marginTop: 3 },
});
