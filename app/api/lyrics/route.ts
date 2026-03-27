import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id || id.length !== 11) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    const song = await ytmusic.getSong(id) as any;
    if (song && song.lyricsId) {
      const lyrics = await ytmusic.getLyrics(song.lyricsId);
      return NextResponse.json({ lyrics }, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      });
    }
    return NextResponse.json({ lyrics: null }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json({ lyrics: null });
    }
    if (error?.message?.includes('Invalid videoId') || (error?.isAxiosError && error?.response?.status === 400)) {
      return NextResponse.json({ lyrics: null });
    }
    console.error(`Lyrics error for id ${id}:`, error?.message || error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
