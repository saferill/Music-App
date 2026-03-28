import { useState, useEffect } from 'react';
import { Play, Plus, Radio, Check, PlusSquare } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { usePlayerStore, Track } from '@/lib/store';
import { db } from '@/lib/db';

interface PlaylistData {
  playlistId: string;
  name: string;
  thumbnails: { url: string; width: number; height: number }[];
  videos: Track[];
}

export function CommunityPlaylistCard({ playlistId }: { playlistId: string }) {
  const [playlist, setPlaylist] = useState<PlaylistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const router = useRouter();
  const playTrack = usePlayerStore((state) => state.playTrack);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const res = await fetch(`/api/ytplaylist?id=${playlistId}`);
        if (res.ok) {
          const data = await res.json();
          setPlaylist({
            ...data,
            videos: data.videos || data.songs || []
          });
        }
      } catch (error) {
        console.error('Failed to fetch playlist:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [playlistId]);

  if (loading) {
    return (
      <div className="h-[420px] w-full rounded-3xl bg-[#1C1C1E] animate-pulse" />
    );
  }

  if (!playlist) {
    return null;
  }

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playlist.videos && playlist.videos.length > 0) {
      playTrack(playlist.videos[0], playlist.videos, 'playlist');
    }
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!added) {
      await db.addPlaylist({
        id: playlist.playlistId,
        name: playlist.name,
        img: playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url || '',
        tracks: playlist.videos || []
      });
      setAdded(true);
    }
  };

  const handleRadio = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Start radio based on the first track
    if (playlist.videos && playlist.videos.length > 0) {
      playTrack(playlist.videos[0], [], 'similar');
    }
  };

  const handleClick = () => {
    router.push(`/playlist/${playlist.playlistId}`);
  };

  const displayTracks = playlist.videos?.slice(0, 3) || [];
  const playlistTitle = playlist.name?.trim() || 'Playlist komunitas';

  return (
    <div 
      onClick={handleClick}
      className="flex h-full w-full cursor-pointer flex-col rounded-3xl bg-[#181818] p-5 transition-colors hover:bg-[#222] "
    >
      <div className="flex gap-4 mb-6">
        <div className="w-24 h-24 rounded-2xl overflow-hidden relative shrink-0 shadow-lg bg-black/20">
          {playlist.videos && playlist.videos.length >= 4 ? (
            <div className="grid grid-cols-2 grid-rows-2 w-full h-full">
              {playlist.videos.slice(0, 4).map((track, i) => {
                const trackTitle = track.name?.trim() || 'Lagu tanpa judul';

                return (
                <div key={i} className="relative w-full h-full">
                  <Image 
                    src={track.thumbnails?.[track.thumbnails.length - 1]?.url || '/placeholder.png'} 
                    alt={trackTitle} 
                    fill 
                    sizes="48px" 
                    className="object-cover" 
                  />
                </div>
                );
              })}
            </div>
          ) : (
            <Image 
              src={playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url || '/placeholder.png'} 
              alt={playlistTitle} 
              fill 
              sizes="96px" 
              className="object-cover" 
            />
          )}
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-white font-bold text-lg line-clamp-2 leading-tight mb-1">{playlistTitle}</h3>
          <p className="text-white/50 text-sm">{playlist.videos?.length || 0} lagu</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 mb-6">
        {displayTracks.map((track, i) => {
          const trackTitle = track.name?.trim() || 'Lagu tanpa judul';

          return (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0">
              <Image 
                src={track.thumbnails?.[track.thumbnails.length - 1]?.url || '/placeholder.png'} 
                alt={trackTitle} 
                fill 
                sizes="48px" 
                className="object-cover" 
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <p className="text-white text-[15px] font-medium line-clamp-1">{trackTitle}</p>
              <p className="text-white/50 text-sm line-clamp-1">
                {Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist'}
              </p>
            </div>
          </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mt-auto">
        <button 
          onClick={handlePlay}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FF7A59] hover:scale-105 transition-transform"
        >
          <Play className="w-7 h-7 text-black fill-current ml-1" />
        </button>
        <button 
          onClick={handleRadio}
          className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Radio className="w-6 h-6 text-white" />
        </button>
        <button 
          onClick={handleAdd}
          className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          {added ? <Check className="w-6 h-6 text-white" /> : <PlusSquare className="w-6 h-6 text-white" />}
        </button>
      </div>
    </div>
  );
}
