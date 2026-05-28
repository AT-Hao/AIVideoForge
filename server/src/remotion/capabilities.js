/**
 * 服务端 Remotion Capability 编译器
 *
 * 与 src/remotion/capabilities/compile.ts 同构，但运行在 Node 端，
 * 用于由后端管线根据 VideoStyleProfile + 视频源 + 字幕生成 RenderPlan。
 *
 * RenderPlan 是前后端通用、可序列化的"渲染指令"，可以：
 *  - 通过 API 直接下发给前端 <Player /> 预览；
 *  - 由后端 Remotion CLI / Lambda 渲染器作为 inputProps 直接消费；
 *  - 入库以记录此次渲染的完整描述（可重放）。
 */

const DEFAULT_DURATION = 300;
const DEFAULT_FPS = 30;
const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const INTRO_SECONDS = 2;
const INTRO_FADE_OUT_FRAMES = 15;
const INTRO_TEXT = 'Created By Antonio';

function estimateDurationInFrames({
  styleProfile,
  subtitles,
  fps,
  durationInFrames,
}) {
  if (durationInFrames) return durationInFrames;
  const sceneEnd =
    styleProfile?.colorGrade?.scenes?.reduce(
      (m, s) => Math.max(m, s.endFrame || 0),
      0
    ) ?? 0;
  const audioEnd =
    styleProfile?.audioMix?.tracks?.reduce(
      (m, t) => Math.max(m, t.endFrame || 0),
      0
    ) ?? 0;
  const effectEnd =
    styleProfile?.effects?.reduce((m, e) => Math.max(m, e.endFrame || 0), 0) ??
    0;
  const subEnd =
    subtitles?.reduce(
      (m, s) => Math.max(m, Math.ceil((s.end || 0) * fps)),
      0
    ) ?? 0;
  return Math.max(sceneEnd, audioEnd, effectEnd, subEnd, DEFAULT_DURATION);
}

/**
 * 把 VideoStyleProfile + 视频/字幕 编译为 RenderPlan。
 *
 * @param {object} input
 * @param {string} input.videoUrl
 * @param {object} input.styleProfile
 * @param {Array}  [input.subtitles]
 * @param {object} [input.layerToggles]
 * @param {number} [input.fps]
 * @param {number} [input.width]
 * @param {number} [input.height]
 * @param {number} [input.durationInFrames]
 */
export function compileRenderPlan(input) {
  const {
    videoUrl,
    styleProfile,
    subtitles = [],
    layerToggles,
    fps = DEFAULT_FPS,
    width = DEFAULT_WIDTH,
    height = DEFAULT_HEIGHT,
  } = input;

  const tg = layerToggles || {
    colorGrade: true,
    transitions: true,
    subtitles: true,
    effects: true,
    audioMix: true,
  };

  const durationInFrames = estimateDurationInFrames({
    styleProfile,
    subtitles,
    fps,
    durationInFrames: input.durationInFrames,
  });

  const introFrames = Math.round(INTRO_SECONDS * fps);
  const totalDurationInFrames = durationInFrames + introFrames;
  const contentRange = { from: introFrames, durationInFrames };

  const capabilities = [];

  // 黑白文字封面（视频开头）
  capabilities.push({
    id: 'visual.intro',
    kind: 'visual.intro',
    zIndex: 100,
    props: {
      text: INTRO_TEXT,
      durationInFrames: introFrames,
      fadeOutFrames: INTRO_FADE_OUT_FRAMES,
    },
  });

  if (videoUrl) {
    capabilities.push({
      id: 'media.video.main',
      kind: 'media.video',
      zIndex: 0,
      range: contentRange,
      props: {
        src: videoUrl,
        objectFit: 'cover',
        cssFilter: styleProfile?.recommendedFilter || 'none',
      },
    });
  }

  if (tg.colorGrade) {
    capabilities.push({
      id: 'visual.colorGrade',
      kind: 'visual.colorGrade',
      zIndex: 10,
      range: contentRange,
      props: { config: styleProfile?.colorGrade || { scenes: [] } },
    });
  }

  if (tg.transitions) {
    capabilities.push({
      id: 'visual.transition',
      kind: 'visual.transition',
      zIndex: 20,
      range: contentRange,
      props: { transitions: styleProfile?.transitions || [] },
    });
  }

  if (tg.effects) {
    capabilities.push({
      id: 'visual.vfx',
      kind: 'visual.vfx',
      zIndex: 30,
      range: contentRange,
      props: { effects: styleProfile?.effects || [] },
    });
  }

  if (tg.subtitles) {
    capabilities.push({
      id: 'visual.text',
      kind: 'visual.text',
      zIndex: 40,
      range: contentRange,
      props: {
        subtitles,
        styleConfig: styleProfile?.subtitleStyle || {
          fontFamily: 'Noto Sans SC, sans-serif',
          fontSize: 32,
          color: '#FFFFFF',
          animation: 'fadeIn',
          position: 'bottom',
        },
        fps,
      },
    });
  }

  if (tg.audioMix) {
    capabilities.push({
      id: 'audio.mix',
      kind: 'audio.mix',
      zIndex: 50,
      range: contentRange,
      props: { config: styleProfile?.audioMix || { tracks: [] } },
    });
  }

  return {
    compositionId: 'PipelineComposition',
    width,
    height,
    fps,
    durationInFrames: totalDurationInFrames,
    background: '#000',
    capabilities,
  };
}


