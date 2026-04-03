import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';
import {
  normalizeArtistEntity,
  normalizeNamedEntity,
  normalizeTrackList,
} from '@/lib/media';

const ytmusic = new YTMusic();
let initializePromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (!initializePromise) {
    initializePromise = ytmusic
      .initialize()
      .then(() => undefined)
      .catch((error) => {
        initializePromise = null;
        throw error;
      });
  }

  return initializePromise;
}

function capResults<T>(items: T[], limit = 8) {
  return items.slice(0, limit);
}

function normalizeSearchResults(items: unknown[], type: string) {
  if (!Array.isArray(items)) return [];

  switch (type) {
    case 'artist':
      return items.map((item) => normalizeArtistEntity(item as Record<string, unknown>));
    case 'album':
      return items.map((item) => normalizeNamedEntity(item as Record<string, unknown>, 'Album'));
    case 'playlist':
      return items.map((item) => normalizeNamedEntity(item as Record<string, unknown>, 'Playlist'));
    case 'song':
    case 'video':
      return normalizeTrackList(items);
    default:
      return items;
  }
}

async function searchByType(query: string, type: string) {
  await ensureInitialized();

  switch (type) {
    case 'song':
      return normalizeSearchResults(await ytmusic.searchSongs(query), 'song');
    case 'video':
      return normalizeSearchResults(await ytmusic.searchVideos(query), 'video');
    case 'artist':
      return normalizeSearchResults(await ytmusic.searchArtists(query), 'artist');
    case 'album':
      return normalizeSearchResults(await ytmusic.searchAlbums(query), 'album');
    case 'playlist':
      return normalizeSearchResults(await ytmusic.searchPlaylists(query), 'playlist');
    default:
      return [];
  }
}

async function searchAll(query: string) {
  const [songs, videos, artists, albums, playlists] = await Promise.all([
    searchByType(query, 'song'),
    searchByType(query, 'video'),
    searchByType(query, 'artist'),
    searchByType(query, 'album'),
    searchByType(query, 'playlist'),
  ]);

  return [
    ...capResults(songs, 6),
    ...capResults(artists, 4),
    ...capResults(albums, 4),
    ...capResults(playlists, 4),
    ...capResults(videos, 4),
  ];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();
  const type = (searchParams.get('type') || 'all').trim().toLowerCase();

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const results =
      type === 'all'
        ? await searchAll(query)
        : await searchByType(query, type);

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
