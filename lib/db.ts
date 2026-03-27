import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Track } from './store';

export interface SubscribedArtist {
  artistId: string;
  name: string;
  thumbnails: { url: string; width: number; height: number }[];
  subscribedAt: number;
}

export interface RecentSearch {
  query: string;
  timestamp: number;
}

interface SannMusicDB extends DBSchema {
  playlists: {
    key: string;
    value: {
      id: string;
      name: string;
      img: string;
      tracks: Track[];
    };
  };
  liked_songs: {
    key: string;
    value: Track;
  };
  subscribed_artists: {
    key: string;
    value: SubscribedArtist;
  };
  recent_searches: {
    key: string;
    value: RecentSearch;
  };
}

let dbPromise: Promise<IDBPDatabase<SannMusicDB>>;

if (typeof window !== 'undefined') {
  dbPromise = openDB<SannMusicDB>('SannMusicDB', 3, {
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('liked_songs')) {
        db.createObjectStore('liked_songs', { keyPath: 'videoId' });
      }
      if (!db.objectStoreNames.contains('subscribed_artists')) {
        db.createObjectStore('subscribed_artists', { keyPath: 'artistId' });
      }
      if (!db.objectStoreNames.contains('recent_searches')) {
        db.createObjectStore('recent_searches', { keyPath: 'query' });
      }
    },
  });
}

export const db = {
  async getPlaylists() {
    const db = await dbPromise;
    return db.getAll('playlists');
  },
  async addPlaylist(playlist: { id: string; name: string; img: string; tracks: Track[] }) {
    const db = await dbPromise;
    return db.put('playlists', playlist);
  },
  async getPlaylist(id: string) {
    const db = await dbPromise;
    return db.get('playlists', id);
  },
  async deletePlaylist(id: string) {
    const db = await dbPromise;
    return db.delete('playlists', id);
  },
  async getLikedSongs() {
    const db = await dbPromise;
    return db.getAll('liked_songs');
  },
  async addLikedSong(track: Track) {
    const db = await dbPromise;
    return db.put('liked_songs', track);
  },
  async removeLikedSong(videoId: string) {
    const db = await dbPromise;
    return db.delete('liked_songs', videoId);
  },
  async isLiked(videoId: string) {
    const db = await dbPromise;
    const song = await db.get('liked_songs', videoId);
    return !!song;
  },
  async getSubscribedArtists() {
    const db = await dbPromise;
    return db.getAll('subscribed_artists');
  },
  async addSubscribedArtist(artist: SubscribedArtist) {
    const db = await dbPromise;
    return db.put('subscribed_artists', artist);
  },
  async removeSubscribedArtist(artistId: string) {
    const db = await dbPromise;
    return db.delete('subscribed_artists', artistId);
  },
  async isSubscribed(artistId: string) {
    const db = await dbPromise;
    const artist = await db.get('subscribed_artists', artistId);
    return !!artist;
  },
  async getRecentSearches() {
    const db = await dbPromise;
    const searches = await db.getAll('recent_searches');
    return searches.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);
  },
  async addRecentSearch(query: string) {
    const db = await dbPromise;
    await db.put('recent_searches', { query, timestamp: Date.now() });
    
    // Keep only 20
    const searches = await db.getAll('recent_searches');
    if (searches.length > 20) {
      const sorted = searches.sort((a, b) => b.timestamp - a.timestamp);
      const toDelete = sorted.slice(20);
      const tx = db.transaction('recent_searches', 'readwrite');
      for (const item of toDelete) {
        tx.store.delete(item.query);
      }
      await tx.done;
    }
  },
  async removeRecentSearch(query: string) {
    const db = await dbPromise;
    return db.delete('recent_searches', query);
  },
};
