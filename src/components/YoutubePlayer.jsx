import React, { useRef, useEffect, useState } from 'react';
import YouTube from 'react-youtube';

const opts = {
  height: '100%',
  width: '100%',
  playerVars: {
    autoplay: 1,
    modestbranding: 1,
    rel: 0,
  },
};

const YoutubePlayer = ({ currentVideo, onVideoEnd, remotePlayerState, onLocalStateChange, localSessionId, isHost, serverTimeOffset }) => {
  const playerRef = useRef(null);
  const mountTimeRef = useRef(Date.now());

  const handleStateChange = (event) => {
    const state = event.data;
    if (state === 0) {
      if (onVideoEnd) onVideoEnd();
    } else if (state === 1 || state === 2) {
      if (Date.now() - mountTimeRef.current < 3000) return;
      if (state === 2 && document.hidden) return;
      if (onLocalStateChange && isHost) {
        onLocalStateChange(state, event.target.getCurrentTime());
      }
    }
  };

  const forceSync = () => {
    try {
      if (!remotePlayerState || !playerRef.current) return;

      const player = playerRef.current;

      if (!currentVideo) {
        // Hentikan video jika antrean kosong agar tidak ada suara hantu
        const ps = player.getPlayerState();
        if (ps === 1 || ps === 3) player.pauseVideo();
        return;
      }

      const playerVideoId = player.getVideoData()?.video_id;
      const isDifferentVideo = playerVideoId && currentVideo?.videoId && playerVideoId !== currentVideo.videoId;

      const currentTime = player.getCurrentTime() || 0;
      let expectedTime = remotePlayerState.time || 0;

      if (remotePlayerState.state === 1) {
        const currentServerTime = Date.now() + (serverTimeOffset || 0);
        const elapsedSeconds = (currentServerTime - remotePlayerState.timestamp) / 1000;
        expectedTime = Math.max(0, expectedTime + elapsedSeconds);
      }

      if (isDifferentVideo) {
        player.loadVideoById({ videoId: currentVideo.videoId, startSeconds: expectedTime });
        return;
      }

      // FIX #1: Jika client ini yang set state, skip HANYA jika sudah playing
      // Sebelumnya: selalu skip jika updatedBy === localSessionId → host tidak auto-play video baru
      if (remotePlayerState.updatedBy === localSessionId) {
        try {
          const ps = player.getPlayerState();
          if (ps === 1) return; // sudah playing, tidak perlu apa-apa
        } catch (e) {
          return;
        }
      }

      if (remotePlayerState.state === 1) {
        // FIX #2: Jika player di state "ended" (0), gunakan playVideo atau loadVideoById
        try {
          const ps = player.getPlayerState();
          if (ps === 0 && currentVideo?.videoId) {
            player.loadVideoById({ videoId: currentVideo.videoId, startSeconds: expectedTime });
            return;
          }
        } catch (e) {}

        const timeDiff = Math.abs(currentTime - expectedTime);
        if (timeDiff > 2) {
          player.seekTo(expectedTime, true);
        }
        player.playVideo();
      } else if (remotePlayerState.state === 2) {
        const timeDiff = Math.abs(currentTime - expectedTime);
        if (timeDiff > 0.5) {
          player.seekTo(expectedTime, true);
        }
        player.pauseVideo();
      }
    } catch (error) {
      console.warn("YouTube API error in forceSync:", error);
    }
  };

  const handleReady = (event) => {
    playerRef.current = event.target;
    mountTimeRef.current = Date.now();
    playerRef.current.unMute();

    // FIX #3: Beri jeda kecil agar remotePlayerState sudah settle sebelum sync
    setTimeout(() => forceSync(), 300);
  };

  const [isLocalMuted, setIsLocalMuted] = useState(false);

  useEffect(() => {
    if (playerRef.current) {
      if (isLocalMuted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    }
  }, [isLocalMuted]);

  const toggleLocalMute = () => setIsLocalMuted(!isLocalMuted);

  // DIHAPUS: useEffect [currentVideo?.videoId] yang tidak reliable
  // karena playerRef.current = null saat component baru mount
  // Digantikan oleh handleReady + forceSync

  useEffect(() => {
    if (currentVideo) {
      forceSync();
    }
    const handleVisibilityChange = () => {
      if (!document.hidden && currentVideo) forceSync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [remotePlayerState, localSessionId, serverTimeOffset, currentVideo]);

  // Bersihkan playerRef saat komponen unmount agar forceSync tidak memanggil player yang sudah hancur
  useEffect(() => {
    return () => {
      playerRef.current = null;
    };
  }, []);

  const [initialVideoId] = useState(currentVideo?.videoId || '');

  return (
    <div className="w-full h-full relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group">
      
      {/* Placeholder Overlay (Tampil saat queue kosong) */}
      <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-yt-card border border-yt-border transition-opacity duration-300 ${!currentVideo ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <YoutubePlaceholderIcon />
        <p className="mt-4 text-xl font-medium tracking-wide">Empty Queue</p>
        <p className="text-sm opacity-60 mt-1">Add a video from the right panel</p>
      </div>

      {/* Player Area (Selalu dirender agar API YouTube tidak crash saat unmount) */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${currentVideo ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        {currentVideo && (
          <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-sm font-medium text-white/90">Played by <span className="text-youtube-red">{currentVideo.sender}</span></span>
            </div>

            <button
              onClick={toggleLocalMute}
              className={`p-2 rounded-full backdrop-blur-md border transition-all ${isLocalMuted ? 'bg-red-500 border-red-400 text-white' : 'bg-black/60 border-white/10 text-white hover:bg-white/20'}`}
              title={isLocalMuted ? 'Unmute' : 'Mute (Local)'}
            >
              {isLocalMuted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"></path><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              )}
            </button>
          </div>
        )}
        <YouTube
          videoId={initialVideoId}
          opts={opts}
          onStateChange={handleStateChange}
          onReady={handleReady}
          className="w-full h-full pointer-events-auto"
          iframeClassName="w-full h-full"
        />
      </div>
    </div>
  );
};

const YoutubePlaceholderIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

export default YoutubePlayer;
