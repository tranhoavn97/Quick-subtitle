import { Clapperboard, Clock, Settings, Subtitles } from 'lucide-react';
import React from 'react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-16 flex flex-col items-center py-6 border-r border-zinc-800 bg-zinc-950 flex-shrink-0 relative z-20">
      <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mb-10 shadow-[0_0_15px_rgba(234,179,8,0.3)] flex-shrink-0 text-black">
        <Subtitles size={24} strokeWidth={2} />
      </div>

      <nav className="flex flex-col space-y-8 flex-1 w-full items-center">
        <button
          onClick={() => onViewChange('editor')}
          className={`transition-colors duration-200 ${
            currentView === 'editor'
              ? 'text-yellow-500'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
          title="Trình chỉnh sửa"
        >
          <Clapperboard size={24} />
        </button>

        <button
          onClick={() => onViewChange('history')}
          className={`transition-colors duration-200 ${
            currentView === 'history'
              ? 'text-yellow-500'
              : 'text-zinc-600 hover:text-zinc-400'
          }`}
          title="Lịch sử"
        >
          <Clock size={24} />
        </button>

        <button
          className="transition-colors duration-200 text-zinc-600 hover:text-zinc-400"
          title="Cài đặt hệ thống"
        >
          <Settings size={24} />
        </button>
      </nav>

      <div className="mt-auto mb-6">
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700"></div>
      </div>
    </aside>
  );
}
