# Sonara Music

Sonara Music is a music streaming project that includes an Android app and a web app/PWA. Both use YouTube Music and YouTube as the main content sources, then wrap them in a lighter, faster, and more personal listening experience for everyday use.

This project is not an official product of YouTube, Google, or Spotify.

## Platform

- `Sonara Music Android` for streaming, library management, lyrics, offline downloads, and playback on Android devices.
- `Sonara Music Web` for browser-based streaming, PWA installation, and sharing the latest APK download link.
- `Stable download route` that always points to the latest Android APK release.

## Android App Features

- Play music and videos from YouTube Music/YouTube without ads, including background playback.
- Explore home, charts, podcasts, moods, genres, and quick recommendations.
- Search songs, artists, albums, videos, podcasts, and playlists from one place.
- Download songs, albums, or playlists for offline playback.
- Audio caching and offline playback support for a more data-friendly experience.
- Synced lyrics, multiple lyric providers, and AI-based lyric translation.
- Local playlists, liked songs, personal mixes, and selective YouTube Music sync features.
- Listening history, playback stats, and a cleaner library experience.
- SponsorBlock and Return YouTube Dislike support for a cleaner video experience.
- Android Auto, widgets, player notifications, sleep timer, and full media controls.

## Web / PWA Features

- Stream music directly from the browser with a modern player.
- Installable to the home screen as a PWA.
- Search songs, artists, albums, and playlists.
- Dedicated pages for artists, albums, playlists, history, top 50, and library.
- Local playlists, liked songs, followed artists, and recent searches stored in the browser.
- Song lyrics, track sharing, and playback notifications.
- Developer page with quick access to the developer profile and the latest APK download button.
- `/download/android/latest` route as a stable Android download link.

## Data Sources

- The main catalog of audio, video, albums, artists, and playlists comes from YouTube Music and YouTube.
- Lyrics may come from multiple providers such as YouTube Transcript, LRCLIB, Lyrics.ovh, KuGou, and other providers used by specific features or platforms.
- Segment skipping uses SponsorBlock.
- Video dislike counts use Return YouTube Dislike.
- Android update metadata and the latest APK files are pulled from GitHub Releases.

## Locally Stored Data

### On Android

- App settings.
- Image, audio, and playback cache.
- Local playlists and library data.
- Listening history and playback statistics.
- Offline download data.

### On Web

- Local playlists.
- Liked songs.
- Followed artists.
- Recent searches.
- Taste profile / onboarding preferences.
- Playback history and update status stored in the browser.

## Privacy

- Sonara Music does not use its own internal Sonara account system.
- Most personal data is stored locally on the user's device or browser.
- Requests to third-party services only happen when related features are used, such as streaming, lyrics, APK updates, SponsorBlock, or dislike counters.
- The Android build in this repository supports Sentry crash reporting integration, but its actual behavior still depends on the build configuration used by the developer.

## Project Structure

- [`androidApp/`](androidApp/) contains the Android entry point.
- [`composeApp/`](composeApp/) contains the shared UI and core application logic.
- [`sonara-web/`](sonara-web/) contains the website and Next.js-based web app.
