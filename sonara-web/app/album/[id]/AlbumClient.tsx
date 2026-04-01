'use client';

import { Play, Shuffle, MoreVertical, Heart } from 'lucide-react';
import { usePlayerStore } from '@/lib/store';

export default function AlbumClient({ album }: { album: any }) {
  const playTrack = usePlayerStore((state) => state.playTrack);

  return (
    <div className="flex items-center gap-4">
      <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
        <Heart className="w-5 h-5 text-white" />
      </button>
      <button 
        className="w-16 h-16 bg-[#A3C9A8] rounded-full flex items-center justify-center hover:scale-105 transition-transform"
        onClick={() => album.songs.length > 0 && playTrack(album.songs[0], album.songs)}
      >
        <Play className="w-8 h-8 text-black fill-current ml-1" />
      </button>
      <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
        <MoreVertical className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
