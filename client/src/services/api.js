import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000', // fallback לאמולטור
});


api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));


export const getEvents = async () => (await api.get('/api/events')).data;
export const addEvent = async (newEvent) => (await api.post('/api/events', newEvent)).data;
export const updateEvent = async (id, updatedEvent) => (await api.put(`/api/events/${id}`, updatedEvent)).data;
export const deleteEvent = async (id) => (await api.delete(`/api/events/${id}`)).data;
export const deleteEventAndLogs = async (eventId) => (await api.delete(`/api/eventsWithLogs/${eventId}`)).data;

export const getLogs = async () => (await api.get('/api/logs')).data;
export const addLog = async (newLog) => (await api.post('/api/logs', newLog)).data;
export const deleteLog = async (logId) => (await api.delete(`/api/logs/${logId}`)).data;

export default api;
