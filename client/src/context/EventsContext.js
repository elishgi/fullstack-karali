import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

export const EventsContext = createContext();

export function EventsProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const refreshEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { data } = await api.get('/api/events');
      setEvents(data);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  const addEvent = useCallback(async (newEvent) => {
    const { data } = await api.post('/api/events', newEvent);
    setEvents(prev => [data, ...prev]);
    return data;
  }, []);

  const updateEventById = useCallback(async (id, payload) => {
    const { data } = await api.put(`/api/events/${id}`, payload);
    setEvents(prev => prev.map(e => (e._id === id ? data : e)));
    return data;
  }, []);

  const deleteEventById = useCallback(async (id) => {
    await api.delete(`/api/events/${id}`);
    setEvents(prev => prev.filter(e => e._id !== id));
  }, []);

  const deleteEventAndLogs = useCallback(async (eventId) => {
    await api.delete(`/api/eventsWithLogs/${eventId}`);
    setEvents(prev => prev.filter(e => e._id !== eventId));
  }, []);

  useEffect(() => {
    refreshEvents();
  }, [refreshEvents]);

  const value = useMemo(() => ({
    events,
    eventsLoading,
    refreshEvents,
    addEvent,
    updateEventById,
    deleteEventById,
    deleteEventAndLogs,
  }), [events, eventsLoading, refreshEvents, addEvent, updateEventById, deleteEventById, deleteEventAndLogs]);

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}
