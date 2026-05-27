import { Sequence, useCurrentFrame, interpolate, Easing } from 'remotion';
import type { SubtitleStyleConfig } from '@/types/pipeline';

interface SubtitleItem {
  id: string;
  text: string;
  start: number;
  end: number;
}

interface TextOverlayLayerProps {
  subtitles: SubtitleItem[];
  styleConfig: SubtitleStyleConfig;
}

const SubtitleDisplay: React.FC<{
  text: string;
  styleConfig: SubtitleStyleConfig;
}> = ({ text, styleConfig }) => {
  const frame = useCurrentFrame();

  const animProgress = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const positionStyles: Record<string, React.CSSProperties> = {
    bottom: { bottom: 80, left: 0, right: 0, textAlign: 'center' as const },
    center: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center' as const,
    },
    top: { top: 80, left: 0, right: 0, textAlign: 'center' as const },
  };

  // Typewriter: progressively reveal characters
  const visibleText =
    styleConfig.animation === 'typewriter'
      ? text.slice(0, Math.max(1, Math.floor(text.length * animProgress)))
      : text;

  const animationStyles: Record<string, React.CSSProperties> = {
    typewriter: { opacity: 1 },
    fadeIn: { opacity: animProgress },
    slideUp: {
      opacity: animProgress,
      transform: `translateY(${(1 - animProgress) * 20}px)`,
    },
    bounce: {
      opacity: animProgress,
      transform: `scale(${0.85 + animProgress * 0.15})`,
    },
  };

  const outlineColor = styleConfig.outlineColor || '#000000';
  const padding = styleConfig.padding ?? 0;

  return (
    <div
      style={{
        position: 'absolute',
        color: styleConfig.color,
        fontSize: styleConfig.fontSize,
        fontFamily: styleConfig.fontFamily,
        fontWeight: styleConfig.fontWeight,
        letterSpacing: styleConfig.letterSpacing,
        textShadow: `0 0 2px ${outlineColor}, 0 0 4px ${outlineColor}, 0 2px 8px rgba(0,0,0,0.6)`,
        padding: '0 40px',
        ...positionStyles[styleConfig.position],
        ...(animationStyles[styleConfig.animation] || animationStyles.fadeIn),
      }}
    >
      <span
        style={{
          display: 'inline-block',
          padding: padding ? `${padding * 0.5}px ${padding}px` : 0,
          background: styleConfig.backgroundColor || 'transparent',
          borderRadius: styleConfig.backgroundColor ? 6 : 0,
        }}
      >
        {visibleText}
      </span>
    </div>
  );
};

export const TextOverlayLayer: React.FC<TextOverlayLayerProps> = ({
  subtitles,
  styleConfig,
}) => {
  const fps = 30;

  return (
    <>
      {subtitles.map((sub) => (
        <Sequence
          key={sub.id}
          from={sub.start * fps}
          durationInFrames={(sub.end - sub.start) * fps}
          layout="none"
        >
          <SubtitleDisplay text={sub.text} styleConfig={styleConfig} />
        </Sequence>
      ))}
    </>
  );
};
