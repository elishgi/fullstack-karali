import AsyncStorage from '@react-native-async-storage/async-storage';

export const AUTH_TOKEN_KEY = 'token';
export const AUTH_USER_KEY = 'user';

export const isValidStoredUser = (user) => Boolean(
  user
  && typeof user === 'object'
  && typeof user.name === 'string'
  && user.name.trim().length > 0
);

export const clearAuthStorage = () => AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);

export const getStoredAuth = async () => {
  const [token, userData] = await Promise.all([
    AsyncStorage.getItem(AUTH_TOKEN_KEY),
    AsyncStorage.getItem(AUTH_USER_KEY),
  ]);

  if (!token || !userData) {
    return { token, user: null, isValid: false };
  }

  try {
    const user = JSON.parse(userData);
    return { token, user, isValid: isValidStoredUser(user) };
  } catch (error) {
    return { token, user: null, isValid: false };
  }
};

export const saveAuthStorage = async ({ token, user }) => {
  if (!token || !isValidStoredUser(user)) {
    throw new Error('Invalid auth payload');
  }

  await Promise.all([
    AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
    AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(user)),
  ]);
};
