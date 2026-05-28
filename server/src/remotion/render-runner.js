/**
 * Remotion Render Runner
 *
 * 接收 RenderPlan，调用 selectComposition + renderMedia 真正产出 MP4。
 */

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { selectComposition, renderMedia } from '@remotion/renderer';
import { getServeUrl } from './bundle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVER_ROOT = path.resolve(__dirname, '..', '..');
const RENDERS_DIR = path.join(SERVER_ROOT, 'uploads', 'renders');

if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}

/**
 * 把 RenderPlan 中所有相对路径形式的 src（如 `/api/video/abc`）补全成绝对 URL，
 * 方便 headless Chromium 在服务端环境内加载资源。
 */
export function absolutizePlan(plan, baseUrl) {
  if (!plan || !Array.isArray(plan.capabilities)) return plan;
  const fixed = {
    ...plan,
    capabilities: plan.capabilities.map((cap) => {
      const props = cap?.props;
      if (!props || typeof props !== 'object') return cap;
      const src = props.src;
      if (typeof src !== 'string' || !src) return cap;
      if (/^https?:\/\//i.test(src) || src.startsWith('blob:') || src.startsWith('data:')) {
        return cap;
      }
      const normalized = src.startsWith('/') ? src : `/${src}`;
      return {
        ...cap,
        props: { ...props, src: `${baseUrl}${normalized}` },
      };
    }),
  };
  return fixed;
}

/**
 * 渲染主入口。
 *
 * @param {object} args
 * @param {string} args.taskId
 * @param {object} args.plan       已绝对化 URL 的 RenderPlan
 * @param {(progress: number, message?: string) => void} [args.onProgress]
 * @returns {Promise<{ outputPath: string, downloadUrl: string }>}
 */
export async function runRemotionRender({ taskId, plan, onProgress }) {
  const report = (progress, message) => {
    try {
      onProgress?.(progress, message);
    } catch {
      /* swallow progress hook errors */
    }
  };

  report(2, 'Preparing bundle...');
  const serveUrl = await getServeUrl();

  report(15, 'Selecting composition...');
  const composition = await selectComposition({
    serveUrl,
    id: plan.compositionId || 'PipelineComposition',
    inputProps: { plan },
  });

  // 用 plan 中提供的尺寸/时长覆盖 Composition 默认值
  const resolvedComposition = {
    ...composition,
    width: plan.width || composition.width,
    height: plan.height || composition.height,
    fps: plan.fps || composition.fps,
    durationInFrames: plan.durationInFrames || composition.durationInFrames,
  };

  const outputPath = path.join(RENDERS_DIR, `${taskId}.mp4`);
  report(20, 'Rendering frames...');

  await renderMedia({
    composition: resolvedComposition,
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: { plan },
    onProgress: ({ progress }) => {
      // 把渲染进度（0~1）映射到 20~95 的总进度区间
      const overall = 20 + Math.round(progress * 75);
      report(overall, `Rendering frames... ${(progress * 100).toFixed(0)}%`);
    },
  });

  report(98, 'Finalizing output...');
  const downloadUrl = `/uploads/renders/${taskId}.mp4`;
  return { outputPath, downloadUrl };
}
