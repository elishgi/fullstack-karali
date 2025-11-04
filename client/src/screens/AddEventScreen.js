import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import WheelColorPicker from 'react-native-wheel-color-picker';

import { addEvent, getEvents } from '../services/api';
import { appendNotificationToStorage } from '../utils/notifications';

const ACCENT = '#3dd6d0';
const ACCENT_DARK = '#0f766e';

export default function AddEventScreen() {
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [color, setColor] = useState('#000000');
  const [isTemporary, setIsTemporary] = useState(false);
  const [expirationDate, setExpirationDate] = useState(() => {
    const initial = new Date();
    initial.setHours(23, 59, 0, 0);
    return initial;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isShared, setIsShared] = useState(false);
  const [eventGoalEnabled, setEventGoalEnabled] = useState(false);
  const [eventGoalValue, setEventGoalValue] = useState('');
  const [dailyGoalEnabled, setDailyGoalEnabled] = useState(false);
  const [dailyGoalValue, setDailyGoalValue] = useState('');
  const [friends] = useState([
    { id: 'u1', name: 'אשתי היקרה' },
    { id: 'u2', name: 'נועה לוי' },
    { id: 'u3', name: 'יוסי מזרחי' },
    { id: 'u4', name: 'עלמה פרידמן' },
  ]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  const toggleEventGoal = () => {
    setEventGoalEnabled((prev) => {
      if (prev) {
        setEventGoalValue('');
      }
      return !prev;
    });
  };

  const toggleDailyGoal = () => {
    setDailyGoalEnabled((prev) => {
      if (prev) {
        setDailyGoalValue('');
      }
      return !prev;
    });
  };

  const toggleSelectFriend = (id) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const handleToggleTemporary = () => {
    setIsTemporary((prev) => {
      const next = !prev;
      if (!next) {
        setShowDatePicker(false);
        setShowTimePicker(false);
      }
      return next;
    });
  };

  const formattedExpiration = useMemo(() => {
    if (!expirationDate) return 'ללא תפוגה';
    const d = expirationDate;
    const date = d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} בשעה ${time}`;
  }, [expirationDate]);

  const handleAddEvent = async () => {
    if (!name.trim()) {
      Alert.alert('אנא הזן שם לאירוע לפני ההוספה');
      return;
    }
    if (isShared && selectedFriendIds.length === 0) {
      Alert.alert("בחר לפחות חבר אחד לאירוע המשותף או בטל את מצב 'אירוע משותף'");
      return;
    }

    if (isTemporary) {
      const now = new Date();
      if (!expirationDate || expirationDate <= now) {
        Alert.alert('אנא בחר תאריך תפוגה עתידי עבור האירוע');
        return;
      }
    }

    let normalizedEventGoal = null;
    if (eventGoalEnabled) {
      const numericGoal = Number(eventGoalValue);
      if (!Number.isFinite(numericGoal) || numericGoal <= 0) {
        Alert.alert('אנא הגדר מספר יעד תקין לאירוע (גדול מאפס)');
        return;
      }
      normalizedEventGoal = Math.floor(numericGoal);
    }

    let normalizedDailyGoal = null;
    if (dailyGoalEnabled) {
      const numericGoal = Number(dailyGoalValue);
      if (!Number.isFinite(numericGoal) || numericGoal <= 0) {
        Alert.alert('אנא הגדר מספר יעד יומי תקין (גדול מאפס)');
        return;
      }
      normalizedDailyGoal = Math.floor(numericGoal);
    }

    const newEvent = {
      name,
      color,
      totalColor: 0,
      shared: isShared,
      type: isTemporary ? 'temporary' : 'regular',
      ...(eventGoalEnabled ? { eventGoalValue: normalizedEventGoal } : {}),
      ...(dailyGoalEnabled ? { dailyGoalValue: normalizedDailyGoal } : {}),
      ...(isTemporary
        ? {
          expiresAt: expirationDate.toISOString(),
          expirationDurationMs: Math.max(expirationDate.getTime() - Date.now(), 0),
        }
        : { expiresAt: null, expirationDurationMs: null }),
    };

    try {
      let existingEventsCount = null;
      try {
        const existingEvents = await getEvents();
        existingEventsCount = Array.isArray(existingEvents) ? existingEvents.length : 0;
      } catch (fetchError) {
        console.warn('getEvents before addEvent failed', fetchError);
      }

      await addEvent(newEvent);

      const notificationsToCreate = [];

      if (existingEventsCount === 0) {
        notificationsToCreate.push({
          title: '🎉 מזל טוב על האירוע הראשון!',
          body: 'איזו התחלה מרגשת! זאת הפעם הראשונה שאתה יוצר אירוע באפליקציה – מאחלים לך המון הצלחה בהמשך החוויה.',
        });
      }

      if (isShared) {
        const selectedNames = friends
          .filter((friend) => selectedFriendIds.includes(friend.id))
          .map((friend) => friend.name);

        const namesLine =
          selectedNames.length > 0
            ? `האירוע ישותף עם: ${selectedNames.join(', ')}`
            : 'האירוע ישותף עם החברים שבחרת.';

        notificationsToCreate.push({
          title: '📢 אירוע משותף חדש',
          body: `איזה כיף! הרגע יצרת אירוע משותף חדש. ${namesLine}`,
        });
      }

      for (const notif of notificationsToCreate) {
        await appendNotificationToStorage(notif);
      }

      Alert.alert('אירוע חדש נוסף בהצלחה');
      navigation.navigate('Home', { refresh: true });
    } catch (error) {
      console.error('שגיאה בהוספת אירוע:', error);
      Alert.alert('אירעה שגיאה בעת הוספת האירוע. נסה שוב.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.85}
        >
          <Text style={styles.backButtonIcon}>←</Text>
          <Text style={styles.backButtonText}>חזור</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.headerWrapper}>
        <Text style={styles.title}>הוספת אירוע חדש</Text>
        <Text style={styles.subtitle}>צור אירוע מותאם אישית - לפי הפרמטרים שלך.</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.label}>שם האירוע</Text>
        <TextInput
          style={styles.input}
          placeholder="תן שם שמתאים לך"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.label}>בחר צבע לזיהוי האירוע</Text>
        <View style={styles.colorPickerWrapper}>
          <WheelColorPicker
            color={color}
            onColorChangeComplete={(selectedColor) => setColor(selectedColor)}
            style={styles.colorPicker}
          />
        </View>
        <View style={styles.colorPreview}>
          <View style={[styles.colorSwatch, { backgroundColor: color }]} />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.label}>הגדרת יעדים לאירוע</Text>
        <View style={styles.goalOptionsRow}>
          <TouchableOpacity
            style={[styles.goalOptionButton, eventGoalEnabled && styles.goalOptionButtonActive]}
            onPress={toggleEventGoal}
            activeOpacity={0.85}
          >
            <Text style={[styles.goalOptionText, eventGoalEnabled && styles.goalOptionTextActive]}>
              יעד לאירוע (האירוע יסתיים בהגעה למספר התיעודים)
            </Text>
          </TouchableOpacity>
          {eventGoalEnabled && (
            <View style={styles.goalInputWrapper}>
              <Text style={styles.helperText}>
                לאחר שתגיע למספר התיעודים שהוגדר – האירוע יסומן כהושלם ויישלח סיכום.
              </Text>
              <TextInput
                value={eventGoalValue}
                onChangeText={setEventGoalValue}
                keyboardType="number-pad"
                placeholder="כמה תיעודים להשגת היעד?"
                placeholderTextColor="#9aa0a6"
                style={styles.goalInput}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.goalOptionButton, dailyGoalEnabled && styles.goalOptionButtonActive]}
            onPress={toggleDailyGoal}
            activeOpacity={0.85}
          >
            <Text style={[styles.goalOptionText, dailyGoalEnabled && styles.goalOptionTextActive]}>
              מגבלה יומית (כמה תיעודים מותר ביום)
            </Text>
          </TouchableOpacity>
          {dailyGoalEnabled && (
            <View style={styles.goalInputWrapper}>
              <Text style={styles.helperText}>
                המערכת תאפשר להוסיף עד למספר התיעודים שהוגדר בין 00:00 ל-00:00 שלמחרת. ניתן למחוק ולתעד מחדש.
              </Text>
              <TextInput
                value={dailyGoalValue}
                onChangeText={setDailyGoalValue}
                keyboardType="number-pad"
                placeholder="כמה תיעודים מותר ביום?"
                placeholderTextColor="#9aa0a6"
                style={styles.goalInput}
              />
            </View>
          )}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.label}>סוג האירוע</Text>
        <TouchableOpacity
          style={[styles.actionToggle, isTemporary && styles.actionToggleActive]}
          onPress={handleToggleTemporary}
          activeOpacity={0.9}
        >
          <Text style={[styles.actionToggleText, isTemporary && styles.actionToggleTextActive]}>
            {isTemporary ? '⚡ אירוע זמני פעיל' : '⚡ הפוך את האירוע לזמני'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>
          בהפעלת מצב זה - תוכל להגדיר תאריך ושעת תפוגה לאירוע שלך.
        </Text>
        {isTemporary && (
          <View style={styles.expirationBox}>

            <Text style={styles.expirationValue}>{formattedExpiration}</Text>

            <View style={styles.expirationButtonsRow}>
              <TouchableOpacity
                style={styles.expirationBtn}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.expirationBtnText}>בחר תאריך</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.expirationBtn}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.expirationBtnText}>בחר שעה</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {isTemporary && showDatePicker && (
        <DateTimePicker
          value={expirationDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              const updated = new Date(expirationDate);
              updated.setFullYear(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate()
              );
              setExpirationDate(updated);
            }
          }}
        />
      )}

      {isTemporary && showTimePicker && (
        <DateTimePicker
          value={expirationDate}
          mode="time"
          is24Hour
          onChange={(_, selectedDate) => {
            setShowTimePicker(Platform.OS === 'ios');
            if (selectedDate) {
              const updated = new Date(expirationDate);
              updated.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
              setExpirationDate(updated);
            }
          }}
        />
      )}

      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={[styles.actionToggle, isShared && styles.actionToggleActive]}
          onPress={() => setIsShared((s) => !s)}
          activeOpacity={0.9}
        >
          <Text style={[styles.actionToggleText, isShared && styles.actionToggleTextActive]}>
            {isShared ? '🤝 אירוע משותף פעיל' : '🤝 אירוע משותף'}
          </Text>
        </TouchableOpacity>

        {isShared && (
          <>
            <View style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>
                נבחרו {selectedFriendIds.length} חבר/ים
              </Text>
            </View>

            <View style={styles.friendsBox}>
              <Text style={styles.friendsTitle}>בחר עם מי לשתף את האירוע</Text>
              {friends.map((friend) => {
                const checked = selectedFriendIds.includes(friend.id);
                return (
                  <TouchableOpacity
                    key={friend.id}
                    style={styles.friendRow}
                    onPress={() => toggleSelectFriend(friend.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.friendName}>{friend.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </View>

      <View style={styles.buttonWrapper}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleAddEvent} activeOpacity={0.88}>
          <Text style={styles.primaryButtonText}>➕ שמירה והוספת האירוע</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

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
    marginBottom: 4,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#e7eefc',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
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
  goalOptionsRow: {
    gap: 14,
  },
  goalOptionButton: {
    backgroundColor: '#eef3fb',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#d5e0f0',
  },
  goalOptionButtonActive: {
    backgroundColor: '#0f766e10',
    borderColor: '#0f766e',
  },
  goalOptionText: {
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: '#2f3c4a',
  },
  goalOptionTextActive: {
    color: '#0f766e',
  },
  goalInputWrapper: {
    gap: 10,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'right',
    color: '#2f3c4a',
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2f3c4a',
    textAlign: 'right',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d7e2',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    textAlign: 'right',
    backgroundColor: '#fff',
    color: '#1f2933',
  },
  colorPickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPicker: {
    width: 240,
    height: 240,
  },
  colorPreview: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 12,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cfd6df',
  },
  colorPreviewText: {
    flex: 1,
    fontSize: 14,
    color: '#52616f',
    textAlign: 'right',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7a8f',
    textAlign: 'right',
    lineHeight: 18,
  },
  actionToggle: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c6d6e6',
    backgroundColor: '#f6fbff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  actionToggleActive: {
    borderColor: ACCENT,
    backgroundColor: '#e7fbfa',
  },
  actionToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2933',
  },
  actionToggleTextActive: {
    color: ACCENT_DARK,
  },
  expirationLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  expirationButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,

  },
  expirationBtn: {
    flex: 1,
  },
  expirationBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  selectedChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#e1f7f5',
    alignSelf: 'flex-end',
  },
  selectedChipText: {
    fontSize: 12,
    color: ACCENT_DARK,
    fontWeight: '600',
    textAlign: 'center',
  },
  friendsBox: {
    borderWidth: 1,
    borderColor: '#d8e2f0',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    gap: 12,
  },
  friendsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2f3c4a',
    textAlign: 'right',
  },
  friendRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbbfc7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 14,
  },
  friendName: {
    fontSize: 16,
    color: '#1f2933',
    textAlign: 'right',
    flex: 1,
  },
  buttonWrapper: {
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: ACCENT,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0a2540',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
