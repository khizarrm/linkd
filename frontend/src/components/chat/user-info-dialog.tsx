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

  const inputClass = "w-full h-9 px-3 bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder:text-white/15 lowercase tracking-wide text-[13px] rounded-lg outline-none focus:border-white/15 focus:bg-white/[0.05] transition-all";
  const textareaClass = "w-full px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder:text-white/15 lowercase tracking-wide text-[13px] rounded-lg outline-none focus:border-white/15 focus:bg-white/[0.05] transition-all resize-none";
  const labelClass = "text-[10px] uppercase text-white/25 block mb-1 tracking-[0.15em]";
  const font = { fontFamily: 'var(--font-fira-mono)' };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 max-h-[85vh] flex flex-col bg-[#0a0a0a] border-white/[0.06] rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        <div className="px-5 pt-4 pb-3 border-b border-white/[0.04] flex-shrink-0">
          <DialogHeader className="p-0">
            <DialogTitle className="flex items-center gap-2.5 text-white/50 lowercase tracking-wide text-xs font-normal" style={font}>
              <div className="w-6 h-6 rounded-full bg-white/[0.05] flex items-center justify-center">
                <User className="h-3 w-3 text-white/30" />
              </div>
              your info
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-3">
          <div>
            <label className={labelClass} style={font}>name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your full name"
              className={inputClass}
              style={font}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={font}>location</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="city, country"
                className={inputClass}
                style={font}
              />
            </div>
            <div>
              <label className={labelClass} style={font}>school</label>
              <input
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="university"
                className={inputClass}
                style={font}
              />
            </div>
          </div>

          <div>
            <label className={labelClass} style={font}>program</label>
            <input
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              placeholder="e.g., computer science"
              className={inputClass}
              style={font}
            />
          </div>

          <div>
            <label className={labelClass} style={font}>interests</label>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              placeholder="what you're interested in..."
              className={textareaClass}
              style={{ ...font, minHeight: '64px' }}
            />
          </div>

          <div>
            <label className={labelClass} style={font}>notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="anything else..."
              className={textareaClass}
              style={{ ...font, minHeight: '64px' }}
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-white/[0.04] flex justify-end gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-white/20 hover:text-white/50 text-[11px] lowercase tracking-wide h-8 px-3 rounded-lg transition-colors"
            style={font}
          >
            cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="bg-white/[0.08] hover:bg-white/[0.12] text-white/50 hover:text-white/70 text-[11px] lowercase tracking-wide h-8 px-4 rounded-lg border border-white/[0.04] transition-all disabled:opacity-40"
            style={font}
          >
            {saving ? 'saving...' : 'save'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
