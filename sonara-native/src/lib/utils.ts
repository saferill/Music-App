export function getHighResImage(url: string | undefined, size = 800) {
  if (!url) return '';
  if (url.includes('googleusercontent.com') || url.includes('ytimg.com') || url.includes('ggpht.com')) {
    // Fix YouTube image URLs to ensure high resolution
    if (url.includes('maxresdefault')) {
      return url;
    }
    return url.replace(/=w\d+-h\d+(-c)?/, `=w${size}-h${size}`).replace(/\/w\d+-h\d+(-c)?/, `/w${size}-h${size}`);
  }
  return url;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
