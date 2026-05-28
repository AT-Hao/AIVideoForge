import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, Download, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { PipelineComposition } from '@/remotion/PipelineComposition';
import { compileRenderPlan, emptyRenderPlan } from '@/remotion/capabilities';
import { createRender, getRenderStatus } from '@/services/api';

const SERVER_ORIGIN = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
).replace(/\/api\/?$/, '');

interface RenderProgressState {
  taskId: string;
  status: string;
  progress: number;
  message: string;
  downloadUrl?: string;
  error?: string;
}

export function PreviewPage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const selectedStyle = useStore((s) => s.selectedStyle);
  const currentProject = useStore((s) => s.currentProject);
  const styleProfile = useStore((s) => s.styleProfile);
  const layerToggles = useStore((s) => s.layerToggles);
  const navigate = useNavigate();
  const [rendering, setRendering] = useState(false);
  const [renderState, setRenderState] = useState<RenderProgressState | null>(
    null
  );
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentVideo || !selectedStyle) {
      navigate('/upload');
    }
  }, [currentVideo, selectedStyle, navigate]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        window.clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const videoUrl = useMemo(() => {
    if (!currentVideo) return '';
    return currentVideo.url.startsWith('http')
      ? currentVideo.url
      : `${SERVER_ORIGIN}${currentVideo.url}`;
  }, [currentVideo]);

  /**
   * 直接在前端把 styleProfile 编译为 RenderPlan，
   * 同一份 plan 既驱动 Player，也提交给后端渲染器（无需在 server 二次编译）。
   */
  const plan = useMemo(() => {
    if (!styleProfile || !videoUrl) return emptyRenderPlan();
    return compileRenderPlan({
      videoUrl,
      styleProfile,
      subtitles: currentProject?.subtitles ?? [],
      layerToggles,
    });
  }, [styleProfile, videoUrl, currentProject?.subtitles, layerToggles]);

  const startPolling = (taskId: string) => {
    if (pollTimerRef.current) {
      window.clearInterval(pollTimerRef.current);
    }
    const tick = async () => {
      try {
        const task = await getRenderStatus(taskId);
        const downloadUrl =
          (task.result as { downloadUrl?: string } | null | undefined)
            ?.downloadUrl;
        setRenderState({
          taskId,
          status: task.status,
          progress: task.progress ?? 0,
          message: task.message ?? '',
          downloadUrl,
          error: task.error,
        });
        if (task.status === 'completed' || task.status === 'failed') {
          if (pollTimerRef.current) {
            window.clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          setRendering(false);
        }
      } catch (err) {
        console.error('poll render status failed', err);
      }
    };
    void tick();
    pollTimerRef.current = window.setInterval(tick, 1500);
  };

  const handleRender = async () => {
    setRendering(true);
    setRenderState(null);
    try {
      const { taskId } = await createRender({ plan });
      setRenderState({
        taskId,
        status: 'pending',
        progress: 0,
        message: '已提交，等待渲染',
      });
      startPolling(taskId);
    } catch (err) {
      console.error(err);
      setRendering(false);
    }
  };

  const downloadHref = renderState?.downloadUrl
    ? renderState.downloadUrl.startsWith('http')
      ? renderState.downloadUrl
      : `${SERVER_ORIGIN}${renderState.downloadUrl}`
    : '';

  if (!currentVideo || !selectedStyle) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/editor')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">预览与渲染</h2>
            <p className="text-muted-foreground">
              共 {plan.capabilities.length} 个能力 · {plan.durationInFrames} 帧 · {plan.fps}fps
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {renderState?.status === 'completed' && downloadHref ? (
            <Button asChild className="gap-2">
              <a href={downloadHref} download target="_blank" rel="noreferrer">
                <Download className="w-4 h-4" />
                下载视频
              </a>
            </Button>
          ) : null}
          <Button onClick={handleRender} disabled={rendering} className="gap-2">
            <Wand2 className="w-4 h-4" />
            {rendering ? '渲染中...' : '提交渲染'}
          </Button>
        </div>
      </div>

      {renderState ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              任务 {renderState.taskId} · 状态 {renderState.status}
            </span>
            <span>{renderState.progress}%</span>
          </div>
          <div className="h-2 rounded bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, renderState.progress)}%` }}
            />
          </div>
          {renderState.message ? (
            <p className="text-muted-foreground">{renderState.message}</p>
          ) : null}
          {renderState.error ? (
            <p className="text-red-500">渲染失败：{renderState.error}</p>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-xl border border-border overflow-hidden bg-black">
        <Player
          component={PipelineComposition}
          inputProps={{ plan }}
          durationInFrames={plan.durationInFrames}
          fps={plan.fps}
          compositionWidth={plan.width}
          compositionHeight={plan.height}
          style={{ width: '100%', height: 'auto', aspectRatio: `${plan.width}/${plan.height}` }}
          controls
          autoPlay
          loop
        />
      </div>
    </div>
  );
}
