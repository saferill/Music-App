import { NextResponse } from 'next/server';
import YTMusic from 'ytmusic-api';

const ytmusic = new YTMusic();
let initialized = false;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  
  try {
    if (!initialized) {
      await ytmusic.initialize();
      initialized = true;
    }
    const upNext = await ytmusic.getUpNexts(id);
    return NextResponse.json(upNext || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    if (error?.name === 'ZodError') {
      return NextResponse.json([]);
    }
    if (error?.message?.includes('Invalid videoId') || (error?.isAxiosError && error?.response?.status === 400)) {
      return NextResponse.json([]);
    }
    console.error(`UpNext error for id ${id}:`, error?.message || error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
