# CHANGELOG

Semua perubahan penting pada project **YouTube Sync Player** didokumentasikan di sini.  
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — 2026-04-30

### 🌐 UI & Localization
- **"Panduan" → "Guide"** — Tombol panduan di header room dan halaman depan diubah menjadi "Guide" untuk konsistensi penggunaan Bahasa Inggris di seluruh antarmuka.
- **Language Toggle di User Guide** — Ditambahkan toggle switch EN / ID di dalam modal panduan penggunaan, memungkinkan user beralih antara Bahasa Inggris dan Bahasa Indonesia secara langsung tanpa menutup modal. Default membuka dalam Bahasa Inggris.
- **Konten User Guide diperbarui** — Panduan penggunaan diperbarui untuk mencakup fitur-fitur terbaru yang belum terdokumentasi sebelumnya:
  - Auto-advance video otomatis saat video selesai
  - Drag-and-drop reorder queue
  - Host fallback otomatis jika Host disconnect
  - Request Host memerlukan persetujuan dari Host aktif

### 🔒 Security Fix
- **Firebase Permission Denied saat Create Room** — Rules Firebase yang dipasang sebelumnya menggunakan `.validate: "newData.hasChildren(['state'])"` yang memblokir penulisan ke path `metadata` saat membuat room baru (karena tidak punya field `state`). Rules diperbarui: validasi dihapus, akses tetap dibatasi hanya ke path `/rooms/{roomId}`.

### 🐛 Bug Fixes
- **[High] Auto-play Tidak Sengaja Saat Join Room Paused** — Jika pengguna baru bergabung ke dalam ruangan yang videonya sedang di-*pause* oleh Host, aplikasi sebelumnya menggunakan perintah `loadVideoById()` yang secara otomatis memutar video tersebut (sehingga pengguna baru tidak sinkron dengan Host yang sedang *pause*). **Solusi:** Menambahkan logika pengecekan di `forceSync` untuk menggunakan `cueVideoById()` secara spesifik jika mendeteksi *remote state* sedang dalam status *paused* (2).
- **[Critical] Video Tidak Bisa Di-Play Awal (`An error occurred`)** — Membekukan prop `videoId` ternyata memicu masalah baru di mana jika antrean awal kosong, *iframe* memuat ID video kosong (`""`) dan memicu layar error. Fungsi `forceSync` kemudian gagal memuat video baru karena logika perbandingannya keliru (*undefined* tidak terdeteksi sebagai perubahan). **Solusi:** Memperbaiki logika `isDifferentVideo` agar jika *player* belum memiliki video (status error/*undefined*), ia tetap akan memaksa *load* video baru dari Firebase.
- **[Critical] Vercel Build Error (`[UNLOADABLE_DEPENDENCY]`)** — Gagal *deploy* di Vercel karena Vite tidak dapat memuat file `ErrorBoundary.jsx` yang dibuat via *command line* PowerShell (ter-encode otomatis ke UTF-16 LE). **Solusi:** Menulis ulang file komponen tersebut menggunakan standar *encoding* UTF-8 agar Vercel dapat mem-*build* dan menerapkan perbaikan *crash* yang sudah dibuat.
- **[Critical] Fatal Crash & Blank Page (`TypeError: reading 'src'`)** — Bug fatal dari pustaka `react-youtube` di mana memuat video baru bertabrakan dengan logika sinkronisasi kustom kita, menyebabkan API iframe YouTube *crash* dan seluruh aplikasi React *unmount* menjadi layar hitam pekat. **Solusi:** Prop `videoId` pada komponen YouTube kini "dibekukan" menggunakan state awal (`initialVideoId`), sehingga pustaka tidak lagi mencoba mengganti video secara otomatis. Seluruh kontrol pergantian video (termasuk deteksi perubahan ID) dipindahkan 100% ke logika `forceSync` secara manual.
- **[Critical] Crash API YouTube Saat Antrean Kosong** — Terjadi *race condition* tambahan di mana fungsi `forceSync` masih mencoba memanggil metode pada *player* YouTube (seperti `playVideo`) tepat setelah video terakhir habis dan antrean menjadi kosong, yang menyebabkan YouTube API *crash* karena *iframe* baru saja di-*unmount* oleh React. **Solusi:** Ditambahkan *cleanup function* pada `useEffect` untuk mengosongkan referensi *player*, dan `forceSync` akan otomatis *return early* jika `currentVideo` sudah kosong. Konfigurasi `opts` juga dipindahkan ke luar komponen agar tidak memicu re-render tak terduga.
- **[Critical] Halaman React Crash Tidak Terlihat** — Seluruh aplikasi dibungkus dengan komponen `<ErrorBoundary>` di `App.jsx` untuk menangkap error *rendering* dan menampilkan UI peringatan alih-alih layar hitam/kosong saat *crash* terjadi. Fungsi internal `forceSync` juga dibungkus penuh dengan blok `try...catch` agar error dari API eksternal YouTube tidak menghancurkan aplikasi.
- **[Critical] Queue kosong sendiri saat refresh page** — Bug di mana antrian (queue) bisa tiba-tiba terkuras habis jika Host melakukan refresh halaman (F5) tepat saat video berganti. Diperbaiki dengan mengganti `setTimeout` menjadi **Atomic Multi-path Updates** via Firebase. Perintah hapus antrian dan sinkronisasi `playerState` kini dijamin dieksekusi secara instan dan bersamaan, menghilangkan *race condition* secara permanen.
- **[Critical] Halaman player menjadi blank/hitam setelah auto-advance** — Perilaku React yang me-remount ulang (menghancurkan dan membuat baru) *iframe* YouTube setiap kali video berganti (karena prop `key={currentVideo.id}`) menyebabkan browser sering kali memblokir *autoplay* karena dianggap sebagai *iframe* baru tanpa interaksi user. Prop `key` telah dihapus sehingga *iframe* akan di-daur ulang dengan sangat mulus menggunakan `loadVideoById()` internal.
- **[Critical] Blank screen setelah video selesai** — Player YouTube tidak bisa `resume` dari state `ended` menggunakan `playVideo()`. Diganti dengan `loadVideoById()` agar video bisa di-reload dengan benar.
- **[Critical] Host tidak auto-play video berikutnya** — `forceSync()` selalu skip eksekusi jika `updatedBy === localSessionId`, sehingga host yang men-trigger advance queue tidak pernah memulai video baru. Sekarang skip hanya jika player **sudah dalam kondisi playing**.
- **[Critical] Race condition queue vs playerState** — `playerState` (perintah play) bisa tiba di semua client **sebelum** queue update, menyebabkan `forceSync()` mencoba play video yang belum/sudah tidak ada. Ditambahkan delay 300ms sebelum `set(playerState)` di `handleVideoEnd` dan `handlePlayNow`.
- **[High] Event `ended` YouTube terpanggil dobel** — YouTube API kadang mengirim event `state=0` (ended) lebih dari sekali. Ditambahkan `videoEndLockRef` sebagai kunci untuk mencegah `handleVideoEnd` dieksekusi ganda, menyebabkan video berikutnya juga terhapus dari queue.
- **[High] Host disconnect saat video putar** — Jika host menutup tab saat video sedang berjalan, host baru tidak tahu posisi video saat ini sehingga semua guest tidak bisa sync ulang. Ditambahkan `prevIsHostRef` untuk mendeteksi transisi Guest → Host, dan otomatis broadcast ulang posisi video dari Firebase.
- **[Medium] Stale closure di host fallback effect** — useEffect fallback host membaca `remotePlayerState` dari memory yang sudah lama (stale closure). Diperbaiki dengan membaca langsung dari Firebase menggunakan `get()` saat dibutuhkan.

### 🍎 Layout Fixes (MacBook / Safari)
- **Tampilan queue terpotong di MacBook** — Penyebab: konflik `h-screen` dan `h-[100dvh]` pada elemen root, sidebar terkunci di height 380px (tidak responsif untuk viewport MacBook 13"), dan MacOS overlay scrollbar menyebabkan layout shift saat pertama load.
  - Hapus `h-screen`, gunakan `h-[100dvh]` saja
  - Sidebar diubah ke `h-[45dvh] md:h-[420px] lg:h-full` agar responsif
  - Tambah `overflow-hidden` pada panel konten queue dan chat
  - Tambah `scrollbar-gutter: stable`, `overscroll-behavior: none`, dan `height: 100%` pada `html`, `body`, `#root`

### 🔒 Security
- **Firebase Realtime Database rules diperketat** — Rules sebelumnya membiarkan siapapun baca/tulis seluruh database. Diubah agar hanya path `/rooms/{roomId}` yang dapat diakses.

---

## [v1.5.0] — 2026-04-24

### 🐛 Bug Fixes
- **Auto-play queue tidak berjalan** — Setelah video selesai, layar menjadi blank dan tidak otomatis lanjut ke video berikutnya. Diperbaiki dengan menambahkan reset `playerState` yang lebih strict saat `handleVideoEnd` dipanggil.

---

## [v1.4.0] — 2026-04-23

### 🐛 Bug Fixes
- **Blank page saat navigasi** — Halaman menjadi kosong saat berpindah antar route tertentu.
- **Perbaikan Safari layout** — Elemen terpotong dan tidak sesuai di browser Safari.
- **Perbaikan room handling & autoplay** — Beberapa kondisi edge case pada manajemen room dan autoplay video.
- **Perbaikan wording halaman index** — Teks dan label di halaman utama disesuaikan.

### ✨ Features
- **Live Chat & Kick User** — Ditambahkan fitur Live Chat real-time antar user di dalam room, dan fitur Kick oleh Host untuk mengeluarkan user dari room dengan sistem banned list di Firebase.
- **Panduan Penggunaan (Help Modal)** — Ditambahkan modal panduan berisi cara penggunaan fitur-fitur aplikasi.

---

## [v1.3.0] — 2026-04-15

### ✨ Features
- **Crown icon untuk Host** — Ikon mahkota (👑) ditampilkan di samping nama user yang menjadi Host pada daftar user online.

### 🐛 Bug Fixes
- **Perbaikan layout container Safari** — Penyesuaian constraint layout untuk kompatibilitas Safari.
- **Sync loop & duplicate video skipping** — Diperbaiki bug di mana sync antar client menyebabkan loop yang membuat video di-skip berulang kali.

---

## [v1.2.0] — 2026-04-14

### ✨ Features
- **Request Host** — Guest dapat mengirim permintaan untuk menjadi Host kepada Host aktif, dengan dialog konfirmasi di sisi penerima.
- **Fitur keamanan Host** — Host dapat mute/unmute kontrol player untuk user lain. Ditambahkan notifikasi transfer Host dan larangan membuka room di tab ganda (duplicate tab detection via BroadcastChannel).
- **Drag-and-drop Queue** — User dapat mengubah urutan queue dengan drag-and-drop antar item.
- **Tombol Up/Down & Play Next** — Navigasi urutan queue melalui tombol panah atas/bawah, dan tombol "Play Next" untuk memindahkan video ke posisi antrian kedua.
- **Judul video via oEmbed** — Judul video YouTube diambil otomatis saat URL ditambahkan menggunakan YouTube oEmbed API.
- **Eye Password toggle** — Tombol untuk menampilkan/menyembunyikan password saat login.
- **Purge room otomatis** — Room dan seluruh datanya di Firebase dihapus otomatis saat semua user keluar (room benar-benar kosong).

### 🐛 Bug Fixes
- **Bug rewind auto-play awal** — Video selalu kembali ke detik 0 saat user baru join, meskipun video sudah berjalan lama.
- **UX dropdown hover** — Perbaikan perilaku dropdown daftar user agar tidak menutup sendiri saat di-hover.
- **Input box layout** — Input form queue di-pin di bagian atas agar tetap terlihat saat daftar video memanjang.
- **Fix delay sync server offset** — Sinkronisasi waktu menggunakan `serverTimeOffset` dari Firebase `.info/serverTimeOffset` untuk akurasi posisi video antar client dengan timezone berbeda.
- **Fix layout expansion & queue scrolling** — Konten tidak lagi meluber keluar viewport, queue bisa di-scroll secara independen.
- **Fix user dropdown z-index** — Dropdown daftar user tidak lagi tertutup oleh elemen lain.
- **Fix decorative glow positioning** — Elemen dekoratif background glow diposisikan dengan benar tanpa mengganggu layout.
- **Standarisasi bahasa UI ke English** — Seluruh teks antarmuka dan komentar kode diubah ke Bahasa Inggris.

### 🏗️ Architecture
- **Migrasi ke multi-room architecture** — Dari sistem 1 global room menjadi sistem room berbasis kode unik (`/rooms/{roomId}`), memungkinkan banyak room berjalan bersamaan secara independen.

---

## [v1.0.0] — 2026-04-14

### 🚀 Initial Release
- **Firebase Realtime Database** — Integrasi dengan Firebase untuk sinkronisasi real-time antar client.
- **YouTube Player sync** — Semua user dalam satu room dapat menonton video YouTube secara bersamaan dan tersinkronisasi (play, pause, seek).
- **Queue system** — User dapat menambahkan video ke antrian menggunakan URL YouTube.
- **Host system** — User pertama yang join menjadi Host dan memiliki kontrol penuh atas player.
- **Presence system** — Deteksi user online menggunakan Firebase `onDisconnect`.
- **SPA routing fix** — Penanganan 404 saat refresh halaman pada Single Page Application.
- **Dark / Light mode** — Toggle tema gelap dan terang.

---

*Generated on 2026-04-30*
