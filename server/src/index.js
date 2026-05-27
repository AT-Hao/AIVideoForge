import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDB } from './db.js';
import uploadRoutes from './routes/upload.js';
import parseRoutes from './routes/parse.js';
import styleRoutes, { seedPresetStyles } from './routes/styles.js';
import renderRoutes from './routes/render.js';
import taskRoutes from './routes/tasks.js';
import pipelineRoutes from './routes/pipeline.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/video/:id', async (req, res) => {
  try {
    const db = getDB();
    const videos = db.collection('videos');
    const video = await videos.findOne({ id: req.params.id });

    if (!video || !video.data) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const buffer = video.data.buffer
      ? Buffer.from(video.data.buffer)
      : video.data;

    res.set({
      'Content-Type': video.contentType || 'video/mp4',
      'Content-Length': buffer.length,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(buffer);
  } catch (err) {
    console.error('Video stream error:', err);
    res.status(500).json({ error: 'Failed to stream video' });
  }
});

app.use('/api/upload', uploadRoutes);
app.use('/api/parse', parseRoutes);
app.use('/api/styles', styleRoutes);
app.use('/api/render', renderRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/pipeline', pipelineRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

async function start() {
  await connectDB();
  await seedPresetStyles().catch((err) => {
    console.error('Seed preset styles failed:', err.message);
  });
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
