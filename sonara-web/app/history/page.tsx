'use client';

import { ArrowLeft, Search, MoreVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePlayerStore } from '@/lib/store';
import Image from 'next/image';
import { getHighResImage } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function HistoryPage() {
  const router = useRouter();
  const history = usePlayerStore((state) => state.history);
  const playTrack = usePlayerStore((state) => state.playTrack);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Group history by Today, This Week, etc.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const todayHistory = history.filter(item => new Date(item.playedAt) >= today);
  const thisWeekHistory = history.filter(item => {
    const date = new Date(item.playedAt);
    return date >= startOfWeek && date < today;
  });
  const olderHistory = history.filter(item => new Date(item.playedAt) < startOfWeek);

  const renderTrackItem = (item: any) => {
    const track = item.track;
    const trackTitle = track.name?.trim() || 'Lagu tanpa judul';
    const artistName = Array.isArray(track.artist) ? track.artist.map((a: any) => a.name).join(', ') : track.artist?.name || 'Unknown Artist';
    const thumbnail = getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 100);

    const formatDuration = (seconds?: number) => {
      if (!seconds) return '';
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return ` • ${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <div 
        key={item.playedAt + track.videoId} 
        className="flex items-center gap-4 py-2 cursor-pointer hover:bg-white/5 px-4 rounded-xl transition-colors"
        onClick={() => playTrack(track, history.map(h => h.track))}
      >
        <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
          <Image src={thumbnail} alt={trackTitle} fill sizes="56px" className="object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate text-base">{trackTitle}</h3>
          <p className="text-white/60 text-sm truncate">
            {artistName}{formatDuration(track.duration)}
          </p>
        </div>
        <button className="p-2 text-white/60 hover:text-white transition-colors">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    );
  };

  return (
    <main className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md pt-6 pb-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-white">Riwayat</h1>
        </div>
        <button className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
          <Search className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 mb-6">
        <button className="px-5 py-2 bg-white/10 text-white rounded-full text-sm font-medium border border-white/5">
          Lokal
        </button>
      </div>

      <div className="space-y-8">
        {todayHistory.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white px-4 mb-4">Hari ini</h2>
            <div className="space-y-1">
              {todayHistory.map(renderTrackItem)}
            </div>
          </div>
        )}

        {thisWeekHistory.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white px-4 mb-4">Minggu ini</h2>
            <div className="space-y-1">
              {thisWeekHistory.map(renderTrackItem)}
            </div>
          </div>
        )}

        {olderHistory.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-white px-4 mb-4">Lebih lama</h2>
            <div className="space-y-1">
              {olderHistory.map(renderTrackItem)}
            </div>
          </div>
        )}

        {history.length === 0 && (
          <div className="text-center text-white/50 mt-20">
            Belum ada riwayat putaran
          </div>
        )}
      </div>
    </main>
  );
}
