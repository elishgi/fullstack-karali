import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TopActionsBar = ({ isEditMode, onToggleEdit, onViewLogs, onAddEvent, disabled, style }) => (
  <View style={[styles.wrapper, style]} pointerEvents={disabled ? 'none' : 'auto'}>
    <View style={[styles.container, disabled && styles.containerHidden]}>
      <TouchableOpacity
        style={[styles.sideAction, isEditMode && styles.sideActionActive]}
        onPress={onToggleEdit}
        activeOpacity={0.85}
      >
        <Ionicons
          name={isEditMode ? 'checkmark-circle-outline' : 'color-palette-outline'}
          size={18}
          color={isEditMode ? '#5B2FC1' : '#2A3A56'}
          style={styles.sideActionIcon}
        />
        <Text style={[styles.sideActionLabel, isEditMode && styles.sideActionLabelActive]}>
          {isEditMode ? 'סיים עריכה' : 'מצב עריכה'}
        </Text>
      </TouchableOpacity>

      <View style={styles.primarySlot}>
        <View style={styles.primaryButtonShadow}>
          <TouchableOpacity style={styles.primaryButton} onPress={onAddEvent} activeOpacity={0.92}>
            <Ionicons name="add" size={28} color="#0B1A33" />
          </TouchableOpacity>
        </View>
        <Text style={styles.primaryLabel}>הוסף אירוע</Text>
      </View>

      <TouchableOpacity style={styles.sideAction} onPress={onViewLogs} activeOpacity={0.85}>
        <Ionicons name="document-text-outline" size={18} color="#2A3A56" style={styles.sideActionIcon} />
        <Text style={styles.sideActionLabel}>יומן תיעודים</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 12,
    elevation: 10,
  },
  containerHidden: {
    opacity: 0,
    transform: [{ translateY: 90 }],
  },
  sideAction: {
    flex: 1,
    maxWidth: 140,
    height: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(42, 58, 86, 0.12)',
    backgroundColor: 'rgba(245, 247, 251, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    paddingHorizontal: 12,
  },
  sideActionActive: {
    backgroundColor: 'rgba(166, 140, 241, 0.2)',
    borderColor: 'rgba(166, 140, 241, 0.48)',
  },
  sideActionIcon: {
    marginEnd: 8,
  },
  sideActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A3A56',
  },
  sideActionLabelActive: {
    color: '#5B2FC1',
  },
  primarySlot: {
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: -6,
  },
  primaryButtonShadow: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(61, 214, 208, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3DD6D0',
    shadowOpacity: 0.32,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 10,
  },
  primaryButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#3DD6D0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3DD6D0',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
    elevation: 12,
  },
  primaryLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#0B1A33',
  },
});

export default TopActionsBar;
