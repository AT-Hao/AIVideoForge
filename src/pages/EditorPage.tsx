import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Play, Wand2, GripVertical, Type, Music, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import type { EditProject, TimelineItem, SubtitleItem } from '@/types';

export function EditorPage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const selectedStyle = useStore((s) => s.selectedStyle);
  const parseResult = useStore((s) => s.parseResult);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const navigate = useNavigate();

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [subtitles] = useState<SubtitleItem[]>([]);
  const [colorTone, setColorTone] = useState(selectedStyle?.params.colorTone || 'bright');
  const [transitionSpeed, setTransitionSpeed] = useState(selectedStyle?.params.transitionSpeed || 1);

  useEffect(() => {
    if (!currentVideo || !selectedStyle) {
      navigate('/upload');
      return;
    }
    const scenes = parseResult?.scenes || [
      { start: 0, end: 5, label: '场景1', description: '开场' },
      { start: 5, end: 10, label: '场景2', description: '发展' },
      { start: 10, end: 15, label: '场景3', description: '高潮' },
    ];
    setTimeline(
      scenes.map((s, i) => ({
        id: `scene-${i}`,
        sceneIndex: i,
        start: s.start,
        end: s.end,
        order: i,
      }))
    );
  }, [currentVideo, selectedStyle, parseResult, navigate]);

  const handleRender = () => {
    if (!currentVideo || !selectedStyle) return;
    const project: EditProject = {
      id: `proj-${Date.now()}`,
      videoId: currentVideo.id,
      styleId: selectedStyle.id,
      customParams: { colorTone, transitionSpeed },
      timeline,
      subtitles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCurrentProject(project);
    navigate('/preview');
  };

  if (!currentVideo || !selectedStyle) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">视频编辑</h2>
          <p className="text-muted-foreground">调整时间轴、添加字幕、自定义风格参数</p>
        </div>
        <Button onClick={handleRender} className="gap-2">
          <Wand2 className="w-4 h-4" />
          生成视频
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 aspect-video flex items-center justify-center">
            <div className="text-center space-y-2">
              <Film className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">视频预览区域</p>
              <Button variant="outline" size="sm" className="gap-2">
                <Play className="w-3.5 h-3.5" />
                播放预览
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              时间轴
            </h3>
            <div className="space-y-2">
              {timeline.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
                >
                  <span className="text-xs text-muted-foreground w-6">{index + 1}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">场景 {item.sceneIndex + 1}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.start}s - {item.end}s
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Timer className="w-4 h-4 text-muted-foreground" />
              风格参数
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">色调</label>
                <select
                  value={colorTone}
                  onChange={(e) => setColorTone(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="bright">明亮</option>
                  <option value="teal-orange">青橙</option>
                  <option value="cyber">赛博</option>
                  <option value="sepia">复古</option>
                  <option value="mono">黑白</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">转场速度 {transitionSpeed}x</label>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={transitionSpeed}
                  onChange={(e) => setTransitionSpeed(parseFloat(e.target.value))}
                  className="mt-1 w-full"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              字幕
            </h3>
            <div className="space-y-2">
              {subtitles.length === 0 && (
                <p className="text-sm text-muted-foreground">暂无字幕</p>
              )}
              {subtitles.map((sub) => (
                <div key={sub.id} className="p-2 rounded bg-secondary/50 text-sm">
                  {sub.text}
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                添加字幕
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Music className="w-4 h-4 text-muted-foreground" />
              背景音乐
            </h3>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>无</option>
              <option>轻快</option>
              <option>史诗</option>
              <option>电子</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
