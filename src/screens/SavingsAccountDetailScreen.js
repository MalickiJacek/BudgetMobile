import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Dimensions, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { getDb } from '../db/database';

const W = Dimensions.get('window').width;

export default function SavingsAccountDetailScreen({ route }) {
  const { accountId, accountName, accountColor } = route.params;
  const [chartData, setChartData] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const db = await getDb();

    // Wpłaty pogrupowane po miesiącach
    const rawDeposits = await db.getAllAsync(
      `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total
       FROM savings_operations
       WHERE account_id=? AND type='deposit'
       GROUP BY month ORDER BY month`,
      [accountId]
    );

    // Snapshoty — najnowszy na każdy miesiąc
    const rawSnapshots = await db.getAllAsync(
      `SELECT strftime('%Y-%m', snapshot_date) as month,
              balance, snapshot_date
       FROM savings_snapshots
       WHERE account_id=?
       ORDER BY snapshot_date ASC`,
      [accountId]
    );

    if (rawDeposits.length === 0 && rawSnapshots.length === 0) {
      setChartData(null);
      setStats(null);
      return;
    }

    // Buduj zunifikowaną oś czasu miesięcy
    const allMonths = new Set([
      ...rawDeposits.map(d => d.month),
      ...rawSnapshots.map(s => s.month),
    ]);
    const now = new Date();
    const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    allMonths.add(nowMonth);

    const sortedMonths = [...allMonths].sort();

    // Skumulowane wpłaty
    const depositMap = {};
    rawDeposits.forEach(d => { depositMap[d.month] = d.total; });

    let cumulative = 0;
    const cumulativeByMonth = {};
    sortedMonths.forEach(m => {
      cumulative += depositMap[m] || 0;
      cumulativeByMonth[m] = cumulative;
    });

    // Snapshoty — ostatni dostępny na dany miesiąc
    const snapshotMap = {};
    rawSnapshots.forEach(s => { snapshotMap[s.month] = s.balance; });

    // Wypełnij luki w snapshotach (przenieś ostatnią wartość do przodu)
    let lastSnap = null;
    const filledSnapshots = {};
    sortedMonths.forEach(m => {
      if (snapshotMap[m] !== undefined) lastSnap = snapshotMap[m];
      if (lastSnap !== null) filledSnapshots[m] = lastSnap;
    });

    // Punkty wykresu — tylko miesiące gdzie mamy obie wartości
    const chartMonths = sortedMonths.filter(m =>
      cumulativeByMonth[m] > 0 || filledSnapshots[m] !== undefined
    );

    // Etykiety — co ile miesięcy pokazać (max 7 etykiet)
    const step = Math.max(1, Math.floor(chartMonths.length / 6));
    const labels = chartMonths.map((m, i) =>
      i % step === 0 ? m.slice(5) : ''
    );

    const depositsLine = chartMonths.map(m => Math.round(cumulativeByMonth[m] || 0));
    const snapshotsLine = chartMonths.map(m =>
      filledSnapshots[m] !== undefined ? Math.round(filledSnapshots[m]) : null
    );

    // Statystyki
    const totalDeposited = cumulative;
    const latestBalance = rawSnapshots.length > 0
      ? rawSnapshots[rawSnapshots.length - 1].balance : null;
    const gain = latestBalance !== null ? latestBalance - totalDeposited : null;
    const gainPct = totalDeposited > 0 && gain !== null
      ? (gain / totalDeposited) * 100 : null;

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

  // Filtruj null ze snapshotów dla wykresu
  const hasSnapshots = snapshotsLine.some(v => v !== null);
  const snapshotsFilled = snapshotsLine.map((v, i) => v !== null ? v : depositsLine[i]);

  const maxVal = Math.max(...depositsLine, ...snapshotsFilled);
  const minVal = Math.min(...depositsLine, ...snapshotsFilled);
  const padding = (maxVal - minVal) * 0.15 || 1000;

  const datasets = [
    {
      data: depositsLine,
      color: () => '#9e9e9e',
      strokeWidth: 2,
    },
    ...(hasSnapshots ? [{
      data: snapshotsFilled,
      color: () => accountColor || '#e65100',
      strokeWidth: 2.5,
    }] : []),
  ];

  const chartConfig = {
    backgroundColor: '#fff',
    backgroundGradientFrom: '#fff',
    backgroundGradientTo: '#fff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(26,35,126,${opacity})`,
    labelColor: () => '#999',
    propsForDots: { r: '4', strokeWidth: '2', stroke: '#fff' },
    propsForLabels: { fontSize: 10 },
  };

  const gainColor = gain === null ? '#999' : gain >= 0 ? '#2e7d32' : '#e53935';

  return (
    <ScrollView
      style={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Nagłówek konta */}
      <View style={[s.accountHeader, { backgroundColor: accountColor }]}>
        <Text style={s.accountName}>{accountName}</Text>
        <Text style={s.accountBalance}>
          {latestBalance != null ? `${fmt(latestBalance)} zł` : 'Brak snapshotu'}
        </Text>
        <Text style={s.accountBalanceLabel}>aktualny stan konta</Text>
      </View>

      {/* Statystyki */}
      <View style={s.statsRow}>
        <StatCard label="Wpłacono łącznie" value={`${fmt(totalDeposited)} zł`} color="#1565C0" />
        <StatCard
          label={gain >= 0 ? 'Zysk' : 'Strata'}
          value={gain !== null ? `${gain >= 0 ? '+' : ''}${fmt(gain)} zł` : '—'}
          color={gainColor}
          sub={gainPct !== null ? `${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%` : ''}
        />
      </View>

      {/* Legenda */}
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

      {/* Wykres */}
      <View style={s.chartWrap}>
        <LineChart
          data={{ labels, datasets }}
          width={W - 32}
          height={260}
          chartConfig={chartConfig}
          bezier
          style={s.chart}
          withDots={labels.length <= 12}
          withInnerLines
          withOuterLines={false}
          fromNumber={Math.max(0, minVal - padding)}
          yAxisSuffix=" zł"
          formatYLabel={v => {
            const n = parseInt(v);
            if (n >= 1000) return `${Math.round(n / 1000)}k`;
            return String(n);
          }}
        />
      </View>

      {/* Interpretacja */}
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
