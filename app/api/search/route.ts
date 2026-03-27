import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type');
  
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });
  
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    
    if (type === 'playlist') {
      let playlists = await ytmusic.searchPlaylists(query).catch(e => { console.error('Error searching playlists:', e.name === 'ZodError' ? 'ZodError' : e); return []; });
      // Filter out mixes (IDs starting with RD) as they cannot be fetched via getPlaylist
      playlists = playlists.filter((p: any) => p.playlistId && !p.playlistId.startsWith('RD'));
      return NextResponse.json(playlists, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }
    
    if (type === 'artist') {
      const artists = await ytmusic.searchArtists(query).catch(e => { console.error('Error searching artists:', e.name === 'ZodError' ? 'ZodError' : e); return []; });
      return NextResponse.json(artists, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
    }
    
    if (type === 'song') {
      const songs = await ytmusic.searchSongs(query).catch(e => { console.error('Error searching songs:', e.name === 'ZodError' ? 'ZodError' : e); return []; });
      return NextResponse.json(songs, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
    }
    
    if (type === 'video') {
      const videos = await ytmusic.searchVideos(query).catch(e => { console.error('Error searching videos:', e.name === 'ZodError' ? 'ZodError' : e); return []; });
      return NextResponse.json(videos, { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
    }

    // If no type is specified, search sequentially to avoid 403 errors from too many parallel requests
    const songs = await ytmusic.searchSongs(query).catch(e => { console.error('Error searching songs:', e.name === 'ZodError' ? 'ZodError' : e); return []; });
    const videos = await ytmusic.searchVideos(query).catch(e => { console.error('Error searching videos:', e.name === 'ZodError' ? 'ZodError' : e); return []; });
    const artists = await ytmusic.searchArtists(query).catch(e => { console.error('Error searching artists:', e.name === 'ZodError' ? 'ZodError' : e); return []; });
    
    const results = [...songs, ...videos, ...artists];
    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
