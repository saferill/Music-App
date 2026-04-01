import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Play, Pause, SkipForward } from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import TrackPlayer, { useProgress, usePlaybackState, State } from 'react-native-track-player';
import FullPlayer from './FullPlayer';

const MiniPlayer = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { currentTrack, togglePlay, skipNext } = usePlayerStore();
  const playerState = usePlaybackState();
  const { position, duration } = useProgress();

  if (!currentTrack) return null;

  const isPlaying = playerState.state === State.Playing;
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  
  const thumbnail = currentTrack.thumbnails?.[0]?.url;

  return (
    <>
      <TouchableOpacity 
        style={styles.container} 
        activeOpacity={0.9} 
        onPress={() => setModalVisible(true)}
      >
        {/* Progress Bar */}
        <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        
        <View style={styles.content}>
          <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
          <View style={styles.details}>
            <Text style={styles.name} numberOfLines={1}>{currentTrack.name}</Text>
            <Text style={styles.artist} numberOfLines={1}>
              {Array.isArray(currentTrack.artist) ? currentTrack.artist[0].name : currentTrack.artist.name}
            </Text>
          </View>
          
          <View style={styles.controls}>
            <TouchableOpacity onPress={togglePlay} style={styles.button}>
              {isPlaying ? (
                <Pause color="#fff" size={32} fill="#fff" />
              ) : (
                <Play color="#fff" size={32} fill="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={skipNext} style={styles.button}>
              <SkipForward color="#fff" size={28} fill="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>

      <FullPlayer 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 80,
    backgroundColor: '#111',
    borderTopWidth: 0.5,
    borderTopColor: '#333',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  progressBar: {
    height: 2,
    backgroundColor: '#1db954',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    flex: 1,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  details: {
    marginLeft: 12,
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  artist: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    padding: 8,
  },
});

export default MiniPlayer;
