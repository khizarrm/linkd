'use client';

import { SidebarSection } from '../sidebar-section';

interface ToggleSetting {
  label: string;
  defaultChecked: boolean;
}

const SETTINGS: ToggleSetting[] = [
  { label: 'Auto-save results', defaultChecked: true },
  { label: 'Show favicons', defaultChecked: true },
  { label: 'Dark mode', defaultChecked: true },
];

export function SettingsContent() {
  return (
    <SidebarSection title="Preferences">
      <div className="space-y-3">
        {SETTINGS.map((setting, idx) => (
          <div
            key={idx}
            className="px-3 py-3 rounded-lg bg-[#151515] border border-[#2a2a2a]"
          >
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-sm font-light text-[#e8e8e8]">
                {setting.label}
              </span>
              <div className="relative inline-block w-10 h-5">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked={setting.defaultChecked}
                />
                <div className="w-10 h-5 bg-[#2a2a2a] rounded-full peer-checked:bg-white transition-all duration-300"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-[#6a6a6a] rounded-full peer-checked:translate-x-5 peer-checked:bg-[#0a0a0a] transition-all duration-300"></div>
              </div>
            </label>
          </div>
        ))}
      </div>
    </SidebarSection>
  );
}
