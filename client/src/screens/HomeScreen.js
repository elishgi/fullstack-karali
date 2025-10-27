// src/screens/HomeScreen.js
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Animated,
  Alert,
  Image,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getEvents,
  updateEvent,
  addLog,
  getLogs,
  deleteLog as deleteLogApi,
  deleteEvent,
  deleteEventAndLogs,
} from '../services/api';
import WheelColorPicker from 'react-native-wheel-color-picker';
import EventButton from '../components/EventButton';
import UserSidebar from '../components/UserSidebar';

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [events, setEvents] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedEventForEditName, setSelectedEventForEditName] = useState(null);
  const [newEventName, setNewEventName] = useState('');

  const [selectedEventForColor, setSelectedEventForColor] = useState(null);
  const [newEventColor, setNewEventColor] = useState('');

  const [selectedEventForDelete, setSelectedEventForDelete] = useState(null);

  const [userName, setUserName] = useState('');
  const [userObj, setUserObj] = useState(null);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarInitialTab, setSidebarInitialTab] = useState(0);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);

  // פילטר/מיון
  const [showPersonal, setShowPersonal] = useState(true);
  const [showShared, setShowShared] = useState(true);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortMode, setSortMode] = useState('none'); // 'none' | 'lastPress' | 'popularity' | 'createdAt'

  const clickTimeout = useRef(null);

  const [hasRevealedButtons, setHasRevealedButtons] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const hasEvents = (events?.length ?? 0) > 0;

  const composeUserDisplayName = (obj) => {
    if (!obj) return 'ללא שם';
    const rawName = typeof obj.name === 'string' ? obj.name.trim() : '';
    const rawLast = typeof obj.lastName === 'string' ? obj.lastName.trim() : '';
    const username = typeof obj.username === 'string' ? obj.username.trim() : '';

    let firstName = rawName;
    let lastName = rawLast;

    if (!lastName && rawName.includes(' ')) {
      const parts = rawName.split(' ').filter(Boolean);
      firstName = parts.shift() || '';
      lastName = parts.join(' ');
    }

    const combined = `${firstName} ${lastName}`.trim();
    if (combined) return combined;
    if (rawName) return rawName;
    if (username) return username;
    return 'ללא שם';
  };

  useEffect(() => {
    const loadUser = async () => {
      const userData = await AsyncStorage.getItem('user');

      if (!userData) {
        console.warn('🟡 לא נמצא משתמש – מחזיר ל־Login');
        navigation.replace('Login');
        return;
      }

      try {
        const parsed = JSON.parse(userData);
        // אפשר שיגיע מה-Login (אובייקט מלא) או מה-SignUp (שם בלבד)
        const displayName = composeUserDisplayName(parsed);
        setUserName(displayName);
        setUserObj(parsed);
      } catch (e) {
        console.error('❌ שגיאה בפענוח user:', e);
        navigation.replace('Login');
      }
    };

    loadUser();
    fetchEvents();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
      refreshUnread();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!sidebarVisible) {
      // בכל סגירה של הסייד־בר נרענן
      refreshUnread();
    }
  }, [sidebarVisible]);

  // HomeScreen.js
  const NOTIF_KEY = 'notifications';
  const NOTIF_UNREAD_KEY = 'notifications_unread_count';

  const ensureDemoNotification = async () => {
    const raw = await AsyncStorage.getItem(NOTIF_KEY);
    if (raw) return; // כבר קיים – לא נדרוס

    const demo = [{
      id: 'demo-1',
      title: 'חדש! שיתוף אירועים',
      body: 'מהיום אפשר לשתף את האירועים שלכם עם חברים! לכו לנסות',
      read: false, // ← חשוב! חייב להיות false
      createdAt: new Date().toISOString(),
      starred: false,
    }];

    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(demo));
    await AsyncStorage.setItem(NOTIF_UNREAD_KEY, '1');
  };

  const refreshUnread = async () => {
    try {
      await ensureDemoNotification();
      const cnt = await AsyncStorage.getItem(NOTIF_UNREAD_KEY);
      setHasUnreadNotif((cnt && Number(cnt) > 0) ? true : false);
    } catch {
      setHasUnreadNotif(false);
    }
  };


  useEffect(() => {
    if (hasRevealedButtons && hasEvents) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [hasRevealedButtons, hasEvents]);



  const fetchEvents = async () => {
    const data = await getEvents();
    setEvents(data);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('profileImageUri');
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
        totalColor: event.totalColor + 1,
        lastPressedAt: new Date().toISOString(),
      };
      await updateEvent(event._id, updatedEvent);
      setEvents(prev => prev.map(e => e._id === event._id ? { ...e, ...updatedEvent } : e));

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

  // חלוקה: אישי/משותף
  const filterEvents = (items) => {
    return items.filter(ev => {
      if (showPersonal && showShared) return true;
      if (showPersonal && !ev.shared) return true;
      if (showShared && ev.shared) return true;
      return false;
    });
  };

  // חילוץ createdAt: אם אין בשדה, מנסים מ-ObjectId של Mongo (אופציונלי)
  const getCreatedAt = (ev) => {
    if (ev.createdAt) return new Date(ev.createdAt);
    // ניסיון חילוץ מטיימסטמפ ב-ObjectId (אם זה מונגו) — אם לא בטוח, נחזיר 0
    try {
      if (typeof ev._id === 'string' && ev._id.length >= 8) {
        const tsHex = ev._id.substring(0, 8);
        const ts = parseInt(tsHex, 16) * 1000;
        return new Date(ts);
      }
    } catch (_) { }
    return new Date(0);
  };

  const getLastPress = (ev) => {
    if (!ev.lastPressedAt) return new Date(0);
    const d = new Date(ev.lastPressedAt);
    return isNaN(d.getTime()) ? new Date(0) : d;
  };

  const sortEvents = (items) => {
    if (sortMode === 'none') return items;
    const arr = [...items];
    switch (sortMode) {
      case 'none':
        return items;
      case 'createdAt':
        arr.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
        break;
      case 'popularity':
        arr.sort((a, b) => (b.totalColor || 0) - (a.totalColor || 0));
        break;
      case 'lastPress':
      default:
        arr.sort((a, b) => getLastPress(b) - getLastPress(a));
        break;
    }
    return arr;
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

      await deleteLogApi(lastLog._id);

      const updatedEvent = {
        ...event,
        totalColor: event.totalColor - 1,
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

  // ----- UI -----
  return (
    <ImageBackground
      source={require('../../assets/images/main-background.png')}
      style={styles.fullBackground}
      resizeMode="cover"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => { setSidebarInitialTab(0); setSidebarVisible(true); }}
          style={styles.menuBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        {/* כפתור הפעמון – צד ימין, אותו סגנון */}
        <TouchableOpacity
          onPress={() => { setSidebarInitialTab('notifications'); setSidebarVisible(true); }}
          style={styles.bellBtn}
          activeOpacity={0.7}
          accessibilityLabel="פתח התראות"
        >
          <Ionicons name="notifications-outline" size={22} color="#000" />
          {hasUnreadNotif && <View style={styles.bellDot} />}
        </TouchableOpacity>

        <Image
          source={require('../../assets/images/logo1.png')}
          style={styles.logo}
        />
        <Text style={styles.welcome}>ברוך הבא, {userName}</Text>
      </View>

      {/* מצב ריק: אין אירועים */}
      {!hasEvents ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>אין אירועים עדיין</Text>
          <Text style={styles.emptySub}>צור את האירוע הראשון שלך כדי להתחיל לתעד</Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('AddEvent')}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>צור אירוע חדש</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* שלישיית כפתורים – תמיד כשיש אירועים */}
          {hasEvents && (
            <View
              style={[styles.topButtonsContainer, sidebarVisible && { opacity: 0 }]}
              pointerEvents={sidebarVisible ? 'none' : 'auto'}
            >
              <TouchableOpacity
                style={[styles.topButton, { backgroundColor: '#A68CF1' }]}
                onPress={() => setIsEditMode(!isEditMode)}
              >
                <Text style={styles.topButtonText}>
                  {isEditMode ? '✅ סיים עריכה' : '🎨 מצב עריכה'}
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
          )}

          {/* פס מצבי תצוגה + פילטר */}
          {hasEvents && (
            <View style={styles.filterBar}>
              <TouchableOpacity
                style={[styles.filterPill, showPersonal ? styles.filterPillActive : null]}
                onPress={() => {
                  setShowPersonal(v => {
                    // אם כרגע שניהם דלוקים – מותר לכבות אישי
                    if (v && !showShared) return true; // אל תכבה אם משותף כבוי – חייב אחד דולק
                    return !v;
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterPillText, showPersonal ? styles.filterPillTextActive : null]}>
                  👤 אירועים אישיים
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterPill, showShared ? styles.filterPillActive : null]}
                onPress={() => {
                  setShowShared(v => {
                    if (v && !showPersonal) return true; // אל תכבה אם אישי כבוי – חייב אחד דולק
                    return !v;
                  });
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.filterPillText, showShared ? styles.filterPillTextActive : null]}>
                  🤝 אירועים משותפים
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.filterIconBtn}
                onPress={() => setSortModalVisible(true)}
                activeOpacity={0.85}
                accessibilityLabel="סינון ומיון לוגים"
              >
                <Ionicons name="filter-outline" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          )}

          {/* רשימת אירועים */}
          <Animated.FlatList
            data={sortEvents(filterEvents(events))}
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


        </>
      )}

      {/* Modals + Alerts (קיים) */}
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
                  await updateEvent(selectedEventForColor._id, {
                    name: selectedEventForColor.name,
                    color: newEventColor,
                    totalColor: selectedEventForColor.totalColor,
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
                    totalColor: selectedEventForEditName.totalColor,
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

      {/* Modal: מיון */}
      <Modal visible={sortModalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { width: 320 }]}>
            <Text style={styles.modalTitle}>מיון לוגים/אירועים</Text>

            {[
              { key: 'none', label: 'ללא מיון (סדר מקורי)' },
              { key: 'lastPress', label: 'לפי זמן לחיצה אחרונה' },
              { key: 'popularity', label: 'לפי פופולריות (סה״כ לחיצות)' },
              { key: 'createdAt', label: 'לפי זמן יצירה' },
            ].map(opt => {
              const active = sortMode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => setSortMode(opt.key)}
                  style={[styles.sortRow, active && styles.sortRowActive]}
                  activeOpacity={0.7}
                >
                  <View style={[styles.radio, active && styles.radioActive]} />
                  <Text style={[styles.sortText, active && styles.sortTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalButton} onPress={() => setSortModalVisible(false)}>
                <Text style={styles.modalButtonText}>סגור</Text>
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
                await deleteEvent(selectedEventForDelete._id);
                fetchEvents();
                setSelectedEventForDelete(null);
              },
              style: 'default',
            },
            {
              text: '🗑️ מחק את האירוע ואת כל התיעודים',
              onPress: async () => {
                await deleteEventAndLogs(selectedEventForDelete._id);
                fetchEvents();
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

      {/* 🔹 חלון צד עם פרופיל ותמונה עגולה */}
      <UserSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        user={userObj}
        onLogout={handleLogout}
        initialTab={sidebarInitialTab}
      />
    </ImageBackground>
  );
}

// styles
const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },

  fullBackground: {
    flex: 1,
    resizeMode: 'cover',
  },

  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 8,
  },

  menuBtn: {
    position: 'absolute',
    left: 20,
    top: 60,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  menuIcon: { fontSize: 22 },

  bellBtn: {
    position: 'absolute',
    right: 20,
    top: 60,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },

  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E53935',
  },

  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: -60,
    marginTop: -40,
  },

  welcome: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: -25,
  },

  // ---- Empty state ----
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: 12,
  },
  primaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#3DD6D0',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // ---- Top actions (when events exist) ----
  topButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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


  /* --- Filter bar --- */
  filterBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#eef6ff',
    borderColor: '#bcd9ff',
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  filterPillTextActive: { color: '#0b69ff' },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* --- Sort modal --- */
  sortRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  sortRowActive: { backgroundColor: '#f3f8ff' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#ccc',
    marginLeft: 8,
  },
  radioActive: { borderColor: '#0b69ff', backgroundColor: '#0b69ff22' },
  sortText: { fontSize: 15, color: '#333' },
  sortTextActive: { color: '#0b69ff', fontWeight: '700' },

  // ---- Modals etc. ----
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
});
