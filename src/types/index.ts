export interface VideoUploadResult {
  id: string;
  url: string;
  name: string;
  size: number;
  duration?: number;
  createdAt: string;
}

export interface VideoParseResult {
  videoId: string;
  keyframes: KeyframeInfo[];
  scenes: SceneInfo[];
  emotions: EmotionInfo[];
  transitions: TransitionInfo[];
  summary: string;
}

export interface KeyframeInfo {
  timestamp: number;
  description: string;
  imageUrl?: string;
}

export interface SceneInfo {
  start: number;
  end: number;
  label: string;
  description: string;
}

export interface EmotionInfo {
  timestamp: number;
  emotion: string;
  confidence: number;
}

export interface TransitionInfo {
  timestamp: number;
  type: string;
}

export interface StyleTemplate {
  id: string;
  name: string;
  description: string;
  previewUrl?: string;
  params: StyleParams;
}

export interface StyleParams {
  colorTone: string;
  transitionSpeed: number;
  subtitleStyle: string;
  filter: string;
  music?: string;
}

export interface EditProject {
  id: string;
  videoId: string;
  styleId: string;
  customParams: Partial<StyleParams>;
  timeline: TimelineItem[];
  subtitles: SubtitleItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineItem {
  id: string;
  sceneIndex: number;
  start: number;
  end: number;
  order: number;
}

export interface SubtitleItem {
  id: string;
  text: string;
  start: number;
  end: number;
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type TaskType = 'upload' | 'parse' | 'render';

export interface Task {
  id: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  message: string;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
  videoId?: string;
  video?: VideoUploadResult;
}
