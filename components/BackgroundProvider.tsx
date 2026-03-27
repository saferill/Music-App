'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/lib/store';
import { FastAverageColor } from 'fast-average-color';
import { getHighResImage } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function BackgroundProvider() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);
  const dominantColor = usePlayerStore((state) => state.dominantColor);

  useEffect(() => {
    if (!currentTrack?.thumbnails?.length) {
      setDominantColor(null);
      return;
    }

    const fac = new FastAverageColor();
    const imageUrl = getHighResImage(currentTrack.thumbnails[currentTrack.thumbnails.length - 1].url, 400);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = imageUrl;

    img.onload = () => {
      try {
        const color = fac.getColor(img);
        setDominantColor(color.hex);
      } catch (e) {
        console.error('Failed to get average color', e);
        setDominantColor(null);
      }
    };

    img.onerror = () => {
      setDominantColor(null);
    };

    return () => {
      fac.destroy();
    };
  }, [currentTrack?.videoId, currentTrack?.thumbnails, setDominantColor]);

  return (
    <div className="fixed inset-0 -z-50 bg-[#0A0A0A] overflow-hidden pointer-events-none">
      <AnimatePresence>
        {dominantColor && (
          <motion.div
            key={dominantColor}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${dominantColor} 40%, #0A0A0A) 0%, #0A0A0A 100%)`
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
