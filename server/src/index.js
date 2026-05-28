import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDB } from './db.js';
import uploadRoutes from './routes/upload.js';
import parseRoutes from './routes/parse.js';
import styleRoutes, { seedPresetStyles } from './routes/styles.js';
import renderRoutes from './routes/render.js';
import taskRoutes from './routes/tasks.js';

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
    const total = buffer.length;
    const contentType = video.contentType || 'video/mp4';

    const range = req.headers.range;
    if (range) {
      // 形如 "bytes=0-" / "bytes=1024-2047"
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      if (!match) {
        res.status(416).set('Content-Range', `bytes */${total}`).end();
        return;
      }
      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : total - 1;
      if (
        Number.isNaN(start) ||
        Number.isNaN(end) ||
        start > end ||
        end >= total
      ) {
        res.status(416).set('Content-Range', `bytes */${total}`).end();
        return;
      }
      const chunk = buffer.subarray(start, end + 1);
      res.status(206).set({
        'Content-Type': contentType,
        'Content-Length': chunk.length,
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
      });
      res.end(chunk);
      return;
    }

    res.set({
      'Content-Type': contentType,
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=86400',
    });
    res.end(buffer);
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

// 渲染产物静态目录：可通过 /uploads/renders/${taskId}.mp4 直接下载
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RENDERS_DIR = path.resolve(__dirname, '..', 'uploads', 'renders');
if (!fs.existsSync(RENDERS_DIR)) {
  fs.mkdirSync(RENDERS_DIR, { recursive: true });
}
app.use('/uploads/renders', express.static(RENDERS_DIR));

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
