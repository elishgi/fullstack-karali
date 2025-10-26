import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:4000',
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    // eslint-disable-next-line no-param-reassign
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const getEvents = async (scope = 'all') => (
  await api.get('/api/events', { params: scope === 'all' ? {} : { scope } })
).data;

export const addEvent = async (newEvent) => (
  await api.post('/api/events', newEvent)
).data;

export const updateEvent = async (id, updatedEvent) => (
  await api.put(`/api/events/${id}`, updatedEvent)
).data;

export const updateEventParticipants = async (id, participants) => (
  await api.patch(`/api/events/${id}/participants`, { participants })
).data;

export const deleteEvent = async (id) => (
  await api.delete(`/api/events/${id}`)
).data;

export const deleteEventAndLogs = async (eventId) => (
  await api.delete(`/api/eventsWithLogs/${eventId}`)
).data;

export const getEventNames = async () => (
  await api.get('/api/events/names')
).data;

export const getLogs = async (params = {}) => (
  await api.get('/api/logs', { params })
).data;

export const addLog = async (newLog) => (
  await api.post('/api/logs', newLog)
).data;

export const deleteLog = async (logId) => (
  await api.delete(`/api/logs/${logId}`)
).data;

export const searchUsers = async (query) => (
  await api.get('/api/users/search', { params: { query } })
).data;

export const sendFriendRequest = async (payload) => (
  await api.post('/api/friends/requests', payload)
).data;

export const getFriendRequests = async (direction) => (
  await api.get('/api/friends/requests', { params: direction ? { direction } : {} })
).data;

export const respondToFriendRequest = async (id, status) => (
  await api.patch(`/api/friends/requests/${id}`, { status })
).data;

export const getFriends = async () => (
  await api.get('/api/friends')
).data;

export const getNotifications = async () => (
  await api.get('/api/notifications')
).data;

export const markNotificationRead = async (id) => (
  await api.patch(`/api/notifications/${id}/read`)
).data;

export default api;
