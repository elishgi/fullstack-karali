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
        style={[styles.segment, showPersonal && styles.segmentActive]}
        onPress={onTogglePersonal}
        activeOpacity={0.85}
      >
        <View
          style={[styles.iconBadge, styles.iconBadgePersonal, showPersonal && styles.iconBadgeActive]}
        >
          <Ionicons
            name={showPersonal ? 'person' : 'person-outline'}
            size={16}
            color={showPersonal ? '#0B69FF' : '#3A4A5F'}
          />
        </View>
        <Text style={[styles.segmentText, showPersonal && styles.segmentTextActive]}>אישי</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, showShared && styles.segmentActive]}
        onPress={onToggleShared}
        activeOpacity={0.85}
      >
        <View
          style={[styles.iconBadge, styles.iconBadgeShared, showShared && styles.iconBadgeActive]}
        >
          <Ionicons
            name={showShared ? 'people' : 'people-outline'}
            size={16}
            color={showShared ? '#673AB7' : '#3A4A5F'}
          />
        </View>
        <Text style={[styles.segmentText, showShared && styles.segmentTextActiveShared]}>משותף</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.segment}
        onPress={onOpenSort}
        activeOpacity={0.85}
        accessibilityLabel="סינון ומיון אירועים"
      >
        <View style={[styles.iconBadge, styles.iconBadgeNeutral]}>
          <Ionicons name="funnel-outline" size={17} color="#3A4A5F" />
        </View>
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
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 14,
    shadowColor: '#0F1F38',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  segmentActive: {
    backgroundColor: 'rgba(16, 32, 54, 0.05)',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 32, 54, 0.08)',
  },
  iconBadgePersonal: {
    backgroundColor: 'rgba(11, 105, 255, 0.14)',
  },
  iconBadgeShared: {
    backgroundColor: 'rgba(103, 58, 183, 0.16)',
  },
  iconBadgeNeutral: {
    backgroundColor: 'rgba(16, 32, 54, 0.1)',
  },
  iconBadgeActive: {
    transform: [{ translateY: -1 }],
    shadowColor: '#0F1F38',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
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
