'use client';

import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useProtectedApi } from '@/hooks/use-protected-api';

interface UserInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function serializeInfo(fields: { name: string; location: string; program: string; school: string; interests: string; notes: string }): string {
  const parts: string[] = [];
  if (fields.name) parts.push(`Name: ${fields.name}`);
  if (fields.location) parts.push(`Location: ${fields.location}`);
  if (fields.program) parts.push(`Program: ${fields.program}`);
  if (fields.school) parts.push(`School: ${fields.school}`);
  if (fields.interests) parts.push(`Interests: ${fields.interests}`);
  if (fields.notes) parts.push(`Notes: ${fields.notes}`);
  return parts.join(' | ');
}

function parseInfo(info: string | null | undefined): { name: string; location: string; program: string; school: string; interests: string; notes: string } {
  const result = { name: '', location: '', program: '', school: '', interests: '', notes: '' };
  if (!info) return result;

  const parts = info.split(' | ');
  for (const part of parts) {
    const colonIdx = part.indexOf(': ');
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).toLowerCase();
    const value = part.slice(colonIdx + 2);
    if (key === 'name') result.name = value;
    else if (key === 'location') result.location = value;
    else if (key === 'program') result.program = value;
    else if (key === 'school') result.school = value;
    else if (key === 'interests') result.interests = value;
    else if (key === 'notes') result.notes = value;
  }
  return result;
}

export function UserInfoDialog({ open, onOpenChange }: UserInfoDialogProps) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [program, setProgram] = useState('');
  const [school, setSchool] = useState('');
  const [interests, setInterests] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const api = useProtectedApi();

  useEffect(() => {
    if (open && !loaded) {
      api.getProfile().then((data) => {
        if (data?.user?.info) {
          const parsed = parseInfo(data.user.info);
          setName(parsed.name);
          setLocation(parsed.location);
          setProgram(parsed.program);
          setSchool(parsed.school);
          setInterests(parsed.interests);
          setNotes(parsed.notes);
        }
        setLoaded(true);
      }).catch(() => {
        setLoaded(true);
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const info = serializeInfo({ name, location, program, school, interests, notes });
      await api.updateProfile({ info });
      onOpenChange(false);
    } catch (err) {
      console.error('failed to save user info:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full h-10 px-3.5 bg-stone-50 ring-1 ring-stone-200 text-stone-800 placeholder:text-stone-400 text-[15px] rounded-xl outline-none focus:ring-stone-300 focus:bg-white transition-all";
  const textareaClass = "w-full px-3.5 py-3 bg-stone-50 ring-1 ring-stone-200 text-stone-800 placeholder:text-stone-400 text-[15px] rounded-xl outline-none focus:ring-stone-300 focus:bg-white transition-all resize-none";
  const labelClass = "text-[13px] text-stone-500 block mb-2 font-medium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] p-0 max-h-[85vh] flex flex-col bg-white border-stone-200 rounded-3xl overflow-hidden shadow-2xl font-sans">
        <div className="px-6 pt-5 pb-4 border-b border-stone-100 flex-shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-3 text-stone-900 tracking-tight text-base font-semibold">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center">
                <User className="h-4 w-4 text-stone-500" />
              </div>
              Your Profile
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 space-y-5">
          <div>
            <label className={labelClass}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, Country"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>School</label>
              <input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="University"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Program</label>
            <input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g., Computer Science"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Interests</label>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="What you're interested in..."
              className={textareaClass}
              style={{ minHeight: '80px' }}
            />
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else..."
              className={textareaClass}
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-stone-100 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-stone-500 hover:text-stone-700 text-[15px] font-medium h-10 px-4 rounded-xl hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-stone-900 hover:bg-stone-800 text-white text-[15px] font-medium h-10 px-5 rounded-xl transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
