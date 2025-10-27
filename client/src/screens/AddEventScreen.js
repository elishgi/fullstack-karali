import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { addEvent, getEvents } from '../services/api';
import WheelColorPicker from 'react-native-wheel-color-picker';
import { appendNotificationToStorage } from '../utils/notifications';

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

  // --- חדש: מצב אירוע משותף + בחירת חברים ---
  const [isShared, setIsShared] = useState(false);
  // TODO: להחליף בשליפה אמיתית מ-API/Store של חברים
  const [friends] = useState([
    { id: 'u1', name: 'אשתי היקרה' },
    { id: 'u2', name: 'נועה לוי' },
    { id: 'u3', name: 'יוסי מזרחי' },
    { id: 'u4', name: 'עלמה פרידמן' },
  ]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);


  const toggleSelectFriend = (id) => {
    setSelectedFriendIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const formattedExpiration = useMemo(() => {
    if (!hasExpiration || !expirationDate) return 'ללא תפוגה';
    return expirationDate.toLocaleString();
  }, [expirationDate, hasExpiration]);

  const handleAddEvent = async () => {
    if (!name.trim()) {
      Alert.alert("אנא הזן שם לאירוע לפני ההוספה");
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
      // --- שדות חדשים לשלב היסודות של השיתוף ---
      shared: isShared,
      participants: selectedFriendIds, // מזהי חברים
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

        const namesLine = selectedNames.length > 0
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
      Alert.alert("אירעה שגיאה בעת הוספת האירוע. נסה שוב.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>הוספת אירוע חדש</Text>

      <Text style={styles.label}>שם האירוע:</Text>
      <TextInput
        style={styles.input}
        placeholder="הכנס שם אירוע"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>בחר צבע:</Text>
      <View style={styles.colorPickerWrapper}>
        <WheelColorPicker
          color={color}
          onColorChangeComplete={(selectedColor) => setColor(selectedColor)}
          style={styles.colorPicker}
        />
      </View>

      <Text style={styles.label}>תצוגת צבע נבחר:</Text>
      <View style={[styles.colorPreview, { backgroundColor: color }]} />

      <View style={styles.expirationWrapper}>
        <TouchableOpacity
          style={[styles.expirationToggle, hasExpiration && styles.expirationToggleActive]}
          onPress={() => setHasExpiration((prev) => !prev)}
        >
          <Text style={[styles.expirationToggleText, hasExpiration && styles.expirationToggleTextActive]}>
            {hasExpiration ? '⏰ תפוגת אירוע: פעילה' : 'להגדיר תפוגה לאירוע?'}
          </Text>
        </TouchableOpacity>

        {hasExpiration && (
          <View style={styles.expirationBox}>
            <Text style={styles.expirationLabel}>התפוגה הנוכחית:</Text>
            <Text style={styles.expirationValue}>{formattedExpiration}</Text>

            <View style={styles.expirationButtonsRow}>
              <TouchableOpacity
                style={styles.expirationBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.expirationBtnText}>בחר תאריך</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.expirationBtn}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.expirationBtnText}>בחר שעה</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={expirationDate}
          mode="date"
          minimumDate={new Date()}
          onChange={(_, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) {
              const updated = new Date(expirationDate);
              updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
              setExpirationDate(updated);
            }
          }}
        />
      )}

      {showTimePicker && (
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

      {/* --- חדש: כפתור 'אירוע משותף?' + רשימת חברים --- */}
      <View style={styles.sharedRow}>
        <TouchableOpacity
          style={[styles.sharedBtn, isShared && styles.sharedBtnActive]}
          onPress={() => setIsShared((s) => !s)}
          activeOpacity={0.85}
        >
          <Text style={[styles.sharedBtnText, isShared && styles.sharedBtnTextActive]}>
            {isShared ? 'אירוע משותף: פעיל' : 'אירוע משותף?'}
          </Text>
        </TouchableOpacity>

        {isShared && (
          <View style={styles.selectedChip}>
            <Text style={styles.selectedChipText}>
              נבחרו {selectedFriendIds.length} חבר/ים
            </Text>
          </View>
        )}
      </View>

      {isShared && (
        <View style={styles.friendsBox}>
          <Text style={styles.friendsTitle}>בחר חברים לשיתוף האירוע:</Text>
          {friends.map((f) => {
            const checked = selectedFriendIds.includes(f.id);
            return (
              <TouchableOpacity
                key={f.id}
                style={styles.friendRow}
                onPress={() => toggleSelectFriend(f.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.friendName}>{f.name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {/* --- סוף חדש --- */}

      <View style={styles.buttonWrapper}>
        <Button title="➕ הוסף אירוע" onPress={handleAddEvent} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#333',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 25,
    fontSize: 16,
  },
  colorPickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  colorPicker: {
    width: 250,
    height: 250,
  },
  colorPreview: {
    width: '100%',
    height: 50,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },

  /* --- חדש: עיצוב אזור שיתוף --- */
  sharedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  sharedBtn: {
    minWidth: '65%',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d5d5d5',
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  expirationWrapper: {
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d5d5d5',
    borderRadius: 14,
    backgroundColor: '#f9f9ff',
    padding: 16,
  },
  expirationToggle: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d0d7ff',
    alignItems: 'center',
  },
  expirationToggleActive: {
    backgroundColor: '#e8f0ff',
    borderColor: '#90a4ff',
  },
  expirationToggleText: {
    fontSize: 16,
    color: '#4a4a4a',
    fontWeight: '600',
  },
  expirationToggleTextActive: {
    color: '#2948ff',
  },
  expirationBox: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#dde1f9',
    gap: 8,
  },
  expirationLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
  },
  expirationValue: {
    fontSize: 16,
    color: '#333',
  },
  expirationButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  expirationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
  },
  expirationBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a237e',
  },
  sharedBtnActive: {
    backgroundColor: '#e6f0ff',
    borderColor: '#9fc5ff',
    elevation: 3,
  },
  sharedBtnText: { fontSize: 16, color: '#2b2b2b', fontWeight: '700', textAlign: 'center' },
  sharedBtnTextActive: { color: '#0b69ff' },

  selectedChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#eef1f7',
  },
  selectedChipText: { fontSize: 12, color: '#3b3b3b', fontWeight: '600' },

  friendsBox: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  friendsTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8, color: '#444' },
  friendRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbb',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#0b69ff',
    borderColor: '#0b69ff',
  },
  checkmark: { color: '#fff', fontSize: 14, lineHeight: 14 },
  friendName: { fontSize: 16, color: '#333' },

  buttonWrapper: {
    marginBottom: 50,
  },
});
