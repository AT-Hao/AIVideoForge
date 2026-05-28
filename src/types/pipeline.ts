export interface ColorGradeConfig {
  scenes: ColorGradeScene[];
}

export interface ColorGradeScene {
  sceneIndex: number;
  startFrame: number;
  endFrame: number;
  filter: string;
  brightness: number;
  contrast: number;
  saturation: number;
  temperature?: number;
  tint?: number;
  vignette?: number;
}

export type TransitionType =
  | 'fade'
  | 'slideLeft'
  | 'slideRight'
  | 'wipe'
  | 'zoom'
  | 'dissolve';

export interface TransitionConfig {
  fromScene: number;
  toScene: number;
  atFrame?: number;
  type: TransitionType;
  durationFrames: number;
  easing: 'linear' | 'spring' | 'ease-in' | 'ease-out' | 'ease-in-out';
  intensity?: number;
}

export interface SubtitleStyleConfig {
  fontFamily: string;
  fontSize: number;
  color: string;
  animation: 'typewriter' | 'fadeIn' | 'slideUp' | 'bounce';
  position: 'bottom' | 'center' | 'top';
  fontWeight?: number | string;
  letterSpacing?: number;
  outlineColor?: string;
  backgroundColor?: string;
  padding?: number;
}

export type EffectType =
  | 'vignette'
  | 'filmGrain'
  | 'lightLeak'
  | 'glitch'
  | 'chromaticAberration'
  | 'none';

export interface EffectConfig {
  startFrame: number;
  endFrame: number;
  type: EffectType;
  intensity: number;
  color?: string;
}

export interface AudioMixConfig {
  tracks: AudioTrack[];
  mood?: string;
  bpm?: number;
  genre?: string;
  masterVolume?: number;
}

export interface AudioTrack {
  id: string;
  url: string;
  startFrame: number;
  endFrame: number;
  volume: number;
  role?: 'bgm' | 'sfx' | 'voice';
}

export interface VideoStyleProfile {
  videoId: string;
  summary: string;
  colorGrade: ColorGradeConfig;
  transitions: TransitionConfig[];
  subtitleStyle: SubtitleStyleConfig;
  effects: EffectConfig[];
  audioMix: AudioMixConfig;
  styleDescription: string;
  recommendedFilter: string;
  pacing: 'fast' | 'medium' | 'slow';
  createdAt: string;
}


