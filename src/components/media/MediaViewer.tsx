// src/components/media/MediaViewer.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { cloudinaryService } from '@/services/CloudinaryService';

interface MediaViewerProps {
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnail?: string;
  duration?: number;
}

const MediaViewer: React.FC<MediaViewerProps> = ({ type, url, thumbnail, duration }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [blurDataURL, setBlurDataURL] = useState<string>('');

  /**
   * Generate blur placeholder for images
   */
  useEffect(() => {
    if (type === 'image' && url) {
      // Extract public_id from URL if it's a Cloudinary URL
      const match = url.match(/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      if (match) {
        const publicId = match[1];
        setBlurDataURL(cloudinaryService.getBlurPlaceholder(publicId));
      }
    }
  }, [type, url]);

  /**
   * Image Component
   */
  if (type === 'image') {
    return (
      <div className="relative mb-2 rounded-lg overflow-hidden">
        {/* Blur placeholder */}
        {isLoading && blurDataURL && (
          <img
            src={blurDataURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Actual image */}
        <img
          src={url}
          alt="Shared image"
          className={`max-w-full rounded-lg transition-opacity duration-300 ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={() => setIsLoading(false)}
          loading="lazy"
        />
        
        {/* Loading spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  }

  /**
   * Video Component
   */
  if (type === 'video') {
    return (
      <VideoPlayer
        url={url}
        thumbnail={thumbnail}
        duration={duration}
      />
    );
  }

  /**
   * Audio Component
   */
  if (type === 'audio') {
    return <AudioPlayer url={url} duration={duration} />;
  }

  /**
   * File Component
   */
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 bg-black/20 border border-white/10 rounded-lg hover:bg-black/30 transition mb-2"
    >
      <p className="text-sm text-white">📎 Download File</p>
    </a>
  );
};

/**
 * Video Player Component
 */
const VideoPlayer: React.FC<{
  url: string;
  thumbnail?: string;
  duration?: number;
}> = ({ url, thumbnail, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative mb-2 rounded-lg overflow-hidden group">
      <video
        ref={videoRef}
        src={url}
        poster={thumbnail}
        className="w-full rounded-lg"
        controls
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {duration && (
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
          {formatDuration(duration)}
        </div>
      )}
    </div>
  );
};

/**
 * Audio Player Component
 */
const AudioPlayer: React.FC<{
  url: string;
  duration?: number;
}> = ({ url, duration }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const audioDuration = duration || audioRef.current?.duration || 0;
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="mb-2 p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-white/10 rounded-lg">
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <input
            type="range"
            min="0"
            max={audioDuration}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
            style={{
              background: `linear-gradient(to right, #a855f7 ${progress}%, rgba(255,255,255,0.2) ${progress}%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(audioDuration)}</span>
          </div>
        </div>

        {/* Mute Button */}
        <button
          onClick={toggleMute}
          className="p-2 hover:bg-white/10 rounded-lg transition"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5 text-gray-400" />
          ) : (
            <Volume2 className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Waveform Visualization (Simplified) */}
      <div className="mt-3 flex items-center justify-center gap-0.5 h-8">
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-purple-500/30 rounded-full transition-all duration-150"
            style={{
              height: `${Math.random() * 100}%`,
              opacity: i / 40 < progress / 100 ? 1 : 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Format duration helper
 */
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default MediaViewer;
