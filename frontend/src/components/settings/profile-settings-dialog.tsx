'use client';

import { useState, useEffect } from 'react';
import { useProtectedApi } from '@/hooks/use-protected-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from 'lucide-react';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ProfileSettingsDialog({ open, onOpenChange, onSuccess }: ProfileSettingsDialogProps) {
  const protectedApi = useProtectedApi();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    linkedinUrl: '',
    githubUrl: '',
    websiteUrl: '',
    twitterUrl: '',
  });

  // Load profile data when dialog opens
  useEffect(() => {
    if (open) {
      loadProfile();
    } else {
      // Reset form and error when dialog closes
      setError(null);
    }
  }, [open]);

  const loadProfile = async () => {
    setIsLoadingProfile(true);
    setError(null);
    try {
      // Try cache first, then fetch from API if needed
      const response = await protectedApi.getProfile();
      if (response.success && response.user) {
        setFormData({
          name: response.user.name || '',
          linkedinUrl: response.user.linkedinUrl || '',
          githubUrl: response.user.githubUrl || '',
          websiteUrl: response.user.websiteUrl || '',
          twitterUrl: response.user.twitterUrl || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      // Convert empty strings to undefined for optional fields
      const updateData: {
        name?: string;
        linkedinUrl?: string;
        githubUrl?: string;
        websiteUrl?: string;
        twitterUrl?: string;
      } = {};

      if (formData.name.trim() !== '') {
        updateData.name = formData.name.trim();
      }
      if (formData.linkedinUrl.trim() !== '') {
        updateData.linkedinUrl = formData.linkedinUrl.trim();
      } else {
        updateData.linkedinUrl = '';
      }
      if (formData.githubUrl.trim() !== '') {
        updateData.githubUrl = formData.githubUrl.trim();
      } else {
        updateData.githubUrl = '';
      }
      if (formData.websiteUrl.trim() !== '') {
        updateData.websiteUrl = formData.websiteUrl.trim();
      } else {
        updateData.websiteUrl = '';
      }
      if (formData.twitterUrl.trim() !== '') {
        updateData.twitterUrl = formData.twitterUrl.trim();
      } else {
        updateData.twitterUrl = '';
      }

      await protectedApi.updateProfile(updateData);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#2a2a2a] flex-shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription>
              Customize your profile information and social media links.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#6a6a6a]" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  Name
                </Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 font-sans font-light tracking-wide"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinUrl" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  LinkedIn URL
                </Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={formData.linkedinUrl}
                  onChange={e => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 font-sans font-light tracking-wide"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="githubUrl" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  GitHub URL
                </Label>
                <Input
                  id="githubUrl"
                  type="url"
                  placeholder="https://github.com/yourusername"
                  value={formData.githubUrl}
                  onChange={e => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 font-sans font-light tracking-wide"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  Website URL
                </Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={formData.websiteUrl}
                  onChange={e => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 font-sans font-light tracking-wide"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitterUrl" className="text-sm font-medium text-gray-400 font-sans font-light tracking-wide">
                  Twitter URL
                </Label>
                <Input
                  id="twitterUrl"
                  type="url"
                  placeholder="https://twitter.com/yourusername"
                  value={formData.twitterUrl}
                  onChange={e => setFormData(prev => ({ ...prev, twitterUrl: e.target.value }))}
                  className="bg-[#0a0a0a] border-[#2a2a2a] text-white focus:border-gray-700 font-sans font-light tracking-wide"
                />
              </div>
            </>
          )}

          {/* Footer */}
          <DialogFooter className="pt-4 flex justify-end gap-3 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isLoadingProfile}
              className="text-gray-400 hover:text-white hover:bg-[#2a2a2a] font-sans font-light tracking-wide"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || isLoadingProfile}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px] font-sans font-light tracking-wide"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

