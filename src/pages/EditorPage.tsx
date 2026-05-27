import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film,
  Play,
  Wand2,
  Palette,
  ArrowRightLeft,
  Type,
  Sparkles,
  Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

interface LayerCardProps {
  icon: React.ElementType;
  name: string;
  desc: string;
  detail?: string;
  enabled: boolean;
  onToggle: () => void;
}

const LayerCard: React.FC<LayerCardProps> = ({ icon: Icon, name, desc, detail, enabled, onToggle }) => (
  <div
    className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      enabled
        ? 'border-border bg-card'
        : 'border-border/40 bg-card/40 opacity-60'
    }`}
  >
    <div
      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        enabled ? 'bg-primary/10' : 'bg-secondary'
      }`}
    >
      <Icon className={`w-5 h-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-medium text-sm">{name}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
      {detail && (
        <div className="text-xs text-muted-foreground/70 mt-0.5">{detail}</div>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${
        enabled ? 'bg-primary' : 'bg-secondary'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);

export function EditorPage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const selectedStyle = useStore((s) => s.selectedStyle);
  const styleProfile = useStore((s) => s.styleProfile);
  const layerToggles = useStore((s) => s.layerToggles);
  const setLayerToggles = useStore((s) => s.setLayerToggles);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentVideo || !selectedStyle) {
      navigate('/upload');
    }
  }, [currentVideo, selectedStyle, navigate]);

  if (!currentVideo || !selectedStyle) return null;

  const cg = styleProfile?.colorGrade;
  const tr = styleProfile?.transitions;
  const sub = styleProfile?.subtitleStyle;
  const fx = styleProfile?.effects;
  const aud = styleProfile?.audioMix;

  const layers = [
    {
      key: 'colorGrade' as const,
      icon: Palette,
      name: '色彩分级',
      desc: '场景级亮度、对比度、饱和度、色温、暗角',
      detail: cg?.scenes?.length ? `${cg.scenes.length} 个场景` : undefined,
    },
    {
      key: 'transitions' as const,
      icon: ArrowRightLeft,
      name: '转场效果',
      desc: '场景间切换动画（淡入淡出/滑动/缩放等）',
      detail: tr?.length ? `${tr.length} 处转场` : undefined,
    },
    {
      key: 'subtitles' as const,
      icon: Type,
      name: '字幕叠加',
      desc: 'AI 推荐的字体、动画与排版样式',
      detail: sub ? `${sub.fontFamily} · ${sub.animation}` : undefined,
    },
    {
      key: 'effects' as const,
      icon: Sparkles,
      name: '视觉特效',
      desc: '暗角、胶片颗粒、光晕、故障、色差效果',
      detail: fx?.length ? `${fx.length} 段特效` : undefined,
    },
    {
      key: 'audioMix' as const,
      icon: Music,
      name: '音频混合',
      desc: '背景音乐氛围、BPM、音量控制',
      detail: aud?.mood ? `${aud.mood} · ${aud.genre}` : undefined,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">视频剪辑</h2>
          <p className="text-muted-foreground">选择要启用的风格模块，关闭不需要的效果</p>
        </div>
        <Button onClick={() => navigate('/preview')} size="lg" className="gap-2">
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

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <h3 className="font-medium text-sm mb-2">视频信息</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>视频：{currentVideo.name}</p>
              <p>风格：{selectedStyle.name}</p>
              {styleProfile?.pacing && (
                <p>节奏：{styleProfile.pacing === 'fast' ? '快速' : styleProfile.pacing === 'slow' ? '缓慢' : '中等'}</p>
              )}
              {styleProfile?.styleDescription && (
                <p className="italic text-xs">{styleProfile.styleDescription}</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-medium text-sm">模块开关</h3>
          {layers.map((layer) => (
            <LayerCard
              key={layer.key}
              icon={layer.icon}
              name={layer.name}
              desc={layer.desc}
              detail={layer.detail}
              enabled={layerToggles[layer.key]}
              onToggle={() => setLayerToggles({ [layer.key]: !layerToggles[layer.key] })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}