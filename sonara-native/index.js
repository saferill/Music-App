import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { PlaybackService } from './src/services/TrackPlayerService';

// Register the service once
TrackPlayer.registerPlaybackService(() => PlaybackService);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App);
