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

  const capabilities = [];

  if (videoUrl) {
    capabilities.push({
      id: 'media.video.main',
      kind: 'media.video',
      zIndex: 0,
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
      props: { config: styleProfile?.colorGrade || { scenes: [] } },
    });
  }

  if (tg.transitions) {
    capabilities.push({
      id: 'visual.transition',
      kind: 'visual.transition',
      zIndex: 20,
      props: { transitions: styleProfile?.transitions || [] },
    });
  }

  if (tg.effects) {
    capabilities.push({
      id: 'visual.vfx',
      kind: 'visual.vfx',
      zIndex: 30,
      props: { effects: styleProfile?.effects || [] },
    });
  }

  if (tg.subtitles) {
    capabilities.push({
      id: 'visual.text',
      kind: 'visual.text',
      zIndex: 40,
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
      props: { config: styleProfile?.audioMix || { tracks: [] } },
    });
  }

  return {
    compositionId: 'PipelineComposition',
    width,
    height,
    fps,
    durationInFrames,
    background: '#000',
    capabilities,
  };
}

/**
 * 从 RenderPlan 推导出"渲染管线 Pass 列表"。每个 Capability 视为一个逻辑 Pass，
 * 末尾追加一个物理 final-encode Pass。所有逻辑 Pass 在 Remotion 内单次渲染中
 * 通过 Composition + Capability Registry 一次性合成（零代际损失）。
 */
export function derivePassesFromPlan(plan) {
  const logicalPasses = plan.capabilities.map((cap) => ({
    id: `pass.${cap.id}`,
    name: cap.kind,
    type: 'logical',
    capabilityId: cap.id,
    capabilityKind: cap.kind,
    dependsOn: [],
    compositionId: plan.compositionId,
    status: 'pending',
  }));

  const finalEncode = {
    id: 'final-encode',
    name: 'Remotion Final Encode',
    type: 'physical',
    dependsOn: logicalPasses.map((p) => p.id),
    compositionId: plan.compositionId,
    outputCodec: 'h264',
    status: 'pending',
  };

  return [...logicalPasses, finalEncode];
}
