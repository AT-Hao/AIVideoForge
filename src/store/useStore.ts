import { create } from 'zustand';
import type { VideoUploadResult, VideoParseResult, StyleTemplate, EditProject, Task, LayerToggles } from '@/types';
import type { VideoStyleProfile, PipelineDefinition, PipelineStatus } from '@/types/pipeline';

interface AppState {
  currentVideo: VideoUploadResult | null;
  parseResult: VideoParseResult | null;
  selectedStyle: StyleTemplate | null;
  currentProject: EditProject | null;
  tasks: Task[];
  styleProfile: VideoStyleProfile | null;
  currentPipeline: PipelineDefinition | null;
  pipelineStatus: PipelineStatus | null;
  layerToggles: LayerToggles;
  setCurrentVideo: (video: VideoUploadResult | null) => void;
  setParseResult: (result: VideoParseResult | null) => void;
  setSelectedStyle: (style: StyleTemplate | null) => void;
  setCurrentProject: (project: EditProject | null) => void;
  setStyleProfile: (profile: VideoStyleProfile | null) => void;
  setCurrentPipeline: (pipeline: PipelineDefinition | null) => void;
  setPipelineStatus: (status: PipelineStatus | null) => void;
  setLayerToggles: (toggles: Partial<LayerToggles>) => void;
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
  styleProfile: null,
  currentPipeline: null,
  pipelineStatus: null,
  layerToggles: {
    colorGrade: true,
    transitions: true,
    subtitles: true,
    effects: true,
    audioMix: true,
  },
  setCurrentVideo: (video) => set({ currentVideo: video }),
  setParseResult: (result) => set({ parseResult: result }),
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setStyleProfile: (profile) => set({ styleProfile: profile }),
  setCurrentPipeline: (pipeline) => set({ currentPipeline: pipeline }),
  setPipelineStatus: (status) => set({ pipelineStatus: status }),
  setLayerToggles: (toggles) =>
    set((state) => ({ layerToggles: { ...state.layerToggles, ...toggles } })),
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
