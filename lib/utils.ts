import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getHighResImage(url: string | undefined, size = 800) {
  if (!url) return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect fill='%23222' width='${size}' height='${size}'/%3E%3Ctext x='50%25' y='50%25' font-size='48' fill='%23666' text-anchor='middle' dominant-baseline='middle' font-family='Arial'%3E♪%3C/text%3E%3C/svg%3E`;
  if (url.includes('googleusercontent.com') || url.includes('ytimg.com') || url.includes('ggpht.com')) {
    // Fix YouTube image URLs to ensure high resolution
    if (url.includes('maxresdefault')) {
      return url;
    }
    return url.replace(/=w\d+-h\d+(-c)?/, `=w${size}-h${size}`).replace(/\/w\d+-h\d+(-c)?/, `/w${size}-h${size}`);
  }
  return url;
}
