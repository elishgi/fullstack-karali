import axios from 'axios';

const api = axios.create({
  baseURL: 'http://192.168.1.112:4000',
});


export const getEvents = async () => {
  try {
    const response = await api.get('/api/events');
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw error;
  }
};

export const addEvent = async (newEvent) => {
  try {
    const response = await api.post('/api/events', newEvent);
    return response.data;
  } catch (error) {
    console.error('Error adding event:', error);
    throw error;
  }
};

export const updateEvent = async (id, updatedEvent) => {
  try {
    const response = await api.put(`/api/events/${id}`, updatedEvent);
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    throw error;
  }
};

export const deleteEvent = async (id) => {
  try {
    const response = await api.delete(`/api/events/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting event:', error);
    throw error;
  }
};

export const deleteEventAndLogs = async (eventId) => {
  try {
    const response = await api.delete(`/api/eventsWithLogs/${eventId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting event with logs:', error);
    throw error;
  }
};


export const getLogs = async () => {
  try {
    const response = await api.get('/api/logs');
    return response.data;
  } catch (error) {
    console.error('Error fetching logs:', error);
    throw error;
  }
};

export const addLog = async (newLog) => {
  try {
    const response = await api.post('/api/logs', newLog);
    return response.data;
  } catch (error) {
    console.error('Error adding log:', error);
    throw error;
  }
};

export const deleteLog = async (logId) => {
  try {
    const response = await api.delete(`/api/logs/${logId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting log:', error);
    throw error;
  }
};


export default api;
