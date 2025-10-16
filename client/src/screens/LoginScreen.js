
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const checkLogin = async () => {
      const token = await AsyncStorage.getItem('token');
      const user = await AsyncStorage.getItem('user');
      if (token && user) {
        navigation.replace('Home');
      }
    };
    checkLogin();
  }, []);

  const handleLogin = async () => {
    try {
      const res = await api.post('/api/users/login', { identifier, password });
      await AsyncStorage.setItem('token', res.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('שגיאה', err.response?.data?.message || 'לא ניתן להתחבר. נסה שוב מאוחר יותר.');
    }
  };


  return (
    <ImageBackground
      source={require('../../client/assets/images/backgroundCool.png')}
      style={styles.background}
    >
      <View style={styles.overlayBox}>
        <Image source={require('../../assets/images/logo1.png')} style={styles.logo} />
        <Text style={styles.title}>התחברות</Text>

        <TextInput
          placeholder="אימייל או שם משתמש"
          style={styles.input}
          value={identifier}
          onChangeText={setIdentifier}
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

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>התחבר</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
          חדש אצלנו ? הרשם
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
    width: '100%',
    height: 250,
    marginBottom: -50,
    marginTop: -50,
    resizeMode: 'contain',
    alignSelf: 'center',
  },

  title: {
    fontSize: 25,
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
    marginBottom: 15,
    borderRadius: 6,
    width: '100%',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3DD6D0',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    marginTop: 15,
    color: '#A68CF1',
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
