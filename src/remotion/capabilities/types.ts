/**
 * Remotion 能力抽象层 —— 统一类型定义
 *
 * 把 Remotion 提供的全部"渲染能力"（媒体输入、色彩分级、转场、特效、文字、音频）
 * 抽象为一组同构的 Capability 描述符。前端 (PipelineComposition) 与后端
 * (render orchestrator) 共用同一组类型，从而做到"序列化即可渲染"。
 *
 * 一个 Capability = {
 *   id            -> 实例唯一 id
 *   kind          -> 能力类型（决定使用哪个 Renderer）
 *   props         -> 该能力的参数
 *   range?        -> 时间范围（帧）
 *   enabled?      -> 是否启用（用于前端 toggle）
 *   zIndex?       -> 层级
 * }
 */

import type {
  ColorGradeConfig,
  TransitionConfig,
  SubtitleStyleConfig,
  EffectConfig,
  AudioMixConfig,
} from '@/types/pipeline';
import type { SubtitleItem } from '@/types';

// ---------------- Capability Kinds ----------------

export const CAPABILITY_KINDS = [
  'media.video',
  'media.audio',
  'media.image',
  'visual.colorGrade',
  'visual.transition',
  'visual.vfx',
  'visual.text',
  'audio.mix',
] as const;

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number];

// ---------------- Capability Props ----------------

export interface FrameRange {
  from: number;
  durationInFrames: number;
}

export interface MediaVideoProps {
  src: string;
  objectFit?: 'cover' | 'contain';
  cssFilter?: string;
  startFromFrame?: number;
  endAtFrame?: number;
  volume?: number;
  playbackRate?: number;
}

export interface MediaAudioProps {
  src: string;
  volume?: number;
  startFromFrame?: number;
  endAtFrame?: number;
}

export interface MediaImageProps {
  src: string;
  objectFit?: 'cover' | 'contain';
}

export interface VisualColorGradeProps {
  config: ColorGradeConfig;
}

export interface VisualTransitionProps {
  transitions: TransitionConfig[];
}

export interface VisualVFXProps {
  effects: EffectConfig[];
}

export interface VisualTextProps {
  subtitles: SubtitleItem[];
  styleConfig: SubtitleStyleConfig;
  fps?: number;
}

export interface AudioMixProps {
  config: AudioMixConfig;
}

// ---------------- Capability Discriminated Union ----------------

export interface CapabilityBase<K extends CapabilityKind, P> {
  id: string;
  kind: K;
  props: P;
  range?: FrameRange;
  enabled?: boolean;
  zIndex?: number;
}

export type Capability =
  | CapabilityBase<'media.video', MediaVideoProps>
  | CapabilityBase<'media.audio', MediaAudioProps>
  | CapabilityBase<'media.image', MediaImageProps>
  | CapabilityBase<'visual.colorGrade', VisualColorGradeProps>
  | CapabilityBase<'visual.transition', VisualTransitionProps>
  | CapabilityBase<'visual.vfx', VisualVFXProps>
  | CapabilityBase<'visual.text', VisualTextProps>
  | CapabilityBase<'audio.mix', AudioMixProps>;

// ---------------- Render Plan ----------------

/**
 * 一份完整的"渲染计划"。这是前后端通讯的核心数据结构。
 * 前端 Player 与后端 Remotion 渲染器都直接消费 RenderPlan。
 */
export interface RenderPlan {
  compositionId: 'PipelineComposition';
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  background?: string;
  capabilities: Capability[];
}
