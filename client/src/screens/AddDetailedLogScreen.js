import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  StyleSheet,
  Alert,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { addLog, updateEvent, getEvents } from '../services/api';

export default function AddDetailedLogScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params;

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


  const handleGetLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('אין הרשאה למיקום');
      return;
    }

    const loc = await Location.getCurrentPositionAsync({});
    setLocation({
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
    });
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

      <Button title="📍 הוסף מיקום" onPress={handleGetLocation} />
      {location ? (
        <Text>
          מיקום: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
        </Text>
      ) : null}

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
