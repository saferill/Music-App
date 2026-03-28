'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, Share2, Play, Radio, MoreVertical } from 'lucide-react';
import { getHighResImage } from '@/lib/utils';
import { TrackItem } from '@/components/TrackItem';
import { usePlayerStore } from '@/lib/store';
import { db } from '@/lib/db';
import { getApiBaseUrl } from '@/lib/config';

export default function ArtistPage() {
  const params = useParams();
  const router = useRouter();
  const [artist, setArtist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const playTrack = usePlayerStore((state) => state.playTrack);

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/artist?id=${params.id}`);
        const data = await res.json();
        setArtist(data);
        
        if (data && data.artistId) {
          const subscribed = await db.isSubscribed(data.artistId);
          setIsSubscribed(subscribed);
        }
      } catch (error) {
        console.error('Failed to fetch artist:', error);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) {
      fetchArtist();
    }
  }, [params.id]);

  const handleSubscribe = async () => {
    if (!artist) return;
    
    if (isSubscribed) {
      await db.removeSubscribedArtist(artist.artistId);
      setIsSubscribed(false);
    } else {
      await db.addSubscribedArtist({
        artistId: artist.artistId,
        name: artist.name,
        thumbnails: artist.thumbnails || [],
        subscribedAt: Date.now()
      });
      setIsSubscribed(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center text-white">
        <p>Artist not found</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-white/10 rounded-full">
          Go Back
        </button>
      </div>
    );
  }

  const headerImage = getHighResImage(artist.thumbnails?.[artist.thumbnails.length - 1]?.url, 1000);

  return (
    <main className="min-h-screen bg-[#0F0F0F] pb-32">
      {/* Header */}
      <div className="relative h-[40vh] min-h-[300px] w-full">
        <Image 
          src={headerImage || '/placeholder.png'} 
          alt={artist.name} 
          fill 
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/50 to-transparent" />
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10">
          <button onClick={() => router.back()} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <button className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition">
            <Share2 className="w-6 h-6" />
          </button>
        </div>

        {/* Artist Info */}
        <div className="absolute bottom-0 left-0 p-6 w-full">
          <h1 className="text-5xl font-bold text-white mb-6">{artist.name}</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSubscribe}
              className={`px-6 py-2 rounded-full border font-medium transition ${
                isSubscribed 
                  ? 'bg-white text-black border-white hover:bg-white/90' 
                  : 'border-white/30 text-white hover:bg-white/10'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
            <button className="px-6 py-2 rounded-full border border-white/30 text-white font-medium flex items-center gap-2 hover:bg-white/10 transition">
              <Radio className="w-4 h-4" />
              Radio
            </button>
            <button 
              className="w-10 h-10 rounded-full bg-[#FF7A59] text-black flex items-center justify-center ml-auto hover:scale-105 transition"
              onClick={() => {
                if (artist.topSongs?.length > 0) {
                  playTrack(artist.topSongs[0], artist.topSongs);
                }
              }}
            >
              <Play className="w-5 h-5 fill-current ml-1" />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-10">
        {/* Tentang */}
        <section>
          <h2 className="text-lg font-bold text-white mb-2">Tentang</h2>
          <div className="text-white/70 text-sm">
            <p className="mb-1">Artist • {artist.name}</p>
            <p className={isBioExpanded ? "" : "line-clamp-3"}>
              Dengarkan karya-karya terbaik dari {artist.name} di platform ini. Jelajahi berbagai lagu populer, album terbaru, single, dan video musik yang telah dirilis. {artist.name} telah memberikan kontribusi besar dalam industri musik dan terus menghibur para penggemarnya dengan karya-karya yang luar biasa. Temukan juga artis-artis serupa dan playlist yang menampilkan lagu-lagu hits dari {artist.name}.
            </p>
            <button 
              onClick={() => setIsBioExpanded(!isBioExpanded)}
              className="text-white mt-2 text-xs font-medium"
            >
              {isBioExpanded ? "Tampilkan lebih sedikit" : "Tampilkan lebih banyak"}
            </button>
          </div>
        </section>

        {/* Top Songs */}
        {artist.topSongs && artist.topSongs.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Top songs</h2>
            </div>
            <div className="flex flex-col gap-2">
              {artist.topSongs.slice(0, 5).map((song: any, index: number) => (
                <div key={`song-${song.videoId}-${index}`} className="w-full">
                  <TrackItem track={song} queue={artist.topSongs} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Albums */}
        {artist.topAlbums && artist.topAlbums.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Albums</h2>
            <div className="flex overflow-x-auto no-scrollbar gap-4 snap-x snap-mandatory pb-4">
              {artist.topAlbums.map((album: any, index: number) => (
                <div 
                  key={`album-${album.albumId}-${index}`} 
                  className="w-40 shrink-0 snap-start group cursor-pointer"
                  onClick={() => router.push(`/album/${album.albumId}`)}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                    <Image 
                      src={getHighResImage(album.thumbnails?.[album.thumbnails.length - 1]?.url, 400) || '/placeholder.png'} 
                      alt={album.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                        <Play className="w-5 h-5 fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white font-medium truncate">{album.name}</h3>
                  <p className="text-white/50 text-sm truncate">{album.year}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Singles */}
        {artist.topSingles && artist.topSingles.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Singles & EPs</h2>
              <button className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-4 snap-x snap-mandatory pb-4">
              {artist.topSingles.map((single: any, index: number) => (
                <div 
                  key={`single-${single.albumId}-${index}`} 
                  className="w-40 shrink-0 snap-start group cursor-pointer"
                  onClick={() => router.push(`/album/${single.albumId}`)}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                    <Image 
                      src={getHighResImage(single.thumbnails?.[single.thumbnails.length - 1]?.url, 400) || '/placeholder.png'} 
                      alt={single.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                        <Play className="w-5 h-5 fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white font-medium truncate">{single.name}</h3>
                  <p className="text-white/50 text-sm truncate">{single.year}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Videos */}
        {artist.topVideos && artist.topVideos.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Videos</h2>
              <button className="text-white/70 hover:text-white">
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </button>
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-4 snap-x snap-mandatory pb-4">
              {artist.topVideos.map((video: any, index: number) => (
                <div 
                  key={`video-${video.videoId}-${index}`} 
                  className="w-64 shrink-0 snap-start group cursor-pointer"
                  onClick={() => playTrack(video, artist.topVideos)}
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden mb-3">
                    <Image 
                      src={getHighResImage(video.thumbnails?.[video.thumbnails.length - 1]?.url, 400) || '/placeholder.png'} 
                      alt={video.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white font-medium line-clamp-2">{video.name}</h3>
                  <p className="text-white/50 text-sm truncate">{artist.name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Featured On */}
        {artist.featuredOn && artist.featuredOn.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Featured on</h2>
            <div className="flex overflow-x-auto no-scrollbar gap-4 snap-x snap-mandatory pb-4">
              {artist.featuredOn.map((playlist: any, index: number) => (
                <div 
                  key={`playlist-${playlist.playlistId}-${index}`} 
                  className="w-40 shrink-0 snap-start group cursor-pointer"
                  onClick={() => router.push(`/playlist/${playlist.playlistId}`)}
                >
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3">
                    <Image 
                      src={getHighResImage(playlist.thumbnails?.[playlist.thumbnails.length - 1]?.url, 400) || '/placeholder.png'} 
                      alt={playlist.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white backdrop-blur-sm">
                        <Play className="w-5 h-5 fill-current ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-white font-medium truncate">{playlist.name}</h3>
                  <p className="text-white/50 text-sm truncate">Playlist</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fans might also like */}
        {artist.similarArtists && artist.similarArtists.filter((a: any) => a.artistId?.startsWith('UC') || a.artistId?.startsWith('HC')).length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Fans might also like</h2>
            <div className="flex overflow-x-auto no-scrollbar gap-6 snap-x snap-mandatory pb-4">
              {artist.similarArtists.filter((a: any) => a.artistId?.startsWith('UC') || a.artistId?.startsWith('HC')).map((similar: any, index: number) => (
                <div 
                  key={`similar-${similar.artistId}-${index}`} 
                  className="w-32 shrink-0 snap-start group cursor-pointer flex flex-col items-center text-center"
                  onClick={() => router.push(`/artist/${similar.artistId}`)}
                >
                  <div className="relative w-32 h-32 rounded-full overflow-hidden mb-3 bg-white/10">
                    {similar.thumbnails?.[similar.thumbnails.length - 1]?.url && (
                      <Image 
                        src={getHighResImage(similar.thumbnails[similar.thumbnails.length - 1].url, 400)} 
                        alt={similar.name} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    )}
                  </div>
                  <h3 className="text-white font-medium line-clamp-2">{similar.name}</h3>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
