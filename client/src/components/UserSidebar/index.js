// UserSidebar.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  Image, Alert, Modal, TouchableWithoutFeedback, SafeAreaView, Platform,
  TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  getFriends,
  getFriendRequests,
  respondToFriendRequest,
  sendFriendRequest,
  searchUsers,
  getNotifications,
  markNotificationRead,
} from '../../services/api';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = SCREEN_WIDTH * 0.82;

const COLORS = {
  primary: '#3DD6D0',
  primaryDark: '#1fc7bf',
  text: '#222',
  subText: '#555',
  border: '#E7E7E7',
  bgSoft: '#F5F6F9',
  danger: '#F35369',
};

const BIO_LIMIT = 180;

/**
 * props:
 *  - visible: boolean
 *  - onClose: () => void
 *  - user: { name, email, phone, bio }
 *  - onLogout: () => void
 *  - onUserUpdated?: (userObj) => void
 */
function UserSidebar({ visible, onClose, user, onLogout, onUserUpdated, initialTab }) {
  // פותח משמאל: מתחיל בחוץ לשמאל (שלילי), נכנס ל-0 כשנפתח
  const slideAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;

  // inner panels: 0-main, 1-account, 2-friends, 3-notifications, 4-settings
  const [activeIndex, setActiveIndex] = useState(0);
  const innerX = useRef(new Animated.Value(0)).current;

  // avatar
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [actionsVisible, setActionsVisible] = useState(false);

  // Friends
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [friendTab, setFriendTab] = useState('friends');
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsError, setFriendsError] = useState(null);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  const loadFriends = useCallback(async () => {
    try {
      setFriendsLoading(true);
      setFriendsError(null);
      const data = await getFriends();
      setFriends(data);
    } catch (error) {
      console.error('שגיאה בשליפת חברים:', error);
      setFriends([]);
      setFriendsError('לא ניתן לטעון את רשימת החברים');
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  const loadFriendRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const { incoming = [], outgoing = [] } = await getFriendRequests();
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (error) {
      console.error('שגיאה בשליפת בקשות חברות:', error);
      setIncomingRequests([]);
      setOutgoingRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const executeSearch = useCallback(async (query) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    try {
      setSearchLoading(true);
      setSearchError(null);
      const results = await searchUsers(trimmed);
      setSearchResults(results);
    } catch (error) {
      console.error('שגיאה בחיפוש חברים:', error);
      setSearchError('אירעה שגיאה במהלך החיפוש');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);


  // ----- Account form state -----
  const [initialUser, setInitialUser] = useState(null);
  const [name, setName] = useState('');
  const [password, setPassword] = useState(''); // לשינוי בלבד
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // --- טיוטות לא מבוקרות (uncontrolled) כדי למנוע איבוד פוקוס ---
  const draftNameRef = useRef('');
  const draftEmailRef = useRef('');
  const draftPhoneRef = useRef('');
  const draftPasswordRef = useRef('');
  const draftBioRef = useRef('');

  // טריגר זעיר לרנדר של כפתורי "שמור"/"חזור" בלי להשפיע על ה-TextInput
  const [draftTick, setDraftTick] = useState(0);
  const bump = () => setDraftTick(t => t + 1);


  // להציג את השם המעודכן מיד
  const [sidebarName, setSidebarName] = useState(user?.username || user?.name || 'משתמש');


  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const loadNotifications = useCallback(async () => {
    try {
      setNotificationsLoading(true);
      const list = await getNotifications();
      setNotifications(list);
    } catch (error) {
      console.error('שגיאה בשליפת התראות:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeIndex === 3 && visible) {
      loadNotifications();
    }
  }, [activeIndex, visible, loadNotifications]);



  // פתיחה/סגירה של הסייד־בר (שמאל)
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -SCREEN_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      if (!visible) {
        // איפוס פנימי בעת סגירה
        setActiveIndex(0);
        innerX.setValue(0);
        setPassword('');
        setConfirmOpen(false);
      }
    });
  }, [visible]);

  // הטענת תמונת פרופיל
  const loadProfileImage = useCallback(async () => {
    const uri = await AsyncStorage.getItem('profileImageUri');
    if (uri) setProfileImageUri(uri);
  }, []);

  // הטענת משתמש מ־AsyncStorage (רק בפתיחה, לא בכל שינוי props.user)
  const loadUser = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('user');
      const stored = raw ? JSON.parse(raw) : null;
      const u = stored || user || {};
      setInitialUser(u);
      setName(u?.username || u?.name || '');
      setEmail(u?.email || '');
      setPhone(u?.phone || '');
      setBio(u?.bio || '');
      setSidebarName(u?.username || u?.name || 'משתמש');

      // סנכרון ערכי ברירת מחדל ל-Uncontrolled
      draftNameRef.current = u?.username || u?.name || '';
      draftEmailRef.current = u?.email || '';
      draftPhoneRef.current = u?.phone || '';
      draftPasswordRef.current = '';       // לא נטען סיסמה קיימת
      draftBioRef.current = u?.bio || '';
      setDraftTick(x => x + 1); // טריגר קטן לעדכן מצב הכפתורים
    } catch (e) {
      console.log('loadUser error', e);
    }
  }, []); // שים לב: בלי תלות ב-user כדי לא לדרוס בזמן הקלדה

  useEffect(() => {
    if (visible) {
      loadProfileImage();
      loadUser();
    }
  }, [visible, loadProfileImage, loadUser]);

  // סלייד אופקי פנימי בין פאנלים
  useEffect(() => {
    Animated.timing(innerX, {
      toValue: -activeIndex * PANEL_WIDTH,
      duration: 280,
      useNativeDriver: true,
    }).start();
    if (activeIndex === 2 && visible) {
      loadFriends();
      loadFriendRequests();
    }
    if (activeIndex === 3 && visible) {
      loadNotifications();
    }
  }, [activeIndex, visible, loadFriends, loadFriendRequests, loadNotifications]);

  // פתיחה על טאב מבוקש (ברירת מחדל 0)
  useEffect(() => {
    if (!visible) return;
    const map = { main: 0, account: 1, friends: 2, notifications: 3, settings: 4 };
    const idx = typeof initialTab === 'string' ? (map[initialTab] ?? 0) : (Number(initialTab) || 0);
    setActiveIndex(idx);
  }, [visible, initialTab]);

  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible, loadNotifications]);

  const initials = (nameStr) => {
    if (!nameStr) return '🙂';
    const parts = nameStr.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return (parts[0][0] || '🙂').toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // ---- avatar actions ----
  const requestCameraPermission = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('אין הרשאה למצלמה', 'אפשר לאשר הרשאות בהגדרות ולנסות שוב.');
      return false;
    }
    return true;
  };
  const requestLibraryPermission = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('אין הרשאה לגלריה', 'אפשר לאשר הרשאות בהגדרות ולנסות שוב.');
      return false;
    }
    return true;
  };
  const persistImage = async (uri) => {
    await AsyncStorage.setItem('profileImageUri', uri);
    setProfileImageUri(uri);
  };
  const chooseFromGallery = async () => {
    try {
      const ok = await requestLibraryPermission();
      if (!ok) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!res.canceled) {
        const uri = res.assets?.[0]?.uri ?? null;
        if (uri) await persistImage(uri);
      }
    } catch {
      Alert.alert('שגיאה', 'אירעה תקלה בבחירת התמונה.');
    } finally {
      setActionsVisible(false);
    }
  };
  const takeFromCamera = async () => {
    try {
      const ok = await requestCameraPermission();
      if (!ok) return;
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!res.canceled) {
        const uri = res.assets?.[0]?.uri ?? null;
        if (uri) await persistImage(uri);
      }
    } catch {
      Alert.alert('שגיאה', 'אירעה תקלה בצילום התמונה.');
    } finally {
      setActionsVisible(false);
    }
  };
  const clearImage = async () => {
    await AsyncStorage.removeItem('profileImageUri');
    setProfileImageUri(null);
    setActionsVisible(false);
  };

  const pointerEvents = visible ? 'auto' : 'none';

  // ----- MAIN PANEL -----
  const MainPanel = () => (
    <View style={styles.panelInner} collapsable={false} renderToHardwareTextureAndroid>
      <View style={styles.header}>
        <Text style={styles.title}>פרופיל</Text>
        <TouchableOpacity onPress={onClose} accessibilityLabel="סגור חלון צד">
          <Text style={styles.close}>✖️</Text>
        </TouchableOpacity>
      </View>

      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <View style={styles.avatarArea}>
          <View style={styles.picWrap}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={styles.pic} />
            ) : (
              <View style={[styles.pic, styles.picPlaceholder]}>
                <Text style={{ fontSize: 42, fontWeight: '700', color: COLORS.text }}>
                  {initials(sidebarName)}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => setActionsVisible(true)}
            accessibilityLabel="שינוי תמונת פרופיל"
          >
            <Feather name="camera" size={20} color={COLORS.subText} />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{sidebarName}</Text>
        {!!user?.friendCode && (
          <View style={styles.friendCodeBox}>
            <Text style={styles.friendCodeLabel}>קוד חבר</Text>
            <Text style={styles.friendCodeValue}>{user.friendCode}</Text>
          </View>
        )}
      </View>

      <View style={{ marginTop: 12 }}>
        <MenuButton icon="person-outline" text="החשבון שלי" onPress={() => setActiveIndex(1)} />
        <MenuButton icon="people-outline" text="חברים" onPress={() => setActiveIndex(2)} />
        <MenuButton icon="notifications-outline" text="התראות" onPress={() => setActiveIndex(3)} />
        <MenuButton icon="settings-outline" text="הגדרות" onPress={() => setActiveIndex(4)} />
        <MenuButton icon="log-out-outline" text="התנתק" onPress={onLogout} />
      </View>
    </View>
  );

  const SubHeader = ({ title, onBack }) => (
    <View style={styles.subHeader}>
      <TouchableOpacity style={styles.backBtn} onPress={onBack ?? (() => setActiveIndex(0))}>
        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        <Text style={styles.backText}>חזרה</Text>
      </TouchableOpacity>
      <Text style={styles.subTitle}>{title}</Text>
      {/* פעולת ברירת מחדל: בסאב־הדר רגיל כלום; בפאנל התראות נחליף ברכיב אחר */}
      <View style={{ width: 64 }} />
    </View>
  );

  // ----- ACCOUNT PANEL -----
  const somethingChanged =
    !!initialUser &&
    (
      draftNameRef.current.trim() !== ((initialUser?.username || initialUser?.name || '')).trim() ||
      draftEmailRef.current.trim() !== (initialUser?.email || '').trim() ||
      draftPhoneRef.current.trim() !== (initialUser?.phone || '').trim() ||
      draftBioRef.current.trim() !== (initialUser?.bio || '').trim() ||
      (draftPasswordRef.current || '').length > 0
    );

  const handleCancelEdit = () => {
    if (!somethingChanged) {
      setActiveIndex(0);
      draftPasswordRef.current = '';
      return;
    }
    Alert.alert('בטוח? לבטל את כל השינויים ?', 'השינויים שביצעת לא יישמרו.', [
      { text: 'לא', style: 'cancel' },
      {
        text: 'כן, בטל',
        style: 'destructive',
        onPress: () => {
          draftNameRef.current = initialUser?.username || initialUser?.name || '';
          draftEmailRef.current = initialUser?.email || '';
          draftPhoneRef.current = initialUser?.phone || '';
          draftBioRef.current = initialUser?.bio || '';
          draftPasswordRef.current = '';
          setActiveIndex(0);
          setDraftTick(x => x + 1); // רענון קל לכפתורים/מונה
        },
      },
    ]);
  };

  const persistUserEverywhere = async (newUser) => {
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    setSidebarName(newUser?.name || 'משתמש');
    onUserUpdated && onUserUpdated(newUser);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // TODO: חיבור API אמיתי (PUT /users/me). כרגע שמירה מקומית בלבד.
      const payload = {
        ...(initialUser || {}),
        name: (draftNameRef.current || '').trim(),
        email: (draftEmailRef.current || '').trim(),
        phone: (draftPhoneRef.current || '').trim(),
        bio: (draftBioRef.current || '').trim(),
      };
      // סיסמה לא נשמרת מקומית. תשלח לשרת בלבד אם וכאשר.

      const updated = payload; // לוקאלי
      await persistUserEverywhere(updated);

      setInitialUser(updated);
      draftPasswordRef.current = '';
      setConfirmOpen(false);
      Alert.alert('עודכן!', 'הפרטים נשמרו בהצלחה.');
      setActiveIndex(0);
      setDraftTick(x => x + 1);
    } catch (e) {
      console.log('save error', e?.message);
      Alert.alert('שגיאה', 'לא הצלחתי לשמור את הפרטים.');
    } finally {
      setSaving(false);
    }
  };


  const AccountPanel = () => (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <View style={styles.panelInner} collapsable={false} renderToHardwareTextureAndroid>
        <SubHeader title="החשבון שלי" onBack={handleCancelEdit} />
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
        >
          <Field
            label="שם"
            defaultValue={draftNameRef.current}
            onChangeText={(t) => { draftNameRef.current = t; bump(); }}
            placeholder="שם מלא"
            autoCapitalize="words"
            autoCorrect={false}
            blurOnSubmit={false}
          />
          <Field
            label="אימייל"
            defaultValue={draftEmailRef.current}
            onChangeText={(t) => { draftEmailRef.current = t; bump(); }}
            placeholder="example@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="מספר טלפון"
            defaultValue={draftPhoneRef.current}
            onChangeText={(t) => { draftPhoneRef.current = t; bump(); }}
            placeholder="05X-XXXXXXX"
            keyboardType="phone-pad"
            autoCorrect={false}
          />
          <Field
            label="סיסמה (להחלפה)"
            defaultValue={draftPasswordRef.current}
            onChangeText={(t) => { draftPasswordRef.current = t; bump(); }}
            placeholder="השאר ריק אם לא משנים"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={{ marginTop: 10 }}>
            <Text style={styles.label}>Bio</Text>
            <View style={styles.inputWrapMultiline}>
              <TextInput
                defaultValue={draftBioRef.current}
                onChangeText={(t) => {
                  if (t.length <= BIO_LIMIT) {
                    draftBioRef.current = t;
                    bump();
                  }
                }}
                placeholder="ספר על עצמך בקצרה..."
                placeholderTextColor="#9AA0A6"
                style={styles.inputMultiline}
                multiline
                maxLength={BIO_LIMIT}
                textAlign="right"
                autoCorrect={false}
              />
            </View>
            <Text style={styles.counter}>{(draftBioRef.current || '').length}/{BIO_LIMIT}</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
              <Text style={styles.cancelText}>חזור</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, (!somethingChanged || saving) && { opacity: 0.5 }]}
              onPress={() => {
                if (!name.trim()) return Alert.alert('שגיאה', 'שם הוא שדה חובה.');
                if (!email.trim()) return Alert.alert('שגיאה', 'אימייל הוא שדה חובה.');
                setConfirmOpen(true); // קופץ אישור "בטוח לשמור?"
              }}
              disabled={!somethingChanged || saving}
            >
              <Text style={styles.saveText}>{saving ? 'שומר...' : 'שמור'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* חלון אישור בטיחותי לשמירה */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setConfirmOpen(false)}>
          <View style={styles.sheetBackdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>בטוח לשמור?</Text>
          <Text style={styles.sheetDesc}>השינויים יוחלו על כל האפליקציה (כולל השם המוצג והמסכים הרלוונטיים).</Text>

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.sheetBtn, { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
          >
            <Text style={[styles.sheetBtnText, { color: '#fff' }]}>{saving ? 'שומר...' : 'שמור'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setConfirmOpen(false)} style={[styles.sheetBtn, styles.sheetCancel]}>
            <Text style={styles.sheetBtnText}>ביטול</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );


  // ----- OTHER PANELS -----
  const FriendsPanel = () => {
    const hasIncoming = incomingRequests.length > 0;
    const hasOutgoing = outgoingRequests.length > 0;

    const handleAccept = async (requestId) => {
      try {
        await respondToFriendRequest(requestId, 'accepted');
        await Promise.all([loadFriends(), loadFriendRequests(), loadNotifications()]);
        Alert.alert('בקשה התקבלה', 'החבר נוסף לרשימת החברים שלך.');
      } catch (error) {
        console.error('שגיאה באישור בקשה:', error);
        Alert.alert('שגיאה', 'לא ניתן לאשר את הבקשה כעת.');
      }
    };

    const handleReject = async (requestId) => {
      try {
        await respondToFriendRequest(requestId, 'rejected');
        await loadFriendRequests();
      } catch (error) {
        console.error('שגיאה בדחיית בקשה:', error);
        Alert.alert('שגיאה', 'לא ניתן לדחות את הבקשה כעת.');
      }
    };

    const handleSendRequest = async (targetId) => {
      try {
        setSendingRequest(true);
        await sendFriendRequest({ toUserId: targetId });
        Alert.alert('בקשה נשלחה', 'בקשת החברות נשלחה בהצלחה.');
        setSearchQuery('');
        setSearchResults([]);
        await loadFriendRequests();
      } catch (error) {
        const message = error?.response?.data?.message || 'לא ניתן לשלוח בקשה כרגע.';
        Alert.alert('שגיאה', message);
      } finally {
        setSendingRequest(false);
      }
    };

    const renderFriendCard = (friend) => (
      <View key={friend._id} style={styles.friendItem}>
        <View style={styles.friendHeader}>
          <Text style={styles.friendName}>{friend.username}</Text>
          <Text style={styles.friendCodeText}>#{friend.friendCode}</Text>
        </View>
        <Text style={styles.friendSince}>מאז: {friend.since ? new Date(friend.since).toLocaleDateString() : 'לא ידוע'}</Text>
      </View>
    );

    const renderIncoming = () => {
      if (requestsLoading) {
        return (
          <View style={styles.placeholderBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        );
      }
      if (!hasIncoming) {
        return (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>אין בקשות נכנסות כרגע.</Text>
          </View>
        );
      }
      return incomingRequests.map((request) => (
        <View key={request._id} style={styles.requestCard}>
          <View style={styles.requestInfo}>
            <Text style={styles.friendName}>{request.fromUser.username}</Text>
            <Text style={styles.friendCodeText}>#{request.fromUser.friendCode}</Text>
            <Text style={styles.requestTime}>
              נשלחה {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.requestBtn, styles.acceptBtn]}
              onPress={() => handleAccept(request._id)}
            >
              <Text style={styles.requestBtnText}>אשר</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.requestBtn, styles.rejectBtn]}
              onPress={() => handleReject(request._id)}
            >
              <Text style={styles.requestBtnText}>דחה</Text>
            </TouchableOpacity>
          </View>
        </View>
      ));
    };

    const renderOutgoing = () => {
      if (requestsLoading) {
        return (
          <View style={styles.placeholderBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        );
      }
      if (!hasOutgoing) {
        return (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>אין בקשות ממתינות שנשלחו.</Text>
          </View>
        );
      }
      return outgoingRequests.map((request) => (
        <View key={request._id} style={styles.requestCard}>
          <View style={styles.requestInfo}>
            <Text style={styles.friendName}>{request.toUser.username}</Text>
            <Text style={styles.friendCodeText}>#{request.toUser.friendCode}</Text>
            <Text style={styles.requestTime}>
              ממתין מאז {new Date(request.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
      ));
    };

    const renderSearch = () => (
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color="#888" style={{ marginHorizontal: 6 }} />
          <TextInput
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              executeSearch(text);
            }}
            placeholder="חפש לפי שם משתמש או קוד חבר"
            style={styles.searchInput}
            placeholderTextColor="#999"
          />
        </View>
        {searchError && <Text style={styles.errorText}>{searchError}</Text>}
        {searchLoading ? (
          <View style={styles.placeholderBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (() => {
          const filtered = searchResults.filter((result) => {
            if (!result?._id) return false;
            if (user?._id && result._id === user._id) return false;
            if (existingFriendIds.has(result._id)) return false;
            if (outgoingIds.has(result._id)) return false;
            if (incomingIds.has(result._id)) return false;
            return true;
          });
          if (filtered.length === 0) {
            return (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>לא נמצאו משתמשים מתאימים.</Text>
              </View>
            );
          }
          return filtered.map((result) => (
            <View key={result._id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.friendName}>{result.username}</Text>
                <Text style={styles.friendCodeText}>#{result.friendCode}</Text>
              </View>
              <TouchableOpacity
                style={[styles.requestBtn, styles.acceptBtn]}
                onPress={() => handleSendRequest(result._id)}
                disabled={sendingRequest}
              >
                <Text style={styles.requestBtnText}>{sendingRequest ? 'שולח...' : 'שלח בקשה'}</Text>
              </TouchableOpacity>
            </View>
          ));
        })()}
      </View>
    );
    return (
      <View style={styles.panelInner}>
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setActiveIndex(0)}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            <Text style={styles.backText}>חזרה</Text>
          </TouchableOpacity>
          <Text style={styles.subTitle}>חברים</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              loadFriends();
              loadFriendRequests();
            }}
          >
            <Ionicons name="refresh" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.friendTabs}>
          {[
            { key: 'friends', label: 'החברים שלי', badge: friends.length },
            { key: 'incoming', label: 'בקשות נכנסות', badge: incomingRequests.length },
            { key: 'outgoing', label: 'בקשות יוצאות', badge: outgoingRequests.length },
            { key: 'search', label: 'חיפוש והוספה' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.friendTab, friendTab === tab.key && styles.friendTabActive]}
              onPress={() => setFriendTab(tab.key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.friendTabText, friendTab === tab.key && styles.friendTabTextActive]}>
                {tab.label}
              </Text>
              {tab.badge > 0 && (
                <View style={styles.friendTabBadge}>
                  <Text style={styles.friendTabBadgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {friendTab === 'friends' && (
            friendsLoading ? (
              <View style={styles.placeholderBox}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : friendsError ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>{friendsError}</Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>עדיין אין לך חברים. נסה לשלוח בקשה!</Text>
              </View>
            ) : (
              friends.map(renderFriendCard)
            )
          )}
          {friendTab === 'incoming' && renderIncoming()}
          {friendTab === 'outgoing' && renderOutgoing()}
          {friendTab === 'search' && renderSearch()}
        </ScrollView>
      </View>
    );
  };


  const NotificationsPanel = () => {
    const markAllRead = async () => {
      if (unreadCount === 0) return;
      try {
        await Promise.all(
          notifications.filter((n) => !n.isRead).map((n) => markNotificationRead(n._id || n.id))
        );
        await loadNotifications();
      } catch (error) {
        console.error('שגיאה בסימון התראות:', error);
      }
    };

    const translateType = (type) => {
      switch (type) {
        case 'FRIEND_REQUEST':
          return 'בקשת חברות חדשה';
        case 'FRIEND_ACCEPTED':
          return 'בקשת החברות התקבלה';
        case 'EVENT_LOG':
          return 'עדכון אירוע משותף';
        default:
          return 'התראה';
      }
    };

    const buildNotificationMessage = (notification) => {
      if (notification.payload?.message) return notification.payload.message;
      switch (notification.type) {
        case 'FRIEND_REQUEST':
          return `${notification.payload?.from?.username || 'משתמש'} שלח לך בקשת חברות.`;
        case 'FRIEND_ACCEPTED':
          return `${notification.payload?.by?.username || 'משתמש'} אישר את בקשת החברות שלך.`;
        case 'EVENT_LOG':
          return `${notification.payload?.by?.username || 'חבר'} הוסיף לוג חדש לאירוע "${notification.payload?.eventTitle || ''}".`;
        default:
          return '';
      }
    };

    const onPressNotification = async (notification) => {
      Alert.alert(
        translateType(notification.type),
        buildNotificationMessage(notification),
        [
          {
            text: 'סגור',
            onPress: async () => {
              if (!notification.isRead) {
                await markNotificationRead(notification._id || notification.id);
                await loadNotifications();
              }
            },
          },
        ],
        { cancelable: true }
      );
    };

    return (
      <View style={styles.panelInner}>
        <View style={styles.subHeader}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setActiveIndex(0)}>
            <Ionicons name="chevron-back" size={22} color={COLORS.text} />
            <Text style={styles.backText}>חזרה</Text>
          </TouchableOpacity>
          <Text style={styles.subTitle}>התראות</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={markAllRead}>
            <Ionicons name="checkmark-done-outline" size={18} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {notificationsLoading ? (
          <View style={styles.placeholderBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.placeholderBox}>
            <Text style={styles.placeholderText}>אין התראות כעת.</Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
            {notifications.map((notification) => {
              const isUnread = !notification.isRead;
              return (
                <TouchableOpacity
                  key={notification._id || notification.id}
                  style={[
                    styles.notifItem,
                    isUnread ? styles.notifItemUnread : styles.notifItemRead,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => onPressNotification(notification)}
                >
                  <View style={styles.notifHeaderRow}>
                    <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}>
                      {translateType(notification.type)}
                    </Text>
                    {isUnread && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.notifBody}>{buildNotificationMessage(notification)}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(notification.createdAt).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    );
  };
  const SettingsPanel = () => (
    <View style={styles.panelInner} collapsable={false} renderToHardwareTextureAndroid>
      <SubHeader title="הגדרות" onBack={() => setActiveIndex(0)} />
      <View style={styles.placeholderBox}>
        <Text style={styles.placeholderText}>הגדרות כלליות — בקרוב.</Text>
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[styles.wrapper, { transform: [{ translateX: slideAnim }] }]}
      pointerEvents={pointerEvents}
    >
      {/* הפאנל משמאל */}
      <SafeAreaView style={styles.panel}>
        <Animated.View
          style={[styles.animatedStrip, { transform: [{ translateX: innerX }] }]}
          renderToHardwareTextureAndroid
          needsOffscreenAlphaCompositing
        >
          <View style={{ width: PANEL_WIDTH }}><MainPanel /></View>
          <View key="account" style={{ width: PANEL_WIDTH }}><AccountPanel /></View>
          <View style={{ width: PANEL_WIDTH }}><FriendsPanel /></View>
          <View style={{ width: PANEL_WIDTH }}><NotificationsPanel /></View>
          <View style={{ width: PANEL_WIDTH }}><SettingsPanel /></View>
        </Animated.View>
      </SafeAreaView>

      {/* אוברליי בצד ימין – סוגר בלחיצה */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Action Sheet - Avatar */}
      <Modal visible={actionsVisible} transparent animationType="fade" onRequestClose={() => setActionsVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setActionsVisible(false)}>
          <View style={styles.sheetBackdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>תמונת פרופיל</Text>

          <TouchableOpacity style={styles.sheetBtn} onPress={chooseFromGallery}>
            <Text style={styles.sheetBtnText}>🖼️ בחר מהגלריה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sheetBtn} onPress={takeFromCamera}>
            <Text style={styles.sheetBtnText}>📷 מצלמה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sheetBtn, styles.sheetDanger]} onPress={clearImage}>
            <Text style={styles.sheetBtnText}>🗑️ הסר תמונה</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sheetBtn, styles.sheetCancel]} onPress={() => setActionsVisible(false)}>
            <Text style={styles.sheetBtnText}>ביטול</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Animated.View>
  );
}
export default React.memo(UserSidebar);

function MenuButton({ icon, text, onPress }) {
  return (
    <View style={{ paddingHorizontal: 10, marginVertical: 6 }}>
      <TouchableOpacity style={styles.menuBtn} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.menuLeft}>
          <Ionicons name={icon} size={20} color={COLORS.primary} />
          <Text style={styles.menuText}>{text}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#8A8A8A" />
      </TouchableOpacity>
    </View>
  );
}

const Field = React.memo(function Field({ label, ...inputProps }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          style={styles.input}
          placeholderTextColor="#9AA0A6"
          textAlign="right"
          {...inputProps}
        />
      </View>
    </View>
  );
});

const PIC_SIZE = 110;

const styles = StyleSheet.create({
  animatedStrip: {
    width: PANEL_WIDTH * 5,
    flexDirection: 'row',
  },
  wrapper: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    width: SCREEN_WIDTH, flexDirection: 'row', zIndex: 30,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  panel: {
    width: PANEL_WIDTH, backgroundColor: '#fff',
    borderTopRightRadius: 20, borderBottomRightRadius: 20,
    overflow: 'hidden', elevation: 9,
  },

  panelInner: { width: PANEL_WIDTH, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  close: { fontSize: 20 },

  avatarArea: {
    width: PIC_SIZE + 20, height: PIC_SIZE + 20, position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  picWrap: {
    height: PIC_SIZE, width: PIC_SIZE, borderRadius: PIC_SIZE / 2,
    overflow: 'hidden', backgroundColor: COLORS.bgSoft,
  },
  pic: { height: '100%', width: '100%', borderRadius: PIC_SIZE / 2, backgroundColor: COLORS.bgSoft },
  picPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  // סרגל פעולות בחירה
  actionsBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },

  // סטטיסטיקה
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 12, color: COLORS.subText, marginTop: 4 },

  section: { marginTop: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 6 },

  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
  },
  searchInput: { flex: 1, fontSize: 14, textAlign: 'right', paddingHorizontal: 8, color: COLORS.text },

  friendItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    marginVertical: 6,
  },
  friendHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  friendName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  friendCodeText: { fontSize: 12, color: COLORS.subText },
  friendStatus: { fontSize: 12, fontWeight: '700' },
  statusOk: { color: '#1e8e3e' },
  statusPending: { color: '#b26a00' },
  friendSince: { marginTop: 4, fontSize: 12, color: COLORS.subText, textAlign: 'right' },

  friendTabs: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
  },
  friendTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  friendTabActive: {
    backgroundColor: '#eef6ff',
    borderColor: '#bcd9ff',
  },
  friendTabText: { fontSize: 13, fontWeight: '700', color: COLORS.subText },
  friendTabTextActive: { color: '#0b69ff' },
  friendTabBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  friendTabBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  requestCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  requestInfo: {
    marginBottom: 10,
  },
  requestTime: { fontSize: 12, color: COLORS.subText, marginTop: 4 },
  requestActions: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  requestBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtn: { backgroundColor: '#3DD6D0' },
  rejectBtn: { backgroundColor: '#F35369' },
  requestBtnText: { color: '#fff', fontWeight: '700' },
  searchSection: { gap: 12 },

  findIdRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  findIdInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    textAlign: 'right',
    color: COLORS.text,
  },
  findIdBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#111',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  findIdBtnText: { fontSize: 13, fontWeight: '800', color: '#111' },
  noteText: { marginTop: 6, color: '#9aa0a6', fontSize: 12, textAlign: 'right' },




  actionBorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  actionBorderBtnText: { fontSize: 13, fontWeight: '700' },
  actionBorderBtnNeutral: { borderColor: '#111' },   // פעיל/ברירת מחדל (שחור)
  actionBorderBtnDanger: { borderColor: '#E53935' },// לא פעיל/ללא בחירה (אדום)
  actionBorderBtnGold: { borderColor: '#DAA520' },// כוכב פעיל (זהב)
  actionBorderBtnDisabled: { borderColor: '#bbb' },

  // כרטיס התראה
  notifItemSelected: { borderColor: '#0b69ff', backgroundColor: '#F3F8FF' },

  // צ'קבוקס לבחירה
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    borderWidth: 1, borderColor: '#bbb',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#0b69ff', borderColor: '#0b69ff' },
  checkboxCheck: { color: '#fff', lineHeight: 14, fontSize: 12 },


  afterTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 8,
  },

  actionBorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  actionBorderBtnText: { fontSize: 13, fontWeight: '700' },
  actionBorderBtnNeutral: { borderColor: '#111' },   // פעיל/ניתן ללחיצה (שחור)
  actionBorderBtnDanger: { borderColor: '#E53935' },// לא זמין (אדום)



  cameraBtn: {
    position: 'absolute', right: 2, bottom: 2, height: 44, width: 44, borderRadius: 22,
    backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },

  userName: { marginTop: 12, fontSize: 18, fontWeight: '800', color: COLORS.text },
  friendCodeBox: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: COLORS.bgSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  friendCodeLabel: { fontSize: 12, color: COLORS.subText, fontWeight: '600' },
  friendCodeValue: { fontSize: 16, fontWeight: '800', color: COLORS.text },

  menuBtn: {
    backgroundColor: COLORS.bgSoft,
    paddingVertical: 16, paddingHorizontal: 14,
    borderRadius: 15, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuText: { color: COLORS.subText, fontSize: 15, fontWeight: '600' },

  subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },

  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
  markAllText: { fontSize: 13, fontWeight: '700' },

  // Notifications list
  notifItem: {
    borderRadius: 14, borderWidth: 1, padding: 12, marginVertical: 6,
    backgroundColor: '#fff',
  },
  notifItemUnread: { borderColor: '#F19999', backgroundColor: '#FFF6F6' }, // אדמדם עדין
  notifItemRead: { borderColor: COLORS.border, backgroundColor: '#fff' },
  notifHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notifTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  notifTitleUnread: { color: '#B00020' }, // אדום כהה לכותרת לא נקראה
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  notifBody: { marginTop: 6, color: COLORS.subText, lineHeight: 20, fontSize: 14, textAlign: 'right' },
  notifTime: { marginTop: 6, color: '#9aa0a6', fontSize: 12, textAlign: 'left' },

  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 8 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  backText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  subTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },

  placeholderBox: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  placeholderText: { color: COLORS.subText, textAlign: 'right' },

  // ---- Account fields ----
  label: { color: COLORS.text, fontWeight: '700', marginBottom: 8, textAlign: 'right' },
  inputWrap: {
    backgroundColor: COLORS.bgSoft, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 12,
  },
  input: { color: COLORS.text },

  inputWrapMultiline: {
    backgroundColor: COLORS.bgSoft, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12, minHeight: 110,
  },
  inputMultiline: { color: COLORS.text },
  counter: { color: COLORS.subText, textAlign: 'left', marginTop: 6 },

  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.bgSoft, borderColor: COLORS.border, borderWidth: 1,
    paddingVertical: 14, borderRadius: 15, alignItems: 'center',
  },
  cancelText: { color: COLORS.subText, fontWeight: '700' },
  saveBtn: {
    flex: 1, backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 15, alignItems: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800' },

  // Action Sheet (גם לאווטר וגם לאישור שמירה)
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: '#fff', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24,
    borderTopLeftRadius: 16, borderTopRightRadius: 16, position: 'absolute', left: 0, right: 0, bottom: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 12,
  },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6, color: COLORS.text },
  sheetDesc: { color: COLORS.subText, textAlign: 'center', marginBottom: 10 },
  sheetBtn: {
    paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, marginTop: 8,
  },
  sheetBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  sheetDanger: { backgroundColor: '#FFEAEA', borderColor: '#F6CACA' },
  sheetCancel: { backgroundColor: COLORS.bgSoft, borderColor: COLORS.border, marginTop: 10 },
});
