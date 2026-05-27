import { Composition } from 'remotion';
import { PipelineComposition } from './PipelineComposition';
import { emptyRenderPlan } from './capabilities';

export const RemotionRoot = () => {
  return (
    <Composition
      id="PipelineComposition"
      component={PipelineComposition as unknown as React.FC<Record<string, unknown>>}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        plan: emptyRenderPlan(),
      }}
    />
  );
};
