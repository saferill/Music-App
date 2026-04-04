import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EqPreset = 'Flat' | 'Bass Boost' | 'Vocal' | 'Treble Boost' | 'Acoustic' | 'Electronic';

interface EqState {
  preset: EqPreset;
  gains: number[]; // [60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz]
  setPreset: (preset: EqPreset) => void;
  setGain: (index: number, value: number) => void;
}

export const EQ_PRESETS: Record<EqPreset, number[]> = {
  'Flat': [0, 0, 0, 0, 0],
  'Bass Boost': [6, 4, -1, 0, 0],
  'Vocal': [-2, 0, 4, 3, 0],
  'Treble Boost': [0, 0, -1, 4, 6],
  'Acoustic': [2, 1, 0, 2, 3],
  'Electronic': [4, 2, -1, 2, 4]
};

export const useEqStore = create<EqState>()(
  persist(
    (set) => ({
      preset: 'Flat',
      gains: EQ_PRESETS['Flat'],
      setPreset: (preset) => set({ preset, gains: EQ_PRESETS[preset] }),
      setGain: (index, value) =>
        set((state) => {
          const newGains = [...state.gains];
          newGains[index] = value;
          return { gains: newGains, preset: 'Flat' };
        }),
    }),
    {
      name: 'sonara-eq',
    }
  )
);
