import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Search, X } from 'lucide-react-native';
import { searchInnerTube } from '../lib/innertube';
import { usePlayerStore } from '../store/playerStore';
import TrackRow from '../components/TrackRow';

const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { playTrack } = usePlayerStore();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchInnerTube(query);
      if (data.contents?.sectionListRenderer?.contents) {
        const musicShelf = data.contents.sectionListRenderer.contents
          .find(c => c.musicShelfRenderer)?.musicShelfRenderer;
        
        if (musicShelf && musicShelf.contents) {
          const tracks = musicShelf.contents.map(c => {
            const tr = c.musicResponsiveListItemRenderer;
            if (!tr) return null;
            return {
              videoId: tr.navigationEndpoint.watchEndpoint.videoId,
              name: tr.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
              artist: { name: tr.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs[2]?.text || 'Unknown' },
              thumbnails: tr.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails,
            };
          }).filter(Boolean);
          setResults(tracks);
        }
      }
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Search color="#888" size={20} />
          <TextInput
            style={styles.input}
            placeholder="Songs, artists, or albums"
            placeholderTextColor="#888"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            autoFocus
          />
          {query.length > 0 && (
            <X color="#888" size={20} onPress={clearSearch} />
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#1db954" size="large" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.videoId}
          renderItem={({ item }) => (
            <TrackRow 
              track={item} 
              onPress={() => playTrack(item, results)} 
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {query.trim() ? "No results found" : "Explore millions of tracks"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
  },
  input: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#444',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default SearchScreen;
