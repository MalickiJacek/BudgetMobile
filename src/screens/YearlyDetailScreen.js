import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import { fetchIncomes, fetchExpenses, fetchSavingsOperations } from '../db/database';

const W = Dimensions.get('window').width;
const EXP_COLORS = ['#e53935','#1e88e5','#43a047','#fb8c00','#8e24aa','#00897b','#f4511e','#3949ab','#00acc1','#7cb342','#fdd835','#6d4c41'];
const SAV_COLORS = ['#1565C0','#6A1B9A','#2E7D32','#E65100','#AD1457','#00838F','#F57F17','#37474F'];

export default function YearlyDetailScreen({ route }) {
  const { initialYear } = route.params;
  const [years, setYears] = useState([]);
  const [selected, setSelected] = useState(initialYear);
  const [data, setData] = useState(null);
  const [rawData, setRawData] = useState(null);

  useFocusEffect(useCallback(() => {
    (async () => {
      const [incomes, expenses, operations] = await Promise.all([
        fetchIncomes(),
        fetchExpenses(),
        fetchSavingsOperations({ limit: 0 }),
      ]);

      const yearSet = new Set();
      incomes.forEach(i => yearSet.add(i.date.slice(0, 4)));
      expenses.forEach(e => yearSet.add(e.date.slice(0, 4)));
      operations.filter(o => o.type === 'deposit').forEach(o => yearSet.add(o.date.slice(0, 4)));

      setYears([...yearSet].sort().reverse());
      setRawData({ incomes, expenses, operations });
    })();
  }, []));

  useEffect(() => {
    if (!rawData) return;
    const { incomes, expenses, operations } = rawData;
    const year = selected;

    const yInc = incomes.filter(i => i.date.startsWith(year));
    const yExp = expenses.filter(e => e.date.startsWith(year));
    const yDep = operations.filter(o => o.type === 'deposit' && o.date.startsWith(year));

    const inc = yInc.reduce((s, i) => s + i.amount, 0);
    const exp = yExp.reduce((s, e) => s + e.amount, 0);
    const dep = yDep.reduce((s, o) => s + o.amount, 0);

    const catMap = {};
    yExp.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    const expCats = Object.entries(catMap).map(([name, total]) => ({ name, total })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

    const accMap = {};
    yDep.forEach(o => { accMap[o.account_name] = (accMap[o.account_name] || 0) + o.amount; });
    const savAccs = Object.entries(accMap).map(([name, total]) => ({ name, total })).filter(a => a.total > 0).sort((a, b) => b.total - a.total);

    setData({ inc, exp, dep, expCats, savAccs });
  }, [selected, rawData]);

  const fmt = v => Math.round(v).toLocaleString('pl-PL');

  const expPie = data?.expCats.map((c, i) => ({
    name: c.name, population: Math.round(c.total),
    color: EXP_COLORS[i % EXP_COLORS.length], legendFontColor: '#555', legendFontSize: 11,
  })) || [];

  const savPie = data?.savAccs.map((a, i) => ({
    name: a.name, population: Math.round(a.total),
    color: SAV_COLORS[i % SAV_COLORS.length], legendFontColor: '#555', legendFontSize: 11,
  })) || [];

  const chartConfig = {
    color: () => '#333', labelColor: () => '#666',
    backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
  };

  const balance = data ? data.inc - data.exp - data.dep : 0;

  return (
    <ScrollView style={s.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.yearPicker}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 12 }}>
        {years.map(y => (
          <TouchableOpacity key={y} style={[s.yearBtn, selected === y && s.yearBtnActive]} onPress={() => setSelected(y)}>
            <Text style={[s.yearBtnText, selected === y && s.yearBtnTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {data && (
        <>
          <View style={s.summaryCard}>
            <Text style={s.summaryYear}>Rok {selected}</Text>
            <View style={s.summaryRow}>
              <SummaryItem label="Zarobione" value={`+${fmt(data.inc)} zł`} color="#2e7d32" />
              <SummaryItem label="Wydane" value={`-${fmt(data.exp)} zł`} color="#e53935" />
              <SummaryItem label="Odłożone" value={`${fmt(data.dep)} zł`} color="#1565c0" />
            </View>
            <View style={s.divider} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={s.balanceLabel}>Bilans roczny</Text>
              <Text style={[s.balanceVal, { color: balance >= 0 ? '#2e7d32' : '#e53935' }]}>
                {balance >= 0 ? '+' : ''}{fmt(balance)} zł
              </Text>
            </View>
          </View>

          {expPie.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🥧 Na co wydano w {selected}</Text>
              <PieChart data={expPie} width={W - 32} height={190} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="8" />
              {data.expCats.map((c, i) => (
                <View key={i} style={s.catRow}>
                  <View style={[s.dot, { backgroundColor: EXP_COLORS[i % EXP_COLORS.length] }]} />
                  <Text style={s.catName}>{c.name}</Text>
                  <View style={s.barWrap}>
                    <View style={[s.bar, { width: `${(c.total / data.expCats[0].total) * 100}%`, backgroundColor: EXP_COLORS[i % EXP_COLORS.length] }]} />
                  </View>
                  <Text style={s.catVal}>{fmt(c.total)} zł</Text>
                </View>
              ))}
            </View>
          )}

          {savPie.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🏦 Gdzie odłożono w {selected}</Text>
              <PieChart data={savPie} width={W - 32} height={190} chartConfig={chartConfig} accessor="population" backgroundColor="transparent" paddingLeft="8" />
              {data.savAccs.map((a, i) => (
                <View key={i} style={s.catRow}>
                  <View style={[s.dot, { backgroundColor: SAV_COLORS[i % SAV_COLORS.length] }]} />
                  <Text style={s.catName}>{a.name}</Text>
                  <View style={s.barWrap}>
                    <View style={[s.bar, { width: `${(a.total / data.savAccs[0].total) * 100}%`, backgroundColor: SAV_COLORS[i % SAV_COLORS.length] }]} />
                  </View>
                  <Text style={s.catVal}>{fmt(a.total)} zł</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const SummaryItem = ({ label, value, color }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={{ fontSize: 17, fontWeight: '800', color }}>{value}</Text>
    <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  yearPicker: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  yearBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0', backgroundColor: '#f5f5f5' },
  yearBtnActive: { backgroundColor: '#1a237e', borderColor: '#1a237e' },
  yearBtnText: { fontSize: 15, fontWeight: '600', color: '#888' },
  yearBtnTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 20 },
  summaryYear: { fontSize: 13, color: '#999', fontWeight: '600', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryRow: { flexDirection: 'row', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 14 },
  balanceLabel: { fontSize: 14, color: '#666', fontWeight: '600' },
  balanceVal: { fontSize: 22, fontWeight: '800' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  catName: { width: 100, fontSize: 12, color: '#555' },
  barWrap: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginHorizontal: 8 },
  bar: { height: 6, borderRadius: 3 },
  catVal: { width: 65, fontSize: 12, fontWeight: '700', color: '#333', textAlign: 'right' },
});
