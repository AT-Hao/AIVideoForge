import { create } from 'zustand';
import type { VideoUploadResult, VideoParseResult, StyleTemplate, EditProject, Task } from '@/types';

interface AppState {
  currentVideo: VideoUploadResult | null;
  parseResult: VideoParseResult | null;
  selectedStyle: StyleTemplate | null;
  currentProject: EditProject | null;
  tasks: Task[];
  setCurrentVideo: (video: VideoUploadResult | null) => void;
  setParseResult: (result: VideoParseResult | null) => void;
  setSelectedStyle: (style: StyleTemplate | null) => void;
  setCurrentProject: (project: EditProject | null) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  currentVideo: null,
  parseResult: null,
  selectedStyle: null,
  currentProject: null,
  tasks: [],
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setParseResult: (result) => set({ parseResult: result }),
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),
}));
