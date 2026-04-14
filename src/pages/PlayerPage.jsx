import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, onValue, push, remove, set, onDisconnect } from 'firebase/database';
import { db } from '../firebase';
import YoutubePlayer from '../components/YoutubePlayer';
import QueuePanel from '../components/QueuePanel';
import ThemeToggle from '../components/ThemeToggle';
import { Users, Copy, Check, Play, LogOut, Crown } from 'lucide-react';

const PlayerPage = () => {
  const navigate = useNavigate();
  const roomId = 'global-room';
  
  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 10));
  
  const [username, setUsername] = useState('');
  const [queue, setQueue] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const onlineCountRef = useRef(0); // Supaya bisa dibaca oleh event listener beforeunload
  const [onlineUsers, setOnlineUsers] = useState([]); // array of { sessionId, username }
  const [copied, setCopied] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  
  const [remotePlayerState, setRemotePlayerState] = useState(null);
  
  // Fitur Host
  const [globalHost, setGlobalHost] = useState(null); // { sessionId, username }
  const [hostTransferReq, setHostTransferReq] = useState(null);
  const [hostRequestData, setHostRequestData] = useState(null); // Data user yg minta jadi host
  const [hasRequestedHost, setHasRequestedHost] = useState(false); // Feedback UI tombol
  const [duplicateTabWarning, setDuplicateTabWarning] = useState(false);

  const isLocalHost = globalHost?.sessionId === sessionId;

  // 1. Cek Login & Cek Multitab (BroadcastChannel)
  useEffect(() => {
    const savedName = localStorage.getItem('ytq_username');
    const savedPass = localStorage.getItem('ytq_password');
    if (!savedName || savedPass !== 'Ngewekuda') {
      navigate('/');
      return;
    }
    setUsername(savedName);

    // Kunci Multitab: 1 Browser hanya boleh buka 1 Tab
    const channel = new BroadcastChannel('ytq_sync_channel');
    
    // Beri tahu channel bahwa tab ini online
    channel.postMessage('TAB_OPENED');

    channel.onmessage = (event) => {
      if (event.data === 'TAB_OPENED') {
        // Tab lain baru saja dibuka, kita peringatkan dia bahwa kita sudah ada
        channel.postMessage('ALREADY_ACTIVE');
      } else if (event.data === 'ALREADY_ACTIVE') {
        // Kita yang baru buka, ditolak sama tab lama
        setDuplicateTabWarning(true);
      }
    };

    return () => {
      channel.close();
    };
  }, [navigate]);

  // 2. Setup Firebase Presence, Queue Sync, Player State, & Host
  useEffect(() => {
    if (!username || duplicateTabWarning) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const queueRef = ref(db, `rooms/${roomId}/queue`);
    const playerStateRef = ref(db, `rooms/${roomId}/playerState`);
    const myUserRef = ref(db, `rooms/${roomId}/users/${sessionId}`);
    const connectedRef = ref(db, '.info/connected');
    const hostRef = ref(db, `rooms/${roomId}/hostInfo`);
    const hostTransferRef = ref(db, `rooms/${roomId}/hostTransfer`);

    // Listener Queue
    const unsubQueue = onValue(queueRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const queueArray = Object.entries(data).map(([id, val]) => ({ id, ...val }));
        queueArray.sort((a, b) => (a.orderIndex || a.timestamp) - (b.orderIndex || b.timestamp));
        setQueue(queueArray);
      } else {
        setQueue([]);
      }
    });

    // Listener Player State
    const unsubPlayerState = onValue(playerStateRef, (snapshot) => {
      if (snapshot.exists()) {
        setRemotePlayerState(snapshot.val());
      }
    });

    // Listener Host Transfer Requests
    const unsubTransfer = onValue(hostTransferRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.targetSessionId === sessionId) {
        setHostTransferReq(data);
      } else {
        setHostTransferReq(null);
      }
    });

    // Listener Permintaan (Request) Host dari akun lain
    const reqHostRef = ref(db, `rooms/${roomId}/hostRequest`);
    const unsubReqHost = onValue(reqHostRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.targetSessionId === sessionId) {
        setHostRequestData(data);
      } else {
        setHostRequestData(null);
      }
    });

    // Listener Presence (menggunakan sessionId agar unik per tab)
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        set(myUserRef, { username, sessionId, joinedAt: Date.now() });
        onDisconnect(myUserRef).remove();
      }
    });

    // Listener Online Users Count
    const usersRef = ref(db, `rooms/${roomId}/users`);

    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const usersObj = snapshot.val();
        const count = Object.keys(usersObj).length;
        setOnlineCount(count);
        onlineCountRef.current = count;
        setOnlineUsers(Object.values(usersObj));
      } else {
        setOnlineCount(0);
        onlineCountRef.current = 0;
        setOnlineUsers([]);
      }
    });

    return () => {
      unsubQueue();
      unsubConnected();
      unsubUsers();
      unsubPlayerState();
      unsubTransfer();
      unsubReqHost();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [username, sessionId, roomId, duplicateTabWarning]);

  // 3. Setup Host Initialization
  useEffect(() => {
    if (!username || duplicateTabWarning) return;
    const hostRef = ref(db, `rooms/${roomId}/hostInfo`);
    
    let hostOnDisconnectRef = null;

    const unsubHost = onValue(hostRef, (snapshot) => {
      const hostData = snapshot.val();
      setGlobalHost(hostData);

      // Jika belom ada host, angkat diri sendiri jadi Host pertama kali (siapa cepat dia dapat)
      if (!hostData) {
         set(hostRef, { sessionId, username });
      } else {
         // Jika kitalah Host saat ini, siapkan onDisconnect untuk menghapus tahta kita jika kita mati/keluar
         if (hostData.sessionId === sessionId) {
            if (!hostOnDisconnectRef) {
               hostOnDisconnectRef = onDisconnect(hostRef);
               hostOnDisconnectRef.remove();
            }
         } else {
            // Kita bukan host, batalkan jadwal hapus host dari koneksi kita
            if (hostOnDisconnectRef) {
               hostOnDisconnectRef.cancel();
               hostOnDisconnectRef = null;
            }
         }
      }
    });

    // 4. Sinkronisasi Tab Close (Hard Close)
    const handleBeforeUnload = () => {
      if (onlineCountRef.current <= 1) {
         // Saya adalah orang terakhir, reset semua antrean dan memory ruangan!
         remove(ref(db, `rooms/${roomId}`));
      } else {
         // Orang lain masih ada, hapus saya saja (dan lepaskan tahta Host jika saya pemegangnya)
         const myUserRefSync = ref(db, `rooms/${roomId}/users/${sessionId}`);
         remove(myUserRefSync);
         
         const hostRefSync = ref(db, `rooms/${roomId}/hostInfo`);
         import('firebase/database').then(({ get }) => {
            get(hostRefSync).then(snap => {
               if (snap.val()?.sessionId === sessionId) {
                  remove(hostRefSync);
               }
            });
         });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubHost();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [username, sessionId, roomId, duplicateTabWarning]);


  // Handlers
  const handleAddVideo = (videoId, title = '') => {
    const queueRef = ref(db, `rooms/${roomId}/queue`);
    push(queueRef, { videoId, title, sender: username, timestamp: Date.now(), orderIndex: Date.now() });
  };

  const handleReorderQueue = (newQueueArray) => {
    const updates = {};
    const baseTime = Date.now();
    newQueueArray.forEach((item, index) => {
       updates[`rooms/${roomId}/queue/${item.id}/orderIndex`] = baseTime + index;
    });
    import('firebase/database').then(({ update }) => {
      update(ref(db), updates);
    });
  };

  const handleRemoveVideo = (id) => remove(ref(db, `rooms/${roomId}/queue/${id}`));

  const handleVideoEnd = () => {
    if (queue.length > 0) handleRemoveVideo(queue[0].id);
  };

  // Handles Local Play/Pause sync
  const handleLocalPlayerStateChange = (state, time) => {
    const stateRef = ref(db, `rooms/${roomId}/playerState`);
    set(stateRef, { state, time, updatedBy: sessionId, timestamp: Date.now() });
  };

  const handleCopyLink = () => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    if (onlineCountRef.current <= 1) {
       // Reset ruangan total jika kita orang terakhir
       remove(ref(db, `rooms/${roomId}`));
    } else {
       // Lepaskan memori saya sendiri
       const myUserRefSync = ref(db, `rooms/${roomId}/users/${sessionId}`);
       remove(myUserRefSync);
       if (isLocalHost) {
         remove(ref(db, `rooms/${roomId}/hostInfo`)); 
       }
    }
    
    localStorage.removeItem('ytq_username');
    localStorage.removeItem('ytq_password');
    navigate('/');
  };

  // --- Fitur Host Handlers ---
  const handleSendTransferRequest = (targetSessionId, targetName) => {
    const transferRef = ref(db, `rooms/${roomId}/hostTransfer`);
    set(transferRef, { targetSessionId, targetUsername: targetName, from: username });
  };

  const respondTransfer = (accept) => {
    const transferRef = ref(db, `rooms/${roomId}/hostTransfer`);
    if (accept && hostTransferReq) {
      const hostRef = ref(db, `rooms/${roomId}/hostInfo`);
      set(hostRef, { sessionId, username: hostTransferReq.targetUsername });
    }
    remove(transferRef); // hapus req
  };

  const handleSendHostRequest = (targetSessionId) => {
    if (isLocalHost) return;
    const reqRef = ref(db, `rooms/${roomId}/hostRequest`);
    set(reqRef, { targetSessionId, from: username, fromSessionId: sessionId });
    setHasRequestedHost(true);
    setTimeout(() => setHasRequestedHost(false), 3000);
  };

  const respondHostRequest = (accept) => {
    const reqRef = ref(db, `rooms/${roomId}/hostRequest`);
    if (accept && hostRequestData) {
      const hostRef = ref(db, `rooms/${roomId}/hostInfo`);
      set(hostRef, { sessionId: hostRequestData.fromSessionId, username: hostRequestData.from });
    }
    remove(reqRef);
  };

  if (duplicateTabWarning) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-yt-bg text-yt-text text-center p-6">
        <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-2xl max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Tab Ganda Terdeteksi</h2>
          <p className="text-sm text-yt-muted mb-4 text-balance">
            Anda sudah menjalankan aplikasi ini di tab atau jendela browser lain. Mohon kembali ke tab yang sudah terbuka, atau tutup tab tersebut untuk menyegarkan sesi Anda di sini.
          </p>
        </div>
      </div>
    );
  }

  // Pastikan render tidak terjadi sebelum username di set dari check login selesai
  if (!username) return null;

  const currentVideo = queue.length > 0 ? queue[0] : null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-yt-bg text-yt-text transition-colors duration-300">
      
      {/* Minta Jadi Host Modal Overlay (khusus penerima yg sedang jadi Host) */}
      {hostRequestData && isLocalHost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-yt-card border border-yt-border p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-yt-text mb-2">Permintaan Akses Audio</h3>
              <p className="text-sm text-yt-muted mb-6">
                 <span className="font-semibold text-youtube-red">{hostRequestData.from}</span> meminta kunci sistem (Role Host) dari Anda. Jika Anda memberikan izin, hanya suara di devicenya yang akan menyala.
              </p>
              <div className="flex gap-3">
                 <button onClick={() => respondHostRequest(false)} className="flex-1 py-2.5 rounded-xl border border-yt-border hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors">Tolak</button>
                 <button onClick={() => respondHostRequest(true)} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg transition-colors">Berikan Akses</button>
              </div>
           </div>
        </div>
      )}

      {/* Transfer Host Modal Overlay */}
      {hostTransferReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-yt-card border border-yt-border p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-yt-text mb-2">Penyerahan Host</h3>
              <p className="text-sm text-yt-muted mb-6">
                 <span className="font-semibold text-youtube-red">{hostTransferReq.from}</span> ingin menjadikan Anda sebagai <b>Host Baru</b>. Dengan menerima ini, Anda akan memiliki kontrol eksklusif untuk mengeluarkan suara speaker ruangan ini.
              </p>
              <div className="flex gap-3">
                 <button onClick={() => respondTransfer(false)} className="flex-1 py-2.5 rounded-xl border border-yt-border hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors">Tolak</button>
                 <button onClick={() => respondTransfer(true)} className="flex-1 py-2.5 rounded-xl bg-youtube-red hover:bg-red-600 text-white font-medium shadow-lg transition-colors">Terima</button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-yt-border flex items-center justify-between px-4 sm:px-6 shrink-0 bg-yt-bg/80 backdrop-blur-md z-10 transition-colors">
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 rounded-full bg-youtube-red flex items-center justify-center shadow-lg">
            <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
               Global Room 
               {isLocalHost && <span className="text-[10px] uppercase font-bold bg-yellow-500 text-white px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 animate-in slide-in-from-left-2"><Crown className="w-3 h-3" /> Host</span>}
            </h1>
            <p className="text-xs text-yt-muted">Login: <span className="text-yt-text font-medium">{username}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="hidden lg:inline">{copied ? 'Tersalin!' : 'Copy Link'}</span>
          </button>

          <ThemeToggle />
          
          {/* Online Users Hover Dropdown */}
          <div 
            className="relative"
            onMouseEnter={() => setIsTooltipOpen(true)}
            onMouseLeave={() => setIsTooltipOpen(false)}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 bg-youtube-red/10 border border-youtube-red/20 rounded-lg text-sm font-medium cursor-default hover:bg-youtube-red/20 transition-colors">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <Users className="w-4 h-4 text-youtube-red" />
              <span>{onlineCount}</span>
            </div>

            {/* Dropdown Tooltip with Invisible Bridge */}
            {isTooltipOpen && onlineUsers.length > 0 && (
              <div className="absolute right-0 top-full pt-2 z-50">
                <div className="w-64 bg-yt-card border border-yt-border rounded-xl shadow-2xl p-2">
                  <p className="text-xs font-semibold text-yt-muted mb-2 px-2 uppercase tracking-wider border-b border-yt-border pb-1">Orang di Room ({onlineCount})</p>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {onlineUsers.map((userObj) => {
                    const isMe = userObj.sessionId === sessionId;
                    const isHeHost = globalHost?.sessionId === userObj.sessionId;
                    
                    return (
                      <div key={userObj.sessionId} className="px-2 py-2 text-sm rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between group transition-colors">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0 ${isHeHost ? 'bg-yellow-500 shadow-md' : 'bg-youtube-red'}`}>
                              {isHeHost ? <Crown className="w-3.5 h-3.5" /> : userObj.username.charAt(0)}
                          </div>
                          <span className="truncate flex-1" title={userObj.username}>
                             {userObj.username} {isMe && <span className="text-xs text-youtube-red ml-1">(Anda)</span>}
                          </span>
                        </div>
                        
                        {/* Jika SAYA adalah host saat ini, dan ini BUKAN saya, munculkan tombol transfer */}
                        {isLocalHost && !isMe && (
                          <button 
                            onClick={() => handleSendTransferRequest(userObj.sessionId, userObj.username)}
                            className="opacity-0 group-hover:opacity-100 bg-black/10 dark:bg-white/10 hover:bg-youtube-red text-yt-text hover:text-white px-2 py-1 rounded text-[10px] font-bold transition-all whitespace-nowrap"
                          >
                             Jadikan Host
                          </button>
                        )}

                        {/* Jika SAYA BUKAN host, tapi DIA adalah host, munculkan Minta Host */}
                        {!isLocalHost && isHeHost && !isMe && (
                          <button 
                            onClick={() => handleSendHostRequest(userObj.sessionId)}
                            disabled={hasRequestedHost}
                            className={`opacity-0 group-hover:opacity-100 text-yt-text px-2 py-1 rounded text-[10px] font-bold transition-all whitespace-nowrap ${hasRequestedHost ? 'bg-green-500/20 text-green-500' : 'bg-black/10 dark:bg-white/10 hover:bg-blue-500 hover:text-white'}`}
                          >
                             {hasRequestedHost ? 'Terkirim ✓' : 'Minta Host'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-yt-border mx-1"></div>

          {/* Navigation Controls */}
          {/* Ikon Home Dihapus sesuai arahan */}

          <button 
            onClick={handleLogout}
            title="Keluar Room"
            className="p-1.5 sm:p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors flex items-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Keluar</span>
          </button>

        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        {/* Left: Player */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl aspect-video bg-youtube-red/5 rounded-[100%] blur-[100px] pointer-events-none"></div>
          
          <div className="flex-1 w-full max-w-5xl mx-auto flex items-center justify-center p-0 sm:p-4">
            <YoutubePlayer 
              currentVideo={currentVideo} 
              onVideoEnd={handleVideoEnd}
              remotePlayerState={remotePlayerState}
              onLocalStateChange={handleLocalPlayerStateChange}
              localSessionId={sessionId}
              isHost={isLocalHost}
            />
          </div>
        </div>

        {/* Right: Queue Panel */}
        <div className="w-full lg:w-96 flex flex-col shrink-0 min-h-0 h-[400px] lg:h-full">
          <QueuePanel 
            queue={queue}
            currentVideoId={currentVideo?.videoId}
            onAddVideo={handleAddVideo}
            onRemoveVideo={handleRemoveVideo}
            onSkipVideo={handleVideoEnd}
            onReorderQueue={handleReorderQueue}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;
