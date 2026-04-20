import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { fetchSavingsOperations, fetchSavingsSnapshots } from '../db/database';

const W = Dimensions.get('window').width;

export default function SavingsAccountDetailScreen({ route }) {
  const { accountId, accountName, accountColor } = route.params;
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [allOps, rawSnapshots] = await Promise.all([
      fetchSavingsOperations({ accountId, limit: 0 }),
      fetchSavingsSnapshots(accountId),
    ]);

    const deposits = allOps.filter(o => o.type === 'deposit');

    // Grupuj wpłaty po miesiącach
    const depositByMonth = {};
    deposits.forEach(d => {
      const month = d.date.slice(0, 7);
      depositByMonth[month] = (depositByMonth[month] || 0) + d.amount;
    });
    const rawDeposits = Object.entries(depositByMonth).map(([month, total]) => ({ month, total })).sort((a, b) => a.month.localeCompare(b.month));

    // Snapshoty z polem month
    const snapsWithMonth = rawSnapshots.map(s => ({ ...s, month: s.snapshot_date.slice(0, 7) }));

    if (rawDeposits.length === 0 && rawSnapshots.length === 0) {
      setChartData(null); setStats(null); return;
    }

    // Zbuduj oś czasu — WSZYSTKIE miesiące od pierwszego do teraz (proporcjonalne odstępy)
    const now = new Date();
    const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const allDataMonths = [
      ...rawDeposits.map(d => d.month),
      ...snapsWithMonth.map(s => s.month),
    ].sort();
    const firstMonth = allDataMonths[0] || nowMonth;
    const sortedMonths = [];
    let [cy, cm] = firstMonth.split('-').map(Number);
    const [ey, em] = nowMonth.split('-').map(Number);
    while (cy < ey || (cy === ey && cm <= em)) {
      sortedMonths.push(`${cy}-${String(cm).padStart(2, '0')}`);
      cm++; if (cm > 12) { cm = 1; cy++; }
    }

    // Skumulowane wpłaty
    const depositMap = {};
    rawDeposits.forEach(d => { depositMap[d.month] = d.total; });
    let cumulative = 0;
    const cumulativeByMonth = {};
    sortedMonths.forEach(m => {
      cumulative += depositMap[m] || 0;
      cumulativeByMonth[m] = cumulative;
    });

    // Snapshoty — ostatni na każdy miesiąc (propaguj do przodu)
    const snapshotMap = {};
    snapsWithMonth.forEach(s => { snapshotMap[s.month] = s.balance; });
    let lastSnap = null;
    const filledSnapshots = {};
    sortedMonths.forEach(m => {
      if (snapshotMap[m] !== undefined) lastSnap = snapshotMap[m];
      if (lastSnap !== null) filledSnapshots[m] = lastSnap;
    });

    const chartMonths = sortedMonths.filter(m => cumulativeByMonth[m] > 0 || filledSnapshots[m] !== undefined);
    const step = Math.max(1, Math.floor(chartMonths.length / 6));
    const labels = chartMonths.map((m, i) => i % step === 0 ? m.slice(5) : '');
    const depositsLine = chartMonths.map(m => Math.round(cumulativeByMonth[m] || 0));
    const snapshotsLine = chartMonths.map(m => filledSnapshots[m] !== undefined ? Math.round(filledSnapshots[m]) : null);

    const totalDeposited = cumulative;
    const latestBalance = rawSnapshots.length > 0 ? rawSnapshots[rawSnapshots.length - 1].balance : null;
    const gain = latestBalance !== null ? latestBalance - totalDeposited : null;
    const gainPct = totalDeposited > 0 && gain !== null ? (gain / totalDeposited) * 100 : null;

    setStats({ totalDeposited, latestBalance, gain, gainPct, snapshotCount: rawSnapshots.length, depositCount: rawDeposits.length });
    setChartData({ labels, depositsLine, snapshotsLine, chartMonths, snapshotMap });
  }, [accountId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const fmt = v => v != null ? Math.round(v).toLocaleString('pl-PL') : '—';

  if (!chartData || !stats) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyIcon}>📊</Text>
        <Text style={s.emptyTitle}>Brak danych</Text>
        <Text style={s.emptyHint}>Dodaj wpłaty i snapshoty stanu konta, aby zobaczyć wykres.</Text>
      </View>
    );
  }

  const { labels, depositsLine, snapshotsLine } = chartData;
  const { totalDeposited, latestBalance, gain, gainPct } = stats;

  const hasSnapshots = snapshotsLine.some(v => v !== null);
  const snapshotsFilled = snapshotsLine.map((v, i) => v !== null ? v : depositsLine[i]);
  const maxVal = Math.max(...depositsLine, ...snapshotsFilled);
  const minVal = Math.min(...depositsLine, ...snapshotsFilled);
  const padding = (maxVal - minVal) * 0.15 || 1000;

  const datasets = [
    { data: depositsLine, color: () => '#9e9e9e', strokeWidth: 2 },
    ...(hasSnapshots ? [{ data: snapshotsFilled, color: () => accountColor || '#e65100', strokeWidth: 2.5 }] : []),
  ];

  const chartConfig = {
    backgroundColor: '#fff', backgroundGradientFrom: '#fff', backgroundGradientTo: '#fff',
    decimalPlaces: 0, color: (opacity = 1) => `rgba(26,35,126,${opacity})`,
    labelColor: () => '#999',
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff' },
    propsForLabels: { fontSize: 10 },
  };

  const gainColor = gain === null ? '#999' : gain >= 0 ? '#2e7d32' : '#e53935';

  return (
    <ScrollView style={s.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={[s.accountHeader, { backgroundColor: accountColor }]}>
        <Text style={s.accountName}>{accountName}</Text>
        <Text style={s.accountBalance}>{latestBalance != null ? `${fmt(latestBalance)} zł` : 'Brak snapshotu'}</Text>
        <Text style={s.accountBalanceLabel}>aktualny stan konta</Text>
      </View>

      <View style={s.statsRow}>
        <StatCard label="Wpłacono łącznie" value={`${fmt(totalDeposited)} zł`} color="#1565C0" />
        <StatCard
          label={gain >= 0 ? 'Zysk' : 'Strata'}
          value={gain !== null ? `${gain >= 0 ? '+' : ''}${fmt(gain)} zł` : '—'}
          color={gainColor}
          sub={gainPct !== null ? `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%` : ''}
        />
      </View>

      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: '#9e9e9e' }]} />
          <Text style={s.legendText}>Skumulowane wpłaty</Text>
        </View>
        {hasSnapshots && (
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: accountColor }]} />
            <Text style={s.legendText}>Stan konta (snapshoty)</Text>
          </View>
        )}
      </View>

      <View style={s.chartWrap}>
        <LineChart
          data={{ labels, datasets }}
          width={W - 32} height={260} chartConfig={chartConfig} bezier
          style={s.chart} withDots={labels.length <= 12} withInnerLines withOuterLines={false}
          fromNumber={Math.max(0, minVal - padding)} yAxisSuffix=" zł"
          formatYLabel={v => { const n = parseInt(v); return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n); }}
        />
      </View>

      {hasSnapshots && gain !== null && (
        <View style={[s.insightBox, { backgroundColor: gain >= 0 ? '#e8f5e9' : '#fce4ec' }]}>
          <Text style={[s.insightTitle, { color: gainColor }]}>
            {gain >= 0 ? '📈 Konto rośnie powyżej wpłat' : '📉 Konto poniżej wpłaconych środków'}
          </Text>
          <Text style={s.insightText}>
            {gain >= 0
              ? `Twoje inwestycje wypracowały ${fmt(gain)} zł zysku (${gainPct?.toFixed(1)}%) ponad wpłacony kapitał.`
              : `Wartość konta jest o ${fmt(Math.abs(gain))} zł niższa niż suma wpłat. Monitoruj dalej.`}
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const StatCard = ({ label, value, color, sub }) => (
  <View style={s.statCard}>
    <Text style={s.statLabel}>{label}</Text>
    <Text style={[s.statValue, { color }]}>{value}</Text>
    {sub ? <Text style={[s.statSub, { color }]}>{sub}</Text> : null}
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f3f7' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#f2f3f7' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
  accountHeader: { padding: 24, paddingTop: 28, paddingBottom: 28 },
  accountName: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  accountBalance: { color: '#fff', fontSize: 34, fontWeight: '800' },
  accountBalanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, margin: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  statLabel: { fontSize: 11, color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statSub: { fontSize: 13, fontWeight: '600', marginTop: 4, opacity: 0.8 },
  legend: { flexDirection: 'row', gap: 20, marginHorizontal: 16, marginBottom: 10, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#666' },
  chartWrap: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 8, paddingTop: 16 },
  chart: { borderRadius: 12 },
  insightBox: { margin: 16, borderRadius: 14, padding: 16 },
  insightTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  insightText: { fontSize: 13, color: '#555', lineHeight: 19 },
});
