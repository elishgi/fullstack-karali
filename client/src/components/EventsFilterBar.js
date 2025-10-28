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
        style={[styles.segment, styles.segmentPersonal, showPersonal && styles.segmentActivePersonal]}
        onPress={onTogglePersonal}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.segmentBadge,
            styles.segmentBadgePersonal,
            showPersonal && styles.segmentBadgePersonalActive,
          ]}
        >
          <Ionicons
            name={showPersonal ? 'person' : 'person-outline'}
            size={14}
            color={showPersonal ? '#0B69FF' : '#4B5A74'}
          />
        </View>
        <Text
          style={[styles.segmentText, showPersonal && styles.segmentTextActivePersonal]}
        >
          אישי
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, styles.segmentShared, showShared && styles.segmentActiveShared]}
        onPress={onToggleShared}
        activeOpacity={0.85}
      >
        <View
          style={[
            styles.segmentBadge,
            styles.segmentBadgeShared,
            showShared && styles.segmentBadgeSharedActive,
          ]}
        >
          <Ionicons
            name={showShared ? 'people' : 'people-outline'}
            size={14}
            color={showShared ? '#673AB7' : '#4B5A74'}
          />
        </View>
        <Text
          style={[styles.segmentText, showShared && styles.segmentTextActiveShared]}
        >
          משותף
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.segment, styles.segmentSort]}
        onPress={onOpenSort}
        activeOpacity={0.85}
        accessibilityLabel="סינון ומיון אירועים"
      >
        <View style={[styles.segmentBadge, styles.segmentBadgeNeutral]}>
          <Ionicons name="funnel-outline" size={15} color="#4B5A74" />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 32, 54, 0.06)',
    borderRadius: 22,
    padding: 6,
    gap: 6,
  },
  segment: {
    flex: 1,
    flexBasis: 0,
    height: 42,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 32, 54, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  segmentPersonal: {
    shadowColor: '#0B69FF',
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  segmentShared: {
    shadowColor: '#673AB7',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  segmentSort: {
    shadowColor: '#182B45',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  segmentActivePersonal: {
    backgroundColor: 'rgba(11, 105, 255, 0.14)',
    borderColor: 'rgba(11, 105, 255, 0.34)',
  },
  segmentActiveShared: {
    backgroundColor: 'rgba(103, 58, 183, 0.16)',
    borderColor: 'rgba(103, 58, 183, 0.36)',
  },
  segmentBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 8,
  },
  segmentBadgePersonal: {
    backgroundColor: 'rgba(11, 105, 255, 0.12)',
  },
  segmentBadgePersonalActive: {
    backgroundColor: 'rgba(11, 105, 255, 0.24)',
  },
  segmentBadgeShared: {
    backgroundColor: 'rgba(103, 58, 183, 0.12)',
  },
  segmentBadgeSharedActive: {
    backgroundColor: 'rgba(103, 58, 183, 0.22)',
  },
  segmentBadgeNeutral: {
    backgroundColor: 'rgba(16, 32, 54, 0.12)',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A4A5F',
    textAlign: 'center',
  },
  segmentTextActivePersonal: {
    color: '#0B69FF',
  },
  segmentTextActiveShared: {
    color: '#673AB7',
  },
});

export default EventsFilterBar;
