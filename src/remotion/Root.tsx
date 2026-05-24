import { Composition } from 'remotion';
import { VideoComposition } from './VideoComposition';

export const RemotionRoot = () => {
  return (
    <Composition
      id="VideoComposition"
      component={VideoComposition as unknown as React.FC<Record<string, unknown>>}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        videoUrl: '',
        styleParams: {
          colorTone: 'bright',
          transitionSpeed: 1,
          subtitleStyle: 'clean',
          filter: 'none',
        },
        subtitles: [],
      }}
    />
  );
};
