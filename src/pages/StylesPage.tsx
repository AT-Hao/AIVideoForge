import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Check,
  Palette,
  Clapperboard,
  Monitor,
  Sun,
  Moon,
  Loader2,
  Trash2,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { applyStyleTemplate, adaptStyleToVideo, deleteStyleTemplate, getStyleTemplates } from '@/services/api';
import type { StyleTemplate, VideoParseResult } from '@/types';
import type { VideoStyleProfile } from '@/types/pipeline';

const presetIcons: Record<string, React.ElementType> = {
  'preset-cinematic': Clapperboard,
  'preset-vlog': Sun,
  'preset-tech': Monitor,
  'preset-retro': Moon,
  'preset-minimal': Palette,
};

export function StylesPage() {
  const currentVideo = useStore((s) => s.currentVideo);
  const selectedStyle = useStore((s) => s.selectedStyle);
  const setSelectedStyle = useStore((s) => s.setSelectedStyle);
  const setStyleProfile = useStore((s) => s.setStyleProfile);
  const setParseResult = useStore((s) => s.setParseResult);
  const navigate = useNavigate();

  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await getStyleTemplates();
      setStyles(list);
    } catch (err) {
      console.error('加载风格列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentVideo) {
      navigate('/upload');
      return;
    }
    refresh();
  }, [currentVideo, navigate]);

  const handleSelect = (style: StyleTemplate) => {
    setSelectedStyle(style);
    setError(null);
  };

  const handleDelete = async (e: React.MouseEvent, style: StyleTemplate) => {
    e.stopPropagation();
    if (!confirm(`确定删除「${style.name}」？`)) return;
    try {
      await deleteStyleTemplate(style.id);
      if (selectedStyle?.id === style.id) setSelectedStyle(null);
      await refresh();
    } catch (err) {
      console.error('删除风格失败', err);
    }
  };

  const handleNext = async () => {
    if (!selectedStyle || !currentVideo) return;
    setApplying(true);
    setError(null);
    try {
      // 阶段 2 主路径：让大模型基于「风格模板 + parseResult」生成 Remotion 适配后的 styleProfile
      let styleProfile: VideoStyleProfile;
      let parseResult: VideoParseResult | undefined;
      try {
        const r = await adaptStyleToVideo(selectedStyle.id, currentVideo.id);
        styleProfile = r.styleProfile;
        parseResult = r.parseResult;
      } catch (err) {
        // 网络层失败，UI 兜底回退到算法版 apply
        console.warn('AI 适配失败，回退到算法版 apply:', err);
        const r = await applyStyleTemplate(selectedStyle.id, currentVideo.id);
        styleProfile = r.styleProfile;
        parseResult = r.parseResult;
      }
      setStyleProfile(styleProfile);
      if (parseResult) setParseResult(parseResult);
      navigate('/editor');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data
          ?.error ||
        (err as { message?: string })?.message ||
        '套用风格失败';
      setError(message);
    } finally {
      setApplying(false);
    }
  };

  if (!currentVideo) return null;

  const presets = styles.filter((s) => s.source === 'preset');
  const userStyles = styles.filter((s) => s.source !== 'preset');

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">选择风格</h2>
        <p className="text-muted-foreground">为「{currentVideo.name}」选择一个再创造风格</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">正在加载风格模板...</p>
        </div>
      ) : (
        <>
          <Section title="内置预设" hint="官方提供的通用风格">
            <Grid
              styles={presets}
              selectedId={selectedStyle?.id}
              onSelect={handleSelect}
            />
          </Section>

          <Section
            title="我的风格"
            hint={
              userStyles.length === 0
                ? '在「视频解析」页保存的风格会出现在这里'
                : `共 ${userStyles.length} 个用户风格`
            }
          >
            {userStyles.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border bg-card text-center text-sm text-muted-foreground">
                暂无保存的风格 — 解析视频后可在「视频解析」页保存为风格模板
              </div>
            ) : (
              <Grid
                styles={userStyles}
                selectedId={selectedStyle?.id}
                onSelect={handleSelect}
                onDelete={handleDelete}
              />
            )}
          </Section>
        </>
      )}

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!selectedStyle || applying} size="lg">
          {applying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              正在套用风格到当前视频...
            </>
          ) : (
            '下一步：编辑视频'
          )}
        </Button>
      </div>
    </div>
  );
}

const Section: React.FC<{
  title: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ title, hint, children }) => (
  <div className="space-y-3">
    <div className="flex items-baseline justify-between">
      <h3 className="font-medium">{title}</h3>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
    {children}
  </div>
);

const Grid: React.FC<{
  styles: StyleTemplate[];
  selectedId?: string;
  onSelect: (s: StyleTemplate) => void;
  onDelete?: (e: React.MouseEvent, s: StyleTemplate) => void;
}> = ({ styles, selectedId, onSelect, onDelete }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {styles.map((style) => {
      const Icon = presetIcons[style.id] || (style.source === 'user' ? User : Sparkles);
      const active = selectedId === style.id;
      return (
        <button
          key={style.id}
          onClick={() => onSelect(style)}
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
          {onDelete && !active && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => onDelete(e, style)}
              className="absolute top-4 right-4 w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </span>
          )}
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">{style.name}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {style.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {style.params?.colorTone && (
              <span className="px-2 py-0.5 rounded-md bg-secondary text-xs text-secondary-foreground">
                {style.params.colorTone}
              </span>
            )}
            {style.params?.transitionSpeed && (
              <span className="px-2 py-0.5 rounded-md bg-secondary text-xs text-secondary-foreground">
                {style.params.transitionSpeed}x 速度
              </span>
            )}
            {style.source === 'user' && (
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-xs text-primary">
                我的
              </span>
            )}
          </div>
        </button>
      );
    })}
  </div>
);
