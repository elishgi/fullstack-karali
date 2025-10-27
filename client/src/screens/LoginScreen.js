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
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import api, { loginWithGoogle } from '../services/api';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

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

  useEffect(() => {
    const completeGoogleLogin = async () => {
      if (response?.type === 'success') {
        const idToken = response.params?.id_token;
        if (idToken) {
          await handleGoogleSignIn(idToken);
        }
      }
    };

    completeGoogleLogin();
  }, [response]);

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

  const handleGoogleSignIn = async (idToken) => {
    try {
      const res = await loginWithGoogle(idToken);
      await AsyncStorage.setItem('token', res.token);
      await AsyncStorage.setItem('user', JSON.stringify(res.user));
      navigation.replace('Home');
    } catch (err) {
      console.error('Google login error:', err);
      Alert.alert('שגיאה', err.response?.data?.message || 'לא ניתן להתחבר באמצעות Google כעת. נסה שוב מאוחר יותר.');
    }
  };

  const startGoogleFlow = () => {
    if (!request) {
      Alert.alert('שגיאה', 'התחברות באמצעות Google אינה זמינה כרגע.');
      return;
    }
    promptAsync();
  };

  return (
    <ImageBackground
      source={require('C:/Users/User/fullstack-karali/client/assets/images/backgroundCool.png')}
      style={styles.background}
    >
      <View style={styles.overlayBox}>
        <Image source={require('C:/Users/User/fullstack-karali/client/assets/images/logo1.png')} style={styles.logo} />
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

        {/* שדה סיסמה עם עין */}
        <View style={styles.passwordWrap}>
          <TextInput
            placeholder="סיסמה"
            style={[styles.input, { paddingRight: 42, marginBottom: 4 }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            textAlign="right"
            autoCapitalize="none"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityLabel={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#666" />
          </TouchableOpacity>
        </View>

        {/* הערת אזהרה קטנה מתחת לסיסמה */}
        <Text style={styles.passwordNote}>יש לשים לב לאותיות קטנות וגדולות</Text>

        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>התחבר</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={startGoogleFlow}
          disabled={!request}
        >
          <Text style={[styles.buttonText, styles.googleButtonText]}>התחבר עם Google</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => navigation.navigate('SignUp')}>
          חדש אצלנו ? הרשם
        </Text>

        <Text style={styles.secondaryLink} onPress={() => navigation.navigate('ForgotPassword')}>
          שכחת סיסמה?
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
  passwordWrap: {
    width: '100%',
    position: 'relative',
  },
  eyeBtn: {
    position: 'absolute',
    right: 10,
    top: 10,
    height: 30,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordNote: {
    width: '100%',
    textAlign: 'right',
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    marginTop: -2,
  },
  button: {
    backgroundColor: '#3DD6D0',
    padding: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4285F4',
  },
  googleButtonText: {
    color: '#4285F4',
  },
  link: {
    marginTop: 15,
    color: '#A68CF1',
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  secondaryLink: {
    marginTop: 10,
    color: '#333',
    textDecorationLine: 'underline',
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
