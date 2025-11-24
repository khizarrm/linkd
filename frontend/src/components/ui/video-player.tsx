'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface VideoPlayerProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  title?: string;
  aspectRatio?: '16/9' | '4/3' | '1/1';
  autoplay?: boolean;
  controls?: boolean;
  muted?: boolean;
  loop?: boolean;
}

/**
 * Video Player Component
 * Composable video player for React and Next.js applications.
 * Supports YouTube embeds and direct video sources.
 */
export function VideoPlayer({
  src,
  title,
  aspectRatio = '16/9',
  autoplay = false,
  controls = true,
  muted = false,
  loop = false,
  className,
  ...props
}: VideoPlayerProps) {
  // Check if it's a YouTube URL
  const isYouTube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/.test(src);
  
  // Extract YouTube video ID
  const getYouTubeId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const youtubeId = isYouTube ? getYouTubeId(src) : null;
  const embedUrl = youtubeId 
    ? `https://www.youtube.com/embed/${youtubeId}?${autoplay ? 'autoplay=1&' : ''}${muted ? 'mute=1&' : ''}${loop ? 'loop=1&playlist=' + youtubeId + '&' : ''}controls=${controls ? 1 : 0}&modestbranding=1&rel=0`
    : null;

  const aspectRatioClass = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
  }[aspectRatio];

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-lg border border-border/60 bg-muted shadow-lg',
        aspectRatioClass,
        className
      )}
      {...props}
    >
      {youtubeId ? (
        <iframe
          src={embedUrl || undefined}
          title={title || 'Video player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <video
          src={src}
          title={title}
          autoPlay={autoplay}
          controls={controls}
          muted={muted}
          loop={loop}
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}

