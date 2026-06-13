import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { VideoLeftColumn } from './components/VideoLeftColumn';
import { SettingsRightColumn } from './components/SettingsRightColumn';
import { HistoryPage } from './components/HistoryPage';
import { SubtitleSettings, VideoState, ViewState, HistoryItem } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('editor');
  
  const [videoState, setVideoState] = useState<VideoState>({
    file: null,
    url: null,
    segments: [],
    status: 'idle',
    progress: 0
  });

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('quicksub_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSetVideoState = (newState: React.SetStateAction<VideoState>) => {
    setVideoState(newState);
  };
  
  // Persist history changes
  useEffect(() => {
    localStorage.setItem('quicksub_history', JSON.stringify(history));
  }, [history]);

  const [settings, setSettings] = useState<SubtitleSettings>({
    language: 'vi',
    model: 'fast',
    font: 'Inter',
    color: '#ffffff',
    position: 'bottom',
    volume: 85,
    zoom: 100,
    flipHorizontal: false,
    enableDubbing: false,
    keepOriginalAudio: true,
    dubbingVoice: 'vi-VN-HoaiMyNeural'
  });

  return (
    <div className="flex h-screen w-full bg-black text-zinc-300 font-sans overflow-hidden select-none">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <h1 className="text-white font-bold tracking-tight text-lg">Quick Subtitle <span className="text-yellow-500">AI</span></h1>
            <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">v2.4 Pro</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-xs text-zinc-500 flex items-center hidden sm:flex">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> AI Engine: Sẵn sàng
            </div>
            <button className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md text-xs font-medium text-white transition-colors">Lưu nháp</button>
            <button className="px-5 py-1.5 bg-yellow-500 hover:bg-yellow-400 rounded-md text-xs font-bold text-black shadow-lg shadow-yellow-900/20">Xuất Video</button>
          </div>
        </header>

        {currentView === 'editor' ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <VideoLeftColumn 
              videoState={videoState} 
              setVideoState={setVideoState} 
              videoTitle={videoState.file?.name || ''}
              settings={settings}
            />
            <SettingsRightColumn 
              settings={settings} 
              setSettings={setSettings} 
              videoState={videoState}
              setVideoState={setVideoState}
              setHistory={setHistory}
            />
          </div>
        ) : (
          <HistoryPage history={history} setHistory={setHistory} />
        )}
      </main>
    </div>
  );
}
