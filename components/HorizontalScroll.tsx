'use client';

import { Track, usePlayerStore } from '@/lib/store';
import Image from 'next/image';
import { getHighResImage } from '@/lib/utils';
import { motion } from 'motion/react';

export function HorizontalScroll({ title, tracks }: { title: string; tracks: Track[] }) {
  const playTrack = usePlayerStore((state) => state.playTrack);

  return (
    <div className="mb-8">
      <h2 className="text-xl font-bold text-white mb-4 px-4">{title}</h2>
      <div className="flex overflow-x-auto no-scrollbar gap-4 px-4 pb-4 snap-x snap-mandatory scroll-smooth">
        {tracks.map((track, i) => {
          const thumbnail = getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 400);
          const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist';

          return (
            <motion.div
              key={`${track.videoId}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-none w-36 cursor-pointer group snap-center hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
              onClick={() => playTrack(track, tracks)}
            >
              <div className="relative w-36 h-36 rounded-xl overflow-hidden mb-2 shadow-lg transition-transform duration-300">
                <Image src={thumbnail} alt={track.name} fill sizes="144px" className="object-cover" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-sm font-medium text-white line-clamp-2 leading-tight">{track.name}</div>
              <div className="text-xs text-gray-400 truncate mt-1">{artistName}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
