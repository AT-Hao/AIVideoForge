import { Router } from 'express';
import { getDB } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  const db = getDB();
  const parses = db.collection('parses');
  const tasks = await parses.find().sort({ createdAt: -1 }).toArray();
  res.json(tasks);
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
