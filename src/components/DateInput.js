import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';

const MONTHS = ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'];

const daysInMonth = (y, m) => new Date(y, m, 0).getDate();

const parseDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  return { y: y || 2026, m: m || 1, d: d || 1 };
};

const formatDate = (y, m, d) =>
  `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

export default function DateInput({ value, onChange, inputStyle }) {
  const [open, setOpen] = useState(false);
  const parsed = parseDate(value);
  const [y, setY] = useState(parsed.y);
  const [m, setM] = useState(parsed.m);
  const [d, setD] = useState(parsed.d);

  const clampDay = (day, month, year) => Math.min(day, daysInMonth(year, month));

  const changeY = (delta) => {
    const ny = y + delta;
    setY(ny);
    setD(clampDay(d, m, ny));
  };
  const changeM = (delta) => {
    let nm = m + delta;
    let ny = y;
    if (nm < 1) { nm = 12; ny = y - 1; setY(ny); }
    if (nm > 12) { nm = 1; ny = y + 1; setY(ny); }
    setM(nm);
    setD(clampDay(d, nm, ny));
  };
  const changeD = (delta) => {
    const max = daysInMonth(y, m);
    let nd = d + delta;
    if (nd < 1) nd = max;
    if (nd > max) nd = 1;
    setD(nd);
  };

  const confirm = () => {
    onChange(formatDate(y, m, d));
    setOpen(false);
  };

  const openPicker = () => {
    const p = parseDate(value);
    setY(p.y); setM(p.m); setD(p.d);
    setOpen(true);
  };

  return (
    <>
      <TouchableOpacity style={[styles.input, inputStyle]} onPress={openPicker}>
        <Text style={styles.text}>{value}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade">
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.card}>
            <Text style={styles.title}>Wybierz datę</Text>
            <View style={styles.cols}>
              <Col label="Dzień" value={String(d)} onUp={() => changeD(1)} onDown={() => changeD(-1)} />
              <Col label="Miesiąc" value={MONTHS[m - 1]} onUp={() => changeM(1)} onDown={() => changeM(-1)} />
              <Col label="Rok" value={String(y)} onUp={() => changeY(1)} onDown={() => changeY(-1)} />
            </View>
            <Text style={styles.preview}>{formatDate(y, m, d)}</Text>
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setOpen(false)}>
                <Text style={styles.btnCancelText}>Anuluj</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnOk} onPress={confirm}>
                <Text style={styles.btnOkText}>Gotowe</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const Col = ({ label, value, onUp, onDown }) => (
  <View style={styles.col}>
    <Text style={styles.colLabel}>{label}</Text>
    <TouchableOpacity style={styles.arrow} onPress={onUp}>
      <Text style={styles.arrowText}>▲</Text>
    </TouchableOpacity>
    <View style={styles.valueBox}>
      <Text style={styles.valueText}>{value}</Text>
    </View>
    <TouchableOpacity style={styles.arrow} onPress={onDown}>
      <Text style={styles.arrowText}>▼</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5, borderColor: '#ececec', borderRadius: 12,
    padding: 14, backgroundColor: '#fafafa',
    flexDirection: 'row', alignItems: 'center',
  },
  text: { flex: 1, fontSize: 16, color: '#333' },
  icon: { fontSize: 18 },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    width: 300, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, elevation: 8,
  },
  title: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 20 },
  cols: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  col: { alignItems: 'center', minWidth: 72 },
  colLabel: { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  arrow: { padding: 8 },
  arrowText: { fontSize: 16, color: '#1565C0' },
  valueBox: { backgroundColor: '#f0f4ff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, minWidth: 56, alignItems: 'center' },
  valueText: { fontSize: 18, fontWeight: '700', color: '#1a237e' },
  preview: { fontSize: 13, color: '#999', marginBottom: 20 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  btnCancel: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: '#e0e0e0', alignItems: 'center' },
  btnCancelText: { color: '#888', fontWeight: '600' },
  btnOk: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#1565C0', alignItems: 'center' },
  btnOkText: { color: '#fff', fontWeight: '700' },
});
