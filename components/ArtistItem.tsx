'use client';

import Image from 'next/image';
import { getHighResImage } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export function ArtistItem({ artist }: { artist: any }) {
  const router = useRouter();
  const thumbnail = getHighResImage(artist.thumbnails?.[artist.thumbnails.length - 1]?.url, 200);

  return (
    <div
      className="flex items-center p-3 hover:bg-white/5 rounded-xl cursor-pointer group transition-colors"
      onClick={() => router.push(`/artist/${artist.artistId}`)}
    >
      <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 bg-white/10">
        {thumbnail && <Image src={thumbnail} alt={artist.name} fill sizes="48px" className="object-cover" />}
      </div>
      <div className="ml-4 flex-1 min-w-0 border-b border-white/5 pb-3 group-hover:border-transparent transition-colors">
        <div className="font-medium truncate text-white">
          {artist.name}
        </div>
        <div className="text-sm text-gray-400 truncate">Artist</div>
      </div>
    </div>
  );
}
