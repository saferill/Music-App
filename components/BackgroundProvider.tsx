'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/lib/store';
import { FastAverageColor } from 'fast-average-color';
import { getHighResImage } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function BackgroundProvider() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const setDominantColor = usePlayerStore((state) => state.setDominantColor);
  const dominantColor = usePlayerStore((state) => state.dominantColor);
  const prevColorRef = useRef<string | null>(null);

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

  // Inject CSS Variables globally
  useEffect(() => {
    const root = document.documentElement;
    if (dominantColor) {
      root.style.setProperty('--accent', dominantColor);
      root.style.setProperty('--accent-soft', `color-mix(in srgb, ${dominantColor} 20%, transparent)`);
      root.style.setProperty('--accent-strong', `color-mix(in srgb, ${dominantColor} 80%, black)`);
      root.style.setProperty('--accent-glow', `0 0 40px color-mix(in srgb, ${dominantColor} 30%, transparent)`);
      prevColorRef.current = dominantColor;
    } else {
      // Fallback colors
      root.style.setProperty('--accent', '#ff7a59');
      root.style.setProperty('--accent-soft', 'rgba(255, 122, 89, 0.1)');
      root.style.setProperty('--accent-strong', '#ff6347');
      root.style.setProperty('--accent-glow', 'none');
    }
  }, [dominantColor]);

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
              background: `radial-gradient(circle at 50% 0%, color-mix(in srgb, ${dominantColor} 30%, #0A0A0A) 0%, #0A0A0A 100%)`
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
