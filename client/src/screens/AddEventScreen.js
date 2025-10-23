import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addEvent } from '../services/api';
import WheelColorPicker from 'react-native-wheel-color-picker';

export default function AddEventScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#000000');

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

  const handleAddEvent = async () => {
    if (!name.trim()) {
      Alert.alert("אנא הזן שם לאירוע לפני ההוספה");
      return;
    }
    if (isShared && selectedFriendIds.length === 0) {
      Alert.alert("בחר לפחות חבר אחד לאירוע המשותף או בטל את מצב 'אירוע משותף'");
      return;
    }

    const newEvent = {
      name,
      color,
      totalColor: 0,
      // --- שדות חדשים לשלב היסודות של השיתוף ---
      shared: isShared,
      participants: selectedFriendIds, // מזהי חברים
    };

    try {
      await addEvent(newEvent);
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

      {/* --- חדש: כפתור 'אירוע משותף?' + רשימת חברים --- */}
      <View style={styles.sharedRow}>
        <TouchableOpacity
          style={[styles.sharedBtn, isShared && styles.sharedBtnActive]}
          onPress={() => setIsShared(s => !s)}
          activeOpacity={0.8}
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
    marginBottom: 10,
    gap: 10,
  },
  sharedBtn: {
    flexGrow: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f8f8f8',
  },
  sharedBtnActive: {
    backgroundColor: '#eef6ff',
    borderColor: '#b6d4fe',
  },
  sharedBtnText: { fontSize: 16, color: '#333', fontWeight: '600' },
  sharedBtnTextActive: { color: '#0b69ff' },

  selectedChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f1f1f1',
  },
  selectedChipText: { fontSize: 12, color: '#555' },

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
