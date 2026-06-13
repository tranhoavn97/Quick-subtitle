import { Upload, X, MonitorPlay } from 'lucide-react';
import React, { useRef, useState, useEffect } from 'react';
import { SubtitleSettings, VideoState } from '../types';

interface VideoLeftColumnProps {
  videoState: VideoState;
  setVideoState: React.Dispatch<React.SetStateAction<VideoState>>;
  videoTitle: string;
  settings: SubtitleSettings;
}

export function VideoLeftColumn({ videoState, setVideoState, videoTitle, settings }: VideoLeftColumnProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  useEffect(() => {
    // Reset time when video changes
    setCurrentTime(0);
  }, [videoState.url]);

  const activeSegment = videoState.segments.find(
    (seg) => currentTime >= seg.start && currentTime <= seg.end
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      setVideoState({ file, url, segments: [], status: 'idle', progress: 0 });
    } else {
      alert('Vui lòng tải lên một tệp video hợp lệ.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const removeVideo = () => {
    if (videoState.url) {
      URL.revokeObjectURL(videoState.url);
    }
    setVideoState({ file: null, url: null, segments: [], status: 'idle', progress: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="flex-1 p-6 flex flex-col space-y-4 bg-zinc-900/30 overflow-hidden">
      <div className="flex-1 relative bg-black rounded-xl border border-zinc-800 overflow-hidden group">
        {videoState.status !== 'idle' && videoState.status !== 'completed' && videoState.status !== 'error' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-white mb-2">
              {videoState.status === 'extracting_audio' && 'Đang trích xuất âm thanh...'}
              {videoState.status === 'generating_subtitles' && 'Đang tạo phụ đề bằng Gemini AI...'}
              {videoState.status === 'translating' && 'Đang dịch phụ đề bằng Gemini AI...'}
              {videoState.status === 'generating_dubbing' && 'Đang lồng tiếng AI...'}
              {videoState.status === 'merging_video' && 'Đang hợp nhất video, âm thanh...'}
              {videoState.status === 'waiting' && 'Vui lòng đợi...'}
            </h3>
            <p className="text-zinc-400 text-sm mb-8 animate-pulse">Quá trình này có thể kéo dài vài phút</p>
            
            <div className="w-full max-w-md bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-yellow-500 transition-all duration-500 ease-out"
                style={{ width: `${videoState.progress}%` }}
              ></div>
            </div>
            <div className="mt-2 text-yellow-500 font-mono text-sm font-bold">{videoState.progress}%</div>
          </div>
        )}

        {videoState.status === 'error' && (
          <div className="absolute inset-0 bg-red-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <X size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Đã xảy ra lỗi</h3>
            <p className="text-red-400 text-sm mb-6 text-center max-w-md">
              {videoState.errorMessage || 'Lỗi không xác định. Vui lòng thử lại.'}
            </p>
            <button 
              onClick={() => setVideoState(prev => ({ ...prev, status: 'idle', progress: 0, errorMessage: undefined }))}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Đóng và thử lại
            </button>
          </div>
        )}

        {!videoState.url ? (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center p-12 transition-colors cursor-pointer ${
              isDragging ? 'bg-yellow-500/5' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800 group-hover:border-yellow-500 transition-colors">
              <Upload size={40} className="text-yellow-500" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-200 mb-1">
              Kéo và thả video vào đây
            </h2>
            <p className="text-zinc-500 text-sm">
              Hỗ trợ MP4, MOV, WEBM. Tối đa 2GB.
            </p>
            <button className="mt-6 px-6 py-2 border border-zinc-700 rounded-lg group-hover:border-yellow-500 group-hover:text-yellow-500 transition-all text-sm font-medium">
              Chọn tệp tin
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="video/*"
              className="hidden"
            />
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col bg-black overflow-hidden justify-center items-center">
            <video
              ref={videoRef}
              src={videoState.url}
              controls
              onTimeUpdate={handleTimeUpdate}
              className="w-full h-full object-contain transition-transform duration-300"
              style={{
                transform: `scale(${settings.zoom / 100}) ${settings.flipHorizontal ? 'scaleX(-1)' : ''}`,
                transformOrigin: 'center center'
              }}
            />
            <button
              onClick={removeVideo}
              className="absolute top-4 right-4 bg-black/50 hover:bg-red-500/80 text-white p-2 text-sm rounded-md backdrop-blur-sm transition-colors border border-white/10 z-10"
              title="Xóa video"
            >
              <X size={16} />
            </button>
            
            {/* Subtitle Overlay */}
            {activeSegment && (
              <div 
                className={`absolute left-0 w-full flex justify-center pointer-events-none transition-all duration-300 ${
                  settings.position === 'top' ? 'top-12' : 
                  settings.position === 'center' ? 'top-1/2 -translate-y-1/2' : 
                  'bottom-16'
                }`}
              >
                <div 
                  className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded text-xl font-medium border border-white/10 shadow-lg flex flex-col items-center max-w-[80%] transition-colors duration-300"
                  style={{ 
                    color: settings.color,
                    fontFamily: settings.font === 'Inter' ? 'Inter, sans-serif' :
                                settings.font === 'Roboto' ? 'Roboto, sans-serif' :
                                settings.font === 'Playfair' ? '"Playfair Display", serif' :
                                settings.font === 'Mono' ? '"JetBrains Mono", monospace' : 'inherit'
                  }}
                >
                  <div className="text-center">{activeSegment.text}</div>
                  {activeSegment.translatedText && (
                    <div className="text-center text-yellow-400 text-lg mt-1 border-t border-white/10 pt-1">
                      {activeSegment.translatedText}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Hint message if no segments yet */}
            {videoState.segments.length === 0 && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10 pointer-events-none">
                <div className="bg-green-500/80 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-white border border-green-400">
                  Video đã được tải lên bản xem trước
                </div>
                <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-zinc-400 border border-white/10">
                  Vui lòng tạo phụ đề tự động (Chưa có phụ đề)
                </div>
              </div>
            )}

            {/* Player Controls Mockup (Decorative) */}
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/80 to-transparent flex items-center px-4 space-x-4 pointer-events-none">
              <div className="w-5 h-5 text-zinc-400">
                <svg fill="currentColor" viewBox="0 0 20 20"><path d="M4.553 4.064A1 1 0 003 5v10a1 1 0 001.553.832l7-5a1 1 0 000-1.664l-7-5z"></path></svg>
              </div>
              <div className="flex-1 h-1 bg-zinc-700 rounded-full relative">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-yellow-500 rounded-full"></div>
              </div>
              <span className="text-[10px] text-zinc-400">02:14 / 06:45</span>
            </div>
          </div>
        )}
      </div>

      {/* Editable Subtitle Table */}
      {videoState.segments.length > 0 ? (
        <div className="h-48 bg-zinc-950 border border-zinc-800 rounded-lg overflow-y-auto flex flex-col">
          {videoState.segments.map((seg, index) => (
             <div key={seg.id || index} className="flex border-b border-zinc-800 p-2 hover:bg-zinc-900 transition-colors">
                <div className="w-16 flex-shrink-0 text-[10px] space-y-1 text-zinc-500 font-mono flex flex-col justify-center text-center">
                  <div>{seg.start.toFixed(1)}s</div>
                  <div className="text-zinc-700">|</div>
                  <div>{seg.end.toFixed(1)}s</div>
                </div>
                <div className="flex-1 px-2 space-y-1">
                   <textarea
                     value={seg.text}
                     onChange={(e) => {
                       const newSegments = [...videoState.segments];
                       newSegments[index].text = e.target.value;
                       setVideoState(prev => ({ ...prev, segments: newSegments }));
                     }}
                     className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-yellow-500 resize-none"
                     rows={1}
                     placeholder="Văn bản gốc..."
                   />
                   {seg.translatedText !== undefined && (
                     <textarea
                       value={seg.translatedText}
                       onChange={(e) => {
                         const newSegments = [...videoState.segments];
                         newSegments[index].translatedText = e.target.value;
                         setVideoState(prev => ({ ...prev, segments: newSegments }));
                       }}
                       className="w-full bg-zinc-800/50 border border-zinc-700 rounded px-2 py-1.5 text-xs text-yellow-400 focus:outline-none focus:border-yellow-500 resize-none"
                       rows={1}
                       placeholder="Bản dịch..."
                     />
                   )}
                </div>
             </div>
          ))}
        </div>
      ) : (
        <div className="h-24 flex items-center justify-center border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm bg-zinc-900/30">
          Danh sách phụ đề sẽ hiển thị ở đây
        </div>
      )}
    </section>
  );
}
