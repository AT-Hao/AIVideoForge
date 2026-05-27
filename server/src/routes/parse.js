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

  // 已有 completed 记录直接复用，不再调用大模型
  const existing = await parses.findOne({ taskId });
  if (existing && existing.status === 'completed' && existing.result) {
    console.log(`[${taskId}] 已存在完成的解析结果，直接复用`);
    return res.json({ taskId, status: 'completed', reused: true });
  }

  await parses.updateOne(
    { taskId },
    {
      $set: {
        taskId,
        videoId,
        status: 'processing',
        progress: 0,
        result: null,
        error: null,
        updatedAt: new Date().toISOString(),
      },
      $setOnInsert: { createdAt: new Date().toISOString() },
    },
    { upsert: true }
  );

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
        { $set: { progress: 15, updatedAt: new Date().toISOString() } }
      );

      console.log(`[${taskId}] 正在上传视频到火山引擎 Ark...`);
      const fileId = await uploadFileToArk(localPath);
      console.log(`[${taskId}] 上传成功，返回文件 ID: ${fileId}`);

      try { fs.unlinkSync(localPath); } catch {}

      await parses.updateOne(
        { taskId },
        { $set: { progress: 40, updatedAt: new Date().toISOString() } }
      );

      console.log(`[${taskId}] 等待文件预处理完成...`);
      await waitForFileProcessing(fileId);
      console.log(`[${taskId}] 文件预处理完成`);

      await parses.updateOne(
        { taskId },
        { $set: { progress: 70, updatedAt: new Date().toISOString() } }
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

      console.log(`[${taskId}] 阶段 1（视频内容解析）任务完成`);
    } catch (err) {
      console.error(`[${taskId}] 解析失败:`, err.message);
      try { if (localPath) fs.unlinkSync(localPath); } catch {}
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

router.get('/:videoId/style-profile', async (req, res) => {
  const { videoId } = req.params;
  const db = getDB();
  const styleProfiles = db.collection('style_profiles');

  const profile = await styleProfiles.findOne({ videoId });
  if (!profile) {
    return res.status(404).json({ error: 'Style profile not found' });
  }

  res.json(profile);
});

export default router;
