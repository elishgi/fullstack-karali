import React, { useRef } from 'react';
import { TouchableWithoutFeedback, TouchableOpacity, Animated, View, Text, ImageBackground, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

// הגדרת הקומפוננטה EventButton:
const EventButton = ({ item, isEditMode, onPress, onLongPress, onEditName, onEditColor, onDelete }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

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
          <View style={[styles.overlay, { backgroundColor: item.color + '88' }]} />
          <Animated.View style={[styles.glowOverlayWrapper, { opacity: glowOpacity }]}>
            <BlurView intensity={50} style={styles.glowOverlay} tint="default">
              <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: item.color + '55', borderRadius: 999 }} />
            </BlurView>
          </Animated.View>

          {item.shared && (
            <View style={styles.sharedTag}>
              <Text style={styles.sharedTagText}>🤝 משותף</Text>
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

          <Text style={styles.eventButtonName}>{item.name}</Text>
          <Text style={styles.eventButtonCount}>{item.totalColor}</Text>
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
  glowOverlayWrapper: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sharedTag: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(61, 214, 208, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sharedTagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  eventButtonName: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  eventButtonCount: {
    color: '#3DD6D0',
    fontWeight: 'bold',
    fontSize: 20,
    marginTop: 4,
    textAlign: 'center',
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
});

export default EventButton;
