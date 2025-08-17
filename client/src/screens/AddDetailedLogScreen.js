import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  Modal

} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { addLog, updateEvent, getEvents } from '../services/api';

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
        await updateEvent(eventId, {
          name: currentEvent.name,
          color: currentEvent.color,
          totalColor: currentEvent.totalColor + 1
        });
      }

      Alert.alert('התיעוד נשמר בהצלחה');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving detailed log:', error);
      Alert.alert('שגיאה בשמירת התיעוד');
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>הוספת תיעוד מפורט לאירוע</Text>

      <Text style={styles.label}>הערה:</Text>
      <TextInput
        style={styles.input}
        placeholder="כתוב הערה כאן..."
        value={comment}
        onChangeText={setComment}
      />

      <Button title="📷 הוסף תמונה" onPress={chooseImageSource} />
      {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : null}

      <View style={{ height: 20 }} />

      <Button title="📍 הוסף מיקום" onPress={chooseLocationSource} />

      {location ? (
        <View style={{
          marginTop: 10, padding: 12, borderRadius: 12, backgroundColor: '#F7F9FC',
          borderWidth: 1, borderColor: '#E6ECF2'
        }}>
          <Text style={{ fontWeight: '600', marginBottom: 6 }}>מיקום שנשמר</Text>
          <Text style={{ marginBottom: 8 }}>
            {address || `(${location.lat.toFixed(5)}, ${location.lng.toFixed(5)})`}
          </Text>

          <View style={{ borderRadius: 10, overflow: 'hidden' }}>
            <MapView
              style={{ width: '100%', height: 140 }}
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

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <Button title="פתח במפות" onPress={() => openInMaps(location)} />
            <Button title="שנה מיקום" onPress={chooseLocationSource} />
          </View>
        </View>
      ) : null}

      <Modal visible={mapVisible} transparent animationType="slide" onRequestClose={() => setMapVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '92%', backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center' }}>בחר מיקום על המפה</Text>
              <Text style={{ textAlign: 'center', marginTop: 4, opacity: 0.7 }}>טפח/י על המפה להצבת סמן</Text>
            </View>

            <View style={{ width: '100%', height: Dimensions.get('window').height * 0.5 }}>
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

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 12 }}>
              <Button title="ביטול" onPress={() => setMapVisible(false)} />
              <Button
                title="אישור"
                onPress={async () => {
                  if (!tempMarker) { Alert.alert('בחר/י נקודה על המפה'); return; }
                  const lat = tempMarker.latitude;
                  const lng = tempMarker.longitude;
                  setLocation({ lat, lng });
                  const addr = await reverseGeocode(lat, lng);
                  setAddress(addr);
                  setMapVisible(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>



      <View style={{ height: 20 }} />

      <Button title="💾 שמור תיעוד" onPress={handleSave} />
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
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  image: {
    width: '100%',
    height: 200,
    marginVertical: 10,
    borderRadius: 8,
  },
});
