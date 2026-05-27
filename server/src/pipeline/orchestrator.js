import { getDB } from '../db.js';
import { compileRenderPlan, derivePassesFromPlan } from '../remotion/capabilities.js';

/**
 * 基于 styleProfile + 视频源构建 PipelineDefinition。
 * 统一以 RenderPlan 为中间表示：
 *   styleProfile  ->  RenderPlan  ->  passes[]
 */
export function buildPipelineDefinition({
  videoId,
  styleProfile,
  videoUrl,
  subtitles = [],
  layerToggles,
  width,
  height,
  fps,
}) {
  const plan = compileRenderPlan({
    videoUrl,
    styleProfile,
    subtitles,
    layerToggles,
    width,
    height,
    fps,
  });

  const passes = derivePassesFromPlan(plan);

  return {
    id: `pipeline-${videoId}-${Date.now()}`,
    videoId,
    plan,
    passes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function savePipeline(pipelineDef) {
  const db = getDB();
  const pipelines = db.collection('pipelines');

  const existing = await pipelines.findOne({ id: pipelineDef.id });
  if (existing) {
    await pipelines.updateOne(
      { id: pipelineDef.id },
      { $set: { ...pipelineDef, updatedAt: new Date().toISOString() } }
    );
  } else {
    await pipelines.insertOne(pipelineDef);
  }

  return pipelineDef;
}

export async function getPipelineStatus(pipelineId) {
  const db = getDB();
  const pipelines = db.collection('pipelines');
  return pipelines.findOne({ id: pipelineId });
}
