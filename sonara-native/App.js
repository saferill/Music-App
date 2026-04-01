import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { View, StyleSheet, StatusBar } from 'react-native';
import MainNavigator from './src/navigation/MainNavigator';
import MiniPlayer from './src/components/MiniPlayer';
import { setupPlayer } from './src/services/TrackPlayerService';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  useEffect(() => {
    setupPlayer();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer theme={DarkTheme}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />
          
          {/* Main App Navigation */}
          <MainNavigator />

          {/* Persistent Player UI */}
          <MiniPlayer />
        </View>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
