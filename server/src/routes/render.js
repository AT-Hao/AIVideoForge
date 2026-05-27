import { Router } from 'express';
import { getDB } from '../db.js';
import { compileRenderPlan } from '../remotion/capabilities.js';

const router = Router();

/**
 * 内存任务表。生产中可换成持久化队列（如 BullMQ + Redis）。
 */
const renderStore = new Map();

/**
 * 解析渲染请求 body：
 *
 *  方式 A（推荐，零额外查询）：
 *    { plan: RenderPlan }
 *
 *  方式 B（自动编译）：
 *    { videoId, subtitles?, layerToggles?, width?, height?, fps? }
 *
 *  方式 C（兼容旧版 EditProject）：
 *    { videoId, subtitles, ... } —— 与 B 等价
 */
async function resolveRenderPlan(body) {
  if (body && body.plan && Array.isArray(body.plan.capabilities)) {
    return body.plan;
  }

  const videoId = body?.videoId;
  if (!videoId) {
    throw new Error('Either `plan` or `videoId` is required');
  }

  const db = getDB();
  const styleProfile = await db
    .collection('style_profiles')
    .findOne({ videoId });
  if (!styleProfile) {
    throw new Error('Style profile not found. Run /api/parse first.');
  }
  const video = await db.collection('videos').findOne({ id: videoId });
  if (!video) {
    throw new Error('Video not found');
  }
  const videoUrl = video.url || `/api/video/${videoId}`;

  return compileRenderPlan({
    videoUrl,
    styleProfile,
    subtitles: body.subtitles || [],
    layerToggles: body.layerToggles,
    width: body.width,
    height: body.height,
    fps: body.fps,
  });
}

/**
 * POST /api/render
 *
 * 提交一次渲染。无论上层是 EditProject 还是 RenderPlan，最终都会
 * 编译为 RenderPlan 并交给真实渲染器（Remotion CLI / Lambda）。
 */
router.post('/', async (req, res) => {
  try {
    const plan = await resolveRenderPlan(req.body);

    const taskId = `render-${Date.now()}`;
    const task = {
      id: taskId,
      type: 'render',
      status: 'pending',
      progress: 0,
      message: '等待渲染',
      plan,
      result: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    renderStore.set(taskId, task);

    // 异步驱动渲染。真实接入点见 runRemotionRender()。
    runRemotionRender(taskId, plan).catch((err) => {
      const t = renderStore.get(taskId);
      if (t) {
        t.status = 'failed';
        t.error = err.message;
        t.updatedAt = new Date().toISOString();
      }
    });

    res.json({ taskId, plan });
  } catch (err) {
    console.error('Render submit error:', err);
    res.status(400).json({ error: err.message });
  }
});

router.get('/:taskId/status', (req, res) => {
  const { taskId } = req.params;
  const task = renderStore.get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Render task not found' });
  }
  res.json(task);
});

/**
 * 真实渲染接入点。当前实现为占位的进度推进，
 * 接入 Remotion 时替换为：
 *
 *   import { bundle } from '@remotion/bundler';
 *   import { renderMedia, selectComposition } from '@remotion/renderer';
 *
 *   const serveUrl = await bundle({ entryPoint: 'src/remotion/index.ts' });
 *   const composition = await selectComposition({
 *     serveUrl,
 *     id: plan.compositionId,
 *     inputProps: { plan },
 *   });
 *   await renderMedia({
 *     composition,
 *     serveUrl,
 *     codec: 'h264',
 *     outputLocation: `./out/${taskId}.mp4`,
 *     inputProps: { plan },
 *     onProgress: ({ progress }) => updateProgress(taskId, progress),
 *   });
 */
async function runRemotionRender(taskId, plan) {
  const update = (patch) => {
    const t = renderStore.get(taskId);
    if (!t) return;
    Object.assign(t, patch, { updatedAt: new Date().toISOString() });
  };

  update({ status: 'processing', progress: 5, message: 'Bundling composition...' });
  await sleep(800);
  update({ progress: 30, message: `Rendering ${plan.capabilities.length} capabilities...` });
  await sleep(2000);
  update({ progress: 70, message: 'Encoding final video...' });
  await sleep(1500);
  update({
    status: 'completed',
    progress: 100,
    message: 'Render completed',
    result: { downloadUrl: `/api/video/render-${taskId}` },
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export default router;
