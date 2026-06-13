export type ViewState = 'editor' | 'history';

export interface SubtitleSettings {
  language: string;
  model: string;
  font: string;
  color: string;
  position: 'top' | 'center' | 'bottom';
  volume: number;
  zoom: number;
  flipHorizontal: boolean;
  enableDubbing: boolean;
  keepOriginalAudio: boolean;
  dubbingVoice: string;
}

export interface Preset {
  id: string;
  name: string;
  settings: SubtitleSettings;
}

export interface SubtitleSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  translatedText?: string;
}

export type ProcessingStatus = 
  | 'idle'
  | 'waiting'
  | 'extracting_audio'
  | 'generating_subtitles'
  | 'translating'
  | 'generating_dubbing'
  | 'merging_video'
  | 'completed'
  | 'error';

export interface VideoState {
  file: File | null;
  url: string | null;
  segments: SubtitleSegment[];
  status: ProcessingStatus;
  progress: number;
  errorMessage?: string;
  resultUrl?: string;
}

export interface HistoryItem {
  id: string;
  name: string;
  date: string;
  duration?: string;
  size?: string;
  status: string;
  url?: string;
}
