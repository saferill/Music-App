'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { usePlayerStore, Track } from '@/lib/store';
import { Play, ArrowLeft, MoreHorizontal, Radio, Music } from 'lucide-react';
import Image from 'next/image';
import { TrackItem } from '@/components/TrackItem';

interface Playlist {
  id: string;
  name: string;
  img: string;
  tracks: Track[];
}

export default function PlaylistPage() {
  const params = useParams();
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const playTrack = usePlayerStore((state) => state.playTrack);

  useEffect(() => {
    const loadPlaylist = async () => {
      if (!params.id) return;
      try {
        const id = String(params.id);
        const data = await db.getPlaylist(id);
        if (data) {
          setPlaylist(data as Playlist);
        } else {
          // Try fetching from YouTube Music API
          const res = await fetch(`/api/ytplaylist?id=${id}`);
          if (res.ok) {
            const ytData = await res.json();
            setPlaylist({
              id: ytData.playlistId || ytData.id || id,
              name: ytData.name || ytData.title || 'Playlist',
              img: ytData.thumbnails?.[ytData.thumbnails.length - 1]?.url || '',
              tracks: ytData.videos || ytData.songs || []
            });
          }
        }
      } catch (error) {
        console.error('Failed to load playlist:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPlaylist();
  }, [params.id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white">Memuat...</div>;
  }

  if (!playlist) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white">
        <p className="mb-4">Playlist tidak ditemukan</p>
        <button onClick={() => router.back()} className="text-[#FF7A59]">Kembali</button>
      </div>
    );
  }

  const handlePlayAll = () => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], playlist.tracks, 'playlist');
    }
  };

  const handleRadio = () => {
    if (playlist.tracks.length > 0) {
      playTrack(playlist.tracks[0], [], 'similar');
    }
  };

  return (
    <main className="min-h-screen pb-20">
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md px-4 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="px-4 pt-4 pb-8 flex flex-col items-center text-center">
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl mb-6 relative bg-white/5 flex items-center justify-center">
          {playlist.img ? (
            <Image src={playlist.img} alt={playlist.name} fill sizes="(max-width: 640px) 100vw, 300px" className="object-cover" />
          ) : (
            <Music className="w-20 h-20 text-white/20" />
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{playlist.name}</h1>
        <p className="text-white/50 mb-6">{playlist.tracks.length} lagu</p>

        <div className="flex items-center gap-4 w-full justify-center">
          <button 
            onClick={handlePlayAll}
            disabled={playlist.tracks.length === 0}
            className="w-14 h-14 bg-[#FF7A59] rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Play className="w-7 h-7 text-black fill-current ml-1" />
          </button>
          <button 
            onClick={handleRadio}
            disabled={playlist.tracks.length === 0}
            className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            <Radio className="w-6 h-6 text-white" />
          </button>
          <button 
            className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <MoreHorizontal className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-3xl mx-auto">
        {playlist.tracks.length === 0 ? (
          <div className="text-center text-white/50 py-12">
            Belum ada lagu di playlist ini.
          </div>
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((track, index) => (
              <TrackItem key={`${track.videoId}-${index}`} track={track} queue={playlist.tracks} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
