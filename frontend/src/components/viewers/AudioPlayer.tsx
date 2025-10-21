"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react';
import { theme } from '@/styles/theme';

interface AudioPlayerProps {
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
}

export default function AudioPlayer({ fileUrl, fileName = 'audio', mimeType = 'audio/mpeg' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.muted = false;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleError = () => {
    setError('Failed to load audio. The format may not be supported.');
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: theme.colors.bg.secondary }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: theme.spacing.sm,
          backgroundColor: theme.colors.bg.elevated,
          borderBottom: `1px solid ${theme.colors.border.primary}`,
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fileName}
        </div>

        <button
          onClick={handleDownload}
          style={{
            padding: '6px',
            borderRadius: theme.radius.sm,
            backgroundColor: 'transparent',
            color: theme.colors.text.primary,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Download"
        >
          <Download size={18} />
        </button>
      </div>

      {/* Audio Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing.xl,
          gap: theme.spacing.lg,
        }}
      >
        {error ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '14px',
              textAlign: 'center',
              gap: theme.spacing.sm,
            }}
          >
            <div>{error}</div>
            <div style={{ fontSize: '12px', color: theme.colors.text.tertiary }}>
              Supported formats: MP3, WAV, OGG, AAC
            </div>
          </div>
        ) : (
          <>
            {/* Audio Element (hidden) */}
            <audio
              ref={audioRef}
              src={fileUrl}
              onError={handleError}
              style={{ display: 'none' }}
            >
              <source src={fileUrl} type={mimeType} />
            </audio>

            {/* Album Art Placeholder */}
            <div
              style={{
                width: '200px',
                height: '200px',
                borderRadius: theme.radius.lg,
                backgroundColor: theme.colors.bg.elevated,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${theme.colors.border.primary}`,
              }}
            >
              <Volume2 size={64} style={{ color: theme.colors.text.tertiary }} />
            </div>

            {/* Time Display */}
            <div style={{ fontSize: '14px', color: theme.colors.text.secondary }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Progress Bar */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              style={{
                width: '100%',
                maxWidth: '400px',
                accentColor: theme.colors.button.primary.bg,
              }}
            />

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
              <button
                onClick={togglePlay}
                style={{
                  padding: theme.spacing.sm,
                  borderRadius: '50%',
                  backgroundColor: theme.colors.button.primary.bg,
                  color: theme.colors.button.primary.text,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                }}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
            </div>

            {/* Volume Control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, width: '100%', maxWidth: '300px' }}>
              <button
                onClick={toggleMute}
                style={{
                  padding: '6px',
                  borderRadius: theme.radius.sm,
                  backgroundColor: 'transparent',
                  color: theme.colors.text.primary,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  flex: 1,
                  accentColor: theme.colors.button.primary.bg,
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
