import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SlidersHorizontal, X } from 'lucide-react';
import { useEqStore, EQ_PRESETS, type EqPreset } from '@/lib/equalizer';

export function EqualizerDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const { preset, gains, setPreset, setGain } = useEqStore();

  const freqs = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 text-white relative">
        <SlidersHorizontal className="h-5 w-5 sm:h-6 sm:w-6" />
        {preset !== 'Flat' && (
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
                  <h3 className="text-xl font-semibold text-white">Equalizer</h3>
                  <p className="mt-1 text-sm text-white/60">Sesuaikan audio kamu</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full bg-white/10 p-2 text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {(Object.keys(EQ_PRESETS) as EqPreset[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPreset(p)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      preset === p
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex h-48 items-end justify-between gap-2">
                {gains.map((gain, idx) => (
                  <div key={idx} className="flex h-full flex-col items-center gap-2">
                    <span className="text-xs text-white/60">{gain > 0 ? `+${gain}` : gain}</span>
                    <div className="relative flex h-full w-8 justify-center rounded-xl bg-black/40">
                      <input
                        type="range"
                        min="-12"
                        max="12"
                        step="0.5"
                        value={gain}
                        onChange={(e) => setGain(idx, parseFloat(e.target.value))}
                        className="absolute inset-x-0 bottom-0 top-0 m-auto h-[100px] w-4 -rotate-90 appearance-none bg-transparent"
                        style={{
                           appearance: 'none',
                           WebkitAppearance: 'none'
                        }}
                      />
                      {/* Visual fill */}
                      <div className="absolute bottom-0 w-8 rounded-b-xl bg-[var(--accent)]/30 backdrop-blur-md pointer-events-none" style={{ height: `${((gain + 12) / 24) * 100}%` }}>
                         <div className="h-1 w-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent-glow)] rounded-t-sm" />
                      </div>
                    </div>
                    <span className="text-[10px] text-white/40">{freqs[idx]}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
