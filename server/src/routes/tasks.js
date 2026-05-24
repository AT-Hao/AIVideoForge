import { Router } from 'express';

const router = Router();

const taskStore = new Map();

function ensureTask(task) {
  if (!taskStore.has(task.id)) {
    taskStore.set(task.id, task);
  }
}

router.get('/', (req, res) => {
  const tasks = Array.from(taskStore.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
  res.json(tasks);
});

router.post('/:taskId/retry', (req, res) => {
  const { taskId } = req.params;
  const task = taskStore.get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  task.status = 'pending';
  task.progress = 0;
  task.message = '等待重试';
  task.error = null;
  task.updatedAt = new Date().toISOString();

  setTimeout(() => {
    task.status = 'processing';
    task.progress = 50;
    task.message = '重试中...';
    task.updatedAt = new Date().toISOString();
  }, 1000);

  setTimeout(() => {
    task.status = 'completed';
    task.progress = 100;
    task.message = '重试成功';
    task.updatedAt = new Date().toISOString();
  }, 3000);

  res.json({ success: true });
});

router.delete('/:taskId', (req, res) => {
  const { taskId } = req.params;
  taskStore.delete(taskId);
  res.json({ success: true });
});

export { taskStore, ensureTask };
export default router;
