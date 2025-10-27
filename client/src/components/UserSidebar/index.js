// UserSidebar.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
    Image, Alert, Modal, TouchableWithoutFeedback, Platform,
    TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteAccount, resetAccount, updateCurrentUser } from '../../services/api';


// ----- Notifications state -----
const NOTIF_KEY = 'notifications';
const NOTIF_UNREAD_KEY = 'notifications_unread_count';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PANEL_WIDTH = SCREEN_WIDTH * 0.82;

// ----- Friends state -----
const FRIENDS_KEY = 'friends_list';
const SHARED_EVENTS_COUNT_KEY = 'shared_events_count';

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
    const [searchExisting, setSearchExisting] = useState('');
    const [searchById, setSearchById] = useState('');
    const [sharedEventsCount, setSharedEventsCount] = useState(0);
    const [accountActionLoading, setAccountActionLoading] = useState(false);

    const persistFriends = async (list) => {
        setFriends(list);
        await AsyncStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
    };

    const seedFriendsIfEmpty = async () => {
        const raw = await AsyncStorage.getItem(FRIENDS_KEY);
        if (raw) return JSON.parse(raw);
        const demo = [
            { id: 'u1', name: 'דני כהן', starred: false, since: new Date().toISOString(), status: 'accepted' },
            { id: 'u2', name: 'נועה לוי', starred: false, since: new Date().toISOString(), status: 'accepted' },
            { id: 'u3', name: 'יוסי מזרחי', starred: true, since: new Date().toISOString(), status: 'accepted' },
        ];
        await persistFriends(demo);
        return demo;
    };

    const loadFriends = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(FRIENDS_KEY);
            if (!raw) {
                const demo = await seedFriendsIfEmpty();
                setFriends(demo);
            } else {
                setFriends(JSON.parse(raw) || []);
            }
        } catch {
            setFriends([]);
        }
    }, []);

    const refreshSharedCount = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(SHARED_EVENTS_COUNT_KEY);
            setSharedEventsCount(raw ? Number(raw) : 0);
        } catch {
            setSharedEventsCount(0);
        }
    }, []);

    const filteredFriends = friends.filter(f =>
        f.name?.toLowerCase().includes(searchExisting.toLowerCase()) ||
        f.id?.toLowerCase().includes(searchExisting.toLowerCase())
    );

    // חיפוש/הוספה לפי ID (יסודות – כרגע דמו)
    const handleFindById = async () => {
        const id = (searchById || '').trim();
        if (!id) return;
        const exists = friends.some(f => f.id === id);
        if (exists) {
            Alert.alert('קיים', 'החבר כבר נמצא ברשימה.');
            return;
        }
        // דמו: מוסיפים חבר חדש במצב pending. בהמשך – קריאת API / בקשת צירוף.
        const newFriend = {
            id,
            name: `משתמש ${id}`,
            starred: false,
            since: new Date().toISOString(),
            status: 'pending', // נפתח בהמשך לאישור הדדי
        };
        const next = [newFriend, ...friends];
        await persistFriends(next);
        setSearchById('');
        Alert.alert('נוסף (דמו)', `נוסף משתמש עם מזהה ${id} במצב ממתין.`);
    };


    // ----- Account form state -----
    const [initialUser, setInitialUser] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [drafts, setDrafts] = useState({
        username: '',
        name: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        bio: '',
    });

    const updateDraft = useCallback((field, value) => {
        setDrafts(prev => ({ ...prev, [field]: value }));
    }, []);

    const getDisplayName = (userObj) => {
        if (!userObj) return 'משתמש';
        const username = (userObj.username || '').trim();
        if (username) return username;
        const primary = (userObj.name || userObj.firstName || '').trim();
        const last = (userObj.lastName || '').trim();
        if (primary || last) return `${primary} ${last}`.trim();
        const name = (userObj.name || '').trim();
        if (name) return name;
        return 'משתמש';
    };


    const normalizeUser = (incoming = {}) => {
        const username = (incoming.username || '').trim();
        let name = (incoming.name ?? incoming.firstName ?? '').trim();
        let lastName = (incoming.lastName || '').trim();

        if (!lastName && name.includes(' ')) {
            const parts = name.split(' ').filter(Boolean);
            name = parts.shift() || '';
            lastName = parts.join(' ');
        }
        const normalized = {
            ...incoming,
            username,
            name,
            lastName,
        };
        delete normalized.password;

        const normalizedEmail = incoming.email == null ? '' : String(incoming.email).trim();
        const normalizedPhone = incoming.phone == null ? '' : String(incoming.phone).trim();
        const normalizedBio = incoming.bio == null ? '' : String(incoming.bio).trim();

        return {
            ...normalized,
            email: normalizedEmail,
            phone: normalizedPhone,
            bio: normalizedBio,
        };
    };
    const syncDraftsFrom = useCallback((userObj) => {
        setDrafts({
            username: userObj?.username || '',
            name: userObj?.name || '',
            lastName: userObj?.lastName || '',
            email: userObj?.email || '',
            phone: userObj?.phone == null ? '' : String(userObj.phone),
            password: '',
            bio: userObj?.bio == null ? '' : String(userObj.bio),
        });
    }, []);

    const resetDraftsToInitial = useCallback(() => {
        syncDraftsFrom(initialUser || {});
    }, [initialUser, syncDraftsFrom]);


    // להציג את השם המעודכן מיד
    const [sidebarName, setSidebarName] = useState(getDisplayName(user));
    const [sidebarBio, setSidebarBio] = useState('');

    // Notifications
    const [notifications, setNotifications] = useState([]);
    const unreadCount = notifications.filter(n => !n.read).length;

    const NOTIF_KEY = 'notifications';
    const NOTIF_UNREAD_KEY = 'notifications_unread_count';

    const persistNotifications = async (list) => {
        setNotifications(list);
        await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(list));
        const unread = list.filter(n => !n.read).length;
        await AsyncStorage.setItem(NOTIF_UNREAD_KEY, String(unread)); // ← עדכן מונה תמיד
    };

    const seedIfEmpty = async () => {
        const raw = await AsyncStorage.getItem(NOTIF_KEY);
        if (raw) return JSON.parse(raw);

        const demo = [{
            id: 'demo-1',
            title: 'חדש! שיתוף אירועים',
            body: 'מהיום אפשר לשתף את האירועים שלכם עם חברים! לכו לנסות',
            read: false, // ← חשוב!
            createdAt: new Date().toISOString(),
            starred: false,
        }];

        await persistNotifications(demo);
        return demo;
    };

    const loadNotifications = useCallback(async () => {
        try {
            const raw = await AsyncStorage.getItem(NOTIF_KEY);
            if (!raw) {
                const demo = await seedIfEmpty();
                setNotifications(demo);
            } else {
                const list = JSON.parse(raw) || [];
                setNotifications(list);
                // עדכן מונה גם כאן, ליתר בטחון
                const unread = list.filter(n => !n.read).length;
                await AsyncStorage.setItem(NOTIF_UNREAD_KEY, String(unread));
            }
        } catch {
            setNotifications([]);
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
                setIsEditing(false);
                resetDraftsToInitial();
                setConfirmOpen(false);
            }
        });
    }, [visible, resetDraftsToInitial]);

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
            const normalized = normalizeUser(stored || user || {});
            setInitialUser(normalized);
            setSidebarName(getDisplayName(normalized));
            setSidebarBio((normalized.bio || '').trim());
            syncDraftsFrom(normalized);
            setIsEditing(false);
            setConfirmOpen(false);
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
            refreshSharedCount();
        }
        if (activeIndex === 3 && visible) {
            loadNotifications();
        }
    }, [activeIndex, visible, loadFriends, refreshSharedCount, loadNotifications]);

    // פתיחה על טאב מבוקש (ברירת מחדל 0)
    useEffect(() => {
        if (!visible) return;
        const map = { main: 0, account: 1, friends: 2, notifications: 3, settings: 4 };
        const idx = typeof initialTab === 'string' ? (map[initialTab] ?? 0) : (Number(initialTab) || 0);
        setActiveIndex(idx);
    }, [visible, initialTab]);

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
                {!!sidebarBio && (
                    <Text style={styles.userBioQuote}>“{sidebarBio}”</Text>
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

    const SubHeader = ({ title, onBack, rightSlot }) => (
        <View style={styles.subHeader}>
            <TouchableOpacity style={styles.backBtn} onPress={onBack ?? (() => setActiveIndex(0))}>
                <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                <Text style={styles.backText}>חזרה</Text>
            </TouchableOpacity>
            <Text style={styles.subTitle}>{title}</Text>
            {rightSlot ? (
                <View style={styles.subHeaderRight}>{rightSlot}</View>
            ) : (
                <View style={{ width: 64 }} />
            )}
        </View>
    );
    // ----- ACCOUNT PANEL -----
    const trimStr = (value) => {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    };

    const somethingChanged =
        !!initialUser &&
        (
            trimStr(drafts.username) !== trimStr(initialUser?.username) ||
            trimStr(drafts.name) !== trimStr(initialUser?.name) ||
            trimStr(drafts.lastName) !== trimStr(initialUser?.lastName) ||
            trimStr(drafts.email) !== trimStr(initialUser?.email) ||
            trimStr(drafts.phone) !== trimStr(initialUser?.phone) ||
            trimStr(drafts.bio) !== trimStr(initialUser?.bio) ||
            trimStr(drafts.password || '') !== ''
        );

    const requestExitEditing = (afterExit) => {
        const finish = () => {
            resetDraftsToInitial();
            setIsEditing(false);
            setConfirmOpen(false);
            if (typeof afterExit === 'function') afterExit();
        };

        if (!somethingChanged) {
            finish();
            return;
        }

        Alert.alert('בטוח? לבטל את כל השינויים ?', 'השינויים שביצעת לא יישמרו.', [
            { text: 'לא', style: 'cancel' },
            {
                text: 'כן, בטל',
                style: 'destructive',
                onPress: finish,
            },
        ]);
    };

    const handleCancelEdit = () => {
        requestExitEditing();
    };

    const persistUserEverywhere = async (newUser) => {
        const normalized = normalizeUser(newUser || {});
        await AsyncStorage.setItem('user', JSON.stringify(normalized));
        setSidebarName(getDisplayName(normalized));
        setSidebarBio((normalized.bio || '').trim());
        onUserUpdated && onUserUpdated(normalized);
        return normalized;
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const username = trimStr(drafts.username);
            const name = trimStr(drafts.name);
            const lastName = trimStr(drafts.lastName);
            const email = trimStr(drafts.email);
            const phone = trimStr(drafts.phone);
            const bio = trimStr(drafts.bio);
            const passwordToUpdate = trimStr(drafts.password);

            const payload = {
                username,
                name,
                lastName,
                email,
                phone,
                bio,
            };

            if (passwordToUpdate) {
                payload.password = passwordToUpdate;
            }

            const updatedFromServer = await updateCurrentUser(payload);
            const updated = await persistUserEverywhere(updatedFromServer);

            setInitialUser(updated);
            syncDraftsFrom(updated);
            setConfirmOpen(false);
            setIsEditing(false);
            Alert.alert('עודכן!', 'הפרטים נשמרו בהצלחה.');
        } catch (e) {
            console.log('save error', e?.message);
            const serverMessage = e?.response?.data?.message;
            Alert.alert('שגיאה', serverMessage || 'לא הצלחתי לשמור את הפרטים.');
        } finally {
            setSaving(false);
        }
    };

    const handleBackPress = () => {
        if (!isEditing) {
            setActiveIndex(0);
            return;
        }
        requestExitEditing(() => setActiveIndex(0));
    };

    const AccountPanel = () => {
        const displayUser = initialUser || {};
        const bioValue = trimStr(displayUser.bio);

        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.panelInner} collapsable={false} renderToHardwareTextureAndroid>
                    <SubHeader
                        title="החשבון שלי"
                        onBack={handleBackPress}
                        rightSlot={
                            !isEditing ? (
                                <TouchableOpacity
                                    style={styles.editBtn}
                                    onPress={() => {
                                        resetDraftsToInitial();
                                        setConfirmOpen(false);
                                        setIsEditing(true);
                                    }}
                                    accessibilityLabel="ערוך פרטי חשבון"
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name="create-outline" size={16} color="#fff" style={{ marginLeft: 4 }} />
                                    <Text style={styles.editBtnText}>ערוך</Text>
                                </TouchableOpacity>
                            ) : null
                        }
                    />

                    {!isEditing ? (
                        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
                            <View style={styles.detailsContainer}>
                                <DetailRow label="שם משתמש" value={displayUser.username} />
                                <DetailRow label="שם פרטי" value={displayUser.name} />
                                <DetailRow label="שם משפחה" value={displayUser.lastName} />
                                <DetailRow label="אימייל" value={displayUser.email} />
                                <DetailRow label="מספר טלפון" value={displayUser.phone} />
                            </View>

                            <View style={styles.detailCardLarge}>
                                <Text style={styles.detailLabel}>קצת עליך</Text>
                                <Text
                                    style={[
                                        styles.detailValue,
                                        { lineHeight: 20 },
                                        !bioValue && styles.detailValuePlaceholder,
                                    ]}
                                >
                                    {bioValue || 'עדיין לא סיפרת על עצמך.'}
                                </Text>
                            </View>

                            <View style={styles.detailCardNote}>
                                <Ionicons name="lock-closed-outline" size={16} color={COLORS.subText} style={{ marginLeft: 8 }} />
                                <Text style={styles.detailNoteText}>אפשר לעדכן סיסמה מתוך מצב העריכה.</Text>
                            </View>
                        </ScrollView>
                    ) : (
                        <ScrollView
                            contentContainerStyle={{ paddingBottom: 24 }}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="none"
                        >
                            <Field
                                label="שם משתמש"
                                value={drafts.username}
                                onChangeText={(t) => updateDraft('username', t)}
                                placeholder="my_user_name"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <Field
                                label="שם פרטי"
                                value={drafts.name}
                                onChangeText={(t) => updateDraft('name', t)}
                                placeholder="לדוגמה: יעל"
                                autoCapitalize="words"
                                autoCorrect={false}
                                blurOnSubmit={false}
                            />
                            <Field
                                label="שם משפחה"
                                value={drafts.lastName}
                                onChangeText={(t) => updateDraft('lastName', t)}
                                placeholder="לדוגמה: לוי"
                                autoCapitalize="words"
                                autoCorrect={false}
                            />
                            <Field
                                label="אימייל"
                                value={drafts.email}
                                onChangeText={(t) => updateDraft('email', t)}
                                placeholder="example@mail.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Field
                                label="מספר טלפון"
                                value={drafts.phone}
                                onChangeText={(t) => updateDraft('phone', t)}
                                placeholder="05X-XXXXXXX"
                                keyboardType="phone-pad"
                                autoCorrect={false}
                            />
                            <Field
                                label="סיסמה (להחלפה)"
                                value={drafts.password}
                                onChangeText={(t) => updateDraft('password', t)}
                                placeholder="השאר ריק אם לא משנים"
                                secureTextEntry
                                autoCapitalize="none"
                                autoCorrect={false}
                            />

                            <View style={{ marginTop: 10 }}>
                                <Text style={styles.label}>קצת עליך</Text>
                                <View style={styles.inputWrapMultiline}>
                                    <TextInput
                                        value={drafts.bio}
                                        onChangeText={(t) => {
                                            if (t.length <= BIO_LIMIT) {
                                                updateDraft('bio', t);
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
                                <Text style={styles.counter}>{(drafts.bio || '').length}/{BIO_LIMIT}</Text>
                            </View>

                            <View style={styles.actionsRow}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                                    <Text style={styles.cancelText}>ביטול</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.saveBtn, (!somethingChanged || saving) && { opacity: 0.5 }]}
                                    onPress={() => {
                                        const usernameVal = trimStr(drafts.username);
                                        const nameVal = trimStr(drafts.name);
                                        const lastVal = trimStr(drafts.lastName);
                                        const emailVal = trimStr(drafts.email);
                                        if (!usernameVal) return Alert.alert('שגיאה', 'שם משתמש הוא שדה חובה.');
                                        if (!nameVal && !lastVal) return Alert.alert('שגיאה', 'יש למלא שם פרטי או שם משפחה.');
                                        if (!emailVal) return Alert.alert('שגיאה', 'אימייל הוא שדה חובה.');
                                        setConfirmOpen(true);
                                    }}
                                    disabled={!somethingChanged || saving}
                                >
                                    <Text style={styles.saveText}>{saving ? 'שומר...' : 'שמור'}</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}
                </View>

                {/* חלון אישור בטיחותי לשמירה */}
                {isEditing && (
                    <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
                        <TouchableWithoutFeedback onPress={() => setConfirmOpen(false)}>
                            <View style={styles.sheetBackdrop} />
                        </TouchableWithoutFeedback>
                        <View style={styles.sheet}>
                            <View style={styles.sheetHandle} />
                            <Text style={styles.sheetTitle}>בטוח לשמור?</Text>
                            <Text style={styles.sheetDesc}>השינויים יישמרו בכל מקום באפליקציה (כולל השם המוצג והמסכים הרלוונטיים).</Text>

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
                )}
            </KeyboardAvoidingView>
        );
    };


    // ----- OTHER PANELS -----
    const FriendsPanel = () => {
        return (
            <View style={styles.panelInner}>
                {/* כותרת */}
                <View style={styles.subHeader}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setActiveIndex(0)}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                        <Text style={styles.backText}>חזרה</Text>
                    </TouchableOpacity>
                    <Text style={styles.subTitle}>חברים</Text>
                    <View style={{ width: 64 }} />
                </View>

                {/* סטטיסטיקה */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statNum}>{friends.length}</Text>
                        <Text style={styles.statLabel}>חברים</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statNum}>{sharedEventsCount}</Text>
                        <Text style={styles.statLabel}>אירועים משותפים</Text>
                    </View>
                </View>

                {/* חיפוש חבר קיים */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>חיפוש חברים קיימים</Text>
                    <View style={styles.searchRow}>
                        <Ionicons name="search-outline" size={18} color="#888" style={{ marginHorizontal: 6 }} />
                        <TextInput
                            value={searchExisting}
                            onChangeText={setSearchExisting}
                            placeholder="חפש לפי שם או מזהה"
                            style={styles.searchInput}
                            placeholderTextColor="#999"
                        />
                    </View>
                </View>

                {/* רשימת חברים */}
                {filteredFriends.length === 0 ? (
                    <View style={styles.placeholderBox}>
                        <Text style={styles.placeholderText}>לא נמצאו חברים תואמים.</Text>
                    </View>
                ) : (
                    <View style={{ marginBottom: 10 }}>
                        {filteredFriends.map(f => (
                            <View key={f.id} style={styles.friendItem}>
                                <View style={styles.friendHeader}>
                                    <Text style={styles.friendName}>{f.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        {/* כוכב (מועדפים) פר-חבר */}
                                        <Ionicons
                                            name={f.starred ? 'star' : 'star-outline'}
                                            size={18}
                                            color={f.starred ? '#DAA520' : '#bbb'}
                                            onPress={async () => {
                                                const next = friends.map(x => x.id === f.id ? { ...x, starred: !x.starred } : x);
                                                await persistFriends(next);
                                            }}
                                        />
                                        {/* סטטוס */}
                                        <Text style={[styles.friendStatus, f.status === 'accepted' ? styles.statusOk : styles.statusPending]}>
                                            {f.status === 'accepted' ? 'מחובר' : 'ממתין'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.friendSince}>מאז: {new Date(f.since).toLocaleDateString()}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* הוספה לפי ID (יסודות) */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>מצא/הוסף חבר לפי מזהה (ID)</Text>
                    <View style={styles.findIdRow}>
                        <TextInput
                            value={searchById}
                            onChangeText={setSearchById}
                            placeholder="הקלד מזהה משתמש (ID)"
                            style={styles.findIdInput}
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                        />
                        <TouchableOpacity style={styles.findIdBtn} onPress={handleFindById} activeOpacity={0.85}>
                            <Ionicons name="person-add-outline" size={18} color="#111" />
                            <Text style={styles.findIdBtnText}>חפש</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.noteText}>בשלב הבא נוסיף בקשת צירוף ואימות הדדי.</Text>
                </View>
            </View>
        );
    };


    const NotificationsPanel = () => {
        const markAllRead = async () => {
            if (unreadCount === 0) return; // מגן
            const next = notifications.map(n => ({ ...n, read: true }));
            await persistNotifications(next);
        };



        const onPressNotification = async (n) => {
            Alert.alert(
                n.title,
                n.body,
                [{
                    text: 'סגור',
                    onPress: async () => {
                        const next = notifications.map(x => x.id === n.id ? { ...x, read: true } : x);
                        await persistNotifications(next);
                    }
                }],
                { cancelable: true }
            );
        };

        return (
            <View style={styles.panelInner}>
                {/* כותרת עליונה נקייה */}
                <View style={styles.subHeader}>
                    <TouchableOpacity style={styles.backBtn} onPress={() => setActiveIndex(0)}>
                        <Ionicons name="chevron-back" size={22} color={COLORS.text} />
                        <Text style={styles.backText}>חזרה</Text>
                    </TouchableOpacity>
                    <Text style={styles.subTitle}>התראות</Text>
                    <View style={{ width: 64 }} />
                </View>

                {/* שורה מתחת לכותרת: סמן הכול כנקראו במסגרת */}
                <View style={styles.afterTitleRow}>
                    <TouchableOpacity
                        style={[
                            styles.actionBorderBtn,
                            unreadCount === 0 ? styles.actionBorderBtnDanger : styles.actionBorderBtnNeutral
                        ]}
                        onPress={markAllRead}
                        disabled={unreadCount === 0} // ← לוודא שהוא באמת לא לחיץ כשהוא אדום
                    >
                        <Ionicons
                            name="checkmark-done-outline"
                            size={18}
                            color={unreadCount === 0 ? '#E53935' : '#111'}
                        />
                        <Text
                            style={[
                                styles.actionBorderBtnText,
                                { color: unreadCount === 0 ? '#E53935' : '#111' }
                            ]}
                        >
                            סמן הכול כנקראו
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* רשימת התראות */}
                {notifications.length === 0 ? (
                    <View style={styles.placeholderBox}>
                        <Text style={styles.placeholderText}>אין התראות כעת.</Text>
                    </View>
                ) : (
                    <View>
                        {notifications.map(n => {
                            const isUnread = !n.read;
                            return (
                                <TouchableOpacity
                                    key={n.id}
                                    style={[
                                        styles.notifItem,
                                        isUnread ? styles.notifItemUnread : styles.notifItemRead,
                                    ]}
                                    activeOpacity={0.8}
                                    onPress={() => onPressNotification(n)}
                                >
                                    <View style={styles.notifHeaderRow}>
                                        <Text style={[styles.notifTitle, isUnread && styles.notifTitleUnread]}>
                                            {n.title}
                                        </Text>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {/* כוכב פר־פריט */}
                                            <Ionicons
                                                name={n.starred ? 'star' : 'star-outline'}
                                                size={18}
                                                color={n.starred ? '#DAA520' : '#bbb'}
                                                onPress={async () => {
                                                    const next = notifications.map(x => x.id === n.id ? { ...x, starred: !x.starred } : x);
                                                    await persistNotifications(next);
                                                }}
                                            />
                                            {/* נקודה אדומה אם לא נקרא */}
                                            {isUnread && <View style={styles.unreadDot} />}
                                        </View>
                                    </View>

                                    {!!n.body && <Text style={styles.notifBody}>{n.body}</Text>}
                                    {!!n.createdAt && (
                                        <Text style={styles.notifTime}>{new Date(n.createdAt).toLocaleString()}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </View>
        );
    };



    const SettingsPanel = () => {
        const performDeleteAccount = async () => {
            try {
                setAccountActionLoading(true);
                await deleteAccount();
                await AsyncStorage.multiRemove([
                    'token',
                    'user',
                    'profileImageUri',
                    NOTIF_KEY,
                    NOTIF_UNREAD_KEY,
                    FRIENDS_KEY,
                    SHARED_EVENTS_COUNT_KEY,
                ]);

                Alert.alert(
                    'החשבון נמחק',
                    'כל הנתונים נמחקו בהצלחה. נעביר אותך למסך ההתחברות.',
                    [
                        {
                            text: 'הבנתי',
                            onPress: () => {
                                onClose && onClose();
                                onLogout && onLogout();
                            },
                        },
                    ],
                    { cancelable: false }
                );
            } catch (error) {
                console.error('Delete account error', error);
                Alert.alert('שגיאה', 'לא הצלחנו למחוק את החשבון. נסה שוב מאוחר יותר.');
            } finally {
                setAccountActionLoading(false);
            }
        };

        const confirmDeleteAccount = () => {
            if (accountActionLoading) return;
            Alert.alert(
                'מחיקת חשבון',
                'האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו תמחק לצמיתות את המשתמש, כל האירועים וכל התיעודים מהמערכת.',
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'כן, מחק לצמיתות',
                        style: 'destructive',
                        onPress: () => performDeleteAccount(),
                    },
                ]
            );
        };

        const performResetAccount = async () => {
            try {
                setAccountActionLoading(true);
                await resetAccount();
                Alert.alert(
                    'החשבון אופס',
                    'כל האירועים והתיעודים שלך הוסרו מהמערכת. ניתן ליצור אירועים חדשים מיד. לרענון הרשימה חזור למסך הראשי.',
                    [
                        {
                            text: 'הבנתי',
                            onPress: () => {
                                setActiveIndex(0);
                            },
                        },
                    ],
                    { cancelable: false }
                );
            } catch (error) {
                console.error('Reset account error', error);
                Alert.alert('שגיאה', 'לא הצלחנו לאפס את החשבון. נסה שוב מאוחר יותר.');
            } finally {
                setAccountActionLoading(false);
            }
        };

        const confirmResetAccount = () => {
            if (accountActionLoading) return;
            Alert.alert(
                'איפוס חשבון',
                'האם לאפס את החשבון? פעולה זו תמחק מהמסד את כל האירועים והתיעודים, אך תשמור על פרטי ההתחברות שלך.',
                [
                    { text: 'ביטול', style: 'cancel' },
                    {
                        text: 'כן, אפס הכול',
                        style: 'destructive',
                        onPress: () => performResetAccount(),
                    },
                ]
            );
        };

        return (
            <View style={styles.panelInner} collapsable={false} renderToHardwareTextureAndroid>
                <SubHeader title="הגדרות" onBack={() => setActiveIndex(0)} />
                <View style={styles.settingsSection}>
                    <Text style={styles.settingsIntro}>
                        פעולות מתקדמות לניהול החשבון. אנא קרא את ההסבר והבן את המשמעות לפני הפעלתן.
                    </Text>

                    <TouchableOpacity
                        style={[
                            styles.dangerActionBase,
                            styles.dangerActionPrimary,
                            accountActionLoading && styles.dangerActionDisabled,
                        ]}
                        onPress={confirmDeleteAccount}
                        activeOpacity={0.85}
                        disabled={accountActionLoading}
                        accessibilityRole="button"
                        accessibilityLabel="מחיקת חשבון"
                    >
                        <Ionicons name="trash-outline" size={24} color="#fff" style={styles.dangerActionIcon} />
                        <View style={styles.dangerActionTexts}>
                            <Text style={[styles.dangerActionTitle, styles.dangerActionTitleOnDark]}>מחק חשבון</Text>
                            <Text style={[styles.dangerActionSubtitle, styles.dangerActionSubtitleOnDark]}>
                                מוחק מיד את המשתמש, כל האירועים, התיעודים והלוגים מהמסד.
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.dangerActionBase,
                            styles.dangerActionSecondary,
                            accountActionLoading && styles.dangerActionDisabled,
                        ]}
                        onPress={confirmResetAccount}
                        activeOpacity={0.85}
                        disabled={accountActionLoading}
                        accessibilityRole="button"
                        accessibilityLabel="איפוס חשבון"
                    >
                        <Ionicons
                            name="refresh-circle-outline"
                            size={24}
                            color={COLORS.danger}
                            style={styles.dangerActionIcon}
                        />
                        <View style={styles.dangerActionTexts}>
                            <Text style={styles.dangerActionTitle}>אפס חשבון</Text>
                            <Text style={styles.dangerActionSubtitle}>
                                מוחק את כל האירועים והתיעודים מהמסד אך משאיר את פרטי המשתמש שלך פעילים.
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <Text style={styles.settingsWarning}>שימו לב: שתי הפעולות אינן הפיכות.</Text>

                    {accountActionLoading && (
                        <View style={styles.settingsLoadingRow}>
                            <ActivityIndicator color={COLORS.danger} size="small" />
                            <Text style={styles.settingsLoadingText}>מבצע את הפעולה…</Text>
                        </View>
                    )}
                </View>
            </View>
        );
    };

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

const DetailRow = React.memo(function DetailRow({ label, value }) {
    const textValue = typeof value === 'string' ? value.trim() : value ? String(value) : '';
    return (
        <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, !textValue && styles.detailValuePlaceholder]}>
                {textValue || '—'}
            </Text>
        </View>
    );
});

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

    // עיצוב ציטוט ספר על עצמך
    userBioQuote: {
        marginTop: 6,
        fontSize: 13,
        color: '#7a7a7a',
        fontStyle: 'italic',
        textAlign: 'center',
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
    friendStatus: { fontSize: 12, fontWeight: '700' },
    statusOk: { color: '#1e8e3e' },
    statusPending: { color: '#b26a00' },
    friendSince: { marginTop: 4, fontSize: 12, color: COLORS.subText, textAlign: 'right' },

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

    menuBtn: {
        backgroundColor: COLORS.bgSoft,
        paddingVertical: 16, paddingHorizontal: 14,
        borderRadius: 15, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border,
    },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    menuText: { color: COLORS.subText, fontSize: 15, fontWeight: '600' },

    subHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    subHeaderRight: { minWidth: 64, alignItems: 'flex-end' },
    editBtn: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    editBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    detailsContainer: { marginTop: 12, gap: 8 },
    detailCard: {
        backgroundColor: COLORS.bgSoft,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    detailCardLarge: {
        backgroundColor: COLORS.bgSoft,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: 12,
    },
    detailLabel: { fontSize: 12, color: COLORS.subText, marginBottom: 4, textAlign: 'right' },
    detailValue: { fontSize: 16, color: COLORS.text, textAlign: 'right' },
    detailValuePlaceholder: { color: '#9AA0A6' },
    detailCardNote: {
        marginTop: 12,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#F9FAFB',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    detailNoteText: { flex: 1, color: COLORS.subText, fontSize: 13, textAlign: 'right' },

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
    backText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
    subTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },

    placeholderBox: { marginTop: 10, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border },
    placeholderText: { color: COLORS.subText, textAlign: 'right' },

    settingsSection: { marginTop: 10 },
    settingsIntro: { color: COLORS.subText, textAlign: 'right', lineHeight: 20, marginBottom: 18 },
    dangerActionBase: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 12,
        marginBottom: 14,
    },
    dangerActionPrimary: {
        backgroundColor: COLORS.danger,
        borderColor: '#D84354',
    },
    dangerActionSecondary: {
        backgroundColor: '#FFE7EA',
        borderColor: '#F5B4BE',
    },
    dangerActionDisabled: { opacity: 0.6 },
    dangerActionIcon: { marginLeft: 4 },
    dangerActionTexts: { flex: 1 },
    dangerActionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.danger, textAlign: 'right' },
    dangerActionTitleOnDark: { color: '#fff' },
    dangerActionSubtitle: { fontSize: 13, lineHeight: 18, color: COLORS.danger, textAlign: 'right' },
    dangerActionSubtitleOnDark: { color: '#FFE6EA' },
    settingsWarning: { marginTop: -4, color: COLORS.subText, fontSize: 12, textAlign: 'right' },
    settingsLoadingRow: { marginTop: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
    settingsLoadingText: { color: COLORS.subText, fontSize: 13 },

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
