import axios from 'axios';
import type {
  VideoUploadResult,
  VideoParseResult,
  StyleTemplate,
  Task,
  SubtitleItem,
  LayerToggles,
} from '@/types';
import type { VideoStyleProfile } from '@/types/pipeline';
import type { RenderPlan } from '@/remotion/capabilities';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// -------------------- Video --------------------

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

export async function getParseStatus(videoId: string): Promise<{
  status: string;
  result?: VideoParseResult;
}> {
  const res = await api.get(`/parse/${videoId}/status`);
  return res.data;
}

export async function getStyleProfile(videoId: string): Promise<VideoStyleProfile> {
  const res = await api.get(`/parse/${videoId}/style-profile`);
  return res.data;
}

// -------------------- Style templates --------------------

export async function getStyleTemplates(): Promise<StyleTemplate[]> {
  const res = await api.get('/styles');
  return res.data;
}

export async function saveStyleTemplate(payload: {
  name: string;
  description?: string;
  videoId?: string;
  styleProfile: Partial<VideoStyleProfile>;
}): Promise<{
  id: string;
  name: string;
  description: string;
  source: 'user';
  videoId: string | null;
  template: unknown;
  createdAt: string;
}> {
  const res = await api.post('/styles/save', payload);
  return res.data;
}

export async function deleteStyleTemplate(id: string): Promise<void> {
  await api.delete(`/styles/${id}`);
}

export async function applyStyleTemplate(
  styleId: string,
  videoId: string
): Promise<{ ok: boolean; styleProfile: VideoStyleProfile; appliedTemplateId: string; parseResult: VideoParseResult }> {
  const res = await api.post(`/styles/${styleId}/apply`, { videoId });
  return res.data;
}

/**
 * 阶段 2 主路径：让大模型基于风格模板 + 视频解析结果做 Remotion 能力适配。
 * 失败时服务端会自动回退到算法版（响应 fallback: true）。
 */
export async function adaptStyleToVideo(
  styleId: string,
  videoId: string
): Promise<{
  ok: boolean;
  styleProfile: VideoStyleProfile;
  appliedTemplateId: string;
  fallback: boolean;
  parseResult: VideoParseResult;
}> {
  const res = await api.post(`/styles/${styleId}/adapt`, { videoId });
  return res.data;
}

// -------------------- Render (RenderPlan-based) --------------------

export interface CreateRenderPayload {
  /** 已有 RenderPlan 时直接传入，零额外服务端编译 */
  plan?: RenderPlan;
  /** 否则由服务端基于 videoId + 当前 styleProfile 编译 */
  videoId?: string;
  subtitles?: SubtitleItem[];
  layerToggles?: LayerToggles;
  width?: number;
  height?: number;
  fps?: number;
}

export interface CreateRenderResponse {
  taskId: string;
  plan: RenderPlan;
}

export async function createRender(payload: CreateRenderPayload): Promise<CreateRenderResponse> {
  const res = await api.post('/render', payload);
  return res.data;
}

export async function getRenderStatus(taskId: string): Promise<Task & { plan?: RenderPlan }> {
  const res = await api.get(`/render/${taskId}/status`);
  return res.data;
}

// -------------------- Tasks --------------------

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
