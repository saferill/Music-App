import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

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
    const artist = await ytmusic.getArtist(id);
    return NextResponse.json(artist, {
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
