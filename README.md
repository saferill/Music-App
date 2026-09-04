<p align="center">
  <img src="Gambar/banner.png" width="100%" alt="Sonara Music Hero Banner" />
</p>

<p align="center">
  <b>A modern, clean, and ad-free music streaming app for Android and Web.</b><br>
  Built with Kotlin Multiplatform and Jetpack Compose, powered by YouTube Music.
</p>

<p align="center">
  <a href="https://github.com/saferill/Music-App/releases"><img src="https://img.shields.io/github/v/release/saferill/Music-App?color=brightgreen&label=Latest%20Release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL%20v3-blue.svg" alt="License"></a>
  <a href="https://github.com/saferill/Music-App"><img src="https://img.shields.io/badge/Platform-Android%20%7C%20Web-orange" alt="Platform"></a>
  <a href="https://github.com/saferill/Music-App/stargazers"><img src="https://img.shields.io/github/stars/saferill/Music-App?color=yellow" alt="Stars"></a>
</p>

---

## 📸 Screenshots

<p align="center">
  <img src="Gambar/1.jpeg" width="18%" alt="Screenshot 1" />
  <img src="Gambar/2.jpeg" width="18%" alt="Screenshot 2" />
  <img src="Gambar/3.jpeg" width="18%" alt="Screenshot 3" />
  <img src="Gambar/4.jpeg" width="18%" alt="Screenshot 4" />
  <img src="Gambar/5.jpeg" width="18%" alt="Screenshot 5" />
</p>

<p align="center">
  <img src="Gambar/6.jpeg" width="18%" alt="Screenshot 6" />
  <img src="Gambar/7.jpeg" width="18%" alt="Screenshot 7" />
  <img src="Gambar/8.jpeg" width="18%" alt="Screenshot 8" />
  <img src="Gambar/9.jpeg" width="18%" alt="Screenshot 9" />
  <img src="Gambar/10.jpeg" width="18%" alt="Screenshot 10" />
</p>

---

## 🌟 Key Features

### 📱 Android Application
- **Ad-Free Streaming:** Stream songs and videos directly from YouTube Music and YouTube with zero ads.
- **Background Playback & Lockscreen:** Full notification controls, Android Auto support, and sleep timer.
- **Synced Lyrics:** Real-time synchronized lyrics with multi-provider fallback (Sonara Lyrics, LRCLIB, Kugou, YouTube Transcript).
- **Offline Mode & Caching:** Download your favorite tracks and cache audio for offline, data-friendly listening.
- **Explore & Discover:** Browse Top Charts, Moods, Genres, Podcasts, and personalized recommendations.
- **Audio Quality:** Prefer high quality audio streams with normalization and equalizer support.
- **Community Enhancements:** Built-in SponsorBlock (skip sponsored segments) and Return YouTube Dislike integration.

### 🌐 Web / PWA App
- **Browser Playback:** Instant music streaming without installation required.
- **PWA Ready:** Installable to your desktop or mobile home screen.
- **Library Sync & Search:** Browse artists, albums, playlists, and top charts directly from the web.

---

## 📥 Download & Installation

You can get the latest release directly from GitHub:

1. Go to the [Releases Page](https://github.com/saferill/Music-App/releases).
2. Download the APK that matches your device architecture:
   - **`arm64-v8a`** (Recommended for most modern Android devices - *~22 MB*)
   - **`armeabi-v7a`** (For older 32-bit Android devices)
   - **`universal`** (Contains all architectures)
3. Open and install the APK on your Android device.

---

## 📂 Project Structure

```text
Music-App/
├── androidApp/          # Android entry point and Android-specific implementations
├── composeApp/          # Shared Compose Multiplatform UI and view models
├── core/                # Common libraries, data repositories, media engines, and scraper
├── fastlane/            # Store metadata, descriptions, and screenshots for IzzyOnDroid/F-Droid
├── Gambar/              # Application screenshots showcase
└── build_and_sign_apk.sh # Build & signing script for release APKs
```

---

## 🔒 Privacy & Data

- **No Tracking:** Sonara Music does not operate a tracking service or require a proprietary Sonara account.
- **Local-First Storage:** All favorites, playlists, download records, and play history stay securely on your local device.
- **Open Source:** Full source code is licensed under the [GNU General Public License v3 (GPLv3)](LICENSE).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [Issues page](https://github.com/saferill/Music-App/issues).

---

<p align="center">Made with ❤️ by <a href="https://github.com/saferill">saferill</a></p>
