import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addEvent, getFriends } from '../services/api';
import WheelColorPicker from 'react-native-wheel-color-picker';

export default function AddEventScreen() {
  const navigation = useNavigation();
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('#000000');
  const [isShared, setIsShared] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendsError, setFriendsError] = useState(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [startsAt, setStartsAt] = useState(null);
  const [endsAt, setEndsAt] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const toggleSelectFriend = (id) => {
    setSelectedFriendIds((prev) =>
      prev.includes(id)
        ? prev.filter((friendId) => friendId !== id)
        : [...prev, id]
    );
  };

  const loadFriends = useCallback(async () => {
    try {
      setLoadingFriends(true);
      setFriendsError(null);
      const list = await getFriends();
      setFriends(list);
    } catch (error) {
      console.error('שגיאה בשליפת חברים:', error);
      setFriends([]);
      setFriendsError('לא הצלחנו לטעון את רשימת החברים');
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useEffect(() => {
    if (isShared) {
      loadFriends();
      setShowFriendsModal(true);
    } else {
      setSelectedFriendIds([]);
      setShowFriendsModal(false);
    }
  }, [isShared, loadFriends]);

  const selectedFriends = useMemo(
    () => friends.filter((friend) => selectedFriendIds.includes(friend._id)),
    [friends, selectedFriendIds]
  );

  const handleAddEvent = async () => {
    if (!title.trim()) {
      Alert.alert('אנא הזן שם לאירוע לפני ההוספה');
      return;
    }

    if (isShared && selectedFriendIds.length === 0) {
      Alert.alert("בחר לפחות חבר אחד לאירוע המשותף או בטל את מצב 'אירוע משותף'");
      return;
    }

    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      Alert.alert('שגיאה', 'תאריך הסיום חייב להיות לאחר תאריך ההתחלה');
      return;
    }

    const payload = {
      title,
      color,
      shared: isShared,
      participants: isShared ? selectedFriendIds : [],
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,
    };

    try {
      await addEvent(payload);
      Alert.alert('אירוע חדש נוסף בהצלחה');
      navigation.navigate('Home', { refresh: true });
    } catch (error) {
      console.error('שגיאה בהוספת אירוע:', error);
      Alert.alert('אירעה שגיאה בעת הוספת האירוע. נסה שוב.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>הוספת אירוע חדש</Text>

      <Text style={styles.label}>שם האירוע:</Text>
      <TextInput
        style={styles.input}
        placeholder="הכנס שם אירוע"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>בחר צבע:</Text>
      <View style={styles.colorPickerWrapper}>
        <WheelColorPicker
          color={color}
          onColorChangeComplete={setColor}
          style={styles.colorPicker}
        />
      </View>

      <Text style={styles.label}>תצוגת צבע נבחר:</Text>
      <View style={[styles.colorPreview, { backgroundColor: color }]} />

      <View style={styles.sharedRow}>
        <TouchableOpacity
          style={[styles.sharedBtn, isShared && styles.sharedBtnActive]}
          onPress={() => setIsShared((prev) => !prev)}
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
        <View style={styles.friendsSummary}>
          {loadingFriends ? (
            <ActivityIndicator size="small" color="#3DD6D0" />
          ) : friendsError ? (
            <Text style={styles.errorText}>{friendsError}</Text>
          ) : selectedFriends.length === 0 ? (
            <Text style={styles.noteText}>טרם נבחרו חברים.</Text>
          ) : (
            <View style={styles.selectedFriendsList}>
              {selectedFriends.map((friend) => (
                <View key={friend._id} style={styles.friendChip}>
                  <Text style={styles.friendChipText}>{friend.username}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.selectFriendsBtn}
            onPress={() => setShowFriendsModal(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.selectFriendsBtnText}>נהל משתתפים</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.dateRow}>
        <View style={styles.dateColumn}>
          <Text style={styles.label}>תאריך התחלה</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowStartPicker(true)}
          >
            <Text style={styles.dateBtnText}>
              {startsAt ? new Date(startsAt).toLocaleString() : 'בחר תאריך התחלה'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.dateColumn}>
          <Text style={styles.label}>תאריך סיום</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowEndPicker(true)}
          >
            <Text style={styles.dateBtnText}>
              {endsAt ? new Date(endsAt).toLocaleString() : 'בחר תאריך סיום'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.buttonWrapper}>
        <Button title="➕ הוסף אירוע" onPress={handleAddEvent} />
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startsAt ? new Date(startsAt) : new Date()}
          mode="datetime"
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) setStartsAt(date.toISOString());
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endsAt ? new Date(endsAt) : new Date()}
          mode="datetime"
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) setEndsAt(date.toISOString());
          }}
        />
      )}

      <Modal
        visible={showFriendsModal}
        animationType="slide"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>בחר חברים לשיתוף</Text>
          {loadingFriends ? (
            <ActivityIndicator size="large" color="#3DD6D0" />
          ) : (
            <FlatList
              data={friends}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const checked = selectedFriendIds.includes(item._id);
                return (
                  <TouchableOpacity
                    style={styles.friendRow}
                    onPress={() => toggleSelectFriend(item._id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.friendInfo}>
                      <Text style={styles.friendName}>{item.username}</Text>
                      <Text style={styles.friendCode}>קוד: {item.friendCode}</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={(
                <Text style={styles.noteText}>
                  {friendsError || 'לא נמצאו חברים מאושרים עדיין.'}
                </Text>
              )}
            />
          )}
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setShowFriendsModal(false)}
          >
            <Text style={styles.modalCloseBtnText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
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
  sharedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  sharedBtn: {
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
  sharedBtnText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  sharedBtnTextActive: {
    color: '#0b69ff',
  },
  selectedChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#eef6ff',
  },
  selectedChipText: {
    fontSize: 14,
    color: '#0b69ff',
    fontWeight: '600',
  },
  friendsSummary: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  errorText: {
    color: '#d9534f',
    textAlign: 'center',
  },
  noteText: {
    color: '#666',
    textAlign: 'center',
  },
  selectedFriendsList: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  friendChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#3DD6D0',
  },
  friendChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  selectFriendsBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#3DD6D0',
  },
  selectFriendsBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 20,
  },
  dateColumn: {
    flex: 1,
  },
  dateBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f7f7f7',
    alignItems: 'center',
  },
  dateBtnText: {
    fontSize: 14,
    color: '#333',
  },
  buttonWrapper: {
    marginTop: 20,
    marginBottom: 60,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  friendRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3DD6D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxChecked: {
    backgroundColor: '#3DD6D0',
  },
  checkmark: {
    color: '#fff',
    fontWeight: '700',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendCode: {
    fontSize: 13,
    color: '#777',
  },
  modalCloseBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3DD6D0',
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
