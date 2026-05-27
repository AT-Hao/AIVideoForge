import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { PipelineComposition } from '@/remotion/PipelineComposition';
import { compileRenderPlan, emptyRenderPlan } from '@/remotion/capabilities';
import { createRender } from '@/services/api';

export function PreviewPage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const selectedStyle = useStore((s) => s.selectedStyle);
  const currentProject = useStore((s) => s.currentProject);
  const styleProfile = useStore((s) => s.styleProfile);
  const layerToggles = useStore((s) => s.layerToggles);
  const navigate = useNavigate();
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!currentVideo || !selectedStyle) {
      navigate('/upload');
    }
  }, [currentVideo, selectedStyle, navigate]);

  const videoUrl = useMemo(() => {
    if (!currentVideo) return '';
    return currentVideo.url.startsWith('http')
      ? currentVideo.url
      : `http://localhost:3001${currentVideo.url}`;
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

  const handleRender = async () => {
    setRendering(true);
    try {
      await createRender({ plan });
      navigate('/tasks');
    } catch {
      setRendering(false);
    }
  };

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
        <Button onClick={handleRender} disabled={rendering} className="gap-2">
          <Wand2 className="w-4 h-4" />
          {rendering ? '提交中...' : '提交渲染'}
        </Button>
      </div>

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
