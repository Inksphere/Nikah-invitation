import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { WEDDING_DATA } from '../config/weddingData';

export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
}

interface AudioPlayerProps {
  autoPlayTrigger?: boolean;
}

function extractYoutubeId(urlOrId: string): string {
  if (!urlOrId) return '';
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/(?:shorts\/|v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : trimmed;
}

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(
  ({ autoPlayTrigger }, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume] = useState(0.8);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ytIframeRef = useRef<HTMLIFrameElement | null>(null);

    const activeYoutubeId =
      extractYoutubeId(WEDDING_DATA.media.youtubeAudioId) ||
      extractYoutubeId(WEDDING_DATA.media.youtubeShortUrl);

    const playMusic = () => {
      // 1. Play local HTML5 audio directly
      if (audioRef.current) {
        audioRef.current.volume = volume;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              console.log('Audio autoplay prevented or waiting for interaction:', err);
            });
        }
      }

      // 2. Also send play command to YouTube iframe if supported
      try {
        if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
            '*'
          );
        }
      } catch (e) {
        // Ignore cross-origin iframe security notice
      }
    };

    const pauseMusic = () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      try {
        if (ytIframeRef.current && ytIframeRef.current.contentWindow) {
          ytIframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
            '*'
          );
        }
      } catch (e) {}
      setIsPlaying(false);
    };

    const togglePlayback = () => {
      if (isPlaying) {
        pauseMusic();
      } else {
        playMusic();
      }
    };

    useImperativeHandle(ref, () => ({
      play: playMusic,
      pause: pauseMusic,
    }));

    useEffect(() => {
      if (autoPlayTrigger) {
        playMusic();
      }
    }, [autoPlayTrigger]);

    // Handle user interaction anywhere as audio unlocker fallback
    useEffect(() => {
      const handleFirstTouch = () => {
        if (audioRef.current && !isPlaying && autoPlayTrigger) {
          playMusic();
        }
      };
      window.addEventListener('touchstart', handleFirstTouch, { once: true });
      window.addEventListener('click', handleFirstTouch, { once: true });
      return () => {
        window.removeEventListener('touchstart', handleFirstTouch);
        window.removeEventListener('click', handleFirstTouch);
      };
    }, [autoPlayTrigger, isPlaying]);

    return (
      <>
        {/* Native Audio Element that guarantees crystal-clear wedding melody */}
        <audio
          ref={audioRef}
          src={WEDDING_DATA.media.audioUrl || '/audio/nikah_melody.mp3'}
          loop
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* YouTube IFrame Embed */}
        <div className="fixed -bottom-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none">
          <iframe
            ref={ytIframeRef}
            id="yt-player-iframe"
            title="Nikah Nasheed"
            src={`https://www.youtube.com/embed/${activeYoutubeId}?enablejsapi=1&autoplay=1&loop=1&playlist=${activeYoutubeId}&controls=0`}
            allow="autoplay; encrypted-media"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Visual button removed as requested - audio plays in background */}
      </>
    );
  }
);

AudioPlayer.displayName = 'AudioPlayer';
