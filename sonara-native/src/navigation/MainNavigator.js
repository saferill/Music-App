import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Search, Library } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

const LibraryPlaceholder = () => (
  <View style={styles.center}>
    <Text style={styles.text}>Your Library will appear here</Text>
  </View>
);

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: '#1db954',
        tabBarInactiveTintColor: '#888',
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Library" 
        component={LibraryPlaceholder} 
        options={{
          tabBarIcon: ({ color, size }) => <Library color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  }
});
