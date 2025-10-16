import React from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from '../src/context/AuthContext';
import { EventsProvider } from './src/context/EventsContext';

// מעביר את הניהול ל־AppNavigator + עוטף ב־Context Providers
export default function App() {
  return (
    <AuthProvider>
      <EventsProvider>
        <AppNavigator />
      </EventsProvider>
    </AuthProvider>
  );
}
