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
  markEventExpirationNotified,
  getEventSummary as getEventSummaryApi,
  restartEvent as restartEventApi,
  archiveEvent as archiveEventApi,
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
  appendNotificationToStorage,
} from '../utils/notifications';

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

const parseDateSafely = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isEventExpired = (event) => {
  const expiresAt = parseDateSafely(event?.expiresAt);
  if (!expiresAt) return false;
  return expiresAt <= new Date();
};

const formatExpirationCountdown = (event) => {
  const expiresAt = parseDateSafely(event?.expiresAt);
  if (!expiresAt) {
    return { label: '', isExpired: false, tone: 'none' };
  }

  const diffMs = expiresAt.getTime() - Date.now();
  if (diffMs <= 0) {
    return { label: 'האירוע הסתיים', isExpired: true, tone: 'expired' };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) {
    parts.push(`${days} ${days === 1 ? 'יום' : 'ימים'}`);
  }
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? 'שעה' : 'שעות'}`);
  }
  if (days === 0 && minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? 'דקה' : 'דקות'}`);
  }

  const label = parts.length > 0 ? `נותרו ${parts.join(' ו-')}` : 'נותרה פחות מדקה';

  let tone = 'info';
  if (diffMs <= 60 * 60 * 1000) {
    tone = 'urgent';
  } else if (diffMs <= 24 * 60 * 60 * 1000) {
    tone = 'warning';
  }

  return { label, isExpired: false, tone };
};

const formatLastPressLabel = (event) => {
  const lastPress = getLastPress(event);
  if (!lastPress || lastPress.getTime() === 0) {
    return 'עדיין לא נרשמו לחיצות';
  }

  const diffMs = Date.now() - lastPress.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'לפני פחות מדקה';
  if (minutes < 60) return `לפני ${minutes} ${minutes === 1 ? 'דקה' : 'דקות'}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `לפני ${hours} ${hours === 1 ? 'שעה' : 'שעות'}`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `לפני ${days} ${days === 1 ? 'יום' : 'ימים'}`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `לפני ${weeks} ${weeks === 1 ? 'שבוע' : 'שבועות'}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `לפני ${months} ${months === 1 ? 'חודש' : 'חודשים'}`;

  const years = Math.floor(days / 365);
  return `לפני ${years} ${years === 1 ? 'שנה' : 'שנים'}`;
};

const buildSummaryMessage = (event, summary) => {
  if (!summary || summary.totalLogs === 0) {
    return `לא נמצאו תיעודים עבור "${event.name}".`;
  }

  const lines = [`במהלך האירוע נרשמו ${summary.totalLogs} תיעודים.`];

  if (summary.byTimeOfDay) {
    const parts = Object.entries(summary.byTimeOfDay)
      .map(([key, value]) => `${key}: ${value}`);
    if (parts.length) {
      lines.push(`חלוקה לפי זמנים: ${parts.join(', ')}`);
    }
  }

  if (summary.firstLog) {
    const firstDate = new Date(summary.firstLog.timestamp);
    if (!Number.isNaN(firstDate.getTime())) {
      lines.push(`תיעוד ראשון: ${firstDate.toLocaleString()}`);
    }
  }

  if (summary.lastLog) {
    const lastDate = new Date(summary.lastLog.timestamp);
    if (!Number.isNaN(lastDate.getTime())) {
      lines.push(`תיעוד אחרון: ${lastDate.toLocaleString()}`);
    }
  }

  return lines.join('\n');
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

  const [userObj, setUserObj] = useState(null);

  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [sidebarInitialTab, setSidebarInitialTab] = useState(0);
  const [hasUnreadNotif, setHasUnreadNotif] = useState(false);

  const [showPersonal, setShowPersonal] = useState(true);
  const [showShared, setShowShared] = useState(true);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [sortMode, setSortMode] = useState('none');
  const [filtersVisible, setFiltersVisible] = useState(false);

  const filtersVisibleRef = useRef(filtersVisible);

  const clickTimeout = useRef(null);
  const hasEvents = events.length > 0;

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

  const processExpiredEvents = useCallback(
    async (items) => {
      const expired = items.filter((event) => isEventExpired(event) && !event.expirationNotified);
      if (expired.length === 0) return;

      for (const event of expired) {
        try {
          await markEventExpirationNotified(event._id);
        } catch (error) {
          console.error('שגיאה בעדכון התראה על תפוגה:', error);
        }

        try {
          await appendNotificationToStorage({
            title: `⏰ האירוע "${event.name}" הסתיים`,
            body: 'האירוע הגיע לסיומו. בחר האם לאתחל אותו או להסיר מהרשימה.',
            metadata: { eventId: event._id },
          });
        } catch (error) {
          console.error('שגיאה ביצירת התראה עבור אירוע שפג תוקף:', error);
        }
      }

      refreshUnread();
    },
    [refreshUnread, markEventExpirationNotified, appendNotificationToStorage],
  );

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      const normalized = Array.isArray(data) ? data : [];
      setEvents(normalized);
      await processExpiredEvents(normalized);
    } catch (error) {
      console.error('שגיאה בטעינת אירועים:', error);
      Alert.alert('שגיאה', 'לא ניתן לטעון את רשימת האירועים כרגע.');
    }
  }, [processExpiredEvents]);

  const loadUser = useCallback(async () => {
    const storedUser = await AsyncStorage.getItem('user');

    if (!storedUser) {
      console.warn('לא נמצא משתמש – מעבר למסך התחברות');
      navigation.replace('Login');
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
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
    filtersVisibleRef.current = filtersVisible;
  }, [filtersVisible]);

  useEffect(() => {
    if (!hasEvents && filtersVisibleRef.current) {
      setFiltersVisible(false);
    }
  }, [hasEvents]);

  useEffect(() => {
    if (sidebarVisible && filtersVisibleRef.current) {
      setFiltersVisible(false);
    }
  }, [sidebarVisible]);

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

  const performRestart = useCallback(
    async (event) => {
      try {
        await restartEventApi(event._id, { resetLogs: true });
        Alert.alert('האירוע אופס', 'האירוע התחיל מחדש והמונה אופס.');
        await fetchEvents();
      } catch (error) {
        console.error('שגיאה באיפוס האירוע:', error);
        Alert.alert('שגיאה', 'לא ניתן לאפס את האירוע כעת.');
      }
    },
    [fetchEvents],
  );

  const performArchive = useCallback(
    async (event) => {
      try {
        await archiveEventApi(event._id);
        Alert.alert('האירוע הוסר', 'האירוע הוסר מהרשימה אך התיעודים נשארו זמינים ביומן.');
        await fetchEvents();
      } catch (error) {
        console.error('שגיאה בארכוב האירוע:', error);
        Alert.alert('שגיאה', 'לא ניתן להסיר את האירוע כעת.');
      }
    },
    [fetchEvents],
  );

  const handleRestartEvent = useCallback(
    async (event) => {
      try {
        const { summary } = await getEventSummaryApi(event._id);
        Alert.alert(
          'איפוס האירוע',
          `${buildSummaryMessage(event, summary)}\n\nהאם לאפס את האירוע ולהתחיל מחדש? התיעודים הנוכחיים ימחקו מהאירוע.`,
          [
            { text: 'ביטול', style: 'cancel' },
            {
              text: 'אפס והתחל מחדש',
              onPress: () => {
                performRestart(event);
              },
            },
          ],
          { cancelable: true },
        );
      } catch (error) {
        console.error('שגיאה בהצגת סיכום לפני איפוס:', error);
        Alert.alert('שגיאה', 'לא ניתן להציג את סיכום האירוע כעת.');
      }
    },
    [performRestart],
  );

  const handleArchiveEvent = useCallback(
    async (event) => {
      try {
        const { summary } = await getEventSummaryApi(event._id);
        Alert.alert(
          'סיכום האירוע',
          `${buildSummaryMessage(event, summary)}\n\nלהסיר את האירוע מהרשימה?`,
          [
            { text: 'השאר', style: 'cancel' },
            {
              text: 'הסר מהרשימה',
              style: 'destructive',
              onPress: () => {
                performArchive(event);
              },
            },
          ],
          { cancelable: true },
        );
      } catch (error) {
        console.error('שגיאה בשליפת סיכום אירוע:', error);
        Alert.alert('שגיאה', 'לא ניתן להציג את סיכום האירוע כעת.');
      }
    },
    [performArchive],
  );

  const showExpiredEventAlert = useCallback(
    (event) => {
      const expiresAt = parseDateSafely(event.expiresAt);
      const baseMessage = expiresAt
        ? `"${event.name}" הסתיים ב-${expiresAt.toLocaleString()}.`
        : `"${event.name}" הסתיים.`;

      Alert.alert(
        'האירוע הסתיים',
        `${baseMessage}\n\nבחר פעולה להמשך:`,
        [
          {
            text: '🔄 אתחל אירוע',
            onPress: () => handleRestartEvent(event),
          },
          {
            text: '📊 סיכום והסר',
            onPress: () => handleArchiveEvent(event),
          },
          { text: 'סגור', style: 'cancel' },
        ],
        { cancelable: true },
      );
    },
    [handleArchiveEvent, handleRestartEvent],
  );

  const handleSingleClick = useCallback(
    async (event) => {
      if (isEventExpired(event)) {
        showExpiredEventAlert(event);
        return;
      }

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
        if (error?.response?.status === 409) {
          showExpiredEventAlert(event);
          await fetchEvents();
          return;
        }
        console.error('שגיאה בעדכון אירוע לאחר לחיצה:', error);
        Alert.alert('שגיאה', 'לא ניתן לעדכן את האירוע כרגע.');
      }
    },
    [fetchEvents, showExpiredEventAlert],
  );

  const handleDoubleClick = useCallback(
    async (event) => {
      if (isEventExpired(event)) {
        showExpiredEventAlert(event);
        return;
      }

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
        if (error?.response?.status === 409) {
          showExpiredEventAlert(event);
          await fetchEvents();
          return;
        }
        console.error('שגיאה במחיקת לחיצה אחרונה:', error);
        Alert.alert('שגיאה', 'לא ניתן למחוק את הלחיצה האחרונה כעת.');
      }
    },
    [fetchEvents, showExpiredEventAlert],
  );

  const handlePress = useCallback(
    (event) => {
      if (isEventExpired(event)) {
        if (clickTimeout.current) {
          clearTimeout(clickTimeout.current);
          clickTimeout.current = null;
        }
        showExpiredEventAlert(event);
        return;
      }

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
      if (isEventExpired(event)) {
        showExpiredEventAlert(event);
        return;
      }
      navigation.navigate('AddDetailedLog', { eventId: event._id });
    },
    [navigation, showExpiredEventAlert],
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

  const decoratedEvents = useMemo(
    () =>
      events.map((event) => {
        const countdown = formatExpirationCountdown(event);
        return {
          ...event,
          expirationLabel: countdown.label,
          expirationTone: countdown.tone,
          isExpired: countdown.isExpired,
          lastPressLabel: formatLastPressLabel(event),
        };
      }),
    [events],
  );

  const eventSummary = useMemo(() => {
    const total = decoratedEvents.length;
    const sharedCount = decoratedEvents.filter((event) => event.shared).length;
    const personalCount = total - sharedCount;
    const expiringSoon = decoratedEvents.filter(
      (event) => event.expirationTone === 'urgent' || event.expirationTone === 'warning',
    ).length;
    const expiredCount = decoratedEvents.filter((event) => event.isExpired).length;

    return { total, sharedCount, personalCount, expiringSoon, expiredCount };
  }, [decoratedEvents]);

  const displayName = useMemo(() => {
    if (!userObj) return 'משתמש';

    const name = (userObj.name || '').trim();
    const first = (userObj.firstName || '').trim();
    const username = (userObj.username || '').trim();

    if (name) {
      return name.split(' ')[0];
    }
    if (first) {
      return first;
    }
    if (username) {
      return username;
    }

    return 'משתמש';
  }, [userObj]);

  const summaryCards = useMemo(
    () => [
      {
        key: 'total',
        label: 'סה"כ אירועים',
        value: eventSummary.total,
        subLabel: `${eventSummary.personalCount} אישיים`,
        icon: 'grid-outline',
      },
      {
        key: 'shared',
        label: 'אירועים משותפים',
        value: eventSummary.sharedCount,
        subLabel:
          eventSummary.sharedCount > 0 ? 'מתואמים עם הצוות' : 'עוד אין אירועים משותפים',
        icon: 'people-outline',
      },
      {
        key: 'expiring',
        label: 'מתקרבים לסיום',
        value: eventSummary.expiringSoon,
        subLabel:
          eventSummary.expiredCount > 0
            ? `${eventSummary.expiredCount} כבר הסתיימו`
            : 'מעודכן בזמן אמת',
        icon: 'time-outline',
      },
    ],
    [eventSummary],
  );

  const displayedEvents = useMemo(
    () => sortEvents(filterEvents(decoratedEvents)),
    [decoratedEvents, filterEvents, sortEvents],
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

  const handleRevealFilters = useCallback(() => {
    setFiltersVisible(true);
  }, []);

  const handleHideFilters = useCallback(() => {
    setFiltersVisible(false);
  }, []);

  const handleListScroll = useCallback((event) => {
    const offsetY = event?.nativeEvent?.contentOffset?.y ?? 0;
    if (offsetY < -70 && !filtersVisibleRef.current) {
      setFiltersVisible(true);
    } else if (offsetY > 20 && filtersVisibleRef.current) {
      setFiltersVisible(false);
    }
  }, []);

  return (
    <ImageBackground
      source={require('../../assets/images/main-background.png')}
      style={styles.fullBackground}
      resizeMode="cover"
    >
      <View style={styles.backgroundOverlay} pointerEvents="none" />
      <View style={styles.screenContainer}>
        <View
          style={[styles.headerBar, sidebarVisible && styles.headerBarDisabled]}
          pointerEvents={sidebarVisible ? 'none' : 'auto'}
        >
          <TouchableOpacity
            onPress={() => {
              setSidebarInitialTab(0);
              setSidebarVisible(true);
            }}
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityLabel="פתח תפריט"
          >
            <Ionicons name="menu" size={24} color="#0B1A33" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Image source={require('../../assets/images/logo1.png')} style={styles.headerLogo} />
            <Text style={styles.greetingText}>שלום {displayName}</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setSidebarInitialTab('notifications');
              setSidebarVisible(true);
            }}
            style={styles.iconButton}
            activeOpacity={0.7}
            accessibilityLabel="פתח התראות"
          >
            <Ionicons name="notifications-outline" size={24} color="#0B1A33" />
            {hasUnreadNotif && <View style={styles.bellDot} />}
          </TouchableOpacity>
        </View>

        {!sidebarVisible && eventSummary.total > 0 && (
          <View style={styles.summaryRow}>
            {summaryCards.map((card) => (
              <View key={card.key} style={styles.summaryCard}>
                <View style={styles.summaryTopRow}>
                  <View
                    style={[styles.summaryIconWrapper, styles[`summaryIconWrapper_${card.key}`]]}
                  >
                    <Ionicons name={card.icon} size={16} color="#fff" />
                  </View>
                  <Text style={styles.summaryValue}>{card.value}</Text>
                </View>
                <Text style={styles.summaryLabel}>{card.label}</Text>
                {card.subLabel ? <Text style={styles.summarySubLabel}>{card.subLabel}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {!hasEvents ? (
          <View style={styles.emptyStateWrapper}>
            <EmptyEventsState onAddEvent={() => navigation.navigate('AddEvent')} />
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.eventsSurface}>
              <TouchableOpacity
                onPress={handleRevealFilters}
                activeOpacity={0.7}
                style={styles.filtersHandleContainer}
                disabled={sidebarVisible}
              >
                <View style={styles.filtersHandle} />
                {!filtersVisible && (
                  <Text style={styles.filtersHandleText}>משכו מטה כדי להציג מסננים</Text>
                )}
              </TouchableOpacity>

              {filtersVisible && (
                <View style={styles.filtersPanel}>
                  <EventsFilterBar
                    showPersonal={showPersonal}
                    showShared={showShared}
                    onTogglePersonal={handleTogglePersonal}
                    onToggleShared={handleToggleShared}
                    onOpenSort={() => setSortModalVisible(true)}
                  />
                  <TouchableOpacity
                    onPress={handleHideFilters}
                    style={styles.filtersHideButton}
                    activeOpacity={0.7}
                    disabled={sidebarVisible}
                  >
                    <Ionicons name="chevron-up" size={16} color="#3D4E68" />
                    <Text style={styles.filtersHideText}>הסתר מסננים</Text>
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                style={styles.eventsList}
                data={displayedEvents}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
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
                onScroll={handleListScroll}
                scrollEventThrottle={16}
              />
            </View>
          </View>
        )}
      </View>

      <TopActionsBar
        style={styles.bottomToolbar}
        isEditMode={isEditMode}
        onToggleEdit={() => setIsEditMode((prev) => !prev)}
        onViewLogs={() => navigation.navigate('Logs')}
        onAddEvent={() => navigation.navigate('AddEvent')}
        disabled={sidebarVisible}
      />

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
  backgroundOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 24, 45, 0.08)',
  },
  screenContainer: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 18,
    paddingBottom: 160,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBarDisabled: {
    opacity: 0,
  },
  iconButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 180,
    height: 60,
    resizeMode: 'contain',
  },
  greetingText: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#132542',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E53935',
    borderWidth: 1,
    borderColor: '#fff',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    flexWrap: 'wrap',
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(16, 32, 54, 0.05)',
    borderRadius: 18,
  },
  summaryCard: {
    flexBasis: '30%',
    minWidth: 96,
    backgroundColor: 'rgba(255, 255, 255, 0.68)',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 6,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryIconWrapper_total: {
    backgroundColor: '#3DD6D0',
  },
  summaryIconWrapper_shared: {
    backgroundColor: '#7C5CFF',
  },
  summaryIconWrapper_expiring: {
    backgroundColor: '#FF8A65',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1A33',
    marginStart: 8,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4A5A78',
    marginTop: 4,
  },
  summarySubLabel: {
    fontSize: 9,
    color: '#7A869A',
    marginTop: 2,
  },
  content: {
    flex: 1,
    marginTop: 12,
    paddingBottom: 40,
  },
  eventsSurface: {
    flex: 1,
    backgroundColor: 'rgba(246, 248, 253, 0.82)',
    borderRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    shadowColor: '#0F1F38',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  emptyStateWrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 160,
  },
  filtersHandleContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  filtersHandle: {
    width: 50,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(16, 32, 54, 0.18)',
    marginBottom: 4,
  },
  filtersHandleText: {
    fontSize: 11,
    color: '#3D4E68',
    fontWeight: '600',
  },
  filtersPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 32, 54, 0.08)',
  },
  filtersHideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 32, 54, 0.06)',
  },
  filtersHideText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D4E68',
    marginStart: 4,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginBottom: 14,
  },
  listContent: {
    paddingBottom: 220,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  eventsList: {
    flex: 1,
  },
  bottomToolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
});
