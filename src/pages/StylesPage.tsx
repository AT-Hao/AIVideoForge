import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Check, Palette, Clapperboard, Monitor, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import type { StyleTemplate } from '@/types';

const defaultStyles: StyleTemplate[] = [
  {
    id: 'cinematic',
    name: '电影感',
    description: '宽银幕比例、胶片色调、戏剧性光影',
    params: { colorTone: 'teal-orange', transitionSpeed: 1.5, subtitleStyle: 'elegant', filter: 'cinematic' },
  },
  {
    id: 'vlog',
    name: 'Vlog 风格',
    description: '明亮清新、快节奏剪辑、活泼字幕',
    params: { colorTone: 'bright', transitionSpeed: 0.8, subtitleStyle: 'bounce', filter: 'vlog' },
  },
  {
    id: 'tech',
    name: '科技感',
    description: '冷色调、线条动画、数据可视化风格',
    params: { colorTone: 'cyber', transitionSpeed: 1.0, subtitleStyle: 'mono', filter: 'tech' },
  },
  {
    id: 'retro',
    name: '复古风',
    description: '暖色调、颗粒感、怀旧滤镜',
    params: { colorTone: 'sepia', transitionSpeed: 1.2, subtitleStyle: 'classic', filter: 'retro' },
  },
  {
    id: 'minimal',
    name: '极简主义',
    description: '黑白灰、大量留白、简洁转场',
    params: { colorTone: 'mono', transitionSpeed: 1.0, subtitleStyle: 'clean', filter: 'minimal' },
  },
];

const icons: Record<string, React.ElementType> = {
  cinematic: Clapperboard,
  vlog: Sun,
  tech: Monitor,
  retro: Moon,
  minimal: Palette,
};

export function StylesPage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const selectedStyle = useStore((s) => s.selectedStyle);
  const setSelectedStyle = useStore((s) => s.setSelectedStyle);
  const [styles] = useState<StyleTemplate[]>(defaultStyles);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentVideo) {
      navigate('/upload');
    }
  }, [currentVideo, navigate]);

  const handleSelect = (style: StyleTemplate) => {
    setSelectedStyle(style);
  };

  const handleNext = () => {
    if (selectedStyle) {
      navigate('/editor');
    }
  };

  if (!currentVideo) return null;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">选择风格</h2>
        <p className="text-muted-foreground">为「{currentVideo.name}」选择一个再创造风格</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {styles.map((style) => {
          const Icon = icons[style.id] || Sparkles;
          const active = selectedStyle?.id === style.id;
          return (
            <button
              key={style.id}
              onClick={() => handleSelect(style)}
              className={`
                relative text-left p-6 rounded-xl border transition-all
                ${active
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
                }
              `}
            >
              {active && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{style.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{style.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded-md bg-secondary text-xs text-secondary-foreground">
                  {style.params.colorTone}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-secondary text-xs text-secondary-foreground">
                  {style.params.transitionSpeed}x 速度
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!selectedStyle} size="lg">
          下一步：编辑视频
        </Button>
      </div>
    </div>
  );
}
