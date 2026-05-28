import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import {
  distillStyleTemplate,
  resolveStyleTemplate,
  deriveLegacyParams,
} from '../pipeline/template-distill.js';
import { adaptCapabilitiesByTemplate } from '../volcengine.js';

const router = Router();

/**
 * 预设风格模板（直接以蒸馏后的 StyleTemplate 结构定义）
 * 服务首次启动时会被 seed 到 saved_styles 集合。
 */
const PRESET_TEMPLATES = [
  {
    id: 'preset-cinematic',
    name: '电影感',
    description: '宽银幕色调、高对比、柔和暗角、低饱和暖色',
    source: 'preset',
    template: {
      version: 1,
      colorGradeBaseline: { brightness: 0.95, contrast: 1.2, saturation: 0.9, temperature: 0.2, tint: 0, vignette: 0.35 },
      transitionDefault: { type: 'dissolve', durationFrames: 24, easing: 'ease-in-out', intensity: 0.7 },
      subtitleStyle: {
        fontFamily: 'Noto Serif SC, serif', fontSize: 36, color: '#F5F5DC',
        animation: 'fadeIn', position: 'bottom', fontWeight: 500, letterSpacing: 1,
        outlineColor: '#000000', backgroundColor: 'rgba(0,0,0,0.35)', padding: 10,
      },
      effectsBaseline: [
        { type: 'vignette', intensity: 0.4 },
        { type: 'filmGrain', intensity: 0.2 },
      ],
      audioMix: { mood: 'epic', genre: 'cinematic', bpm: 90, masterVolume: 0.8 },
      pacing: 'slow',
      recommendedFilter: 'brightness(0.95) contrast(1.2) saturate(0.9) sepia(0.05)',
      styleDescription: '电影感：宽银幕调色与戏剧性光影',
    },
  },
  {
    id: 'preset-vlog',
    name: 'Vlog 风格',
    description: '明亮高饱和、快节奏跳剪、活泼字幕',
    source: 'preset',
    template: {
      version: 1,
      colorGradeBaseline: { brightness: 1.1, contrast: 1.05, saturation: 1.25, temperature: 0.1, tint: 0, vignette: 0 },
      transitionDefault: { type: 'slideLeft', durationFrames: 8, easing: 'spring', intensity: 0.8 },
      subtitleStyle: {
        fontFamily: 'Noto Sans SC, sans-serif', fontSize: 38, color: '#FFFFFF',
        animation: 'bounce', position: 'bottom', fontWeight: 800, letterSpacing: 0,
        outlineColor: '#FF6B6B', backgroundColor: 'rgba(255,255,255,0.0)', padding: 6,
      },
      effectsBaseline: [{ type: 'lightLeak', intensity: 0.25, color: '#ffd28c' }],
      audioMix: { mood: 'playful', genre: 'acoustic', bpm: 120, masterVolume: 0.9 },
      pacing: 'fast',
      recommendedFilter: 'brightness(1.1) saturate(1.25)',
      styleDescription: 'Vlog：明亮、活泼、快节奏',
    },
  },
  {
    id: 'preset-tech',
    name: '科技感',
    description: '冷色调、强对比、极简字体',
    source: 'preset',
    template: {
      version: 1,
      colorGradeBaseline: { brightness: 1.0, contrast: 1.3, saturation: 0.85, temperature: -0.3, tint: 0.05, vignette: 0.15 },
      transitionDefault: { type: 'wipe', durationFrames: 12, easing: 'ease-out', intensity: 0.9 },
      subtitleStyle: {
        fontFamily: 'JetBrains Mono, monospace', fontSize: 30, color: '#A8E6FF',
        animation: 'typewriter', position: 'top', fontWeight: 500, letterSpacing: 2,
        outlineColor: '#00111a', backgroundColor: 'rgba(0,20,40,0.5)', padding: 8,
      },
      effectsBaseline: [
        { type: 'chromaticAberration', intensity: 0.3 },
        { type: 'glitch', intensity: 0.15 },
      ],
      audioMix: { mood: 'tense', genre: 'electronic', bpm: 128, masterVolume: 0.85 },
      pacing: 'medium',
      recommendedFilter: 'brightness(1.0) contrast(1.3) saturate(0.85) hue-rotate(190deg)',
      styleDescription: '科技感：冷色调与数据可视化美学',
    },
  },
  {
    id: 'preset-retro',
    name: '复古风',
    description: '暖色调、胶片颗粒、怀旧滤镜',
    source: 'preset',
    template: {
      version: 1,
      colorGradeBaseline: { brightness: 0.92, contrast: 0.95, saturation: 0.7, temperature: 0.4, tint: 0.1, vignette: 0.5 },
      transitionDefault: { type: 'fade', durationFrames: 20, easing: 'ease-in', intensity: 0.6 },
      subtitleStyle: {
        fontFamily: 'Noto Serif SC, serif', fontSize: 32, color: '#F4E1B8',
        animation: 'fadeIn', position: 'bottom', fontWeight: 600, letterSpacing: 1,
        outlineColor: '#3a2412', backgroundColor: 'rgba(0,0,0,0.2)', padding: 8,
      },
      effectsBaseline: [
        { type: 'filmGrain', intensity: 0.5 },
        { type: 'lightLeak', intensity: 0.35, color: '#ff9a3c' },
        { type: 'vignette', intensity: 0.5 },
      ],
      audioMix: { mood: 'melancholic', genre: 'lofi', bpm: 80, masterVolume: 0.75 },
      pacing: 'slow',
      recommendedFilter: 'sepia(0.4) brightness(0.92) saturate(0.7)',
      styleDescription: '复古：温暖怀旧的胶片质感',
    },
  },
  {
    id: 'preset-minimal',
    name: '极简主义',
    description: '黑白灰、大量留白、简洁转场',
    source: 'preset',
    template: {
      version: 1,
      colorGradeBaseline: { brightness: 1.0, contrast: 1.1, saturation: 0.3, temperature: -0.15, tint: 0, vignette: 0.2 },
      transitionDefault: { type: 'fade', durationFrames: 10, easing: 'ease-in-out', intensity: 0.4 },
      subtitleStyle: {
        fontFamily: 'Noto Sans SC, sans-serif', fontSize: 32, color: '#FFFFFF',
        animation: 'fadeIn', position: 'bottom', fontWeight: 400, letterSpacing: 0,
        outlineColor: '#000000', backgroundColor: 'rgba(0,0,0,0.25)', padding: 8,
      },
      effectsBaseline: [{ type: 'vignette', intensity: 0.15 }],
      audioMix: { mood: 'ambient', genre: 'minimal', bpm: 80, masterVolume: 0.7 },
      pacing: 'slow',
      recommendedFilter: 'grayscale(0.6) brightness(1.0) contrast(1.1)',
      styleDescription: '极简主义：黑白灰克制美学，大量留白与简洁转场',
    },
  },
];

/**
 * 服务启动时把内置预设 seed 到 saved_styles 集合（idempotent）。
 */
export async function seedPresetStyles() {
  const db = getDB();
  const col = db.collection('saved_styles');
  const now = new Date().toISOString();

  for (const preset of PRESET_TEMPLATES) {
    const existing = await col.findOne({ id: preset.id });
    if (existing) continue;
    await col.insertOne({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      source: 'preset',
      videoId: null,
      template: preset.template,
      createdAt: now,
    });
  }
}

router.get('/', async (_req, res) => {
  try {
    const db = getDB();
    const docs = await db
      .collection('saved_styles')
      .find({})
      .sort({ source: 1, createdAt: -1 })
      .toArray();

    const list = docs.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      source: s.source || 'user',
      videoId: s.videoId || null,
      params: deriveLegacyParams(s.template),
      template: s.template,
      createdAt: s.createdAt,
    }));

    res.json(list);
  } catch (err) {
    console.error('List styles error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/save', async (req, res) => {
  try {
    const { name, description, videoId, styleProfile } = req.body;
    if (!name || !styleProfile) {
      return res.status(400).json({ error: 'name and styleProfile are required' });
    }

    const template = distillStyleTemplate(styleProfile);

    const id = `user-${uuidv4()}`;
    const doc = {
      id,
      name,
      description: description || template.styleDescription || '用户自定义风格',
      source: 'user',
      videoId: videoId || null,
      template,
      createdAt: new Date().toISOString(),
    };

    const db = getDB();
    await db.collection('saved_styles').insertOne(doc);

    res.json(doc);
  } catch (err) {
    console.error('Save style error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 把指定风格模板应用到指定视频，生成属于该视频的 VideoStyleProfile，
 * 并写入 style_profiles 集合（覆盖原有同 videoId 的记录）。
 */
router.post('/:id/apply', async (req, res) => {
  try {
    const { id } = req.params;
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const db = getDB();
    const styleDoc = await db.collection('saved_styles').findOne({ id });
    if (!styleDoc || !styleDoc.template) {
      return res.status(404).json({ error: 'Style template not found' });
    }

    const parseTask = await db.collection('parses').findOne({ taskId: `parse-${videoId}` });
    if (!parseTask || !parseTask.result) {
      return res.status(400).json({
        error: 'Video parse result not found. Please parse the video first.',
      });
    }

    const resolved = resolveStyleTemplate(styleDoc.template, parseTask.result, videoId);

    await db.collection('style_profiles').updateOne(
      { videoId },
      {
        $set: {
          videoId,
          ...resolved,
          appliedTemplateId: id,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    res.json({ ok: true, styleProfile: resolved, appliedTemplateId: id, parseResult: parseTask.result });
  } catch (err) {
    console.error('Apply style error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 阶段 2 主路径：基于「风格模板 + parseResult」让大模型生成 Remotion 能力适配后的
 * VideoStyleProfile，写入 style_profiles 集合。
 * 失败时回退到算法版本 resolveStyleTemplate，并在响应中带 fallback: true。
 */
router.post('/:id/adapt', async (req, res) => {
  try {
    const { id } = req.params;
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const db = getDB();
    const styleDoc = await db.collection('saved_styles').findOne({ id });
    if (!styleDoc || !styleDoc.template) {
      return res.status(404).json({ error: 'Style template not found' });
    }

    const parseTask = await db.collection('parses').findOne({ taskId: `parse-${videoId}` });
    if (!parseTask || !parseTask.result) {
      return res.status(400).json({
        error: 'Video parse result not found. Please parse the video first.',
      });
    }

    let resolved;
    let fallback = false;
    try {
      const aiResult = await adaptCapabilitiesByTemplate(parseTask.result, styleDoc.template);
      // adaptCapabilitiesByTemplate 内部已做兜底，这里直接拼上 videoId
      resolved = { videoId, ...aiResult };
    } catch (err) {
      console.warn('[styles/adapt] AI 适配失败，回退到算法版本:', err.message);
      resolved = resolveStyleTemplate(styleDoc.template, parseTask.result, videoId);
      fallback = true;
    }

    await db.collection('style_profiles').updateOne(
      { videoId },
      {
        $set: {
          videoId,
          ...resolved,
          appliedTemplateId: id,
          fallback,
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );

    res.json({
      ok: true,
      styleProfile: resolved,
      appliedTemplateId: id,
      fallback,
      parseResult: parseTask.result,
    });
  } catch (err) {
    console.error('Adapt style error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = getDB();
    const existing = await db.collection('saved_styles').findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ error: 'Style not found' });
    }
    if (existing.source === 'preset') {
      return res.status(400).json({ error: 'Preset style cannot be deleted' });
    }
    await db.collection('saved_styles').deleteOne({ id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
