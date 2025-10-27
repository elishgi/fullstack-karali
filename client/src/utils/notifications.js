import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTIF_KEY = 'notifications';
export const NOTIF_UNREAD_KEY = 'notifications_unread_count';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

export const loadNotificationsFromStorage = async () => {
  try {
    const raw = await AsyncStorage.getItem(NOTIF_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return ensureArray(parsed);
  } catch (error) {
    console.warn('loadNotificationsFromStorage error', error);
    return [];
  }
};

export const saveNotificationsToStorage = async (list) => {
  const normalized = ensureArray(list);
  await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(normalized));
  const unread = normalized.filter((item) => !item.read).length;
  await AsyncStorage.setItem(NOTIF_UNREAD_KEY, String(unread));
  return normalized;
};

const buildNotification = (data) => {
  const nowIso = new Date().toISOString();
  return {
    id: data?.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: data?.title || '',
    body: data?.body || '',
    createdAt: data?.createdAt || nowIso,
    read: data?.read ?? false,
    starred: data?.starred ?? false,
    ...('metadata' in (data || {}) ? { metadata: data.metadata } : {}),
  };
};

export const appendNotificationToStorage = async (notification) => {
  const current = await loadNotificationsFromStorage();
  const prepared = buildNotification({ ...notification, read: false });
  const next = [prepared, ...current];
  await saveNotificationsToStorage(next);
  return prepared;
};

export const removeNotificationFromStorage = async (notificationId) => {
  const current = await loadNotificationsFromStorage();
  const next = current.filter((item) => item.id !== notificationId);
  await saveNotificationsToStorage(next);
  return next;
};

export const markNotificationAsReadInStorage = async (notificationId) => {
  const current = await loadNotificationsFromStorage();
  const next = current.map((item) =>
    item.id === notificationId ? { ...item, read: true } : item
  );
  await saveNotificationsToStorage(next);
  return next;
};

export const markAllNotificationsReadInStorage = async () => {
  const current = await loadNotificationsFromStorage();
  const next = current.map((item) => ({ ...item, read: true }));
  await saveNotificationsToStorage(next);
  return next;
};
