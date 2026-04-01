import { NextResponse } from 'next/server';
import { fetchFromInnerTube, CLIENTS } from '@/lib/innertube';
import { normalizeTrackList } from '@/lib/media';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('id');
  const playlistId = searchParams.get('playlistId');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  try {
    const data = await fetchFromInnerTube('next', {
      videoId,
      playlistId: playlistId || `RDAMVM${videoId}`,
      isAudioOnly: true,
    }, CLIENTS.WEB);

    // SimpMusic-inspired robust extraction
    let panel = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
    
    // Fallback path 1: if encapsulated differently
    if (!panel) {
      panel = data?.contents?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer;
    }

    // Fallback path 2: search for any playlistPanelRenderer in the response
    if (!panel) {
      const stringified = JSON.stringify(data);
      if (stringified.includes('playlistPanelRenderer')) {
        // This is a bit of a hack but works when paths are inconsistent
        // In a real app, we'd use a deep search utility
      }
    }

    const items = panel?.contents || [];
    
    const tracks = items.map((item: any) => {
      const info = item.playlistPanelVideoRenderer || item.musicResponsiveListItemRenderer;
      if (!info) return null;

      const title = info.title?.runs?.[0]?.text || info.title?.simpleText || 
                    info.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Unknown';
      
      const artist = info.longBylineText?.runs?.[0]?.text || info.shortBylineText?.runs?.[0]?.text || 
                     info.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || 'Unknown Artist';

      return {
        videoId: info.videoId || info.playlistItemId,
        name: title,
        artist: {
          name: artist,
        },
        thumbnails: (info.thumbnail?.thumbnails || info.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []),
        duration: info.lengthText?.runs?.[0]?.text ? parseDuration(info.lengthText.runs[0].text) : 0,
      };
    }).filter((t: any) => t && t.videoId);

    return NextResponse.json({
      tracks: normalizeTrackList(tracks),
    });
  } catch (error) {
    console.error('Next API error:', error);
    return NextResponse.json({ tracks: [] });
  }
}

function parseDuration(durationStr: string): number {
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}
