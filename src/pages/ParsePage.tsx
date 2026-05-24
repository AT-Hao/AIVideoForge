import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Image, Film, Smile, ArrowRightLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { getParseStatus } from '@/services/api';


export function ParsePage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const parseResult = useStore((s) => s.parseResult);
  const setParseResult = useStore((s) => s.setParseResult);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!parseResult);

  useEffect(() => {
    if (!currentVideo) {
      navigate('/upload');
      return;
    }
    if (parseResult) {
      setLoading(false);
      return;
    }
    const interval = setInterval(async () => {
      try {
        const data = await getParseStatus(currentVideo.id);
        if (data.status === 'completed' && data.result) {
          setParseResult(data.result);
          setLoading(false);
          clearInterval(interval);
        }
      } catch {
        // ignore
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [currentVideo, parseResult, setParseResult, navigate]);

  if (!currentVideo) return null;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">视频解析</h2>
        <p className="text-muted-foreground">AI 正在分析「{currentVideo.name}」的内容</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">多模态模型解析中，请稍候...</p>
        </div>
      ) : parseResult ? (
        <div className="space-y-8">
          <div className="p-6 rounded-xl border border-border bg-card">
            <h3 className="font-medium flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              内容摘要
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{parseResult.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Film className="w-4 h-4 text-primary" />
                场景分析
              </h3>
              <div className="space-y-3">
                {parseResult.scenes.map((scene, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {scene.start}s-{scene.end}s
                    </span>
                    <div>
                      <div className="text-sm font-medium">{scene.label}</div>
                      <div className="text-xs text-muted-foreground">{scene.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                关键帧
              </h3>
              <div className="space-y-3">
                {parseResult.keyframes.map((kf, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {kf.timestamp}s
                    </span>
                    <div className="text-sm">{kf.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Smile className="w-4 h-4 text-primary" />
                情感分析
              </h3>
              <div className="space-y-3">
                {parseResult.emotions.map((em, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {em.timestamp}s
                    </span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{em.emotion}</div>
                      <div className="w-full h-1.5 bg-secondary rounded-full mt-1">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${em.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{Math.round(em.confidence * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-primary" />
                转场节点
              </h3>
              <div className="space-y-3">
                {parseResult.transitions.map((tr, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {tr.timestamp}s
                    </span>
                    <div className="text-sm">{tr.type === 'cut' ? '硬切' : '淡入淡出'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => navigate('/styles')} size="lg">
              下一步：选择风格
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
