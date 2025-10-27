import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EventsFilterBar = ({
  showPersonal,
  showShared,
  onTogglePersonal,
  onToggleShared,
  onOpenSort,
}) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={[styles.filterPill, showPersonal && styles.filterPillActive]}
      onPress={onTogglePersonal}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterPillText, showPersonal && styles.filterPillTextActive]}>
        👤 אירועים אישיים
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.filterPill, showShared && styles.filterPillActive]}
      onPress={onToggleShared}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterPillText, showShared && styles.filterPillTextActive]}>
        🤝 אירועים משותפים
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.filterIconBtn}
      onPress={onOpenSort}
      activeOpacity={0.85}
      accessibilityLabel="סינון ומיון אירועים"
    >
      <Ionicons name="filter-outline" size={22} color="#333" />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#eef6ff',
    borderColor: '#bcd9ff',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterPillTextActive: {
    color: '#0b69ff',
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EventsFilterBar;