import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ImageBackground,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { resetPassword as resetPasswordRequest } from '../services/api';

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialToken = route.params?.token || '';
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token.trim()) {
      Alert.alert('שגיאה', 'אסימון איפוס הסיסמה חסר. בדוק את הקישור שנשלח אליך.');
      return;
    }

    if (password.length < 6 || !/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
      Alert.alert('שגיאה', 'הסיסמה חייבת להיות באורך של 6 תווים לפחות ולכלול אות ומספר.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('שגיאה', 'הסיסמאות אינן תואמות.');
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordRequest(token.trim(), password);
      Alert.alert('הצלחה', res.message || 'הסיסמה עודכנה בהצלחה.', [
        { text: 'התחבר', onPress: () => navigation.replace('Login') },
      ]);
    } catch (err) {
      Alert.alert('שגיאה', err.response?.data?.message || 'לא ניתן היה לאפס את הסיסמה.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require('C:/Users/User/fullstack-karali/client/assets/images/backgroundCool.png')}
      style={styles.background}
    >
      <View style={styles.overlayBox}>
        <Text style={styles.title}>הגדרת סיסמה חדשה</Text>

        <TextInput
          placeholder="אסימון איפוס"
          value={token}
          onChangeText={setToken}
          style={styles.input}
          autoCapitalize="none"
          textAlign="right"
          placeholderTextColor="#999"
        />

        <TextInput
          placeholder="סיסמה חדשה"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          secureTextEntry
          textAlign="right"
          placeholderTextColor="#999"
        />

        <TextInput
          placeholder="אימות סיסמה"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          style={styles.input}
          secureTextEntry
          textAlign="right"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'מעבד...' : 'אפס סיסמה'}</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          חזרה למסך התחברות
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 26,
    borderRadius: 18,
    width: '85%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 15,
    borderRadius: 6,
    width: '100%',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3DD6D0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  link: {
    color: '#A68CF1',
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
  },
});
