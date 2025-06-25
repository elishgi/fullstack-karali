import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { addEvent } from '../services/api';
import WheelColorPicker from 'react-native-wheel-color-picker';

export default function AddEventScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#000000');

  const handleAddEvent = async () => {
    if (!name.trim()) {
      Alert.alert('יש להזין שם לאירוע');
      return;
    }

    const newEvent = {
      name,
      color,
      totalColor: 0,
    };

    try {
      await addEvent(newEvent);
      Alert.alert('אירוע חדש נוסף בהצלחה');
      navigation.navigate('Home', { refresh: true });
    } catch (error) {
      console.error('Error adding event:', error);
      Alert.alert('שגיאה בהוספת אירוע');
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
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonWrapper: {
    marginBottom: 50,
  },
});

