import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getHighResImage } from '@/lib/utils';
import { notFound } from 'next/navigation';
import YTMusic from 'ytmusic-api';
import AlbumClient from './AlbumClient';
import AlbumTrackClient from './AlbumTrackClient';

async function getAlbumDetails(id: string) {
  try {
    const ytmusic = new YTMusic();
    await ytmusic.initialize();
    const album = await ytmusic.getAlbum(id);
    return album;
  } catch (error: any) {
    if (error?.isAxiosError && error?.response?.status === 400) {
      // Suppress 400 errors as they just mean the ID is invalid
      return null;
    }
    console.error('Error fetching album:', error?.message || error);
    return null;
  }
}

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const album = await getAlbumDetails(resolvedParams.id);

  if (!album) {
    notFound();
  }

  const coverImage = album.thumbnails?.[album.thumbnails.length - 1]?.url || 'https://picsum.photos/seed/album/800/800';
  const totalDuration = album.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
  
  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen pb-24 bg-black">
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur-md pt-6 pb-4 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold text-white truncate">{album.name}</h1>
        </div>
      </div>

      <div className="flex flex-col items-center px-4 mt-4 mb-8">
        <div className="relative w-64 h-64 rounded-xl overflow-hidden shadow-2xl mb-6">
          <Image src={getHighResImage(coverImage, 800)} alt={album.name} fill sizes="(max-width: 640px) 100vw, 300px" className="object-cover" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 text-center">{album.name}</h2>
        <Link href={`/artist/${album.artist.artistId}`} className="text-white/80 hover:underline text-base mb-2">
          {album.artist.name}
        </Link>
        <p className="text-white/60 text-sm mb-6">
          {album.year} • {album.songs.length} lagu • {formatDuration(totalDuration)}
        </p>
        
        <AlbumClient album={album} />
      </div>

      <div className="space-y-1">
        {album.songs.map((track, index) => {
          const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || album.artist.name;
          
          return (
            <AlbumTrackItem 
              key={`${track.videoId}-${index}`} 
              track={track} 
              index={index} 
              album={album} 
              artistName={artistName} 
            />
          );
        })}
      </div>
    </main>
  );
}

function AlbumTrackItem({ track, index, album, artistName }: { track: any, index: number, album: any, artistName: string }) {
  return (
    <AlbumTrackClient track={track} index={index} album={album} artistName={artistName} />
  );
}
