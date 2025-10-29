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
        <View style={[styles.segmentIcon, showPersonal && styles.segmentIconActivePersonal]}>
          <Ionicons
            name={showPersonal ? 'person' : 'person-outline'}
            size={15}
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
        style={[styles.segment, showShared && styles.segmentActiveShared]}
        onPress={onToggleShared}
        activeOpacity={0.85}
      >
        <View style={[styles.segmentIcon, showShared && styles.segmentIconActiveShared]}>
          <Ionicons
            name={showShared ? 'people' : 'people-outline'}
            size={15}
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
        style={[styles.segment, styles.segmentNeutral]}
        onPress={onOpenSort}
        activeOpacity={0.85}
        accessibilityLabel="סינון ומיון אירועים"
      >
        <View style={styles.segmentIcon}>
          <Ionicons name="funnel-outline" size={16} color="#4B5A74" />
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
    backgroundColor: 'rgba(15, 32, 58, 0.07)',
    borderRadius: 24,
    padding: 8,
  },
  segment: {
    flex: 1,
    flexBasis: 0,
    height: 40,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(16, 32, 54, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  segmentActivePersonal: {
    borderColor: 'rgba(11, 105, 255, 0.4)',
    backgroundColor: 'rgba(11, 105, 255, 0.16)',
  },
  segmentActiveShared: {
    borderColor: 'rgba(103, 58, 183, 0.38)',
    backgroundColor: 'rgba(103, 58, 183, 0.16)',
  },
  segmentNeutral: {
    borderColor: 'rgba(16, 32, 54, 0.18)',
  },
  segmentIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 32, 54, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginEnd: 8,
  },
  segmentIconActivePersonal: {
    backgroundColor: 'rgba(11, 105, 255, 0.22)',
  },
  segmentIconActiveShared: {
    backgroundColor: 'rgba(103, 58, 183, 0.22)',
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
