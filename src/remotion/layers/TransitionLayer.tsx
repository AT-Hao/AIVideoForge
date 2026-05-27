import { Sequence, useCurrentFrame, interpolate, Easing } from 'remotion';
import type { TransitionConfig } from '@/types/pipeline';

interface TransitionLayerProps {
  transitions: TransitionConfig[];
}

const easingMap = {
  linear: Easing.linear,
  spring: Easing.bezier(0.16, 1, 0.3, 1),
  'ease-in': Easing.in(Easing.quad),
  'ease-out': Easing.out(Easing.quad),
} as const;

const TransitionFlash: React.FC<{ transition: TransitionConfig }> = ({
  transition,
}) => {
  const frame = useCurrentFrame();
  const { type, durationFrames, easing, intensity = 0.7 } = transition;
  const easingFn = easingMap[easing] ?? easingMap['spring'];

  const progress = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: easingFn,
  });

  // Half: cover-out from 0..0.5; cover-in from 0.5..1
  const half = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
  const coverOpacity = half * intensity;

  if (type === 'fade' || type === 'dissolve') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: type === 'dissolve' ? 'rgba(255,255,255,1)' : 'rgba(0,0,0,1)',
          opacity: coverOpacity,
        }}
      />
    );
  }

  if (type === 'slideLeft' || type === 'slideRight') {
    const dir = type === 'slideLeft' ? -1 : 1;
    const offsetPct = dir * (1 - half) * 100;
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.95)',
          transform: `translateX(${offsetPct}%)`,
          opacity: intensity,
        }}
      />
    );
  }

  if (type === 'wipe') {
    const widthPct = half * 100;
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: '50%',
          width: `${widthPct}%`,
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.95)',
          pointerEvents: 'none',
          opacity: intensity,
        }}
      />
    );
  }

  if (type === 'zoom') {
    const scale = 1 + half * 0.2 * intensity;
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'rgba(0,0,0,0.6)',
          opacity: half * intensity,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
    );
  }

  return null;
};

export const TransitionLayer: React.FC<TransitionLayerProps> = ({
  transitions,
}) => {
  return (
    <>
      {transitions.map((t, i) => {
        const startFrame = (t.atFrame ?? 0) - Math.floor(t.durationFrames / 2);
        const from = Math.max(0, startFrame);
        return (
          <Sequence
            key={`${t.fromScene}-${t.toScene}-${i}`}
            from={from}
            durationInFrames={t.durationFrames}
            layout="none"
          >
            <TransitionFlash transition={t} />
          </Sequence>
        );
      })}
    </>
  );
};
