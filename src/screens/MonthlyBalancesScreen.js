import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getDb } from '../db/database';

export default function MonthlyBalancesScreen() {
  const [months, setMonths] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const db = await getDb();

    // Wszystkie miesiące z jakimikolwiek danymi
    const raw = await db.getAllAsync(`
      SELECT month FROM (
        SELECT strftime('%Y-%m', date) as month FROM incomes
        UNION
        SELECT strftime('%Y-%m', date) FROM expenses
        UNION
        SELECT strftime('%Y-%m', date) FROM savings_operations WHERE type='deposit'
      )
      GROUP BY month ORDER BY month DESC
    `);

    const results = await Promise.all(raw.map(async ({ month }) => {
      const [inc, exp, dep] = await Promise.all([
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM incomes WHERE strftime('%Y-%m',date)=?`, [month]),
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE strftime('%Y-%m',date)=?`, [month]),
        db.getFirstAsync(`SELECT COALESCE(SUM(amount),0) as v FROM savings_operations WHERE type='deposit' AND strftime('%Y-%m',date)=?`, [month]),
      ]);
      const balance = inc.v - exp.v - dep.v;
      const [y, m] = month.split('-');
      const label = new Date(parseInt(y), parseInt(m) - 1, 1)
        .toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
      return { month, label, inc: inc.v, exp: exp.v, dep: dep.v, balance };
    }));

    setMonths(results);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmt = v => Math.round(Math.abs(v)).toLocaleString('pl-PL');

  return (
    <FlatList
      style={s.container}
      data={months}
      keyExtractor={i => i.month}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={<Text style={s.empty}>Brak danych</Text>}
      ListHeaderComponent={
        <View style={s.headerRow}>
          <Text style={s.headerCell}>Miesiąc</Text>
          <Text style={s.headerCell}>Wpływy</Text>
          <Text style={s.headerCell}>Wydatki</Text>
          <Text style={s.headerCell}>Oszcz.</Text>
          <Text style={[s.headerCell, { textAlign: 'right' }]}>Bilans</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={s.row}>
          <View style={s.monthCol}>
            <Text style={s.monthText}>{item.label.charAt(0).toUpperCase() + item.label.slice(1)}</Text>
            <View style={[s.balanceBar, {
              width: `${Math.min(100, Math.abs(item.balance) / Math.max(item.inc, 1) * 100)}%`,
              backgroundColor: item.balance >= 0 ? '#a5d6a7' : '#ef9a9a'
            }]} />
          </View>
          <Text style={s.numCell}>{fmt(item.inc)}</Text>
          <Text style={s.numCell}>{fmt(item.exp)}</Text>
          <Text style={s.numCell}>{fmt(item.dep)}</Text>
          <Text style={[s.numCell, s.balanceCell, { color: item.balance >= 0 ? '#2e7d32' : '#e53935' }]}>
            {item.balance >= 0 ? '+' : '-'}{fmt(item.balance)}
          </Text>
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  empty: { color: '#bbb', textAlign: 'center', marginTop: 60, fontSize: 15 },
  headerRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#e8eaf6' },
  headerCell: { flex: 1, fontSize: 10, fontWeight: '700', color: '#5c6bc0', textTransform: 'uppercase', textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 14, marginVertical: 4, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  monthCol: { flex: 1.6 },
  monthText: { fontSize: 13, fontWeight: '600', color: '#333' },
  balanceBar: { height: 3, borderRadius: 2, marginTop: 5 },
  numCell: { flex: 1, fontSize: 12, color: '#666', textAlign: 'right' },
  balanceCell: { fontWeight: '800', fontSize: 13 },
});
