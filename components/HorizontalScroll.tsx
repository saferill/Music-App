'use client';

import { Track, usePlayerStore } from '@/lib/store';
import Image from 'next/image';
import { getHighResImage } from '@/lib/utils';
import { motion } from 'motion/react';

export function HorizontalScroll({ title, tracks }: { title: string; tracks: Track[] }) {
  const playTrack = usePlayerStore((state) => state.playTrack);

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.3em] text-white/40">Pilihan Kurasi</div>
          <h2 className="mt-1 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <div className="hidden text-sm text-white/45 md:block">Klik kartu untuk langsung memutar</div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory scroll-smooth md:grid md:grid-cols-3 md:gap-5 md:overflow-visible md:pb-0 lg:grid-cols-4 xl:grid-cols-5">
        {tracks.map((track, i) => {
          const thumbnail = getHighResImage(track.thumbnails?.[track.thumbnails.length - 1]?.url, 400);
          const trackTitle = track.name?.trim() || 'Lagu tanpa judul';
          const artistName = Array.isArray(track.artist) ? track.artist.map(a => a.name).join(', ') : track.artist?.name || 'Unknown Artist';

          return (
            <motion.div
              key={`${track.videoId}-${i}`}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="glass-panel group flex-none w-40 cursor-pointer rounded-[28px] p-3 snap-center transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] md:w-auto"
              onClick={() => playTrack(track, tracks)}
            >
              <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-[20px] shadow-lg transition-transform duration-300">
                <Image src={thumbnail} alt={trackTitle} fill sizes="144px" className="object-cover" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold text-white line-clamp-2 leading-tight">{trackTitle}</div>
              <div className="mt-1 text-xs text-gray-300/80 line-clamp-2">{artistName}</div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
