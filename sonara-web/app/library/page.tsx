'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, SubscribedArtist } from '@/lib/db';
import { Track } from '@/lib/store';
import { TrackItem } from '@/components/TrackItem';
import { Heart, Plus, ListMusic, Trash2, Play, MoreVertical, Download, TrendingUp, Clock, UploadCloud } from 'lucide-react';
import Image from 'next/image';
import { usePlayerStore } from '@/lib/store';
import { motion } from 'motion/react';

export default function Library() {
  const router = useRouter();
  const [likedSongs, setLikedSongs] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [subscribedArtists, setSubscribedArtists] = useState<SubscribedArtist[]>([]);
  const [activeTab, setActiveTab] = useState('Daftar putar');
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistImg, setNewPlaylistImg] = useState('');
  const playTrack = usePlayerStore((state) => state.playTrack);

  const tabs = ['Daftar putar', 'Lagu', 'Album', 'Artis', 'Podcasts'];

  const loadLibrary = async () => {
    const liked = await db.getLikedSongs();
    const pl = await db.getPlaylists();
    const sa = await db.getSubscribedArtists();
    setLikedSongs(liked);
    setPlaylists(pl);
    setSubscribedArtists(sa);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLibrary();
  }, []);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    const newPlaylist = {
      id: Date.now().toString(),
      name: newPlaylistName,
      img: newPlaylistImg || 'https://picsum.photos/seed/playlist/200/200',
      tracks: [],
    };
    await db.addPlaylist(newPlaylist);
    setShowCreate(false);
    setNewPlaylistName('');
    setNewPlaylistImg('');
    loadLibrary();
  };

  const handleDeletePlaylist = async (id: string) => {
    await db.deletePlaylist(id);
    loadLibrary();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPlaylistImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <main className="min-h-screen pt-6 px-4 pb-24">
      <div className="flex overflow-x-auto no-scrollbar gap-3 mb-6 snap-x snap-mandatory scroll-smooth">
        {tabs.map((tab) => (
          <motion.button
            key={tab}
            initial={{ opacity: 0.5, scale: 0.9, x: 20 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: false, amount: 0.4 }}
            transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border snap-center ${
              activeTab === tab 
                ? 'bg-white/20 text-white border-white/20' 
                : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'
            }`}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6 text-white/80 text-sm">
        <button className="flex items-center gap-2">
          Tanggal ditambahkan <span className="text-xs">↓</span>
        </button>
        <button>
          <ListMusic className="w-5 h-5" />
        </button>
      </div>

      {activeTab === 'Daftar putar' && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors" onClick={() => setActiveTab('Lagu')}>
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Disukai</h3>
              <p className="text-white/50 text-sm">{likedSongs.length} lagu</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Diunduh</h3>
            </div>
          </div>

          <div 
            onClick={() => router.push('/top50')}
            className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Teratas Saya 50</h3>
            </div>
          </div>

          <div 
            onClick={() => router.push('/history')}
            className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Riwayat / Tersimpan di Cache</h3>
            </div>
          </div>

          <div className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors">
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <UploadCloud className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Diunggah</h3>
            </div>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors w-full text-left mt-4"
          >
            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium">Buat playlist baru</h3>
            </div>
          </button>

          {playlists.map((pl) => (
            <div 
              key={pl.id} 
              className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group"
              onClick={() => router.push(`/playlist/${pl.id}`)}
            >
              <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                <Image src={pl.img} alt={pl.name} fill sizes="144px" className="object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pl.tracks.length > 0) playTrack(pl.tracks[0], pl.tracks, 'playlist');
                    }}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    <Play className="w-4 h-4 text-white ml-0.5 fill-current" />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">{pl.name}</h3>
                <p className="text-white/50 text-sm">{pl.tracks.length} lagu</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePlaylist(pl.id);
                }}
                className="p-2 text-white/50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'Lagu' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Lagu Disukai</h2>
            {likedSongs.length > 0 && (
              <button
                onClick={() => playTrack(likedSongs[0], likedSongs, 'playlist')}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </button>
            )}
          </div>
          <div className="space-y-1">
            {likedSongs.map((track) => (
              <TrackItem key={track.videoId} track={track} queue={likedSongs} />
            ))}
            {likedSongs.length === 0 && (
              <div className="text-center text-white/50 py-12">Belum ada lagu yang disukai.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Artis' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white mb-4">Artis yang Disubscribe</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {subscribedArtists.map((artist) => (
              <div 
                key={artist.artistId} 
                className="flex flex-col items-center p-4 hover:bg-white/5 rounded-xl cursor-pointer transition-colors"
                onClick={() => router.push(`/artist/${artist.artistId}`)}
              >
                <div className="relative w-24 h-24 rounded-full overflow-hidden mb-3 shadow-lg">
                  <Image 
                    src={artist.thumbnails?.[artist.thumbnails.length - 1]?.url || '/placeholder.png'} 
                    alt={artist.name} 
                    fill 
                    sizes="96px" 
                    className="object-cover" 
                  />
                </div>
                <h3 className="text-white font-medium text-center line-clamp-1">{artist.name}</h3>
                <p className="text-white/50 text-xs mt-1">Artis</p>
              </div>
            ))}
            {subscribedArtists.length === 0 && (
              <div className="col-span-full text-center text-white/50 py-12">Belum ada artis yang disubscribe.</div>
            )}
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1C1C1E] rounded-2xl p-6 w-full max-w-sm border border-white/10">
            <h2 className="text-xl font-bold text-white mb-6">Create Playlist</h2>
            
            <div className="flex justify-center mb-6">
              <label className="relative w-32 h-32 rounded-xl overflow-hidden cursor-pointer group bg-white/5 flex items-center justify-center border border-dashed border-white/20 hover:border-white/50 transition-colors">
                {newPlaylistImg ? (
                  <Image src={newPlaylistImg} alt="Preview" fill sizes="144px" className="object-cover" />
                ) : (
                  <ListMusic className="w-8 h-8 text-white/50" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-xs font-semibold text-white">Upload Image</span>
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Playlist Name"
              className="w-full bg-black text-white rounded-xl py-3 px-4 mb-6 focus:outline-none focus:ring-1 focus:ring-white/30 border border-white/10"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="flex-1 py-3 rounded-xl font-semibold text-black bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
