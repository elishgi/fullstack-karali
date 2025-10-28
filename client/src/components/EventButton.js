import React, { useRef } from 'react';
import { TouchableWithoutFeedback, TouchableOpacity, Animated, View, Text, ImageBackground, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

// הגדרת הקומפוננטה EventButton:
const EventButton = ({ item, isEditMode, onPress, onLongPress, onEditName, onEditColor, onDelete }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const expired = Boolean(item?.isExpired);

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 200,
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
        <ImageBackground source={require('../../assets/images/button.png')} style={styles.eventButtonImage}>
          <View
            style={[
              styles.overlay,
              { backgroundColor: item.color + '88' },
              expired && styles.expiredOverlay,
            ]}
          />
          <Animated.View style={[styles.glowOverlayWrapper, { opacity: glowOpacity }]}>
            <BlurView intensity={50} style={styles.glowOverlay} tint="default">
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: item.color + '55', borderRadius: 999 }} />
            </BlurView>
          </Animated.View>

          {expired && (
            <View style={styles.expiredBadge}>
              <Text style={styles.expiredBadgeText}>הסתיים</Text>
            </View>
          )}

          {isEditMode && (
            <View style={styles.editButtonsContainer}>
              <TouchableOpacity style={styles.editButtonCircle} onPress={onDelete}>
                <Text style={styles.editButtonIcon}>🗑️</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButtonCircleColor} onPress={onEditColor}>
                <Text style={styles.editButtonIcon}>🎨</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButtonCircle} onPress={onEditName}>
                <Text style={styles.editButtonIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={[styles.eventButtonName, expired && styles.eventButtonNameExpired]}>{item.name}</Text>
          <Text style={[styles.eventButtonCount, expired && styles.eventButtonCountExpired]}>{item.totalColor}</Text>
          {item.expirationLabel && (
            <Text style={[styles.eventButtonExpiration, expired && styles.eventButtonExpirationExpired]}>
              {item.expirationLabel}
            </Text>
          )}
        </ImageBackground>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// סגנונות
const styles = StyleSheet.create({
  eventButtonWrapper: {
    margin: 8,
    width: 140,
    height: 140,
  },
  eventButtonImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  expiredOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  glowOverlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  eventButtonName: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  eventButtonNameExpired: {
    color: '#555',
  },
  eventButtonCount: {
    color: '#3DD6D0',
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 4,
    textAlign: 'center',
  },
  eventButtonCountExpired: {
    color: '#9aa5b1',
  },
  eventButtonExpiration: {
    marginTop: 6,
    fontSize: 12,
    color: '#4a4a4a',
    textAlign: 'center',
  },
  eventButtonExpirationExpired: {
    color: '#d32f2f',
  },
  editButtonsContainer: {
    position: 'absolute',
    top: -4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 10,
  },
  editButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  editButtonCircleColor: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginTop: -15,
  },
  editButtonIcon: {
    fontSize: 16,
  },
  expiredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(211, 47, 47, 0.9)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  expiredBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default EventButton;
