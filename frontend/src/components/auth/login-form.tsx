'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { publicApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

/**
 * Login Form Component
 * Handles Waitlist signup and Guest authentication
 */
export function LoginForm() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleJoinWaitlist = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await publicApi.joinWaitlist({ email, name: name || undefined });
      setSuccess('Successfully joined waitlist! We\'ll be in touch soon.');
      setEmail('');
      setName('');
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        setError('This email is already on the waitlist');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to join waitlist');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleJoinWaitlist();
  };

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px] animate-fade-in-up">
      <div className="flex flex-col space-y-2 text-center">
        <h1 className="text-3xl font-light tracking-tight text-[#e8e8e8]">
          Join the waitlist
        </h1>
        <p className="text-sm font-light text-[#6a6a6a]">
          Enter your email below to join our waitlist
        </p>
      </div>

      <div className="grid gap-6">
        {/* Waitlist Form */}
        <form onSubmit={handleWaitlistSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="sr-only">
                Name
              </Label>
              <Input
                id="name"
                placeholder="Your name (optional)"
                type="text"
                autoCapitalize="words"
                autoComplete="name"
                autoCorrect="off"
                disabled={isLoading}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] placeholder:text-[#6a6a6a]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="sr-only">
                Email
              </Label>
              <Input
                id="email"
                placeholder="name@example.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-[#151515] border-[#2a2a2a] text-[#e8e8e8] placeholder:text-[#6a6a6a]"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-light"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join Waitlist
            </Button>
          </div>
        </form>

        {/* Success Message */}
        {success && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400 text-center font-light animate-fade-in-up">
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 text-center font-light animate-fade-in-up">
            {error}
          </div>
        )}
      </div>

      {/* Terms */}
      <p className="px-8 text-center text-xs font-light text-[#6a6a6a]">
        By clicking continue, you agree to our{' '}
        <a
          href="/terms"
          className="underline underline-offset-4 hover:text-[#e8e8e8] transition-colors"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          className="underline underline-offset-4 hover:text-[#e8e8e8] transition-colors"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}

