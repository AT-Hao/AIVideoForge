import { Router } from 'express';

const router = Router();

const renderStore = new Map();

router.post('/', (req, res) => {
  const project = req.body;
  const taskId = `render-${Date.now()}`;

  renderStore.set(taskId, {
    id: taskId,
    type: 'render',
    status: 'pending',
    progress: 0,
    message: '等待渲染',
    result: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  setTimeout(() => {
    const task = renderStore.get(taskId);
    if (task) {
      task.status = 'processing';
      task.progress = 30;
      task.message = '正在合成视频...';
      task.updatedAt = new Date().toISOString();
    }
  }, 1000);

  setTimeout(() => {
    const task = renderStore.get(taskId);
    if (task) {
      task.status = 'processing';
      task.progress = 70;
      task.message = '应用风格滤镜...';
      task.updatedAt = new Date().toISOString();
    }
  }, 4000);

  setTimeout(() => {
    const task = renderStore.get(taskId);
    if (task) {
      task.status = 'completed';
      task.progress = 100;
      task.message = '渲染完成';
      task.result = { downloadUrl: `/api/video/render-${taskId}` };
      task.updatedAt = new Date().toISOString();
    }
  }, 7000);

  res.json({ taskId });
});

router.get('/:taskId/status', (req, res) => {
  const { taskId } = req.params;
  const task = renderStore.get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Render task not found' });
  }
  res.json(task);
});

export default router;
