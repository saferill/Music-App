'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/lib/store';
import { db } from '@/lib/db';
import YouTube from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Heart,
  ChevronDown,
  ListMusic,
  Mic2,
  Shuffle,
  Repeat,
  MoreVertical,
  Cast,
  ListPlus,
  User,
  Music,
  Loader2,
} from 'lucide-react';
import { cn, getHighResImage } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LyricsPayload } from '@/lib/lyrics';

type LyricsStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

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
  const [lyricsState, setLyricsState] = useState<{
    trackId: string | null;
    data: LyricsPayload | null;
    status: LyricsStatus;
  }>({
    trackId: null,
    data: null,
    status: 'idle',
  });
  const [showLyrics, setShowLyrics] = useState(false);
  const [imageErrorTrackId, setImageErrorTrackId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);
  const lyricLineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const lyrics =
    currentTrack && lyricsState.trackId === currentTrack.videoId ? lyricsState.data : null;
  const lyricsStatus: LyricsStatus =
    currentTrack && lyricsState.trackId === currentTrack.videoId ? lyricsState.status : 'idle';
  const imageError = currentTrack ? imageErrorTrackId === currentTrack.videoId : false;

  useEffect(() => {
    if (currentTrack) {
      db.isLiked(currentTrack.videoId).then(setIsLiked);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack || lyricsStatus === 'loading' || lyricsStatus === 'ready') return;

    const artistLabel = Array.isArray(currentTrack.artist)
      ? currentTrack.artist.map((artist) => artist.name).join(', ')
      : currentTrack.artist?.name || '';
    const controller = new AbortController();
    const params = new URLSearchParams({
      id: currentTrack.videoId,
      title: currentTrack.name,
      artist: artistLabel,
    });

    if (currentTrack.duration) {
      params.set('duration', String(currentTrack.duration));
    }

    const loadLyrics = async () => {
      await Promise.resolve();

      if (controller.signal.aborted) return;

      lyricLineRefs.current = [];
      setLyricsState({
        trackId: currentTrack.videoId,
        data: null,
        status: 'loading',
      });

      fetch(`/api/lyrics?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (controller.signal.aborted) return;

          if (data?.lyrics?.lines?.length) {
            setLyricsState({
              trackId: currentTrack.videoId,
              data: data.lyrics,
              status: 'ready',
            });
          } else {
            setLyricsState({
              trackId: currentTrack.videoId,
              data: null,
              status: 'unavailable',
            });
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setLyricsState({
              trackId: currentTrack.videoId,
              data: null,
              status: 'unavailable',
            });
          }
        });
    };

    if (lyricsStatus === 'idle') {
      void loadLyrics();
    }

    return () => controller.abort();
  }, [currentTrack, lyricsState.trackId, lyricsStatus]);

  const handleLike = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (!currentTrack) return;
      if (isLiked) {
        await db.removeLikedSong(currentTrack.videoId);
        setIsLiked(false);
      } else {
        await db.addLikedSong(currentTrack);
        setIsLiked(true);
      }
    },
    [currentTrack, isLiked]
  );

  const onReady = useCallback(
    async (event: any) => {
      playerRef.current = event.target;
      const duration = await event.target.getDuration();
      setDuration(duration || 0);
    },
    [setDuration]
  );

  const onStateChange = useCallback(
    async (event: any) => {
      if (event.data === YouTube.PlayerState.PLAYING) {
        setPlaying(true);
        const duration = await event.target.getDuration();
        setDuration(duration || 0);
      } else if (event.data === YouTube.PlayerState.PAUSED) {
        setPlaying(false);
      } else if (event.data === YouTube.PlayerState.ENDED) {
        playNext();
      }
    },
    [setPlaying, setDuration, playNext]
  );

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
  const activeLyricIndex = lyrics?.synced
    ? lyrics.lines.reduce((matchIndex, line, index) => {
        if (typeof line.startTime === 'number' && progress >= line.startTime) {
          return index;
        }
        return matchIndex;
      }, -1)
    : -1;

  useEffect(() => {
    if (!showLyrics || activeLyricIndex < 0) return;

    lyricLineRefs.current[activeLyricIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeLyricIndex, showLyrics]);

  if (!currentTrack) return null;

  const thumbnail = getHighResImage(currentTrack.thumbnails?.[currentTrack.thumbnails.length - 1]?.url, 800);
  const artistName = Array.isArray(currentTrack.artist)
    ? currentTrack.artist.map((a) => a.name).join(', ')
    : currentTrack.artist?.name || 'Unknown Artist';

  return (
    <>
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

      <AnimatePresence>
        {!isExpanded && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 flex cursor-pointer items-center rounded-[28px] border border-white/10 bg-[#1C1C1E]/95 p-2 pr-3 shadow-2xl backdrop-blur-md md:bottom-6 md:left-6 md:right-auto md:w-[420px] md:rounded-full md:pr-4"
            onClick={() => setExpanded(true)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTrack.videoId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex min-w-0 flex-1 items-center"
              >
                <div className="relative mr-3 h-12 w-12 shrink-0">
                  <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="#FF7A59"
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 46}`}
                      strokeDashoffset={`${2 * Math.PI * 46 * (1 - (duration > 0 ? progress / duration : 0))}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-1 overflow-hidden rounded-full bg-[#222]">
                    {!imageError ? (
                      <Image
                        src={thumbnail}
                        alt={currentTrack.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 500px"
                        className="object-cover"
                        onError={() => setImageErrorTrackId(currentTrack.videoId)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#333] to-[#222]">
                        <Music className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div className="truncate text-sm font-semibold text-white">{currentTrack.name}</div>
                  <div className="flex items-center gap-1 truncate text-xs text-white/60">
                    {currentTrack.isExplicit && (
                      <span className="rounded-sm bg-white/20 px-1 text-[8px] text-white">E</span>
                    )}
                    {artistName}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="ml-2 flex shrink-0 items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition-colors hover:bg-white/10"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5 fill-current" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5 fill-current" />
                )}
              </button>
              <button
                onClick={handleLike}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white transition-colors hover:bg-white/10"
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-[#FF7A59] text-[#FF7A59]' : ''}`} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                : '#121212',
            }}
          >
            <div className="relative z-10 flex h-full flex-col px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:p-6 sm:pb-[calc(1.75rem+env(safe-area-inset-bottom))]">
              <div className="mb-5 flex items-center justify-between sm:mb-8">
                <button onClick={() => setExpanded(false)} className="-ml-2 p-2 text-white">
                  <ChevronDown className="h-7 w-7 sm:h-8 sm:w-8" />
                </button>
                <div className="flex gap-2 sm:gap-4">
                  <button className="p-2 text-white">
                    <Cast className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button className="-mr-2 p-2 text-white">
                    <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col justify-center">
                {showLyrics ? (
                  <div className="glass-panel flex-1 overflow-y-auto rounded-[28px] px-4 py-5 no-scrollbar sm:px-6 sm:py-6">
                    {lyricsStatus === 'loading' ? (
                      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-white/60">
                        <Loader2 className="h-6 w-6 animate-spin text-[#FF7A59]" />
                        <p className="text-sm sm:text-base">Melolo lagi cari lirik terbaik untuk lagu ini.</p>
                      </div>
                    ) : lyrics ? (
                      <div className="space-y-4 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white/60">
                          <Mic2 className="h-3.5 w-3.5 text-[#FF7A59]" />
                          {lyrics.providerLabel}
                          {lyrics.synced ? ' synced' : ' lyrics'}
                        </div>
                        <div className="space-y-3 pb-6 pt-1">
                          {lyrics.lines.map((line, index) => {
                            const isActive = lyrics.synced && index === activeLyricIndex;

                            return (
                              <p
                                key={`${line.text}-${index}`}
                                ref={(node) => {
                                  lyricLineRefs.current[index] = node;
                                }}
                                className={cn(
                                  'whitespace-pre-wrap text-lg font-semibold leading-relaxed transition-all sm:text-2xl',
                                  isActive
                                    ? 'scale-[1.01] text-white'
                                    : lyrics.synced
                                      ? 'text-white/35'
                                      : 'text-white/90'
                                )}
                              >
                                {line.text}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-sm leading-7 text-white/55 sm:text-base">
                        Lirik belum ketemu untuk lagu ini. Melolo sudah coba cari dari beberapa sumber, jadi kalau
                        provider menambah data lagu ini nanti tombol lirik akan ikut hidup.
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
                      className="mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] bg-[#222] shadow-2xl sm:max-w-[360px]"
                    >
                      {!imageError ? (
                        <Image
                          src={thumbnail}
                          alt={currentTrack.name}
                          width={500}
                          height={500}
                          className="h-full w-full object-cover"
                          onError={() => setImageErrorTrackId(currentTrack.videoId)}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#333] to-[#222]">
                          <Music className="h-20 w-20 text-gray-600" />
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>

              <div className="mt-6 sm:mt-8">
                <div className="mb-5 flex items-start justify-between gap-4 sm:mb-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentTrack.videoId}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="min-w-0 flex-1 pr-4"
                    >
                      <h2 className="truncate text-xl font-bold text-white sm:text-2xl">{currentTrack.name}</h2>
                      <p className="truncate text-sm text-white/60 sm:text-lg">{artistName}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex items-center gap-2 sm:gap-4">
                    <button
                      onClick={() => setTrackToAdd(currentTrack)}
                      className="p-2 text-white/80 transition hover:text-white"
                    >
                      <ListPlus className="h-6 w-6 sm:h-7 sm:w-7" />
                    </button>
                    <button onClick={handleLike} className="p-2 text-white transition">
                      <Heart className={cn('h-6 w-6 sm:h-7 sm:w-7', isLiked && 'fill-white')} />
                    </button>
                  </div>
                </div>

                <div className="mb-5 sm:mb-6">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={progress || 0}
                    onChange={handleSeek}
                    className="h-1 w-full appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                  />
                  <div className="mt-2 flex justify-between font-mono text-xs text-white/50">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                <div className="mb-6 flex items-center justify-between px-1 sm:mb-8 sm:px-2">
                  <button className="text-white/80 transition hover:text-white">
                    <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                  <button onClick={playPrev} className="text-white transition hover:text-white">
                    <SkipBack className="h-8 w-8 fill-current sm:h-10 sm:w-10" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 sm:h-20 sm:w-20"
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8 fill-current sm:h-10 sm:w-10" />
                    ) : (
                      <Play className="ml-1 h-8 w-8 fill-current sm:h-10 sm:w-10" />
                    )}
                  </button>
                  <button onClick={playNext} className="text-white transition hover:text-white">
                    <SkipForward className="h-8 w-8 fill-current sm:h-10 sm:w-10" />
                  </button>
                  <button className="text-white/80 transition hover:text-white">
                    <Repeat className="h-5 w-5 sm:h-6 sm:w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-3 items-center gap-2 rounded-[24px] bg-white/5 px-3 py-3 sm:flex sm:justify-between sm:px-6 sm:py-4">
                  <button className="flex flex-col items-center gap-1 text-white/80 transition hover:text-white">
                    <ListMusic className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Up Next</span>
                  </button>
                  <button
                    onClick={() => setShowLyrics(!showLyrics)}
                    className={cn(
                      'flex flex-col items-center gap-1 transition',
                      showLyrics ? 'text-white' : 'text-white/80 hover:text-white'
                    )}
                  >
                    <Mic2 className="h-5 w-5" />
                    <span className="text-[10px] uppercase tracking-wider">Lirik</span>
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
                    className="flex flex-col items-center gap-1 text-white/80 transition hover:text-white"
                  >
                    <User className="h-5 w-5" />
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
