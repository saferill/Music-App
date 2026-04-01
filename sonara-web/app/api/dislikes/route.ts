import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('id');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://returnyoutubedislikeapi.com/Votes?videoId=${videoId}`, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
        throw new Error('Dislike API error');
    }

    const data = await response.json();
    return NextResponse.json({
        likes: data.likes,
        dislikes: data.dislikes,
        rating: data.rating,
        viewCount: data.viewCount,
    });
  } catch (error) {
    console.error('Dislike API error:', error);
    return NextResponse.json({ likes: 0, dislikes: 0 });
  }
}
