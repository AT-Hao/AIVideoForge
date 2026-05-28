import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, Easing } from 'remotion';

interface IntroLayerProps {
  text: string;
  durationInFrames: number;
  fadeOutFrames?: number;
  fontSize?: number;
  fontFamily?: string;
}

const IntroCard: React.FC<Required<Omit<IntroLayerProps, 'durationInFrames'>> & {
  durationInFrames: number;
}> = ({ text, durationInFrames, fadeOutFrames, fontSize, fontFamily }) => {
  const frame = useCurrentFrame();

  // 文字进入淡入（前 10 帧），整体淡出在最后 fadeOutFrames 帧
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - fadeOutFrames, durationInFrames],
    [1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.4, 0, 1, 1),
    }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
      }}
    >
      <div
        style={{
          color: '#FFFFFF',
          fontFamily,
          fontSize,
          fontWeight: 600,
          letterSpacing: 2,
          filter: 'grayscale(1)',
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const IntroLayer: React.FC<IntroLayerProps> = ({
  text,
  durationInFrames,
  fadeOutFrames = 15,
  fontSize = 96,
  fontFamily = 'Helvetica, Arial, sans-serif',
}) => {
  if (!text || durationInFrames <= 0) return null;
  return (
    <Sequence from={0} durationInFrames={durationInFrames} layout="none">
      <IntroCard
        text={text}
        durationInFrames={durationInFrames}
        fadeOutFrames={fadeOutFrames}
        fontSize={fontSize}
        fontFamily={fontFamily}
      />
    </Sequence>
  );
};
