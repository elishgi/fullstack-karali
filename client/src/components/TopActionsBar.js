import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TopActionsBar = ({ isEditMode, onToggleEdit, onViewLogs, onAddEvent, disabled, style }) => (
  <View
    style={[styles.container, style, disabled && styles.disabled]}
    pointerEvents={disabled ? 'none' : 'auto'}
  >
    <TouchableOpacity
      style={[styles.sideButton, isEditMode && styles.sideButtonActive]}
      onPress={onToggleEdit}
      activeOpacity={0.85}
    >
      <Text style={[styles.buttonText, isEditMode && styles.buttonTextActive]}>
        {isEditMode ? '✅ סיים עריכה' : '🎨 מצב עריכה'}
      </Text>
    </TouchableOpacity>

    <View style={styles.primaryButtonWrapper}>
      <TouchableOpacity style={styles.primaryButton} onPress={onAddEvent} activeOpacity={0.9}>
        <Text style={styles.primaryButtonText}>➕ הוסף אירוע</Text>
      </TouchableOpacity>
    </View>

    <TouchableOpacity style={styles.sideButton} onPress={onViewLogs} activeOpacity={0.85}>
      <Text style={styles.buttonText}>📄 הצג לוגים</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 6,
  },
  disabled: {
    opacity: 0,
    transform: [{ translateY: 80 }],
  },
  sideButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(11, 26, 51, 0.08)',
    backgroundColor: 'rgba(245, 247, 251, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
  },
  sideButtonActive: {
    backgroundColor: 'rgba(166, 140, 241, 0.22)',
    borderColor: 'rgba(166, 140, 241, 0.6)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A3A56',
  },
  buttonTextActive: {
    color: '#5B2FC1',
  },
  primaryButtonWrapper: {
    flex: 1.2,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3DD6D0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3DD6D0',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B1A33',
  },
});

export default TopActionsBar;
