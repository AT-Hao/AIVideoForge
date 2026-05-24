import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
} from 'remotion';
import { Video } from '@remotion/media';
import type { StyleParams, SubtitleItem } from '@/types';

interface VideoCompositionProps {
  videoUrl: string;
  styleParams: StyleParams;
  subtitles: SubtitleItem[];
}

const colorToneMap: Record<string, string> = {
  bright: 'brightness(1.1) saturate(1.2)',
  'teal-orange': 'sepia(0.3) contrast(1.1)',
  cyber: 'hue-rotate(180deg) contrast(1.2) saturate(1.5)',
  sepia: 'sepia(0.6) contrast(1.1)',
  mono: 'grayscale(1) contrast(1.1)',
};

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  videoUrl,
  styleParams,
  subtitles,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const filter = colorToneMap[styleParams.colorTone] || 'none';

  const opacity = interpolate(frame, [0, fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const currentSub = subtitles.find(
    (s) => frame >= s.start * fps && frame <= s.end * fps
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {videoUrl ? (
        <Video
          src={videoUrl}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter,
            opacity,
          }}
        />
      ) : (
        <div
          style={{
            color: '#fff',
            fontSize: 48,
            fontFamily: 'Outfit, sans-serif',
            opacity,
          }}
        >
          AI Video Studio
        </div>
      )}

      {currentSub && (
        <div
          style={{
            position: 'absolute',
            bottom: 80,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: '#fff',
            fontSize: 32,
            fontFamily: 'Noto Sans SC, sans-serif',
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            padding: '0 40px',
          }}
        >
          {currentSub.text}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 120px rgba(0,0,0,0.3)',
        }}
      />
    </AbsoluteFill>
  );
};
