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
  <View style={styles.wrapper}>
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.segment, showPersonal && styles.segmentActivePersonal]}
        onPress={onTogglePersonal}
        activeOpacity={0.85}
      >
        <Ionicons
          name={showPersonal ? 'person' : 'person-outline'}
          size={16}
          color={showPersonal ? '#0B69FF' : '#3A4A5F'}
          style={styles.segmentIcon}
        />
        <Text style={[styles.segmentText, showPersonal && styles.segmentTextActive]}>אישי</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, showShared && styles.segmentActiveShared]}
        onPress={onToggleShared}
        activeOpacity={0.85}
      >
        <Ionicons
          name={showShared ? 'people' : 'people-outline'}
          size={16}
          color={showShared ? '#673AB7' : '#3A4A5F'}
          style={styles.segmentIcon}
        />
        <Text style={[styles.segmentText, showShared && styles.segmentTextActiveShared]}>משותף</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.segment}
        onPress={onOpenSort}
        activeOpacity={0.85}
        accessibilityLabel="סינון ומיון אירועים"
      >
        <Ionicons name="funnel-outline" size={17} color="#3A4A5F" style={styles.segmentIcon} />
        <Text style={styles.segmentText}>מיון</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 4,
  },
  container: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 32, 54, 0.06)',
    borderRadius: 18,
    padding: 6,
    gap: 6,
  },
  segment: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(16, 32, 54, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  segmentActivePersonal: {
    backgroundColor: 'rgba(11, 105, 255, 0.12)',
    borderColor: 'rgba(11, 105, 255, 0.32)',
  },
  segmentActiveShared: {
    backgroundColor: 'rgba(103, 58, 183, 0.14)',
    borderColor: 'rgba(103, 58, 183, 0.32)',
  },
  segmentIcon: {
    marginEnd: 6,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A4A5F',
    textAlign: 'center',
  },
  segmentTextActive: {
    color: '#0B69FF',
  },
  segmentTextActiveShared: {
    color: '#673AB7',
  },
});

export default EventsFilterBar;
