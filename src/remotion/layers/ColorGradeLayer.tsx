import { useCurrentFrame } from 'remotion';
import type { ColorGradeConfig } from '@/types/pipeline';

interface ColorGradeLayerProps {
  config: ColorGradeConfig;
}

export const ColorGradeLayer: React.FC<ColorGradeLayerProps> = ({ config }) => {
  const frame = useCurrentFrame();

  const currentScene = config.scenes.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame
  );

  if (!currentScene) return null;

  const temperature = currentScene.temperature ?? 0;
  const tint = currentScene.tint ?? 0;
  const vignette = currentScene.vignette ?? 0;

  const tempColor =
    temperature > 0
      ? `rgba(255, 170, 80, ${Math.min(Math.abs(temperature), 1) * 0.18})`
      : `rgba(80, 140, 255, ${Math.min(Math.abs(temperature), 1) * 0.18})`;

  const tintColor =
    tint > 0
      ? `rgba(255, 80, 200, ${Math.min(Math.abs(tint), 1) * 0.15})`
      : `rgba(120, 220, 120, ${Math.min(Math.abs(tint), 1) * 0.15})`;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            currentScene.brightness !== 1 || currentScene.contrast !== 1
              ? `rgba(${currentScene.brightness > 1 ? '255,255,255' : '0,0,0'}, ${
                  Math.abs(currentScene.brightness - 1) * 0.25
                })`
              : 'transparent',
          mixBlendMode: currentScene.brightness > 1 ? 'screen' : 'multiply',
          opacity: Math.abs(currentScene.contrast - 1) * 0.5 + 0.5,
        }}
      />
      {temperature !== 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: tempColor,
            mixBlendMode: 'soft-light',
          }}
        />
      )}
      {tint !== 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: tintColor,
            mixBlendMode: 'overlay',
          }}
        />
      )}
      {vignette > 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            boxShadow: `inset 0 0 ${160 * vignette}px rgba(0,0,0,${0.5 * vignette})`,
          }}
        />
      )}
    </>
  );
};
