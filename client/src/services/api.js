import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: 'http://192.168.9.175:4000',
});

// Interceptor – הוספת Authorization Header אוטומטית
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


// ========== פעולות על אירועים ==========
export const getEvents = async () => {
  const res = await api.get('/api/events');
  return res.data;
};

export const addEvent = async (newEvent) => {
  const res = await api.post('/api/events', newEvent);
  return res.data;
};

export const updateEvent = async (id, updatedEvent) => {
  const res = await api.put(`/api/events/${id}`, updatedEvent);
  return res.data;
};

export const deleteEvent = async (id) => {
  const res = await api.delete(`/api/events/${id}`);
  return res.data;
};

export const deleteEventAndLogs = async (eventId) => {
  const res = await api.delete(`/api/eventsWithLogs/${eventId}`);
  return res.data;
};

// ========== פעולות על תיעודים ==========
export const getLogs = async () => {
  const res = await api.get('/api/logs');
  return res.data;
};

export const addLog = async (newLog) => {
  const res = await api.post('/api/logs', newLog);
  return res.data;
};

export const deleteLog = async (logId) => {
  const res = await api.delete(`/api/logs/${logId}`);
  return res.data;
};

export default api;

