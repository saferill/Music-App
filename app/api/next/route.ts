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

    // Extracting tracks from playlistPanelRenderer
    // Structure: contents.singleColumnMusicWatchNextResultsRenderer.tabbedRenderer.watchNextTabbedResultsRenderer.tabs[0].tabRenderer.content.musicQueueRenderer.content.playlistPanelRenderer.contents
    const panel = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.musicQueueRenderer?.content?.playlistPanelRenderer;
    
    const items = panel?.contents || [];
    
    const tracks = items.map((item: any) => {
      const info = item.playlistPanelVideoRenderer;
      if (!info) return null;

      return {
        videoId: info.videoId,
        name: info.title?.runs?.[0]?.text,
        artist: {
          name: info.longBylineText?.runs?.[0]?.text || info.shortBylineText?.runs?.[0]?.text,
        },
        thumbnails: info.thumbnail?.thumbnails || [],
        duration: info.lengthText?.runs?.[0]?.text ? parseDuration(info.lengthText.runs[0].text) : 0,
      };
    }).filter(Boolean);

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
