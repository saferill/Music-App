import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';
import { firstText, normalizeNamedEntity, normalizeTrackList } from '@/lib/media';

const ytmusic = new YTMusic();
let initialized = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id || id === 'undefined' || id === 'null') {
    return NextResponse.json({ error: 'Missing or invalid id' }, { status: 400 });
  }

  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    try {
      console.log('Fetching playlist:', id);
      const playlist = await ytmusic.getPlaylist(id) as any;
      console.log('Playlist fetched:', playlist.name);
      let videos = playlist.videos || [];
      console.log('Initial videos length:', videos.length);
      if (videos.length === 0) {
        try {
          videos = await ytmusic.getPlaylistVideos(id);
          console.log('Fetched videos length:', videos.length);
        } catch (e) {
          console.error('Failed to get playlist videos:', e);
        }
      }
      return NextResponse.json({
        ...normalizeNamedEntity(playlist, 'Playlist'),
        ...playlist,
        name: firstText(playlist.name, playlist.title) || 'Playlist',
        thumbnails: normalizeNamedEntity(playlist, 'Playlist').thumbnails,
        videos: normalizeTrackList(videos),
      });
    } catch (e: any) {
      console.error('getPlaylist error:', e);
      if (e?.name === 'ZodError') {
        // Suppress ZodError logs
      } else if (e?.message?.includes('split')) {
        // Suppress known split error for invalid playlist IDs
      } else {
        console.log(`getPlaylist failed for id ${id}, trying getAlbum`);
      }
      
      const album = await ytmusic.getAlbum(id);
      const normalizedAlbum = normalizeNamedEntity(album as Record<string, any>, 'Album');
      // Map album to playlist format
      return NextResponse.json({
        playlistId: album.albumId,
        name: firstText(album.name, normalizedAlbum.title) || 'Album',
        artist: album.artist,
        thumbnails: normalizedAlbum.thumbnails,
        videos: normalizeTrackList(album.songs),
      });
    }
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ error: 'ZodError', details: error.issues }, { status: 500 });
    }
    
    // Suppress 400 errors as they just mean the ID is invalid
    if (error?.isAxiosError && error?.response?.status === 400) {
      return NextResponse.json({ error: 'Invalid playlist/album ID' }, { status: 400 });
    }
    
    console.error(`Error fetching playlist/album for id ${id}:`, error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch playlist' }, { status: 500 });
  }
}
