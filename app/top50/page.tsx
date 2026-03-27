'use client';

import { ArrowLeft, Search, Play, Shuffle, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/lib/store';
import Image from 'next/image';
import { getHighResImage } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function Top50Page() {
  const router = useRouter();
  const history = usePlayerStore((state) => state.history);
  const playCounts = usePlayerStore((state) => state.playCounts);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Calculate top 50 tracks
  // We need to get the track details from history, so we'll map over history to get unique tracks
  const uniqueTracks = Array.from(new Map(history.map(item => [item.track.videoId, item.track])).values());
  
  const topTracks = uniqueTracks
    .map(track => ({
      track,
      count: playCounts[track.videoId] || 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map(item => item.track);

  const totalDuration = topTracks.reduce((acc, track) => acc + (track.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const coverImage = topTracks.length > 0 
    ? getHighResImage(topTracks[0].thumbnails?.[topTracks[0].thumbnails.length - 1]?.url, 800)
    : 'https://picsum.photos/seed/top50/800/800';

  return (
    <main className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md pt-6 pb-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Teratas Saya 50</h1>
        </div>
        <button className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
          <Search className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col items-center px-4 mt-4 mb-8">
        <div className="relative w-64 h-64 rounded-xl overflow-hidden shadow-2xl mb-6">
          <Image src={coverImage} alt="Teratas Saya 50" fill sizes="(max-width: 640px) 100vw, 300px" className="object-cover" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Teratas Saya 50</h2>
        <p className="text-white/60 text-sm mb-6">
          {topTracks.length} lagu • {formatDuration(totalDuration)}
        </p>
        
        <div className="flex items-center gap-4">
          <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <Shuffle className="w-5 h-5 text-white" />
          </button>
          <button 
            className="w-16 h-16 bg-[#A3C9A8] rounded-full flex items-center justify-center hover:scale-105 transition-transform"
            onClick={() => topTracks.length > 0 && playTrack(topTracks[0], topTracks)}
          >
            <Play className="w-8 h-8 text-black fill-current ml-1" />
          </button>
          <button className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
            <MoreVertical className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 mb-4">
        <h3 className="text-sm font-medium text-white/80">Sepanjang waktu</h3>
      </div>

      <div className="space-y-1">
        {topTracks.map((track, index) => {
          const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist';
          
          return (
            <div 
              key={track.videoId} 
              className="flex items-center gap-4 py-2 cursor-pointer hover:bg-white/5 px-4 rounded-xl transition-colors"
              onClick={() => playTrack(track, topTracks)}
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
        })}

        {topTracks.length === 0 && (
          <div className="text-center text-white/50 mt-10">
            Belum ada lagu yang sering diputar
          </div>
        )}
      </div>
    </main>
  );
}
