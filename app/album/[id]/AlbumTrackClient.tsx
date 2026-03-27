'use client';

import { MoreVertical } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';

export default function AlbumTrackClient({ track, index, album, artistName }: { track: any, index: number, album: any, artistName: string }) {
  const playTrack = usePlayerStore((state) => state.playTrack);

  return (
    <div 
      className="flex items-center gap-4 py-2 cursor-pointer hover:bg-white/5 px-4 rounded-xl transition-colors"
      onClick={() => playTrack(track, album.songs)}
    >
      <div className="w-6 text-center text-white/60 font-medium">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium truncate text-base">{track.name}</h3>
        <p className="text-white/60 text-sm truncate">
          {artistName}{track.duration ? ` • ${Math.floor(track.duration / 60)}:${Math.floor(track.duration % 60).toString().padStart(2, '0')}` : ''}
        </p>
      </div>
      <button className="p-2 text-white/60 hover:text-white transition-colors">
        <MoreVertical className="w-5 h-5" />
      </button>
    </div>
  );
}
