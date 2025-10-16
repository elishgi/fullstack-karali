import React, { createContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { name, email, ... }
  const [token, setToken] = useState('');      // JWT
  const [loading, setLoading] = useState(true);

  // טוען משתמש וטוקן מהאחסון בעת פתיחת האפליקציה
  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (identifier, password) => {
    const res = await api.post('/api/users/login', { identifier, password });
    await AsyncStorage.setItem('token', res.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(['token', 'user']);
    setToken('');
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isLoggedIn: !!token && !!user,
    login,
    logout,
    setUser, // במידה ונרצה לעדכן שם תצוגה וכד'
  }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
