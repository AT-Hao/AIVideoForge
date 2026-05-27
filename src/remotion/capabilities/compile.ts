/**
 * RenderPlan 编译器
 *
 * 把上层业务数据 (VideoStyleProfile + 字幕 + 媒体源) 编译为
 * Remotion 渲染端可直接消费的 RenderPlan（一组 Capability 实例）。
 *
 * 注意：本文件无任何 React / Remotion 依赖，可在前端 Player 与后端 Node
 * 渲染管线中复用，也可被 server 端直接 import（编译期会保留 type-only import）。
 */

import type { Capability, RenderPlan } from './types';
import type { VideoStyleProfile } from '@/types/pipeline';
import type { SubtitleItem, LayerToggles } from '@/types';

export interface CompileRenderPlanInput {
  videoUrl: string;
  styleProfile: VideoStyleProfile;
  subtitles: SubtitleItem[];
  layerToggles?: LayerToggles;
  width?: number;
  height?: number;
  fps?: number;
  /** 缺省时根据 colorGrade.scenes / audio tracks 自动估算 */
  durationInFrames?: number;
}

const DEFAULT_DURATION = 300;

function estimateDuration(input: CompileRenderPlanInput): number {
  if (input.durationInFrames) return input.durationInFrames;
  const sceneEnd =
    input.styleProfile.colorGrade?.scenes?.reduce(
      (m, s) => Math.max(m, s.endFrame),
      0
    ) ?? 0;
  const audioEnd =
    input.styleProfile.audioMix?.tracks?.reduce(
      (m, t) => Math.max(m, t.endFrame),
      0
    ) ?? 0;
  const effectEnd =
    input.styleProfile.effects?.reduce((m, e) => Math.max(m, e.endFrame), 0) ??
    0;
  const subEnd =
    input.subtitles?.reduce(
      (m, s) => Math.max(m, Math.ceil(s.end * (input.fps ?? 30))),
      0
    ) ?? 0;
  return Math.max(sceneEnd, audioEnd, effectEnd, subEnd, DEFAULT_DURATION);
}

export function compileRenderPlan(input: CompileRenderPlanInput): RenderPlan {
  const fps = input.fps ?? 30;
  const width = input.width ?? 1920;
  const height = input.height ?? 1080;
  const durationInFrames = estimateDuration({ ...input, fps });
  const tg = input.layerToggles ?? {
    colorGrade: true,
    transitions: true,
    subtitles: true,
    effects: true,
    audioMix: true,
  };

  const caps: Capability[] = [];

  if (input.videoUrl) {
    caps.push({
      id: 'media.video.main',
      kind: 'media.video',
      zIndex: 0,
      props: {
        src: input.videoUrl,
        objectFit: 'cover',
        cssFilter: input.styleProfile.recommendedFilter || 'none',
      },
    });
  }

  if (tg.colorGrade) {
    caps.push({
      id: 'visual.colorGrade',
      kind: 'visual.colorGrade',
      zIndex: 10,
      props: { config: input.styleProfile.colorGrade },
    });
  }

  if (tg.transitions) {
    caps.push({
      id: 'visual.transition',
      kind: 'visual.transition',
      zIndex: 20,
      props: { transitions: input.styleProfile.transitions },
    });
  }

  if (tg.effects) {
    caps.push({
      id: 'visual.vfx',
      kind: 'visual.vfx',
      zIndex: 30,
      props: { effects: input.styleProfile.effects },
    });
  }

  if (tg.subtitles) {
    caps.push({
      id: 'visual.text',
      kind: 'visual.text',
      zIndex: 40,
      props: {
        subtitles: input.subtitles,
        styleConfig: input.styleProfile.subtitleStyle,
        fps,
      },
    });
  }

  if (tg.audioMix) {
    caps.push({
      id: 'audio.mix',
      kind: 'audio.mix',
      zIndex: 50,
      props: { config: input.styleProfile.audioMix },
    });
  }

  return {
    compositionId: 'PipelineComposition',
    width,
    height,
    fps,
    durationInFrames,
    background: '#000',
    capabilities: caps,
  };
}

export function emptyRenderPlan(): RenderPlan {
  return {
    compositionId: 'PipelineComposition',
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: DEFAULT_DURATION,
    background: '#000',
    capabilities: [],
  };
}
