// src/screens/HomeScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import {
  addLog,
  deleteEvent,
  deleteEventAndLogs,
  deleteLog as deleteLogApi,
  getEvents,
  getLogs,
  updateEvent,
} from '../services/api';
import EventButton from '../components/EventButton';
import UserSidebar from '../components/UserSidebar';
import ColorPickerModal from '../components/ColorPickerModal';
import EditEventNameModal from '../components/EditEventNameModal';
import SortOptionsModal from '../components/SortOptionsModal';
import EventsFilterBar from '../components/EventsFilterBar';
import TopActionsBar from '../components/TopActionsBar';
import EmptyEventsState from '../components/EmptyEventsState';
import {
  NOTIF_UNREAD_KEY,
  loadNotificationsFromStorage,
  saveNotificationsToStorage,
} from '../utils/notifications';

const composeUserDisplayName = (user) => {
  if (!user) return 'ללא שם';

  const rawFirst = typeof user.name === 'string' ? user.name.trim() : '';
  const rawLast = typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const username = typeof user.username === 'string' ? user.username.trim() : '';

  let firstName = rawFirst;
  let lastName = rawLast;

  if (!lastName && rawFirst.includes(' ')) {
    const parts = rawFirst.split(' ').filter(Boolean);
    firstName = parts.shift() || '';
    lastName = parts.join(' ');
  }

  const combined = `${firstName} ${lastName}`.trim();
  if (combined) return combined;
  if (rawFirst) return rawFirst;
  if (username) return username;
  return 'ללא שם';
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

const getCreatedAt = (event) => {
  if (event.createdAt) return new Date(event.createdAt);
  try {
    if (typeof event._id === 'string' && event._id.length >= 8) {
      const tsHex = event._id.substring(0, 8);
      const ts = parseInt(tsHex, 16) * 1000;
      return new Date(ts);
    }
  } catch (error) {
    return new Date(0);
  }
  return new Date(0);
};

const getLastPress = (event) => {
  if (!event.lastPressedAt) return new Date(0);
  const date = new Date(event.lastPressedAt);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
};

const HomeScreen = () => {
  const navigation = useNavigation();

  const [events, setEvents] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);

  const [selectedEventForEditName, setSelectedEventForEditName] = useState(null);
  const [editedEventName, setEditedEventName] = useState('');

  const [selectedEventForColor, setSelectedEventForColor] = useState(null);
  const [editedEventColor, setEditedEventColor] = useState('');

  const [eventForDelete, setEventForDelete] = useState(null);

  const [userName, setUserName] = useState('');
  const [userObj, setUserObj] = useState(null);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarInitialTab, setSidebarInitialTab] = useState(0);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);

  const [showPersonal, setShowPersonal] = useState(true);
  const [showShared, setShowShared] = useState(true);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortMode, setSortMode] = useState('none');

  const clickTimeout = useRef(null);
  const hasEvents = events.length > 0;

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('שגיאה בטעינת אירועים:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת האירועים כרגע.');
    }
  }, []);

  const ensureDemoNotification = useCallback(async () => {
    const existing = await loadNotificationsFromStorage();
    if (existing.length > 0) return;

    const demo = [
      {
        id: 'demo-1',
        title: 'חדש! שיתוף אירועים',
        body: 'מהיום אפשר לשתף את האירועים שלכם עם חברים! לכו לנסות',
        read: false,
        createdAt: new Date().toISOString(),
        starred: false,
      },
    ];

    await saveNotificationsToStorage(demo);
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      await ensureDemoNotification();
      const count = await AsyncStorage.getItem(NOTIF_UNREAD_KEY);
      setHasUnreadNotif(Boolean(count && Number(count) > 0));
    } catch (error) {
      console.error('שגיאה בעדכון התראות:', error);
      setHasUnreadNotif(false);
    }
  }, [ensureDemoNotification]);

  const loadUser = useCallback(async () => {
    const storedUser = await AsyncStorage.getItem('user');

    if (!storedUser) {
      console.warn('לא נמצא משתמש – מעבר למסך התחברות');
      navigation.replace('Login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      setUserName(composeUserDisplayName(parsedUser));
      setUserObj(parsedUser);
    } catch (error) {
      console.error('שגיאה בפענוח נתוני משתמש:', error);
      navigation.replace('Login');
    }
  }, [navigation]);

  useEffect(() => {
    loadUser();
    fetchEvents();
  }, [loadUser, fetchEvents]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvents();
      refreshUnread();
    });
    return unsubscribe;
  }, [navigation, fetchEvents, refreshUnread]);

  useEffect(() => {
    if (!sidebarVisible) {
      refreshUnread();
    }
  }, [sidebarVisible, refreshUnread]);

  useEffect(() => {
    return () => {
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!eventForDelete) return;

    const { _id, name } = eventForDelete;

    Alert.alert(
      'מחיקת אירוע',
      `מה ברצונך לעשות עבור "${name}"?`,
      [
        {
          text: '🚮 מחק רק את האירוע',
          onPress: async () => {
            try {
              await deleteEvent(_id);
              await fetchEvents();
            } catch (error) {
              console.error('שגיאה במחיקת אירוע:', error);
              Alert.alert('שגיאה', 'לא ניתן למחוק את האירוע כעת.');
            } finally {
              setEventForDelete(null);
            }
          },
          style: 'default',
        },
        {
          text: '🗑️ מחק אירוע וכל התיעודים',
          onPress: async () => {
            try {
              await deleteEventAndLogs(_id);
              await fetchEvents();
            } catch (error) {
              console.error('שגיאה במחיקת אירוע ותיעודים:', error);
              Alert.alert('שגיאה', 'לא ניתן למחוק את האירוע והתיעודים כעת.');
            } finally {
              setEventForDelete(null);
            }
          },
          style: 'destructive',
        },
        {
          text: 'ביטול',
          onPress: () => setEventForDelete(null),
          style: 'cancel',
        },
      ],
      { cancelable: true },
    );
  }, [eventForDelete, fetchEvents]);

  const handleLogout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'user', 'profileImageUri']);
      navigation.replace('Login');
    } catch (error) {
      console.error('שגיאה בהתנתקות:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת ההתנתקות.');
    }
  }, [navigation]);

  const handleSingleClick = useCallback(
    async (event) => {
      try {
        const updatedEvent = {
          ...event,
          totalColor: (event.totalColor || 0) + 1,
          lastPressedAt: new Date().toISOString(),
        };

        await updateEvent(event._id, updatedEvent);
        setEvents((prev) =>
          prev.map((item) => (item._id === event._id ? { ...item, ...updatedEvent } : item)),
        );

        const newLog = {
          eventId: event._id,
          eventName: event.name,
          timestamp: new Date().toISOString(),
          timeOfDay: getCurrentTimeOfDay(),
          dayOfWeek: getCurrentDayOfWeek(),
          comment: '',
          imageUri: '',
          location: {},
        };

        await addLog(newLog);
        await fetchEvents();
      } catch (error) {
        console.error('שגיאה בעדכון אירוע לאחר לחיצה:', error);
        Alert.alert('שגיאה', 'לא ניתן לעדכן את האירוע כרגע.');
      }
    },
    [fetchEvents],
  );

  const handleDoubleClick = useCallback(
    async (event) => {
      if ((event.totalColor || 0) <= 0) {
        Alert.alert('לא ניתן לבצע פעולה', 'מונה הלחיצות כבר עומד על אפס.');
        return;
      }

      try {
        const allLogs = await getLogs();
        const eventLogs = allLogs
          .filter((log) => log.eventId === event._id)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (eventLogs.length === 0) {
          Alert.alert('לא נמצאו תיעודים', 'אין לוגים אחרונים למחיקה עבור אירוע זה.');
          return;
        }

        const lastLog = eventLogs[0];
        await deleteLogApi(lastLog._id);

        const updatedEvent = {
          ...event,
          totalColor: (event.totalColor || 0) - 1,
        };

        await updateEvent(event._id, updatedEvent);
        await fetchEvents();
      } catch (error) {
        console.error('שגיאה במחיקת לחיצה אחרונה:', error);
        Alert.alert('שגיאה', 'לא ניתן למחוק את הלחיצה האחרונה כעת.');
      }
    },
    [fetchEvents],
  );

  const handlePress = useCallback(
    (event) => {
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
    },
    [handleSingleClick, handleDoubleClick],
  );

  const handleLongPress = useCallback(
    (event) => {
      navigation.navigate('AddDetailedLog', { eventId: event._id });
    },
    [navigation],
  );

  const handleOpenEditName = useCallback((event) => {
    setSelectedEventForEditName(event);
    setEditedEventName(event.name);
  }, []);

  const handleOpenEditColor = useCallback((event) => {
    setSelectedEventForColor(event);
    setEditedEventColor(event.color || '#FFFFFF');
  }, []);

  const handleSaveEventName = useCallback(async () => {
    if (!selectedEventForEditName) return;

    try {
      await updateEvent(selectedEventForEditName._id, {
        name: editedEventName.trim() || selectedEventForEditName.name,
        color: selectedEventForEditName.color,
        totalColor: selectedEventForEditName.totalColor,
      });
      await fetchEvents();
    } catch (error) {
      console.error('שגיאה בעדכון שם אירוע:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את שם האירוע כעת.');
    } finally {
      setSelectedEventForEditName(null);
    }
  }, [editedEventName, selectedEventForEditName, fetchEvents]);

  // ✅ תוקן: נוספה מעטפת try/catch/finally תקינה
  const handleSaveEventColor = useCallback(async () => {
    if (!selectedEventForColor) return;

    try {
      await updateEvent(selectedEventForColor._id, {
        name: selectedEventForColor.name,
        color: editedEventColor,
        totalColor: selectedEventForColor.totalColor,
      });
      await fetchEvents();
    } catch (error) {
      console.error('שגיאה בעדכון צבע אירוע:', error);
      Alert.alert('שגיאה', 'לא ניתן לעדכן את צבע האירוע כעת.');
    } finally {
      setSelectedEventForColor(null);
    }
  }, [editedEventColor, selectedEventForColor, fetchEvents]);

  const filterEvents = useCallback(
    (items) =>
      items.filter((event) => {
        if (showPersonal && showShared) return true;
        if (showPersonal && !event.shared) return true;
        if (showShared && event.shared) return true;
        return false;
      }),
    [showPersonal, showShared],
  );

  const sortEvents = useCallback(
    (items) => {
      if (sortMode === 'none') return items;

      const copy = [...items];
      switch (sortMode) {
        case 'createdAt':
          copy.sort((a, b) => getCreatedAt(b) - getCreatedAt(a));
          break;
        case 'popularity':
          copy.sort((a, b) => (b.totalColor || 0) - (a.totalColor || 0));
          break;
        case 'lastPress':
        default:
          copy.sort((a, b) => getLastPress(b) - getLastPress(a));
          break;
      }
      return copy;
    },
    [sortMode],
  );

  const displayedEvents = useMemo(
    () => sortEvents(filterEvents(events)),
    [events, filterEvents, sortEvents],
  );

  const handleTogglePersonal = useCallback(() => {
    setShowPersonal((current) => {
      if (current && !showShared) return true;
      return !current;
    });
  }, [showShared]);

  const handleToggleShared = useCallback(() => {
    setShowShared((current) => {
      if (current && !showPersonal) return true;
      return !current;
    });
  }, [showPersonal]);

  const handleSelectSortMode = useCallback((mode) => {
    setSortMode(mode);
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/images/main-background.png')}
      style={styles.fullBackground}
      resizeMode="cover"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            setSidebarInitialTab(0);
            setSidebarVisible(true);
          }}
          style={styles.menuBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setSidebarInitialTab('notifications');
            setSidebarVisible(true);
          }}
          style={styles.bellBtn}
          activeOpacity={0.7}
          accessibilityLabel="פתח התראות"
        >
          <Ionicons name="notifications-outline" size={22} color="#000" />
          {hasUnreadNotif && <View style={styles.bellDot} />}
        </TouchableOpacity>

        <Image source={require('../../assets/images/logo1.png')} style={styles.logo} />
        <Text style={styles.welcome}>ברוך הבא, {userName}</Text>
      </View>

      {!hasEvents ? (
        <EmptyEventsState onAddEvent={() => navigation.navigate('AddEvent')} />
      ) : (
        <View style={styles.content}>
          <TopActionsBar
            isEditMode={isEditMode}
            onToggleEdit={() => setIsEditMode((prev) => !prev)}
            onViewLogs={() => navigation.navigate('Logs')}
            onAddEvent={() => navigation.navigate('AddEvent')}
            disabled={sidebarVisible}
          />

          <EventsFilterBar
            showPersonal={showPersonal}
            showShared={showShared}
            onTogglePersonal={handleTogglePersonal}
            onToggleShared={handleToggleShared}
            onOpenSort={() => setSortModalVisible(true)}
          />

          <FlatList
            data={displayedEvents}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <EventButton
                item={item}
                isEditMode={isEditMode}
                onPress={() => handlePress(item)}
                onLongPress={() => handleLongPress(item)}
                onEditName={() => handleOpenEditName(item)}
                onEditColor={() => handleOpenEditColor(item)}
                onDelete={() => setEventForDelete(item)}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        </View>
      )}

      <ColorPickerModal
        visible={Boolean(selectedEventForColor)}
        color={editedEventColor}
        onColorChange={setEditedEventColor}
        onSave={handleSaveEventColor}
        onClose={() => setSelectedEventForColor(null)}
      />

      <EditEventNameModal
        visible={Boolean(selectedEventForEditName)}
        name={editedEventName}
        onChangeName={setEditedEventName}
        onSave={handleSaveEventName}
        onClose={() => setSelectedEventForEditName(null)}
      />

      <SortOptionsModal
        visible={sortModalVisible}
        sortMode={sortMode}
        onSelect={(mode) => {
          handleSelectSortMode(mode);
          setSortModalVisible(false);
        }}
        onClose={() => setSortModalVisible(false)}
      />

      <UserSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        user={userObj}
        onLogout={handleLogout}
        initialTab={sidebarInitialTab}
      />
    </ImageBackground>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
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
  menuIcon: {
    fontSize: 22,
  },
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
  content: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContent: {
    paddingBottom: 80,
  },
});
