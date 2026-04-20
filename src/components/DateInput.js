import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function DateInput({ value, onChange, inputStyle }) {
  const [show, setShow] = useState(false);
  const dateObj = new Date(value + 'T12:00:00');

  return (
    <View>
      <TouchableOpacity
        style={[styles.input, inputStyle]}
        onPress={() => setShow(v => !v)}
      >
        <Text style={styles.text}>{value}</Text>
        <Text style={styles.icon}>📅</Text>
      </TouchableOpacity>
      {show && (
        <>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              if (Platform.OS === 'android') setShow(false);
              if (selectedDate) {
                onChange(selectedDate.toISOString().split('T')[0]);
              }
            }}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.done} onPress={() => setShow(false)}>
              <Text style={styles.doneText}>Gotowe</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1.5, borderColor: '#ececec', borderRadius: 12,
    padding: 14, backgroundColor: '#fafafa',
    flexDirection: 'row', alignItems: 'center',
  },
  text: { flex: 1, fontSize: 16, color: '#333' },
  icon: { fontSize: 18 },
  done: {
    alignSelf: 'flex-end', paddingHorizontal: 20, paddingVertical: 8,
    backgroundColor: '#e8f0fe', borderRadius: 8, marginTop: 4,
  },
  doneText: { color: '#1565C0', fontWeight: '700', fontSize: 14 },
});
