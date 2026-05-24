import axios from 'axios';
import type { VideoUploadResult, VideoParseResult, StyleTemplate, EditProject, Task } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function uploadVideo(file: File, onProgress?: (progress: number) => void): Promise<VideoUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (e.total && onProgress) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data;
}

export async function parseVideo(videoId: string): Promise<VideoParseResult> {
  const res = await api.post('/parse', { videoId });
  return res.data;
}

export async function getParseStatus(videoId: string): Promise<{ status: string; result?: VideoParseResult }> {
  const res = await api.get(`/parse/${videoId}/status`);
  return res.data;
}

export async function getStyleTemplates(): Promise<StyleTemplate[]> {
  const res = await api.get('/styles');
  return res.data;
}

export async function createRender(project: EditProject): Promise<{ taskId: string }> {
  const res = await api.post('/render', project);
  return res.data;
}

export async function getRenderStatus(taskId: string): Promise<Task> {
  const res = await api.get(`/render/${taskId}/status`);
  return res.data;
}

export async function getTasks(): Promise<Task[]> {
  const res = await api.get('/tasks');
  return res.data;
}

export async function retryTask(taskId: string): Promise<void> {
  await api.post(`/tasks/${taskId}/retry`);
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`/tasks/${taskId}`);
}

export default api;
