'use client';

import { Track, usePlayerStore } from '@/lib/store';
import { MoreHorizontal, Music } from 'lucide-react';
import Image from 'next/image';
import { getHighResImage } from '@/lib/utils';
import { useState } from 'react';

export function TrackItem({
  track,
  queue,
  playMode,
}: {
  track: Track;
  queue?: Track[];
  playMode?: 'playlist' | 'similar';
}) {
  const playTrack = usePlayerStore((state) => state.playTrack);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setTrackToAdd = usePlayerStore((state) => state.setTrackToAdd);
  const isCurrent = currentTrack?.videoId === track.videoId;
  const [imageError, setImageError] = useState(false);

  const thumbnail = getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 200);
  const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist';
  const mode = playMode || (queue?.length ? 'playlist' : 'similar');
  const handlePlay = () => playTrack(track, mode === 'playlist' ? queue : undefined, mode);

  return (
    <div
      className="flex items-center p-3 hover:bg-white/5 rounded-xl cursor-pointer group transition-colors"
      onClick={handlePlay}
    >
      <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-[#222222]">
        {!imageError ? (
          <Image 
            src={thumbnail} 
            alt={track.name} 
            fill 
            sizes="48px" 
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#333] to-[#222]">
            <Music className="w-6 h-6 text-gray-500" />
          </div>
        )}
        {isCurrent && isPlaying && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="flex gap-0.5 items-end h-3">
              <div className="w-1 bg-[#FF7A59] animate-[bounce_1s_infinite_0ms]" />
              <div className="w-1 bg-[#FF7A59] animate-[bounce_1s_infinite_200ms]" />
              <div className="w-1 bg-[#FF7A59] animate-[bounce_1s_infinite_400ms]" />
            </div>
          </div>
        )}
      </div>
      <div className="ml-4 flex-1 min-w-0 border-b border-white/5 pb-3 group-hover:border-transparent transition-colors">
        <div className={`font-medium truncate ${isCurrent ? 'text-[#FF7A59]' : 'text-white'}`}>
          {track.name}
        </div>
        <div className="text-sm text-gray-400 truncate">{artistName}</div>
      </div>
      <button 
        className="p-2 text-white/50 hover:text-white transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setTrackToAdd(track);
        }}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
}
