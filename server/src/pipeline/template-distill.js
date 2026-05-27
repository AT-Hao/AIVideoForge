/**
 * 风格模板「蒸馏」与「应用」模块
 *
 * - distillStyleTemplate(styleProfile): 把强绑定原视频的 VideoStyleProfile
 *   提炼为可跨视频复用的 StyleTemplate（去掉绝对时间/帧/具体音轨等实例信息）。
 *
 * - resolveStyleTemplate(template, parseResult): 基于新视频的解析结果
 *   把 StyleTemplate 重新具象化为符合 VideoStyleProfile 结构的数据，
 *   供 PipelineComposition / PipelineDefinition 使用。
 */

const FPS = 30;

function avg(values) {
  const arr = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (arr.length === 0) return undefined;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round(num, digits = 2) {
  if (typeof num !== 'number' || Number.isNaN(num)) return undefined;
  const f = 10 ** digits;
  return Math.round(num * f) / f;
}

function mostCommon(values, fallback) {
  const counts = new Map();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = fallback;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

/**
 * 把 VideoStyleProfile 蒸馏为可迁移的 StyleTemplate。
 * 所有与原视频「绝对帧/时间/具体音轨」相关的信息都会被丢弃。
 */
export function distillStyleTemplate(styleProfile) {
  const sceneGrades = styleProfile?.colorGrade?.scenes || [];
  const transitions = styleProfile?.transitions || [];
  const effects = styleProfile?.effects || [];
  const audio = styleProfile?.audioMix || {};
  const subtitle = styleProfile?.subtitleStyle || {};

  // 1. 色彩基线 —— 平均所有场景参数
  const colorGradeBaseline = {
    brightness: round(avg(sceneGrades.map((s) => s.brightness))) ?? 1.0,
    contrast: round(avg(sceneGrades.map((s) => s.contrast))) ?? 1.0,
    saturation: round(avg(sceneGrades.map((s) => s.saturation))) ?? 1.0,
    temperature: round(avg(sceneGrades.map((s) => s.temperature))) ?? 0,
    tint: round(avg(sceneGrades.map((s) => s.tint))) ?? 0,
    vignette: round(avg(sceneGrades.map((s) => s.vignette))) ?? 0,
  };

  // 2. 转场默认值 —— 取最高频的 type/easing + 平均 duration/intensity
  const transitionDefault = {
    type: mostCommon(transitions.map((t) => t.type), 'fade'),
    durationFrames: Math.round(avg(transitions.map((t) => t.durationFrames)) ?? 15),
    easing: mostCommon(transitions.map((t) => t.easing), 'ease-in-out'),
    intensity: round(avg(transitions.map((t) => t.intensity))) ?? 0.7,
  };

  // 3. 特效基线 —— 按 type 去重，取该 type 下平均强度，去掉 startFrame/endFrame
  const effectGroups = new Map();
  for (const e of effects) {
    if (!e?.type || e.type === 'none') continue;
    if (!effectGroups.has(e.type)) {
      effectGroups.set(e.type, { intensities: [], colors: [] });
    }
    const g = effectGroups.get(e.type);
    if (typeof e.intensity === 'number') g.intensities.push(e.intensity);
    if (e.color) g.colors.push(e.color);
  }
  const effectsBaseline = [];
  for (const [type, g] of effectGroups) {
    effectsBaseline.push({
      type,
      intensity: round(avg(g.intensities)) ?? 0.5,
      color: g.colors[0],
    });
  }

  // 4. 字幕 DNA —— 直接整体 copy（不含具体文本/时间）
  const subtitleStyle = {
    fontFamily: subtitle.fontFamily || 'Noto Sans SC, sans-serif',
    fontSize: subtitle.fontSize ?? 32,
    color: subtitle.color || '#FFFFFF',
    animation: subtitle.animation || 'fadeIn',
    position: subtitle.position || 'bottom',
    fontWeight: subtitle.fontWeight ?? 600,
    letterSpacing: subtitle.letterSpacing ?? 0,
    outlineColor: subtitle.outlineColor || '#000000',
    backgroundColor: subtitle.backgroundColor || 'rgba(0,0,0,0)',
    padding: subtitle.padding ?? 8,
  };

  // 5. 音频 DNA —— 只保留抽象描述，丢掉具体 tracks 的 URL/时间
  const audioMix = {
    mood: audio.mood,
    genre: audio.genre,
    bpm: audio.bpm,
    masterVolume: audio.masterVolume ?? 0.8,
  };

  return {
    version: 1,
    colorGradeBaseline,
    transitionDefault,
    subtitleStyle,
    effectsBaseline,
    audioMix,
    pacing: styleProfile?.pacing || 'medium',
    recommendedFilter: styleProfile?.recommendedFilter || 'none',
    styleDescription: styleProfile?.styleDescription || '',
  };
}

function secToFrame(sec) {
  return Math.max(0, Math.round((sec || 0) * FPS));
}

/**
 * 基于新视频的 parseResult 把 StyleTemplate 应用为 VideoStyleProfile。
 * - 色彩基线 → 套到新视频的每个场景
 * - 转场默认值 → 在新视频每对相邻场景的衔接处生成转场
 * - 特效基线 → 平均铺到新视频的总时长上
 * - 字幕 / 音频 DNA → 直接复制
 */
export function resolveStyleTemplate(template, parseResult, videoId) {
  const scenes = parseResult?.scenes || [];
  const baseline = template.colorGradeBaseline || {};

  const colorGradeScenes = scenes.map((scene, i) => {
    const startFrame = secToFrame(scene.start);
    const endFrame = secToFrame(scene.end);
    const filterStr =
      `brightness(${baseline.brightness ?? 1}) ` +
      `contrast(${baseline.contrast ?? 1}) ` +
      `saturate(${baseline.saturation ?? 1})`;
    return {
      sceneIndex: i,
      startFrame,
      endFrame,
      filter: filterStr,
      brightness: baseline.brightness ?? 1.0,
      contrast: baseline.contrast ?? 1.0,
      saturation: baseline.saturation ?? 1.0,
      temperature: baseline.temperature ?? 0,
      tint: baseline.tint ?? 0,
      vignette: baseline.vignette ?? 0,
    };
  });

  const td = template.transitionDefault || {};
  const transitions = [];
  for (let i = 0; i < scenes.length - 1; i++) {
    transitions.push({
      fromScene: i,
      toScene: i + 1,
      atFrame: secToFrame(scenes[i].end),
      type: td.type || 'fade',
      durationFrames: td.durationFrames || 15,
      easing: td.easing || 'ease-in-out',
      intensity: td.intensity ?? 0.7,
    });
  }

  // 视频总帧数：取最后一个场景的结束帧；若无场景则估算 30s
  const totalFrames =
    scenes.length > 0 ? secToFrame(scenes[scenes.length - 1].end) : FPS * 30;

  // 特效：把每个特效铺满整段视频（VFXLayer 是确定性渲染，不依赖具体段落）
  const baselineEffects = template.effectsBaseline || [];
  const effects = baselineEffects.map((eff) => ({
    startFrame: 0,
    endFrame: totalFrames,
    type: eff.type,
    intensity: eff.intensity ?? 0.5,
    color: eff.color,
  }));

  return {
    videoId,
    summary: parseResult?.summary || '',
    colorGrade: { scenes: colorGradeScenes },
    transitions,
    subtitleStyle: { ...template.subtitleStyle },
    effects,
    audioMix: {
      tracks: [], // 模板不带具体音轨，留给用户在编辑器中挂载
      mood: template.audioMix?.mood,
      genre: template.audioMix?.genre,
      bpm: template.audioMix?.bpm,
      masterVolume: template.audioMix?.masterVolume ?? 0.8,
    },
    styleDescription: template.styleDescription || '',
    recommendedFilter: template.recommendedFilter || 'none',
    pacing: template.pacing || 'medium',
  };
}

/**
 * 根据蒸馏后的模板派生出供前端展示用的简化 params（保持向后兼容）。
 */
export function deriveLegacyParams(template) {
  const filter = (template?.recommendedFilter || '').toLowerCase();
  let colorTone = 'custom';
  if (filter.includes('sepia')) colorTone = 'sepia';
  else if (filter.includes('grayscale')) colorTone = 'mono';
  else {
    const sat = template?.colorGradeBaseline?.saturation;
    if (typeof sat === 'number') {
      if (sat > 1.2) colorTone = 'bright';
      else if (sat < 0.7) colorTone = 'mono';
    }
  }

  const pacing = template?.pacing;
  const transitionSpeed = pacing === 'fast' ? 0.7 : pacing === 'slow' ? 1.5 : 1.0;

  return {
    colorTone,
    transitionSpeed,
    subtitleStyle: template?.subtitleStyle?.animation || 'fadeIn',
    filter: template?.recommendedFilter || 'none',
  };
}
