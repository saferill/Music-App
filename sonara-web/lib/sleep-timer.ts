import { create } from 'zustand';
import { usePlayerStore } from './store';

interface SleepTimerState {
  isTimerActive: boolean;
  timeRemaining: number | null; // seconds
  stopAtEndOfTrack: boolean;
  setTimer: (minutes: number) => void;
  setStopAtEndOfTrack: () => void;
  clearTimer: () => void;
  tick: () => void;
}

export const useSleepTimerStore = create<SleepTimerState>((set, get) => ({
  isTimerActive: false,
  timeRemaining: null,
  stopAtEndOfTrack: false,
  setTimer: (minutes) => {
    set({ isTimerActive: true, timeRemaining: minutes * 60, stopAtEndOfTrack: false });
  },
  setStopAtEndOfTrack: () => {
    set({ isTimerActive: true, timeRemaining: null, stopAtEndOfTrack: true });
  },
  clearTimer: () => {
    set({ isTimerActive: false, timeRemaining: null, stopAtEndOfTrack: false });
  },
  tick: () => {
    const { isTimerActive, timeRemaining, clearTimer } = get();
    if (!isTimerActive || timeRemaining === null) return;
    
    if (timeRemaining <= 1) {
      usePlayerStore.getState().setPlaying(false);
      clearTimer();
    } else {
      set({ timeRemaining: timeRemaining - 1 });
    }
  }
}));

if (typeof window !== 'undefined') {
  setInterval(() => {
    useSleepTimerStore.getState().tick();
  }, 1000);
}
