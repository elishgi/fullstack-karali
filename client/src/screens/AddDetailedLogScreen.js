import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  Modal,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { addLog, updateEvent, getEvents } from '../services/api';

const ACCENT = '#3dd6d0';
const ACCENT_DARK = '#0f766e';

export default function AddDetailedLogScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params;

  const [address, setAddress] = useState('');
  const [mapVisible, setMapVisible] = useState(false);
  const [tempRegion, setTempRegion] = useState(null); // לאזור התחלתי במפה
  const [tempMarker, setTempMarker] = useState(null); // מיקום זמני לפני אישור


  const [comment, setComment] = useState('');
  const [imageUri, setImageUri] = useState('');
  const [location, setLocation] = useState(null);
  const [eventName, setEventName] = useState(''); // נוסיף state ל־eventName

  useEffect(() => {
    const fetchEventName = async () => {
      try {
        const allEvents = await getEvents();
        const currentEvent = allEvents.find((e) => String(e._id) === String(eventId));
        if (currentEvent) {
          setEventName(currentEvent.name);
        } else {
          console.log('❌ Event not found for eventId:', eventId);
        }
      } catch (error) {
        console.error('Error fetching event name:', error);
      }
    };

    fetchEventName();
  }, [eventId]);



  const chooseImageSource = () => {
    Alert.alert(
      'הוסף תמונה',
      'מאיפה תרצה להוסיף?',
      [
        { text: 'צלם תמונה', onPress: pickFromCamera },
        { text: 'בחר מהגלריה', onPress: pickFromGallery },
        { text: 'ביטול', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const pickFromCamera = async () => {
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (!camPerm.granted) {
      Alert.alert('אין הרשאה למצלמה', 'אפשר לאפשר בהגדרות המכשיר ולנסות שוב.');
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!res.canceled) {
      setImageUri(res.assets?.[0]?.uri ?? '');
    }
  };

  const pickFromGallery = async () => {
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!libPerm.granted) {
      Alert.alert('אין הרשאה לגלריה');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    // תיקון הבאג: משתמשים ב-canceled (לא cancelled)
    if (!res.canceled) {
      setImageUri(res.assets?.[0]?.uri ?? '');
    }
  };


  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (res?.[0]) {
        const r = res[0];
        // בניית כתובת יפה
        const line = [r.name, r.street, r.city, r.region, r.country].filter(Boolean).join(', ');
        return line || 'כתובת לא זמינה';
      }
    } catch (e) { console.log('reverseGeocode error', e); }
    return 'כתובת לא זמינה';
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('אין הרשאה למיקום');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const lat = loc.coords.latitude;
    const lng = loc.coords.longitude;

    setLocation({ lat, lng });
    const addr = await reverseGeocode(lat, lng);
    setAddress(addr);
  };

  const openMapPicker = async () => {
    // הרשאות קרבה – כדי לקפוץ לאיזור המשתמש במפה
    const perm = await Location.requestForegroundPermissionsAsync();
    let startRegion = {
      latitude: 32.0853,
      longitude: 34.7818,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    if (perm.status === 'granted') {
      try {
        const loc = await Location.getCurrentPositionAsync({});
        startRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
      } catch { }
    }
    setTempRegion(startRegion);
    setTempMarker(null);
    setMapVisible(true);
  };

  const chooseLocationSource = () => {
    Alert.alert(
      'בחר מקור מיקום',
      'איך ברצונך לבחור מיקום?',
      [
        { text: '📍 המיקום הנוכחי', onPress: getCurrentLocation },
        { text: '🗺️ בחר על מפה', onPress: openMapPicker },
        { text: 'ביטול', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const openInMaps = (loc) => {
    if (!loc) return;
    const url = Platform.select({
      ios: `http://maps.apple.com/?ll=${loc.lat},${loc.lng}`,
      android: `https://www.google.com/maps?q=${loc.lat},${loc.lng}`,
      default: `https://www.google.com/maps?q=${loc.lat},${loc.lng}`,
    });
    Linking.openURL(url);
  };


  const handleSave = async () => {
    try {
      let finalEventName = eventName;

      // אם משום מה ה־eventName עדיין ריק → נביא שוב
      if (finalEventName === '') {
        const allEvents = await getEvents();
        const currentEvent = allEvents.find((e) => e._id === eventId);
        if (currentEvent) {
          finalEventName = currentEvent.name;
        }
      }

      // 1. נוסיף Log חדש
      const newLog = {
        eventId: eventId,
        eventName: finalEventName,
        timestamp: new Date(),
        timeOfDay: getCurrentTimeOfDay(),
        dayOfWeek: getCurrentDayOfWeek(),
        comment: comment.trim(),
        imageUri: imageUri,
        location: location || {},
      };

      await addLog(newLog);

      // 2. נעדכן את המונה ב־Event
      const allEvents = await getEvents();
      const currentEvent = allEvents.find((e) => e._id === eventId);

      if (currentEvent) {
        const parsedCount = Number(currentEvent.totalColor);
        const nextCount = Number.isFinite(parsedCount) ? parsedCount + 1 : 1;
        await updateEvent(eventId, {
          name: currentEvent.name,
          color: currentEvent.color,
          totalColor: nextCount
        });
      }

      Alert.alert('התיעוד נשמר בהצלחה');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving detailed log:', error);
      Alert.alert('שגיאה בשמירת התיעוד');
    }
  };


  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonIcon}>←</Text>
          <Text style={styles.backButtonText}>חזרה</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerWrapper}>
        <Text style={styles.title}>הוספת תיעוד מפורט</Text>
        <Text style={styles.subtitle}>לכידת חוויה מלאה עם הערות, תמונות ומיקום מדויק</Text>
      </View>

      {eventName ? (
        <View style={styles.eventPill}>
          <Text style={styles.eventPillLabel}>אירוע</Text>
          <Text style={styles.eventPillValue}>{eventName}</Text>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>סיפור האירוע</Text>
          <Text style={styles.sectionSubtitle}>ספרו לנו מה קרה בפרטי פרטים</Text>
        </View>

        <Text style={styles.label}>הערות חופשיות</Text>
        <TextInput
          style={styles.input}
          placeholder="שתפו תובנות, רגשות או מידע חשוב להמשך..."
          placeholderTextColor="#9aa0a6"
          value={comment}
          onChangeText={setComment}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>תיעוד חזותי</Text>
          <Text style={styles.sectionSubtitle}>הוסיפו תמונה שמספרת את הסיפור</Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={chooseImageSource}
          activeOpacity={0.88}
        >
          <Text style={styles.secondaryButtonText}>📷 הוספת תמונה</Text>
        </TouchableOpacity>

        {imageUri ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.image} />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>
              עדיין אין תמונה. לחיצה על הכפתור תאפשר צילום או בחירה מהגלריה.
            </Text>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>מיקום האירוע</Text>
          <Text style={styles.sectionSubtitle}>בחרו את הדרך הנוחה לכם לציין איפה זה קרה</Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={chooseLocationSource}
            activeOpacity={0.88}
          >
            <Text style={styles.secondaryButtonText}>📍 בחירת מיקום</Text>
          </TouchableOpacity>
          {location ? (
            <TouchableOpacity
              style={styles.secondaryGhostButton}
              onPress={() => openInMaps(location)}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryGhostButtonText}>פתיחה במפות</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {location ? (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>מיקום שנשמר</Text>
              <View style={styles.locationBadge}>
                <Text style={styles.locationBadgeText}>נבחר</Text>
              </View>
            </View>

            <Text style={styles.locationText}>
              {address || `(${location.lat.toFixed(5)}, ${location.lng.toFixed(5)})`}
            </Text>

            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                pointerEvents="none"
                initialRegion={{
                  latitude: location.lat,
                  longitude: location.lng,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                <Marker coordinate={{ latitude: location.lat, longitude: location.lng }} />
              </MapView>
            </View>

            <View style={styles.locationActions}>
              <TouchableOpacity
                style={styles.secondaryGhostButton}
                onPress={chooseLocationSource}
                activeOpacity={0.88}
              >
                <Text style={styles.secondaryGhostButtonText}>עדכון מיקום</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Text style={styles.helperText}>
            טרם נבחר מיקום. ניתן להשתמש במיקום הנוכחי או לבחור נקודה אחרת על גבי המפה.
          </Text>
        )}
      </View>

      <Modal
        visible={mapVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMapVisible(false)}
      >
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalCard}>
            <View style={styles.mapModalHeader}>
              <Text style={styles.mapModalTitle}>בחרו מיקום על המפה</Text>
              <Text style={styles.mapModalSubtitle}>הקישו על המפה להצבת סמן מדויק</Text>
            </View>

            <View style={styles.mapModalContent}>
              {tempRegion && (
                <MapView
                  style={{ flex: 1 }}
                  initialRegion={tempRegion}
                  onPress={(e) => {
                    const { latitude, longitude } = e.nativeEvent.coordinate;
                    setTempMarker({ latitude, longitude });
                  }}
                >
                  {tempMarker && <Marker coordinate={tempMarker} />}
                </MapView>
              )}
            </View>

            <View style={styles.mapModalActions}>
              <TouchableOpacity
                style={styles.secondaryGhostButton}
                onPress={() => setMapVisible(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.secondaryGhostButtonText}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.primaryButtonSmall}
                onPress={async () => {
                  if (!tempMarker) {
                    Alert.alert('בחר/י נקודה על המפה');
                    return;
                  }
                  const lat = tempMarker.latitude;
                  const lng = tempMarker.longitude;
                  setLocation({ lat, lng });
                  const addr = await reverseGeocode(lat, lng);
                  setAddress(addr);
                  setMapVisible(false);
                }}
                activeOpacity={0.88}
              >
                <Text style={styles.primaryButtonText}>אישור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSave}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>💾 שמירת התיעוד</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const getCurrentTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'בוקר';
  if (hour < 16) return 'צהריים';
  if (hour < 20) return 'ערב';
  return 'לילה';
};

const getCurrentDayOfWeek = () => {
  const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  return days[new Date().getDay()];
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: '#f4f7fb',
    flexGrow: 1,
    gap: 18,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7eefc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  backButtonIcon: {
    fontSize: 16,
    color: '#1f2933',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2933',
  },
  headerWrapper: {
    alignItems: 'flex-end',
    gap: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#1f2933',
  },
  subtitle: {
    fontSize: 15,
    color: '#51606f',
    textAlign: 'right',
  },
  eventPill: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d8e2f0',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  eventPillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  eventPillValue: {
    fontSize: 14,
    fontWeight: '700',
    color: ACCENT_DARK,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d8e2f0',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    gap: 14,
  },
  sectionHeader: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2933',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7a90',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2f3c4a',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 120,
    backgroundColor: '#f8fafc',
    textAlign: 'right',
    color: '#1f2933',
  },
  secondaryButton: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#04323d',
  },
  secondaryGhostButton: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  secondaryGhostButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#d8e2f0',
  },
  image: {
    width: '100%',
    height: 220,
  },
  imagePlaceholder: {
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 18,
    backgroundColor: '#f8fbff',
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#6b7a90',
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  locationCard: {
    borderWidth: 1,
    borderColor: '#dbe4f3',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#f7f9fc',
    gap: 10,
  },
  locationHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2933',
  },
  locationBadge: {
    backgroundColor: '#e2f5f3',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ACCENT_DARK,
  },
  locationText: {
    fontSize: 14,
    color: '#344454',
    textAlign: 'right',
  },
  mapContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  map: {
    width: '100%',
    height: 160,
  },
  locationActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7a90',
    textAlign: 'right',
  },
  mapModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  mapModalCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  mapModalHeader: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 6,
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: '#0f172a',
  },
  mapModalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#526581',
  },
  mapModalContent: {
    width: '100%',
    height: Dimensions.get('window').height * 0.45,
  },
  mapModalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  primaryButton: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  primaryButtonSmall: {
    backgroundColor: ACCENT_DARK,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#f8fafc',
  },
  buttonWrapper: {
    paddingBottom: 24,
  },
});
