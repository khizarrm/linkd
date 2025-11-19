'use client';

import { User, LogOut } from 'lucide-react';

interface AccountSectionProps {
  userName?: string;
  userEmail?: string;
  onSignOut?: () => void;
}

export function AccountSection({
  userName = 'User Name',
  userEmail = 'user@email.com',
  onSignOut
}: AccountSectionProps) {
  return (
    <div className="border-t border-[#2a2a2a] pt-4 mt-auto">
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 hover:bg-[#151515] transition-all duration-300 cursor-pointer group">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] flex items-center justify-center border border-[#2a2a2a]">
          <User className="h-4 w-4 text-[#e8e8e8]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-light text-[#e8e8e8] group-hover:text-white transition-colors truncate">
            {userName}
          </p>
          <p className="text-xs font-light text-[#6a6a6a] truncate">
            {userEmail}
          </p>
        </div>
      </div>
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#151515] transition-all duration-300 group"
      >
        <LogOut className="h-4 w-4 text-[#6a6a6a] group-hover:text-red-400 transition-colors" />
        <span className="text-sm font-light text-[#6a6a6a] group-hover:text-red-400 transition-colors">
          Sign out
        </span>
      </button>
    </div>
  );
}
