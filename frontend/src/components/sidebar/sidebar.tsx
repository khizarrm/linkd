'use client';

import { useState } from 'react';
import { Sparkles, History, Settings, ChevronRight, User, LogOut } from 'lucide-react';
import { SidebarToggle } from './sidebar-toggle';
import { SidebarHeader } from './sidebar-header';
import { DiscoverContent } from './content/discover-content';
import { HistoryContent } from './content/history-content';
import { SettingsContent } from './content/settings-content';

type TabId = 'discover' | 'history' | 'settings';

const TABS = [
  { id: 'discover' as const, label: 'Discover', icon: Sparkles },
  { id: 'history' as const, label: 'History', icon: History },
  { id: 'settings' as const, label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('discover');

  const handleSignOut = () => {
    // TODO: Implement sign out logic
    console.log('Sign out clicked');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'discover':
        return <DiscoverContent />;
      case 'history':
        return <HistoryContent />;
      case 'settings':
        return <SettingsContent />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <SidebarToggle isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-[#0a0a0a] border-r border-[#2a2a2a] z-40
          transition-all duration-200 ease-in-out
          ${isOpen ? 'w-72' : 'w-20'}
        `}
      >
        <div className="flex flex-col h-full p-6 pt-24">
          {/* Header */}
          <div className={`mb-8 transition-opacity duration-150 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
            <SidebarHeader title="applyo" subtitle="Outreach Agent" />
          </div>

          {/* Tab Navigation */}
          <nav className="mb-6 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center rounded-lg
                    transition-all duration-200 group
                    ${isOpen ? 'justify-between px-4 py-3.5' : 'justify-center px-0 py-3.5'}
                    ${isActive
                      ? 'bg-white text-[#0a0a0a]'
                      : 'bg-transparent text-[#6a6a6a] hover:bg-[#151515] hover:text-[#e8e8e8]'
                    }
                  `}
                >
                  <div className={`flex items-center ${isOpen ? 'gap-3' : 'gap-0'}`}>
                    <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    {isOpen && (
                      <span className="text-sm font-light tracking-wide">
                        {tab.label}
                      </span>
                    )}
                  </div>
                  {isOpen && (
                    <ChevronRight className={`h-3.5 w-3.5 transition-all duration-200 ${
                      isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0'
                    }`} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Tab Content */}
          <div className={`flex-1 overflow-y-auto mb-6 transition-opacity duration-150 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {renderTabContent()}
          </div>

          {/* Account Section */}
          <div className={`border-t border-[#2a2a2a] pt-4 mt-auto`}>
            {isOpen ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 hover:bg-[#151515] transition-all duration-200 cursor-pointer group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3a3a3a] to-[#1a1a1a] flex items-center justify-center border border-[#2a2a2a]">
                    <User className="h-4 w-4 text-[#e8e8e8]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-light text-[#e8e8e8] group-hover:text-white transition-colors truncate">
                      User Name
                    </p>
                    <p className="text-xs font-light text-[#6a6a6a] truncate">
                      user@email.com
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#151515] transition-all duration-200 group"
                >
                  <LogOut className="h-4 w-4 text-[#6a6a6a] group-hover:text-red-400 transition-colors" />
                  <span className="text-sm font-light text-[#6a6a6a] group-hover:text-red-400 transition-colors">
                    Sign out
                  </span>
                </button>
              </>
            ) : (
              <button className="w-full flex items-center justify-center py-2.5 rounded-lg hover:bg-[#151515] transition-all duration-200 group">
                <User className="h-4 w-4 text-[#6a6a6a] group-hover:text-[#e8e8e8] transition-colors" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}
