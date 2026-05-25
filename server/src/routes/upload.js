import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 },
});

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const id = uuidv4();

  const db = getDB();
  const videos = db.collection('videos');

  const result = {
    id,
    url: `/api/video/${id}`,
    name: req.file.originalname,
    size: req.file.size,
    contentType: req.file.mimetype,
    data: req.file.buffer,
    createdAt: new Date().toISOString(),
  };

  await videos.insertOne(result);

  res.json({
    id: result.id,
    url: result.url,
    name: result.name,
    size: result.size,
    createdAt: result.createdAt,
  });
});

export default router;
