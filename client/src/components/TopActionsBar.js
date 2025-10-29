import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TopActionsBar = ({ isEditMode, onToggleEdit, onViewLogs, onAddEvent, disabled, style }) => (
  <View style={[styles.wrapper, style]} pointerEvents={disabled ? 'none' : 'auto'}>
    <View style={[styles.barShell, disabled && styles.barShellHidden]}>
      <View style={styles.sideActionsRow}>
        <TouchableOpacity
          style={[styles.sideAction, isEditMode && styles.sideActionActive]}
          onPress={onToggleEdit}
          activeOpacity={0.85}
        >
          <Ionicons
            name={isEditMode ? 'checkmark-circle-outline' : 'color-palette-outline'}
            size={20}
            color={isEditMode ? '#E0D4FF' : '#E8EEF8'}
            style={styles.sideActionIcon}
          />
          <Text style={[styles.sideActionLabel, isEditMode && styles.sideActionLabelActive]}>
            {isEditMode ? 'סיים עריכה' : 'מצב עריכה'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideAction} onPress={onViewLogs} activeOpacity={0.85}>
          <Ionicons
            name="document-text-outline"
            size={20}
            color="#E8EEF8"
            style={styles.sideActionIcon}
          />
          <Text style={styles.sideActionLabel}>יומן תיעודים</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.primarySlot}>
        <View style={styles.primaryButtonShadow}>
          <TouchableOpacity style={styles.primaryButton} onPress={onAddEvent} activeOpacity={0.92}>
            <Ionicons name="add" size={30} color="#0B1A33" />
          </TouchableOpacity>
        </View>
        <Text style={styles.primaryLabel}>הוסף אירוע</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  barShell: {
    position: 'relative',
    backgroundColor: 'rgba(15, 32, 58, 0.92)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 34,
    paddingBottom: 18,
    paddingHorizontal: 26,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 16,
    elevation: 14,
  },
  barShellHidden: {
    opacity: 0,
    transform: [{ translateY: 100 }],
  },
  sideActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  sideAction: {
    flex: 1,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    paddingHorizontal: 14,
  },
  sideActionActive: {
    backgroundColor: 'rgba(123, 92, 255, 0.18)',
    borderColor: 'rgba(213, 200, 255, 0.6)',
  },
  sideActionIcon: {
    marginEnd: 8,
  },
  sideActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E8EEF8',
  },
  sideActionLabelActive: {
    color: '#F1E9FF',
  },
  primarySlot: {
    position: 'absolute',
    top: -32,
    left: '50%',
    transform: [{ translateX: -40 }],
    alignItems: 'center',
  },
  primaryButtonShadow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(61, 214, 208, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3DD6D0',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 20,
    elevation: 16,
  },
  primaryButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#3DD6D0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryLabel: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '800',
    color: '#E8EEF8',
  },
});

export default TopActionsBar;
