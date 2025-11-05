import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEvents, markGuideSeen } from '../services/api';
import { appendNotificationToStorage } from '../utils/notifications';

const LoadingScreen = ({ navigation }) => {
  useEffect(() => {
    let isActive = true;

    const sendFirstTimeGuideNotification = async () => {
      try {
        const rawUser = await AsyncStorage.getItem('user');
        if (!rawUser) {
          return { shouldWelcome: false };
        }

        let parsedUser;
        try {
          parsedUser = JSON.parse(rawUser);
        } catch (error) {
          console.warn('שגיאה בפענוח נתוני משתמש עבור התראת מדריך', error);
          return { shouldWelcome: false };
        }

        if (parsedUser?.hasSeenGuide !== false) {
          return { shouldWelcome: false };
        }

        await appendNotificationToStorage({
          title: 'ברוך הבא לקראלי! בוא נצא לסיור',
          body: 'לחיצה כאן תוביל אותך למדריך ההיכרות שלנו, שבו תלמד איך ליצור אירועים ולתעד חוויות ראשונות.',
          metadata: { targetRoute: 'HelpGuide', type: 'guide-intro' },
        });

        let updatedUser = { ...parsedUser, hasSeenGuide: true };
        try {
          const apiUser = await markGuideSeen();
          if (apiUser) {
            updatedUser = apiUser;
          }
        } catch (apiError) {
          console.warn('שגיאה בעדכון סטטוס מדריך בשרת:', apiError);
        }

        try {
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (storageError) {
          console.warn('שגיאה בשמירת נתוני משתמש מעודכנים:', storageError);
        }

        return { shouldWelcome: true };
      } catch (error) {
        console.error('שגיאה בשליחת התראת מדריך שימוש:', error);
        return { shouldWelcome: false };
      }
    };

    const bootstrap = async () => {
      const minimumDelay = new Promise((resolve) => setTimeout(resolve, 2500));

      try {
        const [eventsData] = await Promise.all([
          getEvents().catch((error) => {
            console.error('שגיאה בטעינת נתונים למסך הבית:', error);
            return [];
          }),
          minimumDelay,
        ]);

        if (!isActive) {
          return;
        }

        const guideResult = await sendFirstTimeGuideNotification();

        navigation.replace('Home', {
          prefetchedEvents: Array.isArray(eventsData) ? eventsData : [],
          showFirstLoginWelcome: guideResult?.shouldWelcome === true,
        });
      } catch (error) {
        console.error('שגיאה בהכנת הנתונים למסך הבית:', error);
        if (isActive) {
          navigation.replace('Home');
        }
      }
    };

    bootstrap();

    return () => {
      isActive = false;
    };
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

