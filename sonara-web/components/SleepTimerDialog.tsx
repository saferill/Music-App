import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, X, Moon } from 'lucide-react';
import { useSleepTimerStore } from '@/lib/sleep-timer';

export function SleepTimerDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { isTimerActive, timeRemaining, stopAtEndOfTrack, setTimer, setStopAtEndOfTrack, clearTimer } = useSleepTimerStore();

  const handleSelectTime = (minutes: number) => {
    setTimer(minutes);
    setIsOpen(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 text-white relative">
        <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
        {isTimerActive && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--accent)]"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-[28px] glass-panel-strong p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-white">Timer Tidur</h3>
                  <p className="mt-1 text-sm text-white/60">Hentikan musik otomatis</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {isTimerActive ? (
                <div className="mb-6 rounded-2xl bg-white/5 p-4 border border-white/10">
                  <div className="flex items-center gap-3 mb-2 text-[var(--accent)]">
                    <Moon className="h-5 w-5" />
                    <span className="font-semibold">Timer Aktif</span>
                  </div>
                  <div className="text-2xl font-bold text-white mb-4">
                    {stopAtEndOfTrack ? 'Selesai lagu ini' : timeRemaining ? formatTime(timeRemaining) : ''}
                  </div>
                  <button
                    onClick={() => { clearTimer(); setIsOpen(false); }}
                    className="w-full rounded-xl bg-red-500/20 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500/30"
                  >
                    Matikan Timer
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-2">
                  {[15, 30, 45, 60].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => handleSelectTime(minutes)}
                      className="rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition hover:bg-white/10 hover:border-white/20"
                    >
                      {minutes} Menit
                    </button>
                  ))}
                  <button
                    onClick={() => { setStopAtEndOfTrack(); setIsOpen(false); }}
                    className="col-span-2 rounded-xl border border-white/10 bg-white/5 py-4 text-sm font-medium text-white transition hover:bg-white/10 hover:border-white/20"
                  >
                    Akhir Lagu Ini
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
