import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Modal, 
  SafeAreaView,
  Dimensions
} from 'react-native';
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Shuffle, 
  Repeat, 
  Heart 
} from 'lucide-react-native';
import { usePlayerStore } from '../store/playerStore';
import TrackPlayer, { useProgress, usePlaybackState, State } from 'react-native-track-player';
import { LinearGradient } from 'expo-linear-gradient';

const { height } = Dimensions.get('window');

const FullPlayer = ({ visible, onClose }) => {
  const { currentTrack, togglePlay, skipNext, skipPrev, isShuffled, toggleShuffle, repeatMode, setRepeatMode } = usePlayerStore();
  const playerState = usePlaybackState();
  const { position, duration } = useProgress();

  if (!currentTrack) return null;

  const isPlaying = playerState.state === State.Playing;
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const thumbnail = currentTrack.thumbnails?.[currentTrack.thumbnails.length - 1]?.url;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1a1a', '#000']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <ChevronDown color="#fff" size={32} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Now Playing</Text>
              <View style={{ width: 32 }} />
            </View>

            {/* Artwork */}
            <View style={styles.artworkContainer}>
              <Image source={{ uri: thumbnail }} style={styles.artwork} />
            </View>

            {/* Meta */}
            <View style={styles.metaContainer}>
              <View style={styles.titleWrapper}>
                <Text style={styles.title} numberOfLines={1}>{currentTrack.name}</Text>
                <Text style={styles.artist} numberOfLines={1}>
                  {Array.isArray(currentTrack.artist) ? currentTrack.artist[0].name : currentTrack.artist.name}
                </Text>
              </View>
              <TouchableOpacity>
                <Heart color="#fff" size={28} />
              </TouchableOpacity>
            </View>

            {/* Progress */}
            <View style={styles.progressContainer}>
              <View style={styles.progressRail}>
                <View style={[styles.progressCurrent, { width: `${progressPercent}%` }]} />
              </View>
              <View style={styles.timeWrapper}>
                <Text style={styles.timeText}>{formatTime(position)}</Text>
                <Text style={styles.timeText}>{formatTime(duration)}</Text>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity onPress={toggleShuffle}>
                <Shuffle color={isShuffled ? '#1db954' : '#fff'} size={24} />
              </TouchableOpacity>
              
              <View style={styles.mainControls}>
                <TouchableOpacity onPress={skipPrev}>
                  <SkipBack color="#fff" size={40} fill="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity onPress={togglePlay} style={styles.playButton}>
                  {isPlaying ? (
                    <Pause color="#000" size={48} fill="#000" />
                  ) : (
                    <Play color="#000" size={48} fill="#000" />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity onPress={skipNext}>
                  <SkipForward color="#fff" size={40} fill="#fff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setRepeatMode(repeatMode === 'all' ? 'none' : 'all')}>
                <Repeat color={repeatMode !== 'none' ? '#1db954' : '#fff'} size={24} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  artworkContainer: {
    marginTop: 40,
    width: '100%',
    aspectRatio: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  artwork: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  metaContainer: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  artist: {
    color: '#aaa',
    fontSize: 18,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: 30,
  },
  progressRail: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
  },
  progressCurrent: {
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  timeWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeText: {
    color: '#888',
    fontSize: 12,
  },
  controlsContainer: {
    marginTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 0.8,
    justifyContent: 'space-between',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default FullPlayer;
