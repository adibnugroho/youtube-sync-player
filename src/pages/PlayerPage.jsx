import React, { useState, useEffect, useRef } from 'react';
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
  const onlineCountRef = useRef(0);
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
  const [serverTimeOffset, setServerTimeOffset] = useState(0);

  const isLocalHost = globalHost?.sessionId === sessionId;

  // 1. Cek Login & Cek Multitab
  useEffect(() => {
    const savedName = localStorage.getItem('ytq_username');
    const savedPass = localStorage.getItem('ytq_password');
    if (!savedName || savedPass !== 'Ngewekuda') {
      navigate('/');
      return;
    }
    setUsername(savedName);

    const channel = new BroadcastChannel('ytq_sync_channel');
    channel.postMessage('TAB_OPENED');

    channel.onmessage = (event) => {
      if (event.data === 'TAB_OPENED') {
        channel.postMessage('ALREADY_ACTIVE');
      } else if (event.data === 'ALREADY_ACTIVE') {
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

    const queueRef = ref(db, `rooms/${roomId}/queue`);
    const playerStateRef = ref(db, `rooms/${roomId}/playerState`);
    const myUserRef = ref(db, `rooms/${roomId}/users/${sessionId}`);
    const connectedRef = ref(db, '.info/connected');
    const hostTransferRef = ref(db, `rooms/${roomId}/hostTransfer`);
    const reqHostRef = ref(db, `rooms/${roomId}/hostRequest`);

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

    // Listener Permintaan Host
    const unsubReqHost = onValue(reqHostRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.targetSessionId === sessionId) {
        setHostRequestData(data);
      } else {
        setHostRequestData(null);
      }
    });

    // Listener Presence
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

    // Listener server offset
    const offsetRef = ref(db, ".info/serverTimeOffset");
    const unsubOffset = onValue(offsetRef, (snap) => {
        setServerTimeOffset(snap.val() || 0);
    });

    return () => {
      unsubQueue();
      unsubConnected();
      unsubUsers();
      unsubPlayerState();
      unsubTransfer();
      unsubReqHost();
      unsubOffset();
    };
  }, [username, sessionId, roomId, duplicateTabWarning]);

  // 3. Setup Host Initialization & Reset Sync
  useEffect(() => {
    if (!username || duplicateTabWarning) return;
    const hostRef = ref(db, `rooms/${roomId}/hostInfo`);
    let hostOnDisconnectRef = null;

    const unsubHost = onValue(hostRef, (snapshot) => {
      const hostData = snapshot.val();
      setGlobalHost(hostData);
      if (!hostData) {
         set(hostRef, { sessionId, username });
      } else {
         if (hostData.sessionId === sessionId) {
            if (!hostOnDisconnectRef) {
               hostOnDisconnectRef = onDisconnect(hostRef);
               hostOnDisconnectRef.remove();
            }
         } else if (hostOnDisconnectRef) {
            hostOnDisconnectRef.cancel();
            hostOnDisconnectRef = null;
         }
      }
    });

    const handleBeforeUnload = () => {
      if (onlineCountRef.current <= 1) {
         remove(ref(db, `rooms/${roomId}`));
      } else {
         remove(ref(db, `rooms/${roomId}/users/${sessionId}`));
         import('firebase/database').then(({ get }) => {
            get(hostRef).then(snap => {
               if (snap.val()?.sessionId === sessionId) remove(hostRef);
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

  const handleLocalPlayerStateChange = (state, time) => {
    const stateRef = ref(db, `rooms/${roomId}/playerState`);
    set(stateRef, { 
      state, 
      time, 
      updatedBy: sessionId, 
      timestamp: Date.now() + serverTimeOffset 
    });
  };

  const handleCopyLink = () => {
    const baseUrl = window.location.origin;
    navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    if (onlineCountRef.current <= 1) {
       remove(ref(db, `rooms/${roomId}`));
    } else {
       remove(ref(db, `rooms/${roomId}/users/${sessionId}`));
       if (isLocalHost) remove(ref(db, `rooms/${roomId}/hostInfo`)); 
    }
    localStorage.removeItem('ytq_username');
    localStorage.removeItem('ytq_password');
    navigate('/');
  };

  const handlePlayNow = (id, index) => {
    if (queue.length === 0) return;
    const newQueue = [...queue];
    const [targetItem] = newQueue.splice(index, 1);
    const [oldCurrent] = newQueue.splice(0, 1);
    newQueue.unshift(targetItem);
    handleRemoveVideo(oldCurrent.id);
    handleReorderQueue(newQueue);
  };

  const handleSendTransferRequest = (targetSessionId, targetName) => {
    const transferRef = ref(db, `rooms/${roomId}/hostTransfer`);
    set(transferRef, { targetSessionId, targetUsername: targetName, from: username });
  };

  const respondTransfer = (accept) => {
    const transferRef = ref(db, `rooms/${roomId}/hostTransfer`);
    if (accept && hostTransferReq) {
      set(ref(db, `rooms/${roomId}/hostInfo`), { sessionId, username: hostTransferReq.targetUsername });
    }
    remove(transferRef);
  };

  const handleSendHostRequest = (targetSessionId) => {
    if (isLocalHost) return;
    set(ref(db, `rooms/${roomId}/hostRequest`), { targetSessionId, from: username, fromSessionId: sessionId });
    setHasRequestedHost(true);
    setTimeout(() => setHasRequestedHost(false), 3000);
  };

  const respondHostRequest = (accept) => {
    const reqRef = ref(db, `rooms/${roomId}/hostRequest`);
    if (accept && hostRequestData) {
      set(ref(db, `rooms/${roomId}/hostInfo`), { sessionId: hostRequestData.fromSessionId, username: hostRequestData.from });
    }
    remove(reqRef);
  };

  if (duplicateTabWarning) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-yt-bg text-yt-text text-center p-6 text-balance">
          <h2 className="text-xl font-bold text-red-500 mb-2">Duplicate Tab Detected</h2>
          <p className="text-sm text-yt-muted">You can only open the room in one tab.</p>
      </div>
    );
  }

  if (!username) return null;

  const currentVideo = queue.length > 0 ? queue[0] : null;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-yt-bg text-yt-text transition-colors duration-300">
      
      {/* Modals */}
      {hostRequestData && isLocalHost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-yt-card border border-yt-border p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-yt-text mb-2">Audio Access Request</h3>
              <p className="text-sm text-yt-muted mb-6"> {hostRequestData.from} is requesting the Host role.</p>
              <div className="flex gap-3">
                 <button onClick={() => respondHostRequest(false)} className="flex-1 py-2.5 rounded-xl border border-yt-border hover:bg-black/5 dark:hover:bg-white/5 font-medium transition-colors">Decline</button>
                 <button onClick={() => respondHostRequest(true)} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg transition-colors">Grant Access</button>
              </div>
           </div>
        </div>
      )}

      {hostTransferReq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-yt-card border border-yt-border p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-yt-text mb-2">Host Transfer</h3>
              <p className="text-sm text-yt-muted mb-6">{hostTransferReq.from} wants to make you the Host.</p>
              <div className="flex gap-3">
                 <button onClick={() => respondTransfer(false)} className="flex-1 py-2.5 rounded-xl border border-yt-border font-medium transition-colors">Decline</button>
                 <button onClick={() => respondTransfer(true)} className="flex-1 py-2.5 rounded-xl bg-youtube-red hover:bg-red-600 text-white font-medium shadow-lg transition-colors">Accept</button>
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-yt-border flex items-center justify-between px-4 sm:px-6 shrink-0 bg-yt-bg/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-8 h-8 rounded-full bg-youtube-red flex items-center justify-center shadow-lg"><Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" /></div>
          <div>
            <h1 className="font-bold text-lg leading-tight flex items-center gap-2">Global Room {isLocalHost && <Crown className="w-4 h-4 text-yellow-500" />}</h1>
            <p className="text-xs text-yt-muted">Login: <span className="text-yt-text font-medium">{username}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={handleCopyLink} className="flex items-center gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            <span className="hidden lg:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <ThemeToggle />
          <div className="relative" onMouseEnter={() => setIsTooltipOpen(true)} onMouseLeave={() => setIsTooltipOpen(false)}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-youtube-red/10 border border-youtube-red/20 rounded-lg text-sm font-medium cursor-default hover:bg-youtube-red/20 transition-colors">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <Users className="w-4 h-4 text-youtube-red" />
              <span>{onlineCount}</span>
            </div>
            {isTooltipOpen && onlineUsers.length > 0 && (
              <div className="absolute right-0 top-full pt-2 z-50">
                <div className="w-64 bg-yt-card border border-yt-border rounded-xl shadow-2xl p-2 max-h-80 overflow-y-auto">
                  {onlineUsers.map((u) => (
                    <div key={u.sessionId} className="px-2 py-2 text-sm rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between group">
                      <span className="truncate flex-1">{u.username} {u.sessionId === sessionId && "(You)"}</span>
                      {isLocalHost && u.sessionId !== sessionId && (
                        <button onClick={() => handleSendTransferRequest(u.sessionId, u.username)} className="opacity-0 group-hover:opacity-100 bg-youtube-red text-white px-2 py-1 rounded text-[10px] font-bold">Make Host</button>
                      )}
                      {!isLocalHost && globalHost?.sessionId === u.sessionId && (
                        <button onClick={() => handleSendHostRequest(u.sessionId)} disabled={hasRequestedHost} className="opacity-0 group-hover:opacity-100 bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-bold">
                           {hasRequestedHost ? 'Sent ✓' : 'Request Host'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="p-1.5 sm:p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg flex items-center gap-2">
            <LogOut className="w-5 h-5" /><span className="text-sm font-medium hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 gap-4 overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-0 sm:p-4">
          <YoutubePlayer 
            currentVideo={currentVideo} 
            onVideoEnd={handleVideoEnd}
            remotePlayerState={remotePlayerState}
            onLocalStateChange={handleLocalPlayerStateChange}
            localSessionId={sessionId}
            isHost={isLocalHost}
            serverTimeOffset={serverTimeOffset}
          />
        </div>
        <div className="w-full lg:w-96 flex flex-col shrink-0 min-h-0 h-[400px] lg:h-full">
          <QueuePanel 
            queue={queue}
            currentVideoId={currentVideo?.videoId}
            onAddVideo={handleAddVideo}
            onRemoveVideo={handleRemoveVideo}
            onSkipVideo={handleVideoEnd}
            onReorderQueue={handleReorderQueue}
            onPlayNow={handlePlayNow}
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerPage;
