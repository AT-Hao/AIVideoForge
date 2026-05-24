import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Player } from '@remotion/player';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { VideoComposition } from '@/remotion/VideoComposition';
import { createRender } from '@/services/api';

export function PreviewPage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const selectedStyle = useStore((s) => s.selectedStyle);
  const currentProject = useStore((s) => s.currentProject);
  const navigate = useNavigate();
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!currentVideo || !selectedStyle) {
      navigate('/upload');
    }
  }, [currentVideo, selectedStyle, navigate]);

  const handleRender = async () => {
    if (!currentProject) return;
    setRendering(true);
    try {
      await createRender(currentProject);
      navigate('/tasks');
    } catch {
      setRendering(false);
    }
  };

  if (!currentVideo || !selectedStyle) return null;

  const videoUrl = currentVideo.url.startsWith('http')
    ? currentVideo.url
    : `http://localhost:3001${currentVideo.url}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/editor')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-semibold">预览与渲染</h2>
            <p className="text-muted-foreground">确认效果后提交渲染任务</p>
          </div>
        </div>
        <Button onClick={handleRender} disabled={rendering} className="gap-2">
          <Wand2 className="w-4 h-4" />
          {rendering ? '提交中...' : '提交渲染'}
        </Button>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-black">
        <Player
          component={VideoComposition}
          inputProps={{
            videoUrl,
            styleParams: selectedStyle.params,
            subtitles: currentProject?.subtitles || [],
          }}
          durationInFrames={300}
          fps={30}
          compositionWidth={1920}
          compositionHeight={1080}
          style={{ width: '100%', height: 'auto', aspectRatio: '16/9' }}
          controls
          autoPlay
          loop
        />
      </div>
    </div>
  );
}
