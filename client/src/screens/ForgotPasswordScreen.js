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
import { useNavigation } from '@react-navigation/native';
import { requestPasswordReset } from '../services/api';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('שגיאה', 'אנא הזן כתובת אימייל.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordReset(trimmedEmail);
      Alert.alert(
        'בדוק את תיבת הדואר',
        res.message || 'אם קיים חשבון עם כתובת האימייל שסיפקת, שלחנו הוראות לאיפוס הסיסמה.',
        [
          {
            text: 'המשך',
            onPress: () => navigation.navigate('ResetPassword'),
          },
        ],
      );
    } catch (err) {
      Alert.alert('שגיאה', err.response?.data?.message || 'לא ניתן היה לשלוח קישור לאיפוס סיסמה.');
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
        <Text style={styles.title}>שחזור סיסמה</Text>
        <Text style={styles.description}>
          הזן את כתובת האימייל שלך ונשלח אליך קישור להגדיר סיסמה חדשה.
        </Text>

        <TextInput
          placeholder="האימייל שלך"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          textAlign="right"
          placeholderTextColor="#999"
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'שולח...' : 'שלח קישור'}</Text>
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
    marginBottom: 12,
    color: '#333',
    writingDirection: 'rtl',
  },
  description: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 20,
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
