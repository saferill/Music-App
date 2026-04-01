import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  Image, 
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayerStore } from '../store/playerStore';
import { searchInnerTube } from '../lib/innertube';

const HomeScreen = () => {
  const [trending, setTrending] = useState([]);
  const { playTrack } = usePlayerStore();

  useEffect(() => {
    // Fetch some initial content
    const fetchHomeContent = async () => {
      try {
        const data = await searchInnerTube('Trending Hits');
        if (data.contents?.sectionListRenderer?.contents) {
          const musicShelf = data.contents.sectionListRenderer.contents
            .find(c => c.musicShelfRenderer)?.musicShelfRenderer;
          
          if (musicShelf && musicShelf.contents) {
            const tracks = musicShelf.contents.slice(0, 10).map(c => {
              const tr = c.musicResponsiveListItemRenderer;
              if (!tr) return null;
              return {
                videoId: tr.navigationEndpoint.watchEndpoint.videoId,
                name: tr.flexColumns[0].musicResponsiveListItemFlexColumnRenderer.text.runs[0].text,
                artist: { name: tr.flexColumns[1].musicResponsiveListItemFlexColumnRenderer.text.runs[2]?.text || 'Unknown' },
                thumbnails: tr.thumbnail.musicThumbnailRenderer.thumbnail.thumbnails,
              };
            }).filter(Boolean);
            setTrending(tracks);
          }
        }
      } catch (e) {
        console.error('Home fetch failed', e);
      }
    };
    fetchHomeContent();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Evening</Text>
          <Text style={styles.subtitle}>Discover something new</Text>
        </View>

        {/* Quick Picks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Picks</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalList}>
            {trending.map((item) => (
              <TouchableOpacity 
                key={item.videoId} 
                style={styles.card}
                onPress={() => playTrack(item, trending)}
              >
                <Image 
                  source={{ uri: item.thumbnails[item.thumbnails.length - 1]?.url }} 
                  style={styles.cardCover} 
                />
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardArtist} numberOfLines={1}>
                   {Array.isArray(item.artist) ? item.artist[0].name : item.artist.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Discovery Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fresh For You</Text>
          <View style={styles.grid}>
            {trending.slice(4, 8).map((item) => (
              <TouchableOpacity 
                key={item.videoId + '_grid'} 
                style={styles.gridItem}
                onPress={() => playTrack(item, trending)}
              >
                <LinearGradient
                  colors={['#222', '#111']}
                  style={styles.gridItemInner}
                >
                  <Image 
                    source={{ uri: item.thumbnails[0]?.url }} 
                    style={styles.gridThumb} 
                  />
                  <Text style={styles.gridTitle} numberOfLines={1}>{item.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  greeting: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginTop: 4,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 16,
  },
  horizontalList: {
    paddingLeft: 20,
  },
  card: {
    marginRight: 16,
    width: 160,
  },
  cardCover: {
    width: 160,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#111',
  },
  cardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  cardArtist: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  grid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 16,
  },
  gridItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#111',
  },
  gridThumb: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  gridTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 10,
    flex: 1,
  },
});

export default HomeScreen;
