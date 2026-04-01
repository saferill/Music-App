import { NextResponse } from 'next/server';
import { searchInnerTube } from '@/lib/innertube';
import { normalizeTrack } from '@/lib/media';

/**
 * Basic InnerTube parser for music app needs
 */
function parseInnerTubeSearch(data: any, type?: string) {
  const contents = data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
  
  // Find the primary shelf
  const shelf = contents.find((c: any) => c.musicShelfRenderer)?.musicShelfRenderer;
  if (!shelf) return [];

  return shelf.contents.map((item: any) => {
    const renderer = item.musicResponsiveListItemRenderer;
    if (!renderer) return null;

    const videoId = renderer.playlistItemData?.videoId || 
                    renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;
    
    // Extract title, artist, duration from flexColumns
    const flexColumns = renderer.flexColumns || [];
    const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text;
    
    // For artistic/playlist/song differentiation, check the runs in flexColumn[1]
    const subtextRuns = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
    
    const artist = subtextRuns[0]?.text;
    const album = subtextRuns[2]?.text;
    const durationText = subtextRuns[subtextRuns.length - 1]?.text;

    const thumbnails = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];

    if (type === 'artist') {
      return {
        type: 'Artist',
        name: title,
        artistId: renderer.navigationEndpoint?.browseEndpoint?.browseId,
        thumbnails,
      };
    }

    if (type === 'playlist') {
      return {
        type: 'Playlist',
        name: title,
        playlistId: renderer.navigationEndpoint?.browseEndpoint?.browseId,
        thumbnails,
      };
    }

    // Default: Song/Video
    return normalizeTrack({
      videoId,
      name: title,
      artist: { name: artist },
      album: { name: album },
      thumbnails,
      durationText,
    });
  }).filter(Boolean);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const type = searchParams.get('type');
  
  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });
  
  try {
    const rawData = await searchInnerTube(query, type || 'song');
    const results = parseInnerTubeSearch(rawData, type || 'song');
    
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
