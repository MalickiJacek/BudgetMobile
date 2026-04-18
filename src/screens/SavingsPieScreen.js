import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-chart-kit';
import { getDb } from '../db/database';

const W = Dimensions.get('window').width;
const COLORS = ['#1565C0','#6A1B9A','#2E7D32','#E65100','#AD1457','#00838F','#F57F17','#37474F'];

export default function SavingsPieScreen() {
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const db = await getDb();
    const accs = await db.getAllAsync(`
      SELECT sa.id, sa.name, sa.color,
             ss.balance, ss.snapshot_date
      FROM savings_accounts sa
      LEFT JOIN savings_snapshots ss ON ss.id=(
        SELECT id FROM savings_snapshots WHERE account_id=sa.id
        ORDER BY snapshot_date DESC, id DESC LIMIT 1
      )
      ORDER BY COALESCE(ss.balance, 0) DESC`);

    const withBalance = accs.filter(a => a.balance != null && a.balance > 0);
    const tot = withBalance.reduce((s, a) => s + a.balance, 0);
    setAccounts(accs);
    setTotal(tot);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const withBalance = accounts.filter(a => a.balance != null && a.balance > 0);
  const fmt = v => Math.round(v).toLocaleString('pl-PL');

  const pieData = withBalance.map((a, i) => ({
    name: a.name,
    population: Math.round(a.balance),
    color: a.color || COLORS[i % COLORS.length],
    legendFontColor: '#555',
    legendFontSize: 11,
  }));

  const chartConfig = {
    color: () => '#333', labelColor: () => '#666',
    backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
  };

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={s.totalCard}>
        <Text style={s.totalLabel}>Łączne oszczędności</Text>
        <Text style={s.totalVal}>{fmt(total)} zł</Text>
        <Text style={s.totalHint}>wg ostatnich snapshotów</Text>
      </View>

      {pieData.length > 0 ? (
        <View style={s.section}>
          <PieChart
            data={pieData} width={W - 32} height={210}
            chartConfig={chartConfig} accessor="population"
            backgroundColor="transparent" paddingLeft="8"
          />
        </View>
      ) : (
        <Text style={s.empty}>Brak snapshotów — dodaj stan kont w zakładce Oszczędności</Text>
      )}

      <View style={s.section}>
        {accounts.map((a, i) => {
          const pct = total > 0 && a.balance ? (a.balance / total) * 100 : 0;
          return (
            <View key={a.id} style={s.row}>
              <View style={[s.dot, { backgroundColor: a.color || COLORS[i % COLORS.length] }]} />
              <View style={s.rowBody}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={s.name}>{a.name}</Text>
                  <Text style={s.val}>{a.balance != null ? `${fmt(a.balance)} zł` : '—'}</Text>
                </View>
                <View style={s.barWrap}>
                  <View style={[s.bar, { width: `${pct}%`, backgroundColor: a.color || COLORS[i % COLORS.length] }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={s.meta}>{a.snapshot_date ? `Stan na ${a.snapshot_date}` : 'Brak snapshotu'}</Text>
                  {pct > 0 && <Text style={s.pct}>{pct.toFixed(1)}%</Text>}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  empty: { color: '#bbb', textAlign: 'center', marginTop: 40, paddingHorizontal: 32, fontSize: 14, lineHeight: 20 },
  totalCard: { backgroundColor: '#1a237e', margin: 16, borderRadius: 18, padding: 22, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600' },
  totalVal: { color: '#fff', fontSize: 36, fontWeight: '800', marginVertical: 6 },
  totalHint: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 14, borderRadius: 16, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12, marginTop: 3 },
  rowBody: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: '#333' },
  val: { fontSize: 15, fontWeight: '800', color: '#1a237e' },
  barWrap: { height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 },
  bar: { height: 6, borderRadius: 3 },
  meta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  pct: { fontSize: 11, color: '#888', fontWeight: '600' },
});
