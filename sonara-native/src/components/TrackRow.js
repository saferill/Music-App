import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

const TrackRow = ({ track, onPress }) => {
  const thumbnail = track.thumbnails?.[0]?.url;
  const artistName = Array.isArray(track.artist) 
    ? track.artist.map(a => a.name).join(', ') 
    : track.artist?.name || 'Unknown Artist';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>{track.name}</Text>
        <Text style={styles.artist} numberOfLines={1}>{artistName}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  details: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  artist: {
    color: '#aaa',
    fontSize: 14,
    marginTop: 4,
  },
});

export default TrackRow;
