import { Router } from 'express';

const router = Router();

const parseStore = new Map();

router.post('/', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  const taskId = `parse-${videoId}`;
  parseStore.set(taskId, {
    status: 'processing',
    progress: 0,
    result: null,
  });

  setTimeout(() => {
    const result = {
      videoId,
      keyframes: [
        { timestamp: 0, description: '视频开场画面' },
        { timestamp: 5, description: '主体出现' },
        { timestamp: 10, description: '场景切换' },
      ],
      scenes: [
        { start: 0, end: 5, label: '开场', description: '视频开头，环境展示' },
        { start: 5, end: 10, label: '发展', description: '主体活动，情节推进' },
        { start: 10, end: 15, label: '高潮', description: '关键瞬间，情感爆发' },
      ],
      emotions: [
        { timestamp: 2, emotion: '平静', confidence: 0.85 },
        { timestamp: 7, emotion: '兴奋', confidence: 0.72 },
        { timestamp: 12, emotion: '紧张', confidence: 0.91 },
      ],
      transitions: [
        { timestamp: 5, type: 'cut' },
        { timestamp: 10, type: 'fade' },
      ],
      summary: '视频展示了从平静开场到紧张高潮的情感递进过程。',
    };
    parseStore.set(taskId, {
      status: 'completed',
      progress: 100,
      result,
    });
  }, 3000);

  res.json({ taskId, status: 'processing' });
});

router.get('/:videoId/status', (req, res) => {
  const { videoId } = req.params;
  const task = parseStore.get(`parse-${videoId}`);
  if (!task) {
    return res.status(404).json({ error: 'Parse task not found' });
  }
  res.json({
    status: task.status,
    progress: task.progress,
    result: task.result,
  });
});

export default router;
