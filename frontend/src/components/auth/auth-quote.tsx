'use client';

import { VideoPlayer } from '@/components/ui/video-player';

/**
 * Auth Quote Component
 * Displays company branding and video player on login page
 */
export function AuthQuote() {
  return (
    <div className="relative hidden h-full flex-col bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] p-10 xl:p-12 text-white lg:flex overflow-hidden">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent" />
      
      {/* Decorative gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full gap-8">
        {/* Brand - Centered at top */}
        <div className="flex flex-col items-center justify-center pt-8">
          <h1 className="text-4xl xl:text-5xl font-light tracking-tight text-center mb-2">
            outreach
          </h1>
          <p className="text-lg xl:text-xl font-light text-[#a8a8a8] text-center">
            don't ask, don't get.
          </p>
        </div>

        {/* Video Player */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl xl:max-w-5xl">
            <VideoPlayer
              src="https://youtu.be/3kL3nEbxLi0"
              title="Product Demo"
              aspectRatio="16/9"
              className="border-white/20 shadow-2xl"
            />
          </div>
        </div>

        {/* Message */}
        <div className="flex flex-col items-center justify-center pb-8 space-y-3">
          <p className="text-lg xl:text-xl font-light text-center text-[#e8e8e8] max-w-md leading-relaxed">
            I got 7+ interviews, 2 internships, and a convo with Mark Cuban from cold emailing. Just ask.
          </p>
          <p className="text-sm xl:text-base font-light text-center text-[#a8a8a8] max-w-md">
            To learn more about the project,{' '}
            <a
              href="https://substack.com/@khizar949459/note/c-173113875"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[#e8e8e8] transition-colors"
            >
              read here
            </a>
            . To see my other stuff,{' '}
            <a
              href="https://khizarmalik.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[#e8e8e8] transition-colors"
            >
              check here
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

