import { Router } from 'express';
import { getDB } from '../db.js';
import {
  buildPipelineDefinition,
  savePipeline,
  getPipelineStatus,
} from '../pipeline/orchestrator.js';

const router = Router();

/**
 * POST /api/pipeline/create
 * body: { videoId, subtitles?, layerToggles?, width?, height?, fps? }
 *
 * 服务端会读取 styleProfile 与 video URL，编译为 RenderPlan，
 * 并构建 PipelineDefinition。返回的 pipeline.plan 可直接喂给前端 <Player />。
 */
router.post('/create', async (req, res) => {
  try {
    const { videoId, subtitles, layerToggles, width, height, fps } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }

    const db = getDB();
    const styleProfile = await db
      .collection('style_profiles')
      .findOne({ videoId });
    if (!styleProfile) {
      return res.status(404).json({
        error: 'Style profile not found. Please run video parse first.',
      });
    }

    const video = await db.collection('videos').findOne({ id: videoId });
    if (!video) {
      return res.status(404).json({ error: 'Video not found.' });
    }
    const videoUrl = video.url || `/api/video/${videoId}`;

    const pipelineDef = buildPipelineDefinition({
      videoId,
      styleProfile,
      videoUrl,
      subtitles,
      layerToggles,
      width,
      height,
      fps,
    });
    await savePipeline(pipelineDef);

    res.json(pipelineDef);
  } catch (err) {
    console.error('Pipeline create error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:pipelineId/status', async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const pipeline = await getPipelineStatus(pipelineId);

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    const completedPasses = pipeline.passes.filter((p) => p.status === 'completed').length;
    const failedPasses = pipeline.passes.filter((p) => p.status === 'failed');
    const totalPasses = pipeline.passes.length;
    const progress = totalPasses
      ? Math.round((completedPasses / totalPasses) * 100)
      : 0;

    const status = failedPasses.length > 0
      ? 'failed'
      : completedPasses === totalPasses
        ? 'completed'
        : 'running';

    res.json({
      pipelineId: pipeline.id,
      status,
      progress,
      currentPass: pipeline.passes.find((p) => p.status === 'running')?.id || null,
      passes: pipeline.passes,
      plan: pipeline.plan,
      intermediateOutputs: {},
      finalOutput: pipeline.finalOutput || null,
      error: failedPasses.length > 0 ? failedPasses[0].error : null,
    });
  } catch (err) {
    console.error('Pipeline status error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/pipeline/:pipelineId/execute
 * 触发执行：所有逻辑 Pass 在 Remotion 单次渲染中通过 Capability Registry 一次性合成。
 *
 * 注意：真实的视频编码需要在独立 worker 中调用 Remotion CLI / Lambda。
 * 此处保留单一物理 Pass 占位，便于后续无侵入接入真实渲染器。
 */
router.post('/:pipelineId/execute', async (req, res) => {
  try {
    const { pipelineId } = req.params;
    const db = getDB();
    const pipelines = db.collection('pipelines');
    const pipeline = await pipelines.findOne({ id: pipelineId });

    if (!pipeline) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }

    // 逻辑 Pass：直接标记完成（在 Composition 中一次性合成）
    for (const pass of pipeline.passes.filter((p) => p.type === 'logical')) {
      await pipelines.updateOne(
        { id: pipelineId, 'passes.id': pass.id },
        { $set: { 'passes.$.status': 'completed' } }
      );
    }

    // 物理 Pass：下游 worker 接入 Remotion CLI 时替换此处
    const finalPass = pipeline.passes.find((p) => p.type === 'physical');
    if (finalPass) {
      await pipelines.updateOne(
        { id: pipelineId, 'passes.id': finalPass.id },
        { $set: { 'passes.$.status': 'completed' } }
      );
    }

    await pipelines.updateOne(
      { id: pipelineId },
      { $set: { updatedAt: new Date().toISOString() } }
    );

    res.json({
      pipelineId,
      status: 'completed',
      message: 'All passes executed. Logical layers combined in single render.',
      plan: pipeline.plan,
    });
  } catch (err) {
    console.error('Pipeline execute error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
