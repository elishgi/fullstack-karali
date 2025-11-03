// ../navigation/AppNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/HomeScreen';
import AddEventScreen from '../screens/AddEventScreen';
import LogsScreen from '../screens/LogsScreen';
import AddDetailedLogScreen from '../screens/AddDetailedLogScreen';
import SignUpScreen from '../screens/SignUpScreen';
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AddEvent" component={AddEventScreen} />
        <Stack.Screen name="Logs" component={LogsScreen} />
        <Stack.Screen name="AddDetailedLog" component={AddDetailedLogScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

