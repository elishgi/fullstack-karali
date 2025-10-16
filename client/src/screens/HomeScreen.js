import React, { useEffect, useState, useRef, useContext } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ImageBackground, StyleSheet,
  Animated, Alert, Image, Modal, TextInput, Button,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import WheelColorPicker from 'react-native-wheel-color-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  addLog,
  getLogs,
  deleteLog as apiDeleteLog,
} from '../services/api';

import EventButton from '../components/EventButton';
import { EventsContext } from '../context/EventsContext';
import { AuthContext } from '../context/AuthContext';

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const { events, refreshEvents, updateEventById, deleteEventById, deleteEventAndLogs } = useContext(EventsContext);
  const { logout } = useContext(AuthContext);

  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedEventForEditName, setSelectedEventForEditName] = useState(null);
  const [newEventName, setNewEventName] = useState('');
  const [selectedEventForColor, setSelectedEventForColor] = useState(null);
  const [newEventColor, setNewEventColor] = useState('');
  const [selectedEventForDelete, setSelectedEventForDelete] = useState(null);
  const [userName, setUserName] = useState('');

  const clickTimeout = useRef(null);
  const hasEvents = (events?.length ?? 0) > 0;

  useEffect(() => {
    (async () => {
      const userData = await AsyncStorage.getItem('user');
      if (!userData) {
        navigation.replace('Login');
        return;
      }
      try {
        const parsed = JSON.parse(userData);
        setUserName(parsed?.name || '');
      } catch {
        navigation.replace('Login');
      }
    })();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshEvents();
    });
    return unsubscribe;
  }, [navigation, refreshEvents]);

  const handleLogout = async () => {
    try {
      await logout();
      navigation.replace('Login');
    } catch (error) {
      console.error('שגיאה בהתנתקות:', error);
      Alert.alert('שגיאה בהתנתקות');
    }
  };

  const handleSingleClick = async (event) => {
    try {
      await updateEventById(event._id, { ...event, totalColor: event.totalColor + 1 });
      const newLog = {
        eventId: event._id,
        eventName: event.name,
        timestamp: new Date(),
        timeOfDay: getCurrentTimeOfDay(),
        dayOfWeek: getCurrentDayOfWeek(),
        comment: '',
        imageUri: '',
        location: {},
      };
      await addLog(newLog);
      // אין חובה לרענן — כבר עדכנו לוקאלית, אבל נרענן להבאת הלוגים/מונים מאוששים
      refreshEvents();
    } catch (error) {
      console.error('Error in handleSingleClick:', error);
    }
  };

  const handleDoubleClick = async (event) => {
    if (event.totalColor <= 0) {
      Alert.alert('לא ניתן למחוק לחיצה — מונה כבר 0');
      return;
    }
    try {
      const allLogs = await getLogs();
      const eventLogs = allLogs
        .filter((log) => log.eventId === event._id)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      if (eventLogs.length === 0) {
        Alert.alert('אין לוגים למחיקה');
        return;
      }

      const lastLog = eventLogs[0];
      await apiDeleteLog(lastLog._id);

      await updateEventById(event._id, { ...event, totalColor: event.totalColor - 1 });
      refreshEvents();
    } catch (error) {
      console.error('Error in handleDoubleClick:', error);
    }
  };

  const handlePress = (event) => {
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      handleDoubleClick(event);
    } else {
      clickTimeout.current = setTimeout(() => {
        handleSingleClick(event);
        clickTimeout.current = null;
      }, 250);
    }
  };

  const handleLongPress = (event) => {
    navigation.navigate('AddDetailedLog', { eventId: event._id });
  };

  return (
    <ImageBackground
      source={require('../../assets/images/main-background.png')}
      style={styles.fullBackground}
      resizeMode="cover"
    >
      {/* Header */}
      <View style={styles.header}>
        <Image source={require('../../assets/images/logo1.png')} style={styles.logo} />
        <Text style={styles.welcome}>ברוך הבא, {userName}</Text>
      </View>

      {!hasEvents ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>אין אירועים עדיין</Text>
          <Text style={styles.emptySub}>צור את האירוע הראשון שלך כדי להתחיל לתעד</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('AddEvent')} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>צור אירוע חדש</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.topButtonsContainer}>
            <TouchableOpacity style={[styles.topButton, { backgroundColor: '#A68CF1' }]} onPress={() => setIsEditMode(!isEditMode)}>
              <Text style={styles.topButtonText}>{isEditMode ? '✅ סיים עריכה' : '🎨 מצב עריכה'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.topButton, { backgroundColor: '#66D19E' }]} onPress={() => navigation.navigate('Logs')}>
              <Text style={styles.topButtonText}>📄 הצג לוגים</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.topButton, { backgroundColor: '#3DD6D0' }]} onPress={() => navigation.navigate('AddEvent')}>
              <Text style={styles.topButtonText}>➕ הוסף אירוע</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={events}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <EventButton
                item={item}
                isEditMode={isEditMode}
                navigation={navigation}
                onPress={() => handlePress(item)}
                onLongPress={() => handleLongPress(item)}
                onEditName={() => setSelectedEventForEditName(item)}
                onEditColor={() => setSelectedEventForColor(item)}
                onDelete={() => setSelectedEventForDelete(item)}
              />
            )}
          />

          <View style={{ padding: 20 }}>
            <Button title="🚪 התנתק" color="gray" onPress={handleLogout} />
          </View>
        </>
      )}

      {/* Modals */}
      <Modal visible={!!selectedEventForColor} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>בחר צבע חדש</Text>
            <View style={styles.colorPickerWrapper}>
              <View style={styles.colorWheelWrapper}>
                <WheelColorPicker
                  color={newEventColor}
                  onColorChangeComplete={setNewEventColor}
                  style={{ width: 200, height: 200 }}
                />
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  await updateEventById(selectedEventForColor._id, {
                    name: selectedEventForColor.name,
                    color: newEventColor,
                    totalColor: selectedEventForColor.totalColor,
                  });
                  refreshEvents();
                  setSelectedEventForColor(null);
                }}
              >
                <Text style={styles.modalButtonText}>💾 שמור צבע</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalButton} onPress={() => setSelectedEventForColor(null)}>
                <Text style={styles.modalButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!selectedEventForEditName} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>ערוך שם אירוע</Text>
            <TextInput
              style={styles.input}
              placeholder="שם חדש לאירוע"
              value={newEventName}
              onChangeText={setNewEventName}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  await updateEventById(selectedEventForEditName._id, {
                    name: newEventName,
                    color: selectedEventForEditName.color,
                    totalColor: selectedEventForEditName.totalColor,
                  });
                  refreshEvents();
                  setSelectedEventForEditName(null);
                }}
              >
                <Text style={styles.modalButtonText}>💾 שמור שם</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalButton} onPress={() => setSelectedEventForEditName(null)}>
                <Text style={styles.modalButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {selectedEventForDelete &&
        Alert.alert(
          'מחיקת אירוע',
          'מה ברצונך לעשות?',
          [
            {
              text: '🚮 מחק רק את האירוע',
              onPress: async () => {
                await deleteEventById(selectedEventForDelete._id);
                refreshEvents();
                setSelectedEventForDelete(null);
              },
              style: 'default',
            },
            {
              text: '🗑️ מחק את האירוע ואת כל התיעודים',
              onPress: async () => {
                await deleteEventAndLogs(selectedEventForDelete._id);
                refreshEvents();
                setSelectedEventForDelete(null);
              },
              style: 'destructive',
            },
            {
              text: 'ביטול',
              onPress: () => setSelectedEventForDelete(null),
              style: 'cancel',
            },
          ],
          { cancelable: true }
        )}
    </ImageBackground>
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
  // … (השאר כמו אצלך – לא שיניתי)
  fullBackground: { flex: 1, resizeMode: 'cover' },
  header: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 200, height: 200, resizeMode: 'contain', marginBottom: -60, marginTop: -40 },
  welcome: { fontSize: 15, fontWeight: 'bold', color: '#333', textAlign: 'center', marginTop: -25 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptySub: { fontSize: 14, opacity: 0.7, textAlign: 'center', marginBottom: 12 },
  primaryBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, backgroundColor: '#3DD6D0' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  topButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  topButton: {
    flex: 1, marginHorizontal: 5, paddingVertical: 12, backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  topButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: 300, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, width: '100%', marginBottom: 15, fontSize: 16 },
  colorPickerWrapper: { marginVertical: 10, alignItems: 'center', justifyContent: 'center' },
  colorWheelWrapper: { width: 200, height: 200, overflow: 'hidden', borderRadius: 100, justifyContent: 'center', alignItems: 'center' },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  modalButton: { flex: 1, marginHorizontal: 5, paddingVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 8, alignItems: 'center' },
  modalButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});
