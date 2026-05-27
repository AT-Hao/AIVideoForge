import { Audio } from '@remotion/media';
import { Sequence } from 'remotion';
import type { AudioMixConfig } from '@/types/pipeline';

interface AudioMixLayerProps {
  config: AudioMixConfig;
}

export const AudioMixLayer: React.FC<AudioMixLayerProps> = ({ config }) => {
  const master = config.masterVolume ?? 1;
  return (
    <>
      {config.tracks
        .filter((t) => Boolean(t.url))
        .map((track) => (
          <Sequence
            key={track.id}
            from={track.startFrame}
            durationInFrames={Math.max(1, track.endFrame - track.startFrame)}
            layout="none"
          >
            <Audio
              src={track.url}
              volume={Math.max(0, Math.min(1, track.volume * master))}
            />
          </Sequence>
        ))}
    </>
  );
};
