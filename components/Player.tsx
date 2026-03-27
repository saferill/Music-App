'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/lib/store';
import { db } from '@/lib/db';
import YouTube from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Heart, ChevronDown, ListMusic, Mic2, Shuffle, Repeat, Maximize2, MoreVertical, Cast, ListPlus, User, Music } from 'lucide-react';
import { cn, getHighResImage } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export function Player() {
  const router = useRouter();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const isExpanded = usePlayerStore((state) => state.isExpanded);
  const progress = usePlayerStore((state) => state.progress);
  const duration = usePlayerStore((state) => state.duration);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const setPlaying = usePlayerStore((state) => state.setPlaying);
  const setExpanded = usePlayerStore((state) => state.setExpanded);
  const setProgress = usePlayerStore((state) => state.setProgress);
  const setDuration = usePlayerStore((state) => state.setDuration);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrev = usePlayerStore((state) => state.playPrev);
  const setTrackToAdd = usePlayerStore((state) => state.setTrackToAdd);
  const dominantColor = usePlayerStore((state) => state.dominantColor);

  const [isLiked, setIsLiked] = useState(false);
  const [lyrics, setLyrics] = useState<{ text: string }[] | null>(null);
  const [showLyrics, setShowLyrics] = useState(false);
  const [imageError, setImageError] = useState(false);
  const playerRef = useRef<any>(null);

  // Reset lyrics when track changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLyrics(null);
    setImageError(false);
  }, [currentTrack?.videoId]);

  useEffect(() => {
    if (currentTrack) {
      db.isLiked(currentTrack.videoId).then(setIsLiked);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (currentTrack && showLyrics && !lyrics) {
      fetch(`/api/lyrics?id=${currentTrack.videoId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.lyrics && data.lyrics.lyrics) {
            setLyrics([{ text: data.lyrics.lyrics || data.lyrics }]);
          } else {
            setLyrics(null);
          }
        })
        .catch(() => setLyrics(null));
    }
  }, [currentTrack, showLyrics, lyrics]);

  const handleLike = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentTrack) return;
    if (isLiked) {
      await db.removeLikedSong(currentTrack.videoId);
      setIsLiked(false);
    } else {
      await db.addLikedSong(currentTrack);
      setIsLiked(true);
    }
  }, [currentTrack, isLiked]);

  const onReady = useCallback(async (event: any) => {
    playerRef.current = event.target;
    const duration = await event.target.getDuration();
    setDuration(duration || 0);
  }, [setDuration]);

  const onStateChange = useCallback(async (event: any) => {
    if (event.data === YouTube.PlayerState.PLAYING) {
      setPlaying(true);
      const duration = await event.target.getDuration();
      setDuration(duration || 0);
    } else if (event.data === YouTube.PlayerState.PAUSED) {
      setPlaying(false);
    } else if (event.data === YouTube.PlayerState.ENDED) {
      playNext();
    }
  }, [setPlaying, setDuration, playNext]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(async () => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          const time = await playerRef.current.getCurrentTime();
          setProgress(time || 0);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, setProgress]);

  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isPlaying]);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setProgress(newTime);
    if (playerRef.current) {
      playerRef.current.seekTo(newTime, true);
    }
  };

  if (!currentTrack) return null;

  const thumbnail = getHighResImage(currentTrack.thumbnails?.[currentTrack.thumbnails.length - 1]?.url, 800);
  const artistName = Array.isArray(currentTrack.artist) ? currentTrack.artist.map(a => a.name).join(', ') : currentTrack.artist?.name || 'Unknown Artist';

  return (
    <>
      {/* Hidden YouTube Player */}
      <div className="hidden">
        <YouTube
          videoId={currentTrack.videoId}
          opts={{
            height: '0',
            width: '0',
            playerVars: {
              autoplay: 1,
              controls: 0,
              playsinline: 1,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
        />
      </div>

      {/* Mini Player */}
      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[80px] left-4 right-4 z-50 flex cursor-pointer items-center rounded-full border border-white/10 bg-[#1C1C1E]/95 p-2 pr-4 shadow-2xl backdrop-blur-md md:bottom-6 md:left-6 md:right-auto md:w-[420px]"
            onClick={() => setExpanded(true)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.videoId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center flex-1 min-w-0"
              >
                {/* Circular Album Art with Progress */}
                <div className="relative w-12 h-12 shrink-0 mr-3">
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle 
                      cx="50" cy="50" r="46" fill="none" stroke="#FF7A59" strokeWidth="4" 
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeDashoffset={`${2 * Math.PI * 46 * (1 - (duration > 0 ? progress / duration : 0))}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-1 rounded-full overflow-hidden bg-[#222]">
                    {!imageError ? (
                      <Image 
                        src={thumbnail} 
                        alt={currentTrack.name} 
                        fill 
                        sizes="(max-width: 640px) 100vw, 500px" 
                        className="object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#333] to-[#222]">
                        <Music className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="text-white text-sm font-semibold truncate">{currentTrack.name}</div>
                  <div className="text-white/60 text-xs truncate flex items-center gap-1">
                    {currentTrack.isExplicit && <span className="bg-white/20 text-[8px] px-1 rounded-sm text-white">E</span>}
                    {artistName}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
              </button>
              <button
                onClick={handleLike}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-[#FF7A59] text-[#FF7A59]' : ''}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded Player */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] flex flex-col"
            style={{
              background: dominantColor 
                ? `linear-gradient(to bottom, color-mix(in srgb, ${dominantColor} 40%, #121212) 0%, #121212 100%)`
                : '#121212'
            }}
          >
            <div className="relative z-10 flex flex-col h-full p-6 pb-8">
              {/* Header */}
              <div className="flex justify-between items-center mb-8">
                <button onClick={() => setExpanded(false)} className="p-2 -ml-2 text-white">
                  <ChevronDown className="w-8 h-8" />
                </button>
                <div className="flex gap-4">
                  <button className="p-2 text-white">
                    <Cast className="w-6 h-6" />
                  </button>
                  <button className="p-2 -mr-2 text-white">
                    <MoreVertical className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 flex flex-col justify-center min-h-0">
                {showLyrics ? (
                  <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
                    {lyrics ? (
                      <div className="text-2xl font-bold leading-relaxed text-white/90 space-y-6 text-center">
                        {lyrics.map((line, i) => (
                          <p key={i} className="whitespace-pre-wrap">{line.text}</p>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-white/50 text-lg">
                        Lyrics not available
                      </div>
                    )}
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack.videoId}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: isPlaying ? 1 : 0.95 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                      className="w-full aspect-square rounded-xl overflow-hidden shadow-2xl mx-auto max-w-[360px] bg-[#222]"
                    >
                      {!imageError ? (
                        <Image 
                          src={thumbnail} 
                          alt={currentTrack.name} 
                          width={500} 
                          height={500} 
                          className="w-full h-full object-cover"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#333] to-[#222]">
                          <Music className="w-20 h-20 text-gray-600" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              {/* Controls Area */}
              <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={currentTrack.videoId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="min-w-0 flex-1 pr-4"
                    >
                      <h2 className="text-2xl font-bold text-white truncate">{currentTrack.name}</h2>
                      <p className="text-lg text-white/60 truncate">{artistName}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex items-center gap-4">
                    <button onClick={() => setTrackToAdd(currentTrack)} className="p-2 text-white/80 hover:text-white transition">
                      <ListPlus className="w-7 h-7" />
                    </button>
                    <button onClick={handleLike} className="p-2 text-white transition">
                      <Heart className={cn("w-7 h-7", isLiked && "fill-white")} />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress || 0}
                    onChange={handleSeek}
                    className="w-full h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-2 font-mono">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex justify-between items-center mb-8 px-2">
                  <button className="text-white/80 hover:text-white transition">
                    <Shuffle className="w-6 h-6" />
                  </button>
                  <button onClick={playPrev} className="text-white hover:text-white transition">
                    <SkipBack className="w-10 h-10 fill-current" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-20 h-20 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                  </button>
                  <button onClick={playNext} className="text-white hover:text-white transition">
                    <SkipForward className="w-10 h-10 fill-current" />
                  </button>
                  <button className="text-white/80 hover:text-white transition">
                    <Repeat className="w-6 h-6" />
                  </button>
                </div>

                {/* Bottom Actions */}
                <div className="flex justify-between items-center px-6 py-4 bg-white/5 rounded-2xl">
                  <button className="text-white/80 hover:text-white transition flex flex-col items-center gap-1">
                    <ListMusic className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-wider">Up Next</span>
                  </button>
                  <button
                    onClick={() => setShowLyrics(!showLyrics)}
                    className={cn("transition flex flex-col items-center gap-1", showLyrics ? "text-white" : "text-white/80 hover:text-white")}
                  >
                    <Mic2 className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-wider">Lyrics</span>
                  </button>
                  <button 
                    onClick={() => {
                      const artistId = Array.isArray(currentTrack.artist) 
                        ? currentTrack.artist[0]?.artistId 
                        : currentTrack.artist?.artistId;
                      if (artistId) {
                        setExpanded(false);
                        router.push(`/artist/${artistId}`);
                      }
                    }}
                    className="text-white/80 hover:text-white transition flex flex-col items-center gap-1"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] uppercase tracking-wider">Lihat Artis</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
