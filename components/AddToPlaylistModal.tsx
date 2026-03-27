'use client';

import { useState, useEffect } from 'react';
import { usePlayerStore } from '@/lib/store';
import { db } from '@/lib/db';
import { X, Plus, Music } from 'lucide-react';
import Image from 'next/image';
import { getHighResImage } from '@/lib/utils';

interface Playlist {
  id: string;
  name: string;
  img: string;
  tracks: any[];
}

export function AddToPlaylistModal() {
  const trackToAdd = usePlayerStore((state) => state.trackToAdd);
  const setTrackToAdd = usePlayerStore((state) => state.setTrackToAdd);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const loadPlaylists = async () => {
    const data = await db.getPlaylists();
    setPlaylists(data as Playlist[]);
  };

  useEffect(() => {
    if (trackToAdd) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadPlaylists();
    }
  }, [trackToAdd]);

  const handleAddToPlaylist = async (playlist: Playlist) => {
    if (!trackToAdd) return;
    
    // Check if track already exists
    if (playlist.tracks.some(t => t.videoId === trackToAdd.videoId)) {
      setTrackToAdd(null);
      return;
    }

    const updatedPlaylist = {
      ...playlist,
      tracks: [...playlist.tracks, trackToAdd]
    };

    await db.addPlaylist(updatedPlaylist);
    setTrackToAdd(null);
  };

  const handleCreateAndAdd = async () => {
    if (!newPlaylistName.trim() || !trackToAdd) return;

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: newPlaylistName.trim(),
      img: getHighResImage(trackToAdd.thumbnails?.[trackToAdd.thumbnails.length - 1]?.url, 400),
      tracks: [trackToAdd]
    };

    await db.addPlaylist(newPlaylist);
    setNewPlaylistName('');
    setIsCreating(false);
    setTrackToAdd(null);
  };

  if (!trackToAdd) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0">
      <div 
        className="bg-[#1C1C1E] w-full sm:w-[400px] max-h-[80vh] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Tambahkan ke Playlist</h2>
          <button 
            onClick={() => setTrackToAdd(null)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex items-center gap-4 border-b border-white/5 bg-white/5">
          <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0">
            <Image 
              src={getHighResImage(trackToAdd.thumbnails?.[trackToAdd.thumbnails.length - 1]?.url, 200)} 
              alt={trackToAdd.name} 
              fill 
              className="object-cover" 
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium truncate">{trackToAdd.name}</div>
            <div className="text-white/60 text-sm truncate">
              {Array.isArray(trackToAdd.artist) ? trackToAdd.artist.map(a => a.name).join(', ') : trackToAdd.artist?.name}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isCreating ? (
            <div className="p-4 space-y-4">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Nama playlist baru"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-[#FA243C] transition-colors"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-white/80 hover:bg-white/10 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreateAndAdd}
                  disabled={!newPlaylistName.trim()}
                  className="flex-1 py-3 bg-[#FA243C] text-white rounded-xl font-medium disabled:opacity-50 transition-colors"
                >
                  Buat & Tambah
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors text-left group"
              >
                <div className="w-12 h-12 bg-white/10 rounded-md flex items-center justify-center group-hover:bg-white/20 transition-colors">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <span className="text-white font-medium">Playlist Baru</span>
              </button>

              <div className="my-2 border-t border-white/5" />

              {playlists.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  Belum ada playlist
                </div>
              ) : (
                playlists.map(playlist => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist)}
                    className="w-full flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                  >
                    <div className="relative w-12 h-12 bg-white/5 rounded-md overflow-hidden flex items-center justify-center shrink-0">
                      {playlist.img ? (
                        <Image src={playlist.img} alt={playlist.name} fill className="object-cover" />
                      ) : (
                        <Music className="w-6 h-6 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{playlist.name}</div>
                      <div className="text-white/50 text-sm">{playlist.tracks.length} lagu</div>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
