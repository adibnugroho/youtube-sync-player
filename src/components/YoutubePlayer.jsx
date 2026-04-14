import React, { useRef, useEffect } from 'react';
import YouTube from 'react-youtube';

const YoutubePlayer = ({ currentVideo, onVideoEnd }) => {
  const playerRef = useRef(null);

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
    // 0 = ended
    if (event.data === 0) {
      if (onVideoEnd) onVideoEnd();
    }
  };

  const handleReady = (event) => {
    playerRef.current = event.target;
  };

  if (!currentVideo) {
    return (
      <div className="w-full h-full aspect-video bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center text-youtube-muted">
        <YoutubePlaceholderIcon />
        <p className="mt-4 text-xl font-medium tracking-wide">Queue Kosong</p>
        <p className="text-sm opacity-60 mt-1">Tambahkan video dari panel sebelah kanan</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative group">
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-sm font-medium">Ditambahkan oleh <span className="text-youtube-red">{currentVideo.sender}</span></span>
      </div>
      <YouTube
        videoId={currentVideo.videoId}
        opts={opts}
        onStateChange={handleStateChange}
        onReady={handleReady}
        className="w-full h-full"
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
