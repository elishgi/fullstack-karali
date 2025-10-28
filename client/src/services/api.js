import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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
export const markEventExpirationNotified = async (id) => (await api.post(`/api/events/${id}/mark-expiration-notified`)).data;
export const getEventSummary = async (id) => (await api.get(`/api/events/${id}/summary`)).data;
export const getTemporaryEventsOverview = async () => (await api.get('/api/events/temporary-overview')).data;
export const restartEvent = async (id, payload) => (await api.post(`/api/events/${id}/restart`, payload)).data;
export const archiveEvent = async (id) => (await api.post(`/api/events/${id}/archive`)).data;

export const getLogs = async () => (await api.get('/api/logs')).data;
export const addLog = async (newLog) => (await api.post('/api/logs', newLog)).data;
export const deleteLog = async (logId) => (await api.delete(`/api/logs/${logId}`)).data;
export const deleteAccount = async () => (await api.delete('/api/users/account')).data;
export const resetAccount = async () => (await api.post('/api/users/account/reset')).data;
export const updateCurrentUser = async (updates) => {
  try {
    const response = await api.put('/api/users/me', updates);
    return response.data.user;
  } catch (error) {
    if (error?.response?.status === 404) {
      const fallbackResponse = await api.put('/api/users/account', updates);
      return fallbackResponse.data.user;
    }
    throw error;
  }
};

export default api;
