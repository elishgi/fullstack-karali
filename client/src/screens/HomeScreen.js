import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ImageBackground,
  StyleSheet,
  Animated,
  Alert,
  Image,
  Modal,
  TextInput,
  Button
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';

import {
  getEvents,
  updateEvent,
  addLog,
  getLogs,
  deleteLog,
  deleteEvent,
  deleteEventAndLogs
} from '../services/api';
import { BlurView } from 'expo-blur';
import WheelColorPicker from 'react-native-wheel-color-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedEventForEditName, setSelectedEventForEditName] = useState(null);
  const [newEventName, setNewEventName] = useState('');

  const [selectedEventForColor, setSelectedEventForColor] = useState(null);
  const [newEventColor, setNewEventColor] = useState('');

  const [selectedEventForDelete, setSelectedEventForDelete] = useState(null);

  const [userName, setUserName] = useState('');

  const clickTimeout = useRef(null);

  const route = useRoute();



  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserName(parsed.name);
      }
    };

    loadUser();
    fetchEvents();
  }, []);


  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
    });

    return unsubscribe;
  }, [navigation]);


  const fetchEvents = async () => {
    const data = await getEvents();
    setEvents(data);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      navigation.replace('Login');
    } catch (error) {
      console.error('שגיאה בהתנתקות:', error);
      Alert.alert('שגיאה בהתנתקות');
    }
  };


  const handleSingleClick = async (event) => {
    try {
      const updatedEvent = {
        ...event,
        totalColor: event.totalColor + 1
      };
      await updateEvent(event._id, updatedEvent);

      const newLog = {
        eventId: event._id,
        eventName: event.name,
        timestamp: new Date(),
        timeOfDay: getCurrentTimeOfDay(),
        dayOfWeek: getCurrentDayOfWeek(),
        comment: '',
        imageUri: '',
        location: {}
      };

      await addLog(newLog);
      fetchEvents();
    } catch (error) {
      console.error('Error in handleSingleClick:', error);
    }
  };

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

      await deleteLog(lastLog._id);

      const updatedEvent = {
        ...event,
        totalColor: event.totalColor - 1
      };
      await updateEvent(event._id, updatedEvent);

      fetchEvents();
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
      <View style={styles.header}>
        <Image source={require('C:/Users/User/fullstack-karali/client/assets/images/logo1.png')} style={styles.logo} />
        <Text style={styles.welcome}>ברוך הבא, {userName}</Text>
      </View>


      {/* שלישיית כפתורים מעוצבת */}
      <View style={styles.topButtonsContainer}>
        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: '#A68CF1' }]}
          onPress={() => setIsEditMode(!isEditMode)}
        >
          <Text style={styles.topButtonText}>
            {isEditMode ? '✅ סיים עריכה' : '🖉 מצב עריכה'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: '#66D19E' }]}
          onPress={() => navigation.navigate('Logs')}
        >
          <Text style={styles.topButtonText}>📄 הצג לוגים</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topButton, { backgroundColor: '#3DD6D0' }]}
          onPress={() => navigation.navigate('AddEvent')}
        >
          <Text style={styles.topButtonText}>➕ הוסף אירוע</Text>
        </TouchableOpacity>
      </View>



      <View style={{ alignItems: 'center' }}>
        <Text style={styles.title}>אירועים:</Text>
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


      <Modal visible={!!selectedEventForColor} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>בחר צבע חדש</Text>

            {/* גלגל צבעים בתוך wrapper עם overflow:hidden */}
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
                  await updateEvent(selectedEventForColor._id, {
                    name: selectedEventForColor.name,
                    color: newEventColor,
                    totalColor: selectedEventForColor.totalColor
                  });
                  fetchEvents();
                  setSelectedEventForColor(null);
                }}
              >
                <Text style={styles.modalButtonText}>💾 שמור צבע</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelectedEventForColor(null)}
              >
                <Text style={styles.modalButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Name */}
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
                  await updateEvent(selectedEventForEditName._id, {
                    name: newEventName,
                    color: selectedEventForEditName.color,
                    totalColor: selectedEventForEditName.totalColor
                  });
                  fetchEvents();
                  setSelectedEventForEditName(null);
                }}
              >
                <Text style={styles.modalButtonText}>💾 שמור שם</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setSelectedEventForEditName(null)}
              >
                <Text style={styles.modalButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Alert Delete */}
      {selectedEventForDelete && Alert.alert(
        'מחיקת אירוע',
        'מה ברצונך לעשות?',
        [
          {
            text: '🚮 מחק רק את האירוע',
            onPress: async () => {
              await deleteEvent(selectedEventForDelete._id);
              fetchEvents();
              setSelectedEventForDelete(null);
            },
            style: 'default'
          },
          {
            text: '🗑️ מחק את האירוע ואת כל התיעודים',
            onPress: async () => {
              console.log('👉 התחילה מחיקה מלאה');
              await deleteEventAndLogs(selectedEventForDelete._id);
              fetchEvents();
              setSelectedEventForDelete(null);
            },
            style: 'destructive'
          },
          {
            text: 'ביטול',
            onPress: () => setSelectedEventForDelete(null),
            style: 'cancel'
          }
        ],
        { cancelable: true }
      )}

    </ImageBackground>
  );
}

// EventButton:
const EventButton = ({ item, isEditMode, navigation, onPress, onLongPress, onEditName, onEditColor, onDelete }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true
      }),
      Animated.timing(glowOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={isEditMode ? null : onPress}
      onLongPress={isEditMode ? null : onLongPress}
      pointerEvents={isEditMode ? 'box-none' : 'auto'} // ← הכי חשוב!
    >

      <Animated.View
        style={[
          styles.eventButtonWrapper,
          {
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        <ImageBackground
          source={require('../../assets/images/button.png')}
          style={styles.eventButtonImage}
          resizeMode="contain"
        >
          <View style={[styles.overlay, { backgroundColor: item.color + '88' }]} />
          <Animated.View
            style={[
              styles.glowOverlayWrapper,
              { opacity: glowOpacity }
            ]}
          >
            <BlurView intensity={50} style={styles.glowOverlay} tint="default">
              <View
                style={{
                  ...StyleSheet.absoluteFillObject,
                  backgroundColor: item.color + '55',
                  borderRadius: 999
                }}
              />
            </BlurView>
          </Animated.View>

          {/* כפתורי עריכה */}
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

// styles:
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  fullBackground: {
    flex: 1,
    resizeMode: 'cover',
  },

  topButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  topButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  title: { fontSize: 20, fontWeight: 'bold', marginVertical: 10 },
  eventButtonWrapper: {
    textAlign: 'center',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  editButtonIcon: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)', // כהה יותר → שלא יראה כמו דף לבן
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: 300,
    alignItems: 'center',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 15,
    fontSize: 16,
  },
  colorPickerWrapper: {
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  colorWheelWrapper: {
    width: 200,
    height: 200,
    overflow: 'hidden',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },

  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },

  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },

  header: {
    alignItems: 'center',
    marginBottom: 20,
  },

  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: -60,
    marginTop: -40,
  },

  welcome: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },


});


