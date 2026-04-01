import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('id');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&category=sponsor&category=selfpromo&category=interaction&category=intro&category=outro&category=preview&category=music_offtopic&category=poi_highlight&category=filler&service=YouTube`,
      {
        next: { revalidate: 3600 },
      }
    );

    if (response.status === 404) {
      return NextResponse.json({ segments: [] });
    }

    if (!response.ok) {
      throw new Error('SponsorBlock API error');
    }

    const data = await response.json();
    
    // Normalize response to a simpler format
    const segments = data.map((segment: any) => ({
      start: segment.segment[0],
      end: segment.segment[1],
      category: segment.category,
      uuid: segment.UUID,
    }));

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('SponsorBlock error:', error);
    return NextResponse.json({ segments: [] });
  }
}
