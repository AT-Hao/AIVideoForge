import { Router } from 'express';
import { getDB } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = getDB();
  const parses = db.collection('parses');
  const videos = db.collection('videos');
  const tasks = await parses.find().sort({ createdAt: -1 }).toArray();
  
  const mappedTasks = await Promise.all(tasks.map(async t => {
    const video = await videos.findOne({ id: t.videoId });
    return {
      id: t.taskId,
      videoId: t.videoId,
      video: video ? {
        id: video.id,
        url: video.url,
        name: video.name,
        size: video.size,
        createdAt: video.createdAt
      } : null,
      type: 'parse',
      status: t.status,
      progress: t.progress,
      message: t.error || (t.status === 'completed' ? '解析完成' : '正在解析视频'),
      result: t.result,
      error: t.error,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    };
  }));
  
  res.json(mappedTasks);
});

router.post('/:taskId/retry', async (req, res) => {
  const { taskId } = req.params;
  const db = getDB();
  const parses = db.collection('parses');

  const task = await parses.findOne({ taskId });
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  await parses.updateOne(
    { taskId },
    {
      $set: {
        status: 'processing',
        progress: 0,
        error: null,
        updatedAt: new Date().toISOString(),
      },
    }
  );

  res.json({ success: true });
});

router.delete('/:taskId', async (req, res) => {
  const { taskId } = req.params;
  const db = getDB();
  const parses = db.collection('parses');
  await parses.deleteOne({ taskId });
  res.json({ success: true });
});

export default router;
