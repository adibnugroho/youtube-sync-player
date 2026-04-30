import React, { useState } from 'react';
import { X, Info, Crown, Users, ListVideo, LogIn, MessageSquare } from 'lucide-react';

const content = {
  en: {
    title: 'User Guide',
    sections: [
      {
        icon: 'login',
        color: 'text-youtube-red',
        heading: 'Getting Started',
        items: [
          { label: 'Create Room', text: 'Fill in your Username, Room Name, and a Room Password. You will automatically become the Host.' },
          { label: 'Join Room', text: 'Enter your Username, the Room ID (e.g. Room-1234), and the password shared by the room creator.' },
          { label: 'Invite Friends', text: 'Click "Copy Link" inside the room and share it. Your friends only need to enter a username and the room password.' },
        ],
      },
      {
        icon: 'queue',
        color: 'text-youtube-red',
        heading: 'Video Queue',
        items: [
          { label: null, text: 'Everyone in the room can add videos to the queue.' },
          { label: null, text: 'Find a YouTube video, copy its URL, paste it in the right panel, and click "Add".' },
          { label: null, text: 'The queue is real-time and synced for all participants. It automatically advances to the next video when one finishes.' },
          { label: null, text: 'Drag-and-drop items in the queue to reorder them. Use the ▲▼ arrows or "Play Next" to quickly move a video up.' },
        ],
      },
      {
        icon: 'chat',
        color: 'text-youtube-red',
        heading: 'Live Chat & Reactions',
        items: [
          { label: null, text: 'Use the Live Chat tab in the right panel to chat with others in real-time.' },
          { label: null, text: 'Quick Emoji Reactions are available above the text box — send a reaction without typing.' },
          { label: null, text: 'A red dot indicator will appear on the Live Chat tab when a new message arrives while you are viewing the Queue tab.' },
        ],
      },
      {
        icon: 'crown',
        color: 'text-yellow-500',
        heading: 'Host Policy',
        items: [
          { label: null, text: 'The room creator (or whoever receives the Host role) is the Host, marked with a Crown icon (👑).' },
          { label: 'Exclusive Playback Control', text: 'Only the Host\'s actions (Play, Pause, Skip, Play Now) are synced to all participants.' },
          { label: 'Kick User', text: 'The Host can kick disruptive users. Click the online count, then click "Kick" next to a username. The user will be blocked from re-entering with the same name.' },
          { label: 'Transfer Host', text: 'The Host can pass their role to another user via the "Make Host" button in the participants list.' },
          { label: null, text: 'If the Host disconnects, the next user in the room automatically becomes the new Host and re-syncs the video for everyone.' },
        ],
      },
      {
        icon: 'users',
        color: 'text-blue-500',
        heading: 'Guest Policy',
        items: [
          { label: null, text: 'Guests watch in sync with the Host.' },
          { label: null, text: 'Guests can add/remove videos from the queue and chat in Live Chat.' },
          { label: 'Request Host', text: 'Click "Request Host" in the participants list if you need independent playback control. The current Host must approve.' },
        ],
      },
    ],
  },
  id: {
    title: 'Panduan Penggunaan',
    sections: [
      {
        icon: 'login',
        color: 'text-youtube-red',
        heading: 'Mulai & Bergabung',
        items: [
          { label: 'Create Room', text: 'Isi Username, Nama Room, dan Password Room. Anda akan otomatis menjadi Host.' },
          { label: 'Join Room', text: 'Masukkan Username, ID Room (contoh: Room-1234), dan Password yang diberikan oleh pembuat room.' },
          { label: 'Invite Friends', text: 'Klik "Copy Link" di dalam room lalu bagikan. Teman Anda hanya perlu memasukkan username dan password.' },
        ],
      },
      {
        icon: 'queue',
        color: 'text-youtube-red',
        heading: 'Antrian Video (Queue)',
        items: [
          { label: null, text: 'Semua orang di dalam room dapat menambahkan video ke antrian.' },
          { label: null, text: 'Cari video YouTube, salin URL-nya, tempel di panel kanan, lalu klik "Add".' },
          { label: null, text: 'Antrian bersifat real-time dan tersinkronisasi untuk semua peserta. Akan otomatis lanjut ke video berikutnya saat video selesai.' },
          { label: null, text: 'Drag-and-drop item di antrian untuk mengubah urutan. Gunakan tombol ▲▼ atau "Play Next" untuk memindahkan video ke atas dengan cepat.' },
        ],
      },
      {
        icon: 'chat',
        color: 'text-youtube-red',
        heading: 'Live Chat & Reaksi',
        items: [
          { label: null, text: 'Gunakan tab Live Chat di panel kanan untuk mengobrol secara real-time.' },
          { label: null, text: 'Tombol Emoji Reaksi tersedia di atas kotak teks — kirim reaksi tanpa perlu mengetik.' },
          { label: null, text: 'Titik merah akan muncul di tab Live Chat jika ada pesan baru saat Anda sedang di tab Queue.' },
        ],
      },
      {
        icon: 'crown',
        color: 'text-yellow-500',
        heading: 'Kebijakan Host',
        items: [
          { label: null, text: 'Pembuat room (atau penerima estafet) adalah Host, ditandai dengan ikon Mahkota (👑).' },
          { label: 'Hak Eksklusif Pemutaran', text: 'Hanya aksi Host (Play, Pause, Skip, Play Now) yang tersinkronisasi ke semua peserta.' },
          { label: 'Kick User', text: 'Host dapat menendang user yang mengganggu. Klik jumlah online, lalu klik "Kick". User tersebut tidak bisa masuk lagi dengan nama yang sama.' },
          { label: 'Transfer Host', text: 'Host dapat memberikan jabatannya via tombol "Make Host" di daftar partisipan.' },
          { label: null, text: 'Jika Host disconnect, user berikutnya di room otomatis menjadi Host baru dan menyinkronkan video untuk semua.' },
        ],
      },
      {
        icon: 'users',
        color: 'text-blue-500',
        heading: 'Kebijakan Guest',
        items: [
          { label: null, text: 'Guest menonton secara sinkron bersama Host.' },
          { label: null, text: 'Guest dapat menambah/menghapus video dari antrian dan chat di Live Chat.' },
          { label: 'Request Host', text: 'Klik "Request Host" di daftar partisipan jika butuh akses kontrol player. Host aktif harus menyetujui.' },
        ],
      },
    ],
  },
};

const iconMap = {
  login: LogIn,
  queue: ListVideo,
  chat: MessageSquare,
  crown: Crown,
  users: Users,
};

const HelpModal = ({ isOpen, onClose }) => {
  const [lang, setLang] = useState('en');
  if (!isOpen) return null;

  const t = content[lang];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-yt-card border border-yt-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-yt-border bg-black/5 dark:bg-white/5 shrink-0">
          <h2 className="text-xl font-bold flex items-center gap-2 text-yt-text">
            <Info className="w-6 h-6 text-youtube-red" /> {t.title}
          </h2>
          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex items-center gap-2 bg-black/10 dark:bg-white/10 rounded-full px-1 py-1">
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'en' ? 'bg-youtube-red text-white shadow-sm' : 'text-yt-muted hover:text-yt-text'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('id')}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${lang === 'id' ? 'bg-youtube-red text-white shadow-sm' : 'text-yt-muted hover:text-yt-text'}`}
              >
                ID
              </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-yt-text" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-8 text-yt-text">
          {t.sections.map((section) => {
            const Icon = iconMap[section.icon];
            return (
              <section key={section.heading}>
                <h3 className={`text-lg font-bold flex items-center gap-2 mb-3 ${section.color}`}>
                  <Icon className="w-5 h-5" /> {section.heading}
                </h3>
                <ul className="list-disc list-inside space-y-2 text-sm text-yt-muted ml-1">
                  {section.items.map((item, i) => (
                    <li key={i}>
                      {item.label && (
                        <strong className={item.label === 'Kick User' || item.label === 'Menendang (Kick) User' ? 'text-red-500' : 'text-yt-text'}>
                          {item.label}:{' '}
                        </strong>
                      )}
                      {item.text}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default HelpModal;
