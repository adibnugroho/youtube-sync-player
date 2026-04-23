import React from 'react';
import { X, Info, Crown, Users, ListVideo, LogIn, MessageSquare } from 'lucide-react';

const HelpModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-yt-card border border-yt-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-yt-border bg-black/5 dark:bg-white/5 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-yt-text">
            <Info className="w-6 h-6 text-youtube-red" /> Panduan Penggunaan
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-yt-text" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-8 text-yt-text">
          
          <section>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-youtube-red">
              <LogIn className="w-5 h-5" /> Mulai & Bergabung
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yt-muted ml-1">
              <li><strong className="text-yt-text">Create Room:</strong> Buat room baru dengan mengisi Username Anda, Nama Room, dan Password Room. Anda akan otomatis menjadi Host.</li>
              <li><strong className="text-yt-text">Join Room:</strong> Masukkan Username Anda, ID Room (contoh: Room-1234), dan Password Room yang diberikan oleh pembuat room.</li>
              <li><strong className="text-yt-text">Invite Friends:</strong> Cukup klik "Copy Link" di dalam room dan bagikan. Teman Anda hanya perlu memasukkan username dan password.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-youtube-red">
              <ListVideo className="w-5 h-5" /> Input Playlist
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yt-muted ml-1">
              <li>Semua orang di dalam room dapat menambahkan lagu/video ke dalam antrean (Queue).</li>
              <li>Cari video YouTube yang diinginkan, salin Link URL-nya, lalu tempel (paste) pada panel kanan dan klik "Add".</li>
              <li>Antrean video bersifat Real-Time dan tersinkronisasi untuk semua peserta dan akan melompat ke video berikutnya secara otomatis saat video habis.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-youtube-red">
              <MessageSquare className="w-5 h-5" /> Live Chat & Interaksi
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yt-muted ml-1">
              <li>Gunakan tab <strong>Live Chat</strong> di panel kanan untuk mengobrol dengan rekan di ruang yang sama secara Real-Time.</li>
              <li>Terdapat tombol Emoji Cepat (Reactions) di atas kotak ketik untuk mengirimkan reaksi super kilat tanpa perlu mengetik.</li>
              <li>Indikator berupa titik merah akan muncul di Tab Live Chat jika ada pesan masuk saat Anda sedang membuka tab Queue.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-yellow-500">
              <Crown className="w-5 h-5" /> Kebijakan Host
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yt-muted ml-1">
              <li>Pencipta room atau penerima estafet jabatan adalah seorang <strong>Host</strong>. Host ditandai dengan ikon Mahkota (<Crown className="inline w-3 h-3 text-yellow-500"/>).</li>
              <li><strong className="text-yt-text">Hak Eksklusif Pemutaran:</strong> Hanya interaksi Host (Play, Pause, Skip, dan Play Now) yang akan tersinkronisasi ke seluruh pemain di dalam ruangan.</li>
              <li><strong className="text-red-500">Menendang (Kick) User:</strong> Host memiliki wewenang untuk menendang user yang mengganggu. Klik daftar jumlah online, lalu klik "Kick" pada nama yang dituju. User tersebut akan diblokir tidak bisa masuk ruangan lagi dengan nama yang sama.</li>
              <li>Host dapat memberikan jabatannya kepada user lain dengan menekan tombol <strong>"Make Host"</strong> melalui daftar partisipan yang sedang online.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-bold flex items-center gap-2 mb-3 text-blue-500">
              <Users className="w-5 h-5" /> Kebijakan Guest
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yt-muted ml-1">
              <li>Guest dapat menonton secara sinkron bersama Host.</li>
              <li>Guest dapat menambahkan dan menghapus video dari antrean maupun berbincang di Live Chat.</li>
              <li>Guest dapat menekan tombol <strong>"Request Host"</strong> melalui daftar partisipan jika mereka butuh akses kontrol player secara mandiri.</li>
            </ul>
          </section>

        </div>

      </div>
    </div>
  );
};

export default HelpModal;
