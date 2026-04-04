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
    const thumbnails = currentTrack.thumbnails;
    if (!Array.isArray(thumbnails) || thumbnails.length === 0) {
      setDominantColor(null);
      return;
    }
    const imageUrl = getHighResImage(thumbnails[thumbnails.length - 1].url, 400);

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
            className="absolute inset-0 overflow-hidden"
          >
            <div className="absolute inset-0 opacity-40 mix-blend-screen blur-[100px] md:blur-[140px]">
              <motion.div
                animate={{
                  transform: ['translate(0%,0%) scale(1)', 'translate(10%,5%) scale(1.1)', 'translate(-5%,15%) scale(0.9)', 'translate(0%,0%) scale(1)'],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-0 left-0 h-[60vh] w-[60vw] rounded-full"
                style={{ backgroundColor: dominantColor }}
              />
              <motion.div
                animate={{
                  transform: ['translate(0%,0%) scale(1)', 'translate(-10%,-5%) scale(1.2)', 'translate(5%,-10%) scale(1)', 'translate(0%,0%) scale(1)'],
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute bottom-0 right-0 h-[70vh] w-[70vw] rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${dominantColor} 80%, black 20%)` }}
              />
              <motion.div
                animate={{
                  transform: ['translate(0%,0%) scale(1)', 'translate(5%,-15%) scale(0.9)', 'translate(-10%,5%) scale(1.1)', 'translate(0%,0%) scale(1)'],
                }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 h-[50vh] w-[50vw] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, ${dominantColor} 50%, white 10%)` }}
              />
            </div>
            {/* Overlay to ensure text readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A]/40 via-[#0A0A0A]/80 to-[#0A0A0A]" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
