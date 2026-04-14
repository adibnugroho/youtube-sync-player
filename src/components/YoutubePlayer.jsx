import React, { useRef, useEffect } from 'react';
import YouTube from 'react-youtube';

const YoutubePlayer = ({ currentVideo, onVideoEnd, remotePlayerState, onLocalStateChange, localSessionId, isHost }) => {
  const playerRef = useRef(null);
  const mountTimeRef = useRef(Date.now());

  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      modestbranding: 1,
      rel: 0,
    },
  };

  const handleStateChange = (event) => {
    // 0 = ended, 1 = playing, 2 = paused
    const state = event.data;
    if (state === 0) {
      if (onVideoEnd) onVideoEnd();
    } else if (state === 1 || state === 2) {
      // Mencegah letupan broadcast otomatis di awal komponen dimuat yang mereset video orang lain
      if (Date.now() - mountTimeRef.current < 3000) return;
      
      if (onLocalStateChange) {
        onLocalStateChange(state, event.target.getCurrentTime());
      }
    }
  };

  const handleReady = (event) => {
    playerRef.current = event.target;
    // Mute or Unmute based on Host status on initial ready
    if (isHost) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
  };

  // Mute/Unmute listener dynamically if host status changes
  useEffect(() => {
    if (playerRef.current) {
      if (isHost) {
        playerRef.current.unMute();
      } else {
        playerRef.current.mute();
      }
    }
  }, [isHost]);

  useEffect(() => {
    if (remotePlayerState && playerRef.current && remotePlayerState.updatedBy !== localSessionId) {
      const player = playerRef.current;
      
      const currentTime = player.getCurrentTime() || 0;
      const targetTime = remotePlayerState.time || 0;
      const timeDiff = Math.abs(currentTime - targetTime);
      
      // Mencegah infinite loop: Hanya sinkronisasi jika berbeda cukup jauh atau berpindah play/pause status
      if (remotePlayerState.state === 1) {
        if (timeDiff > 2) {
            player.seekTo(targetTime, true);
        }
        player.playVideo();
      } else if (remotePlayerState.state === 2) {
        if (timeDiff > 0.5) {
            player.seekTo(targetTime, true);
        }
        player.pauseVideo();
      }
    }
  }, [remotePlayerState, localSessionId]);

  if (!currentVideo) {
    return (
      <div className="w-full h-full my-auto aspect-video bg-yt-card border border-yt-border rounded-2xl flex flex-col items-center justify-center text-yt-muted transition-colors duration-300 shadow-2xl">
        <YoutubePlaceholderIcon />
        <p className="mt-4 text-xl font-medium tracking-wide">Queue Kosong</p>
        <p className="text-sm opacity-60 mt-1">Tambahkan video dari panel sebelah kanan</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative group">
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm font-medium text-white/90">Ditambahkan oleh <span className="text-youtube-red">{currentVideo.sender}</span></span>
      </div>
      <YouTube
        videoId={currentVideo.videoId}
        opts={opts}
        onStateChange={handleStateChange}
        onReady={handleReady}
        className="w-full h-full pointer-events-auto"
        iframeClassName="w-full h-full"
      />
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
