import React from 'react';
import { SubtitleSettings, VideoState, HistoryItem } from '../types';

interface SettingsRightColumnProps {
  settings: SubtitleSettings;
  setSettings: React.Dispatch<React.SetStateAction<SubtitleSettings>>;
  videoState: VideoState;
  setVideoState: React.Dispatch<React.SetStateAction<VideoState>>;
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
}

export function SettingsRightColumn({ settings, setSettings, videoState, setVideoState, setHistory }: SettingsRightColumnProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isDubbing, setIsDubbing] = React.useState(false);
  const [transcript, setTranscript] = React.useState('');

  const handleGenerate = async () => {
    if (!transcript.trim()) {
      alert('Vui lòng nhập nội dung transcript mẫu');
      return;
    }
    
    // In mock preview we still ensure a file was picked for UI consistency, but not strictly needed if we just show subtitles.
    // If the user hasn't loaded video, we can still generate subtitles just for demo.
    
    setIsGenerating(true);
    setVideoState(prev => ({ ...prev, status: 'generating_subtitles', progress: 30, errorMessage: undefined }));

    try {
      const response = await fetch('/api/gemini/split', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ transcript }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate');
      }

      const data = await response.json();
      setVideoState((prev) => ({ ...prev, segments: data.segments, status: 'completed', progress: 100 }));
    } catch (error) {
       console.error(error);
       setVideoState((prev) => ({ ...prev, status: 'error', progress: 0, errorMessage: 'Có lỗi khi dùng Gemini tạo phụ đề. (Chưa có API key hoặc lỗi mạng)' }));
    } finally {
       setIsGenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!videoState.segments || videoState.segments.length === 0) {
      alert('Vui lòng tạo phụ đề trước');
      return;
    }
    setIsTranslating(true);
    setVideoState(prev => ({ ...prev, status: 'translating', progress: 50, errorMessage: undefined }));
    try {
      const response = await fetch('/api/gemini/translate', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ segments: videoState.segments, targetLanguage: settings.language }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to translate');
      }

      const data = await response.json();
      setVideoState((prev) => ({ ...prev, segments: data.segments, status: 'completed', progress: 100 }));
    } catch (error) {
       console.error(error);
       setVideoState((prev) => ({ ...prev, status: 'error', progress: 0, errorMessage: 'Có lỗi khi gọi Gemini dịch.' }));
    } finally {
       setIsTranslating(false);
    }
  };

  const handleDemoDubbing = async () => {
    if (!videoState.segments || videoState.segments.length === 0) {
      alert('Vui lòng tạo phụ đề trước');
      return;
    }
    setIsDubbing(true);
    setVideoState(prev => ({ ...prev, status: 'generating_dubbing', progress: 50, errorMessage: undefined }));
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setVideoState(prev => ({ ...prev, status: 'completed', progress: 100 }));
    alert('Đã tạo kịch bản lồng tiếng demo. Tính năng xuất audio thật bị vô hiệu hóa trong phiên bản này.');
    setIsDubbing(false);
  };

  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    if (!videoState.file) {
      alert('Không có video để xuất');
      return;
    }
    if (!videoState.segments || videoState.segments.length === 0) {
      alert('Vui lòng tạo phụ đề trước khi xuất video');
      return;
    }

    setIsExporting(true);
    setVideoState(prev => ({ ...prev, status: 'generating_dubbing', progress: 10, errorMessage: undefined }));
    
    try {
      // Mock progress
      const progressSteps = [
        { status: 'generating_dubbing', progress: 40, delay: 2000 },
        { status: 'merging_video', progress: 70, delay: 2500 },
        { status: 'merging_video', progress: 90, delay: 1500 }
      ] as const;

      for (const step of progressSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setVideoState(prev => ({ ...prev, status: step.status, progress: step.progress }));
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Just re-use the preview video URL for the exported result in mock mode
      const url = videoState.url || '';
      
      setVideoState(prev => ({ ...prev, status: 'completed', progress: 100, resultUrl: url }));
      
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        name: videoState.file.name,
        date: new Date().toISOString(),
        status: 'completed',
        url: url
      };
      setHistory(prev => [...prev, newItem]);

    } catch (error) {
      console.error(error);
      setVideoState((prev) => ({ ...prev, status: 'error', progress: 0, errorMessage: 'Có lỗi xảy ra khi xuất video. Vui lòng thử lại.' }));
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        name: videoState.file.name,
        date: new Date().toISOString(),
        status: 'error'
      };
      setHistory(prev => [...prev, newItem]);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section className="w-80 border-l border-zinc-800 flex flex-col bg-zinc-950 flex-shrink-0">
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Warning Box */}
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg text-justify shadow-sm">
          <p className="text-[11px] text-yellow-500/90 leading-relaxed">
            <span className="font-bold block mb-1 uppercase tracking-wider text-yellow-500">⚠ Môi trường Demo</span>
            Phiên bản AI Studio hiện chỉ demo giao diện và xử lý văn bản. Để tự nhận giọng từ video, tạo phụ đề thật và lồng tiếng thật, cần backend Node.js + FFmpeg + Whisper/Gemini Audio + TTS.
          </p>
        </div>

        {/* Transcript Input */}
        <div>
           <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Nhập nội dung video để AI tạo phụ đề</label>
           <textarea
             value={transcript}
             onChange={(e) => setTranscript(e.target.value)}
             className="w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-yellow-500 text-zinc-200 resize-none placeholder-zinc-600"
             placeholder="Nhập nội dung video để AI tạo phụ đề..."
           />
        </div>

        {/* AI Trigger */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isExporting}
          className={`w-full py-4 rounded-xl font-bold flex flex-col items-center shadow-xl transition-all ${
            isGenerating || isExporting
            ? 'bg-yellow-500/50 text-black/50 cursor-not-allowed' 
            : 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-yellow-900/10 active:scale-95'
          }`}
        >
          <span className="text-sm mb-1">{isGenerating ? 'Đang Tạo Bằng Gemini...' : 'Tạo Phụ Đề Bằng AI Gemini'}</span>
          <span className="text-[10px] opacity-70">Tự động chia thời gian</span>
        </button>

        {/* Language & Model */}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Ngôn ngữ dịch</label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-yellow-500 appearance-none text-zinc-200"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">Tiếng Anh</option>
                  <option value="ja">Tiếng Nhật</option>
                  <option value="ko">Tiếng Hàn</option>
                </select>
                <div className="absolute right-3 top-3 pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"></path></svg>
                </div>
              </div>
              <button 
                onClick={handleTranslate}
                disabled={isTranslating || !videoState.segments.length}
                className={`px-4 rounded-lg font-bold text-xs transition-colors ${
                  isTranslating ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' :
                  !videoState.segments.length ? 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed' :
                  'bg-zinc-700 text-white hover:bg-zinc-600'
                }`}
              >
                {isTranslating ? 'Đang dịch...' : 'Dịch phụ đề'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Mô hình AI</label>
            <div className="relative">
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-yellow-500 appearance-none text-zinc-200"
              >
                <option value="pro">Whisper Large-v3 (Tốt nhất)</option>
                <option value="fast">Whisper Medium (Cân bằng)</option>
                <option value="base">Whisper Base (Nhanh)</option>
              </select>
              <div className="absolute right-3 top-3 pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"></path></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Styling Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-900">
          <label className="text-[10px] uppercase font-bold text-zinc-500 block">Kiểu chữ & Hiển thị</label>
          
          {/* Font Choice */}
          <div className="flex space-x-2">
             <button
                onClick={() => setSettings({ ...settings, font: 'Inter' })}
                className={`flex-1 py-2 rounded text-[11px] font-bold ${
                  settings.font === 'Inter' 
                  ? 'bg-zinc-800 border border-yellow-500/50 text-yellow-500' 
                  : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                }`}
             >
              INTER
             </button>
             <button
                onClick={() => setSettings({ ...settings, font: 'Roboto' })}
                className={`flex-1 py-2 rounded text-[11px] font-bold ${
                  settings.font === 'Roboto' 
                  ? 'bg-zinc-800 border border-yellow-500/50 text-yellow-500' 
                  : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                }`}
             >
              ROBOTO
             </button>
             <button
                onClick={() => setSettings({ ...settings, font: 'Mono' })}
                className={`flex-1 py-2 rounded text-[11px] font-bold ${
                  settings.font === 'Mono' 
                  ? 'bg-zinc-800 border border-yellow-500/50 text-yellow-500' 
                  : 'bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400'
                }`}
             >
              MONO
             </button>
          </div>

          {/* Color Picker Mock */}
          <div className="flex items-center justify-between">
             <span className="text-xs text-zinc-400">Màu chữ</span>
             <div className="flex items-center gap-2">
               <input
                 type="color"
                 value={settings.color}
                 onChange={(e) => setSettings({ ...settings, color: e.target.value })}
                 className="w-6 h-6 rounded cursor-pointer bg-zinc-950 border-0 p-0"
               />
               <div className="w-16 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-400 font-mono text-[10px]">
                 {settings.color.toUpperCase()}
               </div>
             </div>
          </div>

          {/* Position Toggle */}
          <div className="bg-zinc-900 rounded-lg p-1 flex">
             {(['bottom', 'center', 'top'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSettings({ ...settings, position: pos })}
                  className={`flex-1 text-[10px] py-1.5 rounded transition-colors ${
                    settings.position === pos
                      ? 'bg-zinc-800 text-white font-medium'
                      : 'hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {pos === 'bottom' ? 'Dưới' : pos === 'center' ? 'Giữa' : 'Trên'}
                </button>
             ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-5 pt-4 border-t border-zinc-900">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Âm lượng</span>
              <span>{settings.volume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={settings.volume}
              onChange={(e) => setSettings({ ...settings, volume: parseInt(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-yellow-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-zinc-400">
              <span>Phóng to video</span>
              <span>{(settings.zoom / 100).toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={settings.zoom}
              onChange={(e) => setSettings({ ...settings, zoom: parseInt(e.target.value) })}
              className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-yellow-500"
            />
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Lật ngang video</span>
            <button
               onClick={() => setSettings({ ...settings, flipHorizontal: !settings.flipHorizontal })}
               className={`w-9 h-5 rounded-full relative p-1 cursor-pointer transition-colors ${
                 settings.flipHorizontal ? 'bg-yellow-500' : 'bg-zinc-800'
               }`}
            >
              <div 
                 className={`w-3 h-3 bg-zinc-100 rounded-full transition-transform ${
                   settings.flipHorizontal ? 'translate-x-4' : 'translate-x-0'
                 }`}
              ></div>
            </button>
          </div>
        </div>

        {/* AI Voice Dubbing Section */}
        <div className="space-y-4 pt-4 border-t border-zinc-900">
          <label className="text-[10px] uppercase font-bold text-zinc-500 block">Lồng tiếng AI (Edge TTS)</label>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400">Bật lồng tiếng</span>
            <button
               onClick={() => setSettings({ ...settings, enableDubbing: !settings.enableDubbing })}
               className={`w-9 h-5 rounded-full relative p-1 cursor-pointer transition-colors ${
                 settings.enableDubbing ? 'bg-yellow-500' : 'bg-zinc-800'
               }`}
            >
              <div 
                 className={`w-3 h-3 bg-zinc-100 rounded-full transition-transform ${
                   settings.enableDubbing ? 'translate-x-4' : 'translate-x-0'
                 }`}
              ></div>
            </button>
          </div>

          {settings.enableDubbing && (
            <>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block">Giọng đọc</label>
                <div className="relative">
                  <select
                    value={settings.dubbingVoice}
                    onChange={(e) => setSettings({ ...settings, dubbingVoice: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-yellow-500 appearance-none text-zinc-200"
                  >
                    <option value="vi-VN-HoaiMyNeural">Tiếng Việt - Nữ (Hoàng My)</option>
                    <option value="vi-VN-NamMinhNeural">Tiếng Việt - Nam (Nam Minh)</option>
                    <option value="en-US-AriaNeural">Tiếng Anh - Nữ (Aria)</option>
                    <option value="en-US-DavisNeural">Tiếng Anh - Nam (Davis)</option>
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-zinc-500">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"></path></svg>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleDemoDubbing}
                disabled={isDubbing || !videoState.segments.length}
                className={`w-full py-2 mt-2 rounded text-xs font-bold transition-colors ${
                  isDubbing ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' :
                  !videoState.segments.length ? 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed' :
                  'bg-yellow-500 text-black hover:bg-yellow-400'
                }`}
              >
                {isDubbing ? 'Đang tạo kịch bản...' : 'Tạo lồng tiếng AI (Demo)'}
              </button>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Giữ âm thanh gốc</span>
                <button
                   onClick={() => setSettings({ ...settings, keepOriginalAudio: !settings.keepOriginalAudio })}
                   className={`w-9 h-5 rounded-full relative p-1 cursor-pointer transition-colors ${
                     settings.keepOriginalAudio ? 'bg-yellow-500' : 'bg-zinc-800'
                   }`}
                >
                  <div 
                     className={`w-3 h-3 bg-zinc-100 rounded-full transition-transform ${
                       settings.keepOriginalAudio ? 'translate-x-4' : 'translate-x-0'
                     }`}
                  ></div>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Preset Controls */}
        <div className="flex space-x-2">
          <button 
             onClick={() => alert('Đã lưu Preset thành công!')}
             className="flex-1 py-2 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
          >
            LƯU PRESET
          </button>
          <button 
             className="flex-1 py-2 bg-zinc-900 border border-zinc-800 rounded text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
          >
            TẢI PRESET
          </button>
        </div>
      </div>

      {/* Bottom Export Sticky */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-900 space-y-3">
        <button 
           disabled={true}
           className="w-full py-3 font-bold rounded-lg text-xs bg-zinc-800 text-zinc-500 cursor-not-allowed"
        >
          XUẤT VIDEO (BẢO TRÌ BẢN DEMO)
        </button>
      </div>
    </section>
  );
}
