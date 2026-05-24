import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getDB } from '../db.js';

const router = Router();
const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 * 1024 } });

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const id = path.basename(req.file.filename, path.extname(req.file.filename));
  const filePath = path.join(uploadDir, req.file.filename);
  const fileBuffer = fs.readFileSync(filePath);

  const db = getDB();
  const videos = db.collection('videos');

  const result = {
    id,
    url: `/uploads/${req.file.filename}`,
    name: req.file.originalname,
    size: req.file.size,
    contentType: req.file.mimetype,
    data: fileBuffer,
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
