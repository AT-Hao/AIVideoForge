import { Router } from 'express';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';
import { uploadFileToArk, waitForFileProcessing, analyzeVideo } from '../volcengine.js';

const router = Router();

router.post('/', async (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  const db = getDB();
  const videos = db.collection('videos');
  const parses = db.collection('parses');

  const video = await videos.findOne({ id: videoId });
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }

  const taskId = `parse-${videoId}`;

  await parses.insertOne({
    taskId,
    videoId,
    status: 'processing',
    progress: 0,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  res.json({ taskId, status: 'processing' });

  process.nextTick(async () => {
    let localPath;
    try {
      console.log(`[${taskId}] 开始解析视频: ${videoId}`);

      const videoData = video.data.buffer
        ? Buffer.from(video.data.buffer)
        : video.data;

      const ext = path.extname(video.name || '') || '.mp4';
      localPath = path.join(os.tmpdir(), `video-parse-${uuidv4()}${ext}`);
      fs.writeFileSync(localPath, videoData);
      console.log(`[${taskId}] 从 MongoDB 写入临时文件: ${localPath}`);

      await parses.updateOne(
        { taskId },
        { $set: { progress: 10, updatedAt: new Date().toISOString() } }
      );

      console.log(`[${taskId}] 正在上传视频到火山引擎 Ark...`);
      const fileId = await uploadFileToArk(localPath);
      console.log(`[${taskId}] 上传成功，返回文件 ID: ${fileId}`);

      try { fs.unlinkSync(localPath); } catch {}

      await parses.updateOne(
        { taskId },
        { $set: { progress: 30, updatedAt: new Date().toISOString() } }
      );

      console.log(`[${taskId}] 等待文件预处理完成...`);
      await waitForFileProcessing(fileId);
      console.log(`[${taskId}] 文件预处理完成`);

      await parses.updateOne(
        { taskId },
        { $set: { progress: 60, updatedAt: new Date().toISOString() } }
      );

      console.log(`[${taskId}] 正在调用模型解析视频内容...`);
      const analysis = await analyzeVideo(fileId);
      console.log(`[${taskId}] 模型解析完成`);

      const result = {
        videoId,
        ...analysis,
      };

      await parses.updateOne(
        { taskId },
        {
          $set: {
            status: 'completed',
            progress: 100,
            result,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      console.log(`[${taskId}] 视频解析任务完成`);
    } catch (err) {
      console.error(`[${taskId}] 解析失败:`, err.message);
      try { fs.unlinkSync(localPath); } catch {}
      await parses.updateOne(
        { taskId },
        {
          $set: {
            status: 'failed',
            error: err.message,
            updatedAt: new Date().toISOString(),
          },
        }
      );
    }
  });
});

router.get('/:videoId/status', async (req, res) => {
  const { videoId } = req.params;
  const db = getDB();
  const parses = db.collection('parses');

  const task = await parses.findOne({ taskId: `parse-${videoId}` });
  if (!task) {
    return res.status(404).json({ error: 'Parse task not found' });
  }

  res.json({
    status: task.status,
    progress: task.progress,
    result: task.result,
    error: task.error,
  });
});

export default router;
