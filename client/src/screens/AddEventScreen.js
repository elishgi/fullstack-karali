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

  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState(() => {
    const initial = new Date();
    initial.setHours(23, 59, 0, 0);
    return initial;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [isShared, setIsShared] = useState(false);
  const [friends] = useState([
    { id: 'u1', name: 'אשתי היקרה' },
    { id: 'u2', name: 'נועה לוי' },
    { id: 'u3', name: 'יוסי מזרחי' },
    { id: 'u4', name: 'עלמה פרידמן' },
  ]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);

  const toggleSelectFriend = (id) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const formattedExpiration = useMemo(() => {
    if (!hasExpiration || !expirationDate) return 'ללא תפוגה';
    try {
      return expirationDate.toLocaleString('he-IL');
    } catch (error) {
      return expirationDate.toLocaleString();
    }
  }, [expirationDate, hasExpiration]);

  const handleAddEvent = async () => {
    if (!name.trim()) {
      Alert.alert('אנא הזן שם לאירוע לפני ההוספה');
      return;
    }
    if (isShared && selectedFriendIds.length === 0) {
      Alert.alert("בחר לפחות חבר אחד לאירוע המשותף או בטל את מצב 'אירוע משותף'");
      return;
    }

    if (hasExpiration) {
      const now = new Date();
      if (!expirationDate || expirationDate <= now) {
        Alert.alert('אנא בחר תאריך תפוגה עתידי עבור האירוע');
        return;
      }
    }

    const newEvent = {
      name,
      color,
      totalColor: 0,
      shared: isShared,
      participants: selectedFriendIds,
      ...(hasExpiration
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

  const renderExpirationSection = () => {
    if (!hasExpiration) {
      return null;
    }

    return (
      <View style={styles.expirationBox}>
        <Text style={styles.expirationLabel}>התפוגה הנוכחית</Text>
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
    );
  };

  const renderSharedSection = () => {
    if (!isShared) {
      return null;
    }

    return (
      <>
        <View style={styles.selectedChip}>
          <Text style={styles.selectedChipText}>
            נבחרו {selectedFriendIds.length} חבר/ים
          </Text>
        </View>

        <View style={styles.friendsBox}>
          <Text style={styles.friendsTitle}>בחרו עם מי לשתף את האירוע</Text>
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
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.headerWrapper}>
        <Text style={styles.title}>הוספת אירוע חדש</Text>
        <Text style={styles.subtitle}>צרו אירוע מותאם אישית ותחילת תיעוד מיידי</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.label}>שם האירוע</Text>
        <TextInput
          style={styles.input}
          placeholder="תנו שם שמתאים לכם"
          value={name}
          onChangeText={setName}
          placeholderTextColor="#9aa0a6"
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.label}>בחרו צבע לזיהוי מהיר</Text>
        <View style={styles.colorPickerWrapper}>
          <WheelColorPicker
            color={color}
            onColorChangeComplete={(selectedColor) => setColor(selectedColor)}
            style={styles.colorPicker}
          />
        </View>
        <View style={styles.colorPreview}>
          <View style={[styles.colorSwatch, { backgroundColor: color }]} />
          <Text style={styles.colorPreviewText}>כך האירוע ייראה ברשימה</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={[styles.actionToggle, hasExpiration && styles.actionToggleActive]}
          onPress={() => setHasExpiration((prev) => !prev)}
          activeOpacity={0.9}
        >
          <Text style={[styles.actionToggleText, hasExpiration && styles.actionToggleTextActive]}>
            {hasExpiration ? '⏰ תפוגת אירוע פעילה' : '⏰ הגדרת תפוגה לאירוע'}
          </Text>
        </TouchableOpacity>
        {renderExpirationSection()}
      </View>

      {showDatePicker ? (
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
      ) : null}

      {showTimePicker ? (
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
      ) : null}

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
        {renderSharedSection()}
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
    backgroundColor: '#dff8f6',
    borderColor: ACCENT,
  },
  actionToggleText: {
    fontSize: 16,
    color: '#1f2933',
    fontWeight: '700',
    textAlign: 'center',
  },
  actionToggleTextActive: {
    color: ACCENT_DARK,
  },
  expirationBox: {
    backgroundColor: '#f7fbff',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d7e2f2',
    gap: 12,
  },
  expirationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2f3c4a',
    textAlign: 'right',
  },
  expirationValue: {
    fontSize: 16,
    color: '#1f2933',
    textAlign: 'right',
  },
  expirationButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  expirationBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#e4f1ff',
    borderWidth: 1,
    borderColor: '#c1dbff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expirationBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#175cd3',
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
