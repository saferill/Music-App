# Sonara

Sonara adalah aplikasi pemutar musik modern yang dibangun menggunakan Next.js. Dirancang untuk memberikan pengalaman mendengarkan musik yang mulus dan personal, memungkinkan Anda menjelajahi jutaan lagu, mengelola koleksi musik Anda, dan menemukan artis baru dengan antarmuka yang intuitif dan responsif.

## Fitur
- **Pengelolaan Playlist:** Buat, edit, dan hapus playlist kustom Anda. Tambahkan lagu dari berbagai sumber dan nikmati pemutaran tanpa henti. Aplikasi ini mendukung playlist lokal dan eksternal (misalnya, dari YouTube Music API).
- **Lagu Disukai:** Simpan dan akses cepat semua lagu favorit Anda di satu tempat.
- **Jelajah Artis:** Temukan profil artis secara mendalam, lihat diskografi lengkap mereka (lagu teratas, album, single, video), dan subscribe untuk mendapatkan pembaruan dari artis favorit Anda.
- **Pengalaman Pemutaran:** Putar lagu individual, seluruh playlist, atau mulai mode radio berdasarkan lagu untuk menemukan musik serupa.
- **Perpustakaan Pribadi:** Akses berbagai kategori di perpustakaan musik Anda, termasuk lagu yang disukai, playlist kustom, artis yang disubscribe, riwayat putar, dan dukungan untuk lagu yang diunduh serta diunggah.
- **Dukungan Progressive Web App (PWA):** Instal aplikasi ini langsung ke perangkat Anda untuk akses cepat dan pengalaman seperti aplikasi native.
- **Antarmuka Pengguna Responsif:** Nikmati pengalaman yang konsisten dan optimal di berbagai perangkat, dari desktop hingga seluler.
- **Integrasi Eksternal:** Mengambil dan menampilkan data musik dari sumber eksternal untuk memperkaya konten yang tersedia.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Jalankan aplikasi dalam mode pengembangan:
   `npm run dev`

Ini akan memulai server pengembangan di `http://localhost:3000`.

## Android App

Project ini juga sudah disiapkan sebagai aplikasi Android menggunakan Capacitor.

### Build APK debug

1. Pastikan Android SDK dan Android Studio sudah terpasang.
2. Sinkronkan project Android:
   `npx cap sync android`
3. Build APK debug:
   Dari folder `android`, jalankan `gradlew.bat assembleDebug`

File hasilnya akan ada di:
`android/app/build/outputs/apk/debug/app-debug.apk`

### Build release

Untuk release signed, buat file `android/keystore.properties` berdasarkan `android/keystore.properties.example`, lalu isi path ke file keystore dan password-nya.

Setelah itu, dari folder `android`, jalankan:
`gradlew.bat assembleRelease`

Jika ingin format bundle untuk Play Store:
`gradlew.bat bundleRelease`
