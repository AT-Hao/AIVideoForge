import { Router } from 'express';
import { getDB } from '../db.js';
import { compileRenderPlan } from '../remotion/capabilities.js';
import { runRemotionRender, absolutizePlan } from '../remotion/render-runner.js';

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

function getServerBaseUrl(req) {
  // 渲染时 headless Chromium 通过该 baseUrl 拉资源，必须可达。
  const port = process.env.PORT || 3001;
  return process.env.PUBLIC_BASE_URL || `http://localhost:${port}`;
}

/**
 * POST /api/render
 *
 * 提交一次渲染。无论上层是 EditProject 还是 RenderPlan，最终都会
 * 编译为 RenderPlan 并交给 Remotion 渲染器。
 */
router.post('/', async (req, res) => {
  try {
    const rawPlan = await resolveRenderPlan(req.body);
    const baseUrl = getServerBaseUrl(req);
    const plan = absolutizePlan(rawPlan, baseUrl);

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

    // 异步驱动渲染
    runRenderTask(taskId, plan).catch((err) => {
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
 * 真实渲染任务执行：bundle -> selectComposition -> renderMedia。
 */
async function runRenderTask(taskId, plan) {
  const update = (patch) => {
    const t = renderStore.get(taskId);
    if (!t) return;
    Object.assign(t, patch, { updatedAt: new Date().toISOString() });
  };

  update({ status: 'processing', progress: 1, message: 'Bundling composition...' });

  const { downloadUrl } = await runRemotionRender({
    taskId,
    plan,
    onProgress: (progress, message) => {
      update({ progress, message: message || `Rendering... ${progress}%` });
    },
  });

  update({
    status: 'completed',
    progress: 100,
    message: 'Render completed',
    result: { downloadUrl },
  });
}

export default router;
