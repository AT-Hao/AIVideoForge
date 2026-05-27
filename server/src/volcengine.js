import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { adaptCapabilitiesPrompt } from './pipeline/ai-prompts.js';

function getApiKey() {
  const key = process.env.ARK_API_KEY;
  if (!key) throw new Error('ARK_API_KEY is not configured');
  return key;
}

function getBaseUrl() {
  return process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
}

function getModel() {
  return process.env.ARK_MODEL_ID || 'doubao-seed-1-6-251015';
}

// ---------------- 文件上传 / 预处理 ----------------

export async function uploadFileToArk(filePath) {
  const apiKey = getApiKey();

  console.log(`[Volcengine] 开始上传文件: ${filePath}`);

  const form = new FormData();
  form.append('purpose', 'user_data');
  form.append('file', fs.createReadStream(filePath));
  form.append('preprocess_configs[video][fps]', '0.3');

  const res = await fetch(`${getBaseUrl()}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ark upload failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log(`[Volcengine] 文件上传成功，File ID: ${data.id}`);
  return data.id;
}

export async function waitForFileProcessing(fileId) {
  const apiKey = getApiKey();

  const maxAttempts = 60;
  const baseInterval = 2000;
  let elapsed = 0;

  console.log(`[Volcengine] 开始等待文件预处理，File ID: ${fileId}`);

  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${getBaseUrl()}/files/${fileId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ark file status failed: ${res.status} ${text}`);
    }

    const data = await res.json();

    if (data.status === 'active') {
      console.log(`[Volcengine] 文件预处理完成，File ID: ${fileId}，耗时 ${elapsed}s`);
      return data;
    }
    if (data.status === 'error') {
      throw new Error(`Ark file processing error: ${data.status_details || 'unknown'}`);
    }

    console.log(`[Volcengine] 文件状态: ${data.status}，已等待 ${elapsed}s`);

    const delay = Math.min(baseInterval + i * 500, 10000);
    await new Promise((r) => setTimeout(r, delay));
    elapsed += Math.round(delay / 1000);
  }

  throw new Error('Ark file processing timeout');
}

// ---------------- 通用 Ark 调用 ----------------

async function postArkResponses(payload) {
  const apiKey = getApiKey();
  const res = await fetch(`${getBaseUrl()}/responses`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: getModel(), ...payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ark request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return extractTextFromResponse(data);
}

/** 仅文本输入的模型调用 */
export async function callArkText(prompt) {
  return postArkResponses({
    input: [
      {
        role: 'user',
        content: [{ type: 'input_text', text: prompt }],
      },
    ],
  });
}

/** 文本 + 视频文件输入的多模态模型调用 */
export async function callArkVideo(fileId, prompt) {
  return postArkResponses({
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_video', file_id: fileId },
          { type: 'input_text', text: prompt },
        ],
      },
    ],
  });
}

function extractTextFromResponse(data) {
  if (data.output && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (item.content && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (c.type === 'output_text' && c.text) {
            return c.text;
          }
        }
      }
    }
  }
  if (data.choices && Array.isArray(data.choices)) {
    return data.choices[0]?.message?.content || '';
  }
  return JSON.stringify(data);
}

function parseJsonStrict(text) {
  const cleaned = String(text || '')
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
  return JSON.parse(cleaned);
}

function parseJsonLoose(text) {
  try {
    return parseJsonStrict(text);
  } catch {
    return null;
  }
}

// ---------------- 阶段 1：视频内容解析 ----------------

const DEFAULT_PARSE_PROMPT =
  '请详细分析这个视频内容，以JSON格式输出以下信息：\n' +
  '1. keyframes: 关键帧数组，每个包含 timestamp（秒）和 description（画面描述）\n' +
  '2. scenes: 场景数组，每个包含 start（开始秒）、end（结束秒）、label（场景标签）、description（场景描述）\n' +
  '3. emotions: 情绪变化数组，每个包含 timestamp（秒）、emotion（情绪类型）、confidence（置信度0-1）\n' +
  '4. transitions: 转场数组，每个包含 timestamp（秒）、type（转场类型）\n' +
  '5. summary: 视频内容总结\n' +
  '请确保输出是合法的JSON格式。';

export async function analyzeVideo(fileId, prompt) {
  console.log(`[Volcengine] 开始调用模型解析视频，File ID: ${fileId}`);
  const text = await callArkVideo(fileId, prompt || DEFAULT_PARSE_PROMPT);
  console.log(`[Volcengine] 模型响应接收成功，File ID: ${fileId}`);

  const parsed = parseJsonLoose(text) || {};
  return {
    keyframes: parsed.keyframes || [],
    scenes: parsed.scenes || [],
    emotions: parsed.emotions || [],
    transitions: parsed.transitions || [],
    summary: parsed.summary || (typeof parsed === 'string' ? parsed : ''),
  };
}

// ---------------- 阶段 2：风格模板 → Remotion 能力适配 ----------------

/**
 * 基于「parseResult + StyleTemplate」让大模型一次性生成符合
 * VideoStyleProfile 结构的对象。失败时抛错，由路由层决定是否回退。
 */
export async function adaptCapabilitiesByTemplate(parseResult, template) {
  console.log('[Volcengine] 开始进行 Remotion 能力适配...');
  const prompt = adaptCapabilitiesPrompt(parseResult, template);

  const text = await callArkText(prompt);
  const parsed = parseJsonLoose(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Capability adaptation: model returned non-JSON');
  }

  // 兜底字段，确保前端 / Capability 编译器消费稳定
  const out = {
    summary: parsed.summary || parseResult?.summary || '',
    styleDescription: parsed.styleDescription || template?.styleDescription || '通用风格',
    recommendedFilter: parsed.recommendedFilter || template?.recommendedFilter || 'none',
    pacing: parsed.pacing || template?.pacing || 'medium',
    colorGrade: { scenes: parsed?.colorGrade?.scenes || [] },
    transitions: Array.isArray(parsed.transitions) ? parsed.transitions : [],
    subtitleStyle: parsed.subtitleStyle || template?.subtitleStyle || {},
    effects: Array.isArray(parsed.effects) ? parsed.effects : [],
    audioMix: {
      tracks: [],
      mood: parsed?.audioMix?.mood ?? template?.audioMix?.mood,
      genre: parsed?.audioMix?.genre ?? template?.audioMix?.genre,
      bpm: parsed?.audioMix?.bpm ?? template?.audioMix?.bpm,
      masterVolume:
        parsed?.audioMix?.masterVolume ?? template?.audioMix?.masterVolume ?? 0.8,
    },
  };

  console.log(
    '[Volcengine] 能力适配完成:',
    JSON.stringify({
      sceneCount: out.colorGrade.scenes.length,
      transitionCount: out.transitions.length,
      effectsCount: out.effects.length,
      pacing: out.pacing,
    })
  );
  return out;
}
