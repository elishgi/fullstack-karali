import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LoadingScreen = ({ navigation }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 7000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <ImageBackground
      source={require('../../assets/images/backgroundCool.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.mockHome}>
          <View style={[styles.placeholderCard, styles.placeholderLarge]} />
          <View style={[styles.placeholderCard, styles.placeholderMedium]} />
          <View style={styles.placeholderRow}>
            <View style={[styles.placeholderPill, styles.placeholderPillWide]} />
            <View style={[styles.placeholderPill, styles.placeholderPillNarrow]} />
          </View>
          <View style={[styles.placeholderCard, styles.placeholderSmall]} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3DD6D0" style={styles.spinner} />
          <Ionicons name="walk-outline" size={52} color="#3DD6D0" style={styles.runner} />
          <Text style={styles.loadingTitle}>טוען נתונים...</Text>
          <Text style={styles.loadingSubtitle}>תן לנו כמה רגעים לסדר את הכל בשבילך</Text>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 24,
    paddingVertical: 48,
    justifyContent: 'space-between',
  },
  mockHome: {
    flex: 1,
    justifyContent: 'space-around',
    opacity: 0.6,
  },
  placeholderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  placeholderLarge: {
    height: 140,
  },
  placeholderMedium: {
    height: 110,
  },
  placeholderSmall: {
    height: 90,
  },
  placeholderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  placeholderPill: {
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  placeholderPillWide: {
    width: '40%',
    marginLeft: 12,
  },
  placeholderPillNarrow: {
    width: '24%',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  runner: {
    marginBottom: 8,
  },
  loadingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E2E2E',
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  loadingSubtitle: {
    fontSize: 16,
    color: '#4A4A4A',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});

export default LoadingScreen;

