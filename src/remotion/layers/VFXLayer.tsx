import { Sequence, useCurrentFrame } from 'remotion';
import type { EffectConfig } from '@/types/pipeline';

interface VFXLayerProps {
  effects: EffectConfig[];
}

const VignetteEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        boxShadow: `inset 0 0 ${120 * intensity}px rgba(0,0,0,${0.3 * intensity})`,
      }}
    />
  );
};

const FilmGrainEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='${0.08 * intensity}'/%3E%3C/svg%3E")`,
        backgroundSize: '256px 256px',
        opacity: intensity,
      }}
    />
  );
};

const LightLeakEffect: React.FC<{ intensity: number; color?: string }> = ({
  intensity,
  color,
}) => {
  const frame = useCurrentFrame();
  const seed = Math.sin(frame * 0.05) * 0.5 + 0.5;
  const x = 30 + seed * 40;
  const y = 30 + (1 - seed) * 40;
  const tint = color || '#ffaa55';
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `radial-gradient(circle at ${x}% ${y}%, ${tint}${alphaHex(
          0.45 * intensity
        )} 0%, transparent 60%)`,
        mixBlendMode: 'screen',
      }}
    />
  );
};

const GlitchEffect: React.FC<{ intensity: number }> = ({ intensity }) => {
  const frame = useCurrentFrame();
  const glitchActive = Math.sin(frame * 0.3) > 0.85;

  if (!glitchActive) return null;

  const seed = Math.sin(frame * 12.9898 + 78.233) * 43758.5453;
  const pseudoRandom = seed - Math.floor(seed);
  const offsetX = (pseudoRandom - 0.5) * 20 * intensity;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        transform: `translateX(${offsetX}px)`,
        background: `rgba(255, 0, 255, ${0.05 * intensity})`,
      }}
    />
  );
};

const ChromaticAberrationEffect: React.FC<{ intensity: number }> = ({
  intensity,
}) => {
  const offset = 4 * intensity;
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'rgba(255,0,0,0.18)',
          mixBlendMode: 'screen',
          transform: `translate(${-offset}px, 0)`,
          opacity: intensity,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'rgba(0,180,255,0.18)',
          mixBlendMode: 'screen',
          transform: `translate(${offset}px, 0)`,
          opacity: intensity,
        }}
      />
    </>
  );
};

const EffectComponent: React.FC<{ effect: EffectConfig }> = ({ effect }) => {
  switch (effect.type) {
    case 'vignette':
      return <VignetteEffect intensity={effect.intensity} />;
    case 'filmGrain':
      return <FilmGrainEffect intensity={effect.intensity} />;
    case 'lightLeak':
      return (
        <LightLeakEffect intensity={effect.intensity} color={effect.color} />
      );
    case 'glitch':
      return <GlitchEffect intensity={effect.intensity} />;
    case 'chromaticAberration':
      return <ChromaticAberrationEffect intensity={effect.intensity} />;
    default:
      return null;
  }
};

function alphaHex(a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return v.toString(16).padStart(2, '0');
}

export const VFXLayer: React.FC<VFXLayerProps> = ({ effects }) => {
  return (
    <>
      {effects
        .filter((e) => e.type !== 'none')
        .map((effect, i) => (
          <Sequence
            key={i}
            from={effect.startFrame}
            durationInFrames={Math.max(1, effect.endFrame - effect.startFrame)}
            layout="none"
          >
            <EffectComponent effect={effect} />
          </Sequence>
        ))}
    </>
  );
};
