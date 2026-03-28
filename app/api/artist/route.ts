import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';
import {
  normalizeArtistEntity,
  normalizeNamedEntity,
  normalizeTrackList,
} from '@/lib/media';

const ytmusic = new YTMusic();
let initialized = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'Artist ID required' }, { status: 400 });
  
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    const rawArtist = await ytmusic.getArtist(id);
    const artist = normalizeArtistEntity(rawArtist as Record<string, any>);

    return NextResponse.json({
      ...rawArtist,
      ...artist,
      topSongs: normalizeTrackList((rawArtist as any)?.topSongs),
      topVideos: normalizeTrackList((rawArtist as any)?.topVideos),
      topAlbums: Array.isArray((rawArtist as any)?.topAlbums)
        ? (rawArtist as any).topAlbums.map((album: Record<string, any>) => normalizeNamedEntity(album, 'Album'))
        : [],
      topSingles: Array.isArray((rawArtist as any)?.topSingles)
        ? (rawArtist as any).topSingles.map((single: Record<string, any>) => normalizeNamedEntity(single, 'Single'))
        : [],
      featuredOn: Array.isArray((rawArtist as any)?.featuredOn)
        ? (rawArtist as any).featuredOn.map((playlist: Record<string, any>) => normalizeNamedEntity(playlist, 'Playlist'))
        : [],
      similarArtists: Array.isArray((rawArtist as any)?.similarArtists)
        ? (rawArtist as any).similarArtists.map((similarArtist: Record<string, any>) => normalizeArtistEntity(similarArtist))
        : [],
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'ZodError', details: error.issues }, { status: 500 });
    }
    if (error?.isAxiosError && error?.response?.status === 400) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 });
    }
    console.error(`Artist error for id ${id}:`, error?.message || error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
