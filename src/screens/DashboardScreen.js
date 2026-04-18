import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, TouchableOpacity, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { getDb } from '../db/database';
import { seedDemoData, clearAllData } from '../db/seed';

const W = Dimensions.get('window').width;
const CAT_COLORS = ['#e53935','#1e88e5','#43a047','#fb8c00','#8e24aa','#00897b','#f4511e','#3949ab','#00acc1','#7cb342','#fdd835','#6d4c41'];

export default function DashboardScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const db = await getDb();
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [inc, exp, dep] = await Promise.all([
      db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM incomes WHERE strftime('%Y-%m',date)=?`, [ym]),
      db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE strftime('%Y-%m',date)=?`, [ym]),
      db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM savings_operations WHERE type='deposit' AND strftime('%Y-%m',date)=?`, [ym]),
    ]);

    // Wydatki wg kategorii
    const cats = await db.getAllAsync(`
      SELECT ec.name, COALESCE(SUM(e.amount),0) as total
      FROM expenses e JOIN expenses_category ec ON e.category_id=ec.id
      WHERE strftime('%Y-%m',e.date)=?
      GROUP BY ec.id ORDER BY total DESC`, [ym]);

    // 6 miesięcy historia
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });

    const history = await Promise.all(months.map(async m => {
      const [i, e, s] = await Promise.all([
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM incomes WHERE strftime('%Y-%m',date)=?`, [m]),
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE strftime('%Y-%m',date)=?`, [m]),
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM savings_operations WHERE type='deposit' AND strftime('%Y-%m',date)=?`, [m]),
      ]);
      return { label: m.slice(5), income: i.v, expense: e.v, savings: s.v };
    }));

    // Stan oszczędności z najnowszych snapshotów
    const accounts = await db.getAllAsync(`
      SELECT sa.name, sa.color,
             ss.balance, ss.snapshot_date
      FROM savings_accounts sa
      LEFT JOIN savings_snapshots ss ON ss.id=(
        SELECT id FROM savings_snapshots WHERE account_id=sa.id
        ORDER BY snapshot_date DESC, id DESC LIMIT 1
      )
      ORDER BY sa.id`);

    const totalSavings = accounts.reduce((s, a) => s + (a.balance || 0), 0);

    // Roczne podsumowanie
    const year = String(now.getFullYear());
    const [yearInc, yearExp, yearDep] = await Promise.all([
      db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM incomes WHERE strftime('%Y',date)=?`, [year]),
      db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE strftime('%Y',date)=?`, [year]),
      db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM savings_operations WHERE type='deposit' AND strftime('%Y',date)=?`, [year]),
    ]);

    setData({ inc: inc.v, exp: exp.v, dep: dep.v, cats, history, accounts, totalSavings, ym, yearInc: yearInc.v, yearExp: yearExp.v, yearDep: yearDep.v, year });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!data) return <View style={s.center}><Text style={s.centerText}>Ładowanie...</Text></View>;

  const { inc, exp, dep, cats, history, accounts, totalSavings, yearInc, yearExp, yearDep, year } = data;
  const balance = inc - exp - dep;
  const now = new Date();
  const monthLabel = now.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
  const hasData = history.some(h => h.income > 0 || h.expense > 0 || h.savings > 0);

  const chartConfig = {
    backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
    decimalPlaces: 0, color: (o = 1) => `rgba(26,35,126,${o})`,
    labelColor: () => '#888', barPercentage: 0.55,
    propsForLabels: { fontSize: 10 },
  };

  const barData = {
    labels: history.map(h => h.label),
    datasets: [
      { data: history.map(h => Math.round(h.income)), color: (o = 1) => `rgba(67,160,71,${o})` },
      { data: history.map(h => Math.round(h.expense + h.savings)), color: (o = 1) => `rgba(229,57,53,${o})` },
    ],
    legend: ['Wpływy', 'Wydatki+Oszcz.'],
  };

  const pieData = cats.filter(c => c.total > 0).slice(0, 8).map((c, i) => ({
    name: c.name, population: Math.round(c.total),
    color: CAT_COLORS[i % CAT_COLORS.length],
    legendFontColor: '#555', legendFontSize: 11,
  }));

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Miesiąc */}
      <Text style={s.month}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text>

      {/* 3 karty */}
      <View style={s.row3}>
        <MetricCard label="Wpływy" value={`+${fmt(inc)} zł`} bg="#e8f5e9" color="#2e7d32" />
        <MetricCard label="Wydatki" value={`-${fmt(exp)} zł`} bg="#fce4ec" color="#c62828" />
        <MetricCard label="Oszczędności" value={`${fmt(dep)} zł`} bg="#e3f2fd" color="#1565c0" />
      </View>

      {/* Bilans */}
      <TouchableOpacity style={[s.balanceCard, { backgroundColor: balance >= -10 ? '#e8f5e9' : '#fff3e0' }]}
        onPress={() => navigation.navigate('MonthlyBalances')}>
        <View>
          <Text style={s.balanceTitle}>Bilans miesiąca</Text>
          <Text style={s.balanceHint}>Wpływy − Wydatki − Oszczędności</Text>
        </View>
        <Text style={[s.balanceVal, { color: balance >= 0 ? '#2e7d32' : '#e65100' }]}>
          {balance >= 0 ? '+' : ''}{fmt(balance)} zł
        </Text>
      </TouchableOpacity>

      {/* Rok */}
      <TouchableOpacity style={s.yearCard}
        onPress={() => navigation.navigate('YearlyDetail', { initialYear: String(now.getFullYear()) })}>
        <Text style={s.sectionTitle}>📅 Rok {year}</Text>
        <View style={s.yearRow}>
          <YearStat label="Zarobione" value={fmt(yearInc)} color="#2e7d32" />
          <YearStat label="Wydane" value={fmt(yearExp)} color="#c62828" />
          <YearStat label="Odłożone" value={fmt(yearDep)} color="#1565c0" />
          <YearStat label="Bilans" value={fmt(yearInc - yearExp - yearDep)} color={yearInc - yearExp - yearDep >= 0 ? '#2e7d32' : '#e65100'} />
        </View>
      </TouchableOpacity>

      {/* Oszczędności */}
      <TouchableOpacity style={s.section} onPress={() => navigation.navigate('SavingsPie')}>
        <View style={s.sectionRow}>
          <Text style={s.sectionTitle}>🏦 Oszczędności łącznie</Text>
          <Text style={s.sectionVal}>{fmt(totalSavings)} zł</Text>
        </View>
        {accounts.map((a, i) => (
          <View key={i} style={s.accountRow}>
            <View style={[s.dot, { backgroundColor: a.color }]} />
            <Text style={s.accountName}>{a.name}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.accountBal}>{a.balance != null ? `${fmt(a.balance)} zł` : '—'}</Text>
              {a.snapshot_date && <Text style={s.accountDate}>{a.snapshot_date}</Text>}
            </View>
          </View>
        ))}
      </TouchableOpacity>

      {/* Wykres 6 miesięcy */}
      {hasData && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>📈 Ostatnie 6 miesięcy</Text>
          <Text style={s.sectionHint}>Wpływy (zielony) vs Wydatki+Oszczędności (czerwony)</Text>
          <BarChart
            data={barData} width={W - 32} height={210}
            chartConfig={chartConfig} style={s.chart}
            withInnerLines fromZero showBarTops={false}
          />
        </View>
      )}

      {/* Wydatki wg kategorii */}
      {pieData.length > 0 && (
        <TouchableOpacity style={s.section} onPress={() => navigation.navigate('ExpenseCategoryDetail')}>
          <Text style={s.sectionTitle}>🥧 Na co wydajemy</Text>
          <Text style={s.sectionHint}>Bieżący miesiąc · dotknij po więcej →</Text>
          <PieChart
            data={pieData} width={W - 32} height={190}
            chartConfig={chartConfig} accessor="population"
            backgroundColor="transparent" paddingLeft="8"
            style={s.chart}
          />
          {cats.filter(c => c.total > 0).map((c, i) => (
            <View key={i} style={s.catRow}>
              <View style={[s.catDot, { backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
              <Text style={s.catName}>{c.name}</Text>
              <View style={s.catBarWrap}>
                <View style={[s.catBar, { width: `${Math.min(100, (c.total / cats[0].total) * 100)}%`, backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }]} />
              </View>
              <Text style={s.catVal}>{fmt(c.total)} zł</Text>
            </View>
          ))}
        </TouchableOpacity>
      )}

      {/* DEV — usunąć po testach */}
      <View style={s.devRow}>
        <TouchableOpacity style={s.devBtn} onPress={async () => {
          Alert.alert('Demo dane', 'Wczytać przykładowe dane?', [
            { text: 'Anuluj' },
            { text: 'Wczytaj', onPress: async () => {
              const db = await getDb();
              await seedDemoData(db);
              load();
            }}
          ]);
        }}>
          <Text style={s.devBtnText}>🧪 Wczytaj demo dane</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.devBtn, { borderColor: '#e53935' }]} onPress={async () => {
          Alert.alert('Wyczyść', 'Usunąć wszystkie dane?', [
            { text: 'Anuluj' },
            { text: 'Usuń', style: 'destructive', onPress: async () => {
              const db = await getDb();
              await clearAllData(db);
              load();
            }}
          ]);
        }}>
          <Text style={[s.devBtnText, { color: '#e53935' }]}>🗑️ Wyczyść dane</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const fmt = v => Math.round(v).toLocaleString('pl-PL');

const MetricCard = ({ label, value, bg, color }) => (
  <View style={[{ flex: 1, borderRadius: 12, padding: 12, backgroundColor: bg }]}>
    <Text style={{ fontSize: 10, color: '#666', fontWeight: '700', marginBottom: 5 }}>{label.toUpperCase()}</Text>
    <Text style={{ fontSize: 14, fontWeight: '800', color }}>{value}</Text>
  </View>
);

const YearStat = ({ label, value, color }) => (
  <View style={{ alignItems: 'center', flex: 1 }}>
    <Text style={{ fontSize: 15, fontWeight: '800', color }}>{value}</Text>
    <Text style={{ fontSize: 10, color: '#999', marginTop: 3, textAlign: 'center' }}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7', paddingHorizontal: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerText: { color: '#aaa', fontSize: 16 },
  month: { fontSize: 19, fontWeight: '800', color: '#1a237e', marginTop: 18, marginBottom: 14 },
  row3: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  balanceCard: { borderRadius: 16, padding: 18, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  balanceHint: { fontSize: 11, color: '#888', marginTop: 3 },
  balanceVal: { fontSize: 24, fontWeight: '800' },
  yearCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 },
  yearRow: { flexDirection: 'row', marginTop: 12 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 4 },
  sectionHint: { fontSize: 11, color: '#aaa', marginBottom: 12 },
  sectionVal: { fontSize: 18, fontWeight: '800', color: '#1565c0' },
  accountRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  accountName: { flex: 1, fontSize: 14, color: '#333' },
  accountBal: { fontSize: 15, fontWeight: '700', color: '#1a237e' },
  accountDate: { fontSize: 10, color: '#aaa', marginTop: 2 },
  chart: { borderRadius: 12, marginBottom: 8, marginLeft: -8 },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  catName: { width: 90, fontSize: 12, color: '#555' },
  catBarWrap: { flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, marginHorizontal: 8 },
  catBar: { height: 6, borderRadius: 3 },
  catVal: { width: 60, fontSize: 12, fontWeight: '600', color: '#333', textAlign: 'right' },
  devRow: { flexDirection: 'row', gap: 10, marginTop: 8, marginBottom: 8 },
  devBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#aaa', alignItems: 'center' },
  devBtnText: { fontSize: 13, color: '#555', fontWeight: '600' },
});
