import React, { useMemo, useRef } from 'react';
import { TouchableWithoutFeedback, TouchableOpacity, Animated, View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const BADGE_VARIANTS = {
  personal: { containerStyle: 'badge_personal', textStyle: 'badgeText_personal', iconColor: '#12696A' },
  shared: { containerStyle: 'badge_shared', textStyle: 'badgeText_shared', iconColor: '#4C34D3' },
  temporary: { containerStyle: 'badge_temporary', textStyle: 'badgeText_temporary', iconColor: '#B75B1C' },
  regular: { containerStyle: 'badge_regular', textStyle: 'badgeText_regular', iconColor: '#0B1A33' },
  expired: { containerStyle: 'badge_expired', textStyle: 'badgeText_expired', iconColor: '#B71C1C' },
};

const TIMER_VARIANTS = {
  info: { containerStyle: 'timerPillInfo', textStyle: 'timerTextInfo', iconColor: '#12696A' },
  warning: { containerStyle: 'timerPillWarning', textStyle: 'timerTextWarning', iconColor: '#B15A00' },
  urgent: { containerStyle: 'timerPillUrgent', textStyle: 'timerTextUrgent', iconColor: '#B71C1C' },
  expired: { containerStyle: 'timerPillExpired', textStyle: 'timerTextExpired', iconColor: '#5A5A5A' },
  none: { containerStyle: 'timerPillInfo', textStyle: 'timerTextInfo', iconColor: '#12696A' },
};

const EventButton = ({ item, isEditMode, onPress, onLongPress, onEditName, onEditColor, onDelete }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const expired = Boolean(item?.isExpired);

  const statusBadges = useMemo(() => {
    const badges = [];

    if (item?.shared) {
      badges.push({ key: 'shared', label: 'משותף', icon: 'people-outline', variant: 'shared' });
    } else {
      badges.push({ key: 'personal', label: 'אישי', icon: 'person-outline', variant: 'personal' });
    }

    if (expired) {
      badges.push({ key: 'expired', label: 'הסתיים', icon: 'alert-circle', variant: 'expired' });
    } else if (item?.type === 'temporary' || item?.expirationLabel) {
      badges.push({ key: 'temporary', label: 'מוגבל בזמן', icon: 'time-outline', variant: 'temporary' });
    } else {
      badges.push({ key: 'regular', label: 'אירוע קבוע', icon: 'repeat-outline', variant: 'regular' });
    }

    return badges;
  }, [expired, item?.shared, item?.type, item?.expirationLabel]);

  const timerTone = expired ? 'expired' : item?.expirationTone || 'none';
  const timerVariant = TIMER_VARIANTS[timerTone] || TIMER_VARIANTS.info;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.94,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={isEditMode ? null : onPress}
      onLongPress={isEditMode ? null : onLongPress}
    >
      <Animated.View style={[styles.eventButtonWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.eventCard, expired && styles.eventCardExpired]}>
          <Animated.View style={[styles.glowOverlayWrapper, { opacity: glowOpacity }]} pointerEvents="none">
            <BlurView intensity={45} style={styles.glowOverlay} tint="light">
              <View
                style={[
                  styles.glowTint,
                  { backgroundColor: item?.color || '#3DD6D0' },
                ]}
              />
            </BlurView>
          </Animated.View>

          {isEditMode && (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity
                style={[styles.editButtonCircle, styles.editButtonCircleDelete]}
                onPress={onDelete}
              >
                <Ionicons name="trash-outline" size={15} color="#8C1C1C" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButtonCircle, styles.editButtonCircleAccent]}
                onPress={onEditColor}
              >
                <Ionicons name="color-palette-outline" size={15} color="#4C34D3" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButtonCircle, styles.editButtonCircleRename]}
                onPress={onEditName}
              >
                <Ionicons name="pencil-outline" size={15} color="#0B1A33" />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.badgesRow}>
            {statusBadges.map((badge) => {
              const palette = BADGE_VARIANTS[badge.variant] || BADGE_VARIANTS.personal;
              return (
                <View
                  key={badge.key}
                  style={[styles.badge, styles[palette.containerStyle]]}
                >
                  <Ionicons name={badge.icon} size={12} color={palette.iconColor} style={styles.badgeIcon} />
                  <Text style={[styles.badgeText, styles[palette.textStyle]]}>{badge.label}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.circleContainer}>
            <View style={[styles.circleShadow, { shadowColor: item?.color || '#3DD6D0' }]}>
              <View
                style={[
                  styles.innerCircle,
                  expired && styles.innerCircleExpired,
                  { backgroundColor: item?.color || '#3DD6D0' },
                ]}
              />
            </View>
            {expired && (
              <View style={styles.expiredFlag}>
                <Ionicons name="alert-circle" size={12} color="#fff" style={styles.expiredFlagIcon} />
                <Text style={styles.expiredFlagText}>הסתיים</Text>
              </View>
            )}
          </View>

          <Text style={[styles.eventButtonName, expired && styles.eventButtonNameExpired]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.eventButtonLastPress}>{item.lastPressLabel}</Text>

          {item.expirationLabel ? (
            <View style={[styles.timerPill, styles[timerVariant.containerStyle]]}>
              <Ionicons
                name={expired ? 'alert-circle' : 'time-outline'}
                size={12}
                color={timerVariant.iconColor}
                style={styles.timerIcon}
              />
              <Text style={[styles.timerText, styles[timerVariant.textStyle]]}>{item.expirationLabel}</Text>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  eventButtonWrapper: {
    width: '48%',
    marginVertical: 8,
    marginHorizontal: 6,
    flexGrow: 1,
  },
  eventCard: {
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#001',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  eventCardExpired: {
    backgroundColor: 'rgba(244, 245, 248, 0.95)',
  },
  glowOverlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    overflow: 'hidden',
  },
  glowTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    opacity: 0.2,
  },
  editButtonsContainer: {
    position: 'absolute',
    top: -14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    zIndex: 10,
  },
  editButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(16, 32, 54, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 6,
    shadowColor: '#0B1A33',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
  },
  editButtonCircleAccent: {
    backgroundColor: 'rgba(124, 92, 255, 0.16)',
    borderColor: 'rgba(124, 92, 255, 0.45)',
  },
  editButtonCircleDelete: {
    backgroundColor: 'rgba(231, 76, 60, 0.14)',
    borderColor: 'rgba(231, 76, 60, 0.4)',
  },
  editButtonCircleRename: {
    backgroundColor: 'rgba(61, 214, 208, 0.18)',
    borderColor: 'rgba(61, 214, 208, 0.42)',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginEnd: 6,
    marginBottom: 4,
  },
  badgeIcon: {
    marginEnd: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badge_personal: {
    backgroundColor: 'rgba(61, 214, 208, 0.16)',
  },
  badgeText_personal: {
    color: '#12696A',
  },
  badge_shared: {
    backgroundColor: 'rgba(124, 92, 255, 0.16)',
  },
  badgeText_shared: {
    color: '#4C34D3',
  },
  badge_temporary: {
    backgroundColor: 'rgba(255, 171, 64, 0.18)',
  },
  badgeText_temporary: {
    color: '#B75B1C',
  },
  badge_regular: {
    backgroundColor: 'rgba(11, 26, 51, 0.12)',
  },
  badgeText_regular: {
    color: '#0B1A33',
  },
  badge_expired: {
    backgroundColor: 'rgba(183, 45, 45, 0.2)',
  },
  badgeText_expired: {
    color: '#B71C1C',
  },
  circleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  circleShadow: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3DD6D0',
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  innerCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 33,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  innerCircleExpired: {
    opacity: 0.5,
  },
  expiredFlag: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(183, 45, 45, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  expiredFlagIcon: {
    marginEnd: 3,
  },
  expiredFlagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  eventButtonName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1A33',
    textAlign: 'center',
    marginTop: 2,
  },
  eventButtonNameExpired: {
    color: '#6C7485',
  },
  eventButtonLastPress: {
    marginTop: 6,
    fontSize: 10,
    color: '#637186',
    textAlign: 'center',
  },
  timerPill: {
    alignSelf: 'center',
    marginTop: 8,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerIcon: {
    marginEnd: 4,
  },
  timerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timerPillInfo: {
    backgroundColor: 'rgba(61, 214, 208, 0.18)',
  },
  timerTextInfo: {
    color: '#12696A',
  },
  timerPillWarning: {
    backgroundColor: 'rgba(255, 171, 64, 0.22)',
  },
  timerTextWarning: {
    color: '#B15A00',
  },
  timerPillUrgent: {
    backgroundColor: 'rgba(229, 57, 53, 0.24)',
  },
  timerTextUrgent: {
    color: '#B71C1C',
  },
  timerPillExpired: {
    backgroundColor: 'rgba(158, 158, 158, 0.28)',
  },
  timerTextExpired: {
    color: '#424242',
  },
});

export default EventButton;
