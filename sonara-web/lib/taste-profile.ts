export interface TasteProfile {
  favoriteArtists: string[];
  favoriteGenres: string[];
  createdAt: number;
}

const STORAGE_KEY = 'melolo-taste-profile-v1';

export function readTasteProfile(): TasteProfile | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<TasteProfile>;
    if (!Array.isArray(parsed.favoriteArtists) || !Array.isArray(parsed.favoriteGenres)) {
      return null;
    }

    return {
      favoriteArtists: parsed.favoriteArtists.filter(Boolean),
      favoriteGenres: parsed.favoriteGenres.filter(Boolean),
      createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveTasteProfile(profile: TasteProfile) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new Event('melolo:taste-profile-updated'));
}

export function clearTasteProfile() {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event('melolo:taste-profile-updated'));
}
