
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const isValidEmail = (email) => {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const isStrongPassword = (pw) => {
    return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(pw);
  };

  const handleSignUp = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('שגיאה', 'אנא מלא את כל השדות');
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert('שגיאה', 'אנא הזן כתובת אימייל תקינה');
      return;
    }

    if (!isStrongPassword(password)) {
      Alert.alert('שגיאה', 'הסיסמה חלשה – יש להזין לפחות 6 תווים, כולל אות אחת ומספר אחד');
      return;
    }

    try {
      const res = await api.post('/api/users/signup', { name, email, password });
      Alert.alert('נרשמת בהצלחה! תוכל כעת להתחבר למערכת.', [
        { text: 'אישור', onPress: () => navigation.replace('Login') },
      ]);
    } catch (err) {
      Alert.alert('שגיאה', err.response?.data?.message || err.message || 'לא ניתן להירשם כעת. נסה שוב מאוחר יותר.');
    }
  };

  return (
    <ImageBackground source={require('C:/Users/User/fullstack-karali/client/assets/images/background4.png')} style={styles.background}>
      <View style={styles.overlayBox}>
        <Image source={require('C:/Users/User/fullstack-karali/client/assets/images/logo1.png')} style={styles.logo} />
        <Text style={styles.title}>הרשמה</Text>

        <TextInput
          placeholder="שם"
          style={styles.input}
          value={name}
          onChangeText={setName}
          textAlign="right"
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="אימייל"
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          textAlign="right"
          placeholderTextColor="#999"
        />
        <TextInput
          placeholder="סיסמה"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textAlign="right"
          placeholderTextColor="#999"
        />
        <Text style={styles.passwordNote}>לפחות 6 תווים, כולל אות אחת ומספר אחד</Text>

        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>צור חשבון</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => navigation.navigate('Login')}>
          כבר יש לך חשבון? התחבר
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 30,
    borderRadius: 20,
    width: '85%',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: -50,
    marginTop: -50,
    resizeMode: 'contain',
    alignSelf: 'center',
  },
  title: {
    fontSize: 26,
    marginBottom: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
    width: '100%',
    fontSize: 16,
  },
  passwordNote: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    alignSelf: 'flex-start',
    writingDirection: 'rtl',
  },
  button: {
    backgroundColor: '#3DD6D0',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginTop: 5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    marginTop: 18,
    color: '#A68CF1',
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
