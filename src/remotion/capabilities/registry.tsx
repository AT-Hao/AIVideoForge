/**
 * Capability Registry —— 前端渲染端
 *
 * 每一个 Capability.kind 对应一个 React 渲染器组件。新能力只需在此注册
 * 一行映射即可被 PipelineComposition 自动识别并渲染。
 */

import { Video, Audio } from '@remotion/media';
import { Img, staticFile } from 'remotion';
import { ColorGradeLayer } from '../layers/ColorGradeLayer';
import { TransitionLayer } from '../layers/TransitionLayer';
import { VFXLayer } from '../layers/VFXLayer';
import { TextOverlayLayer } from '../layers/TextOverlayLayer';
import { IntroLayer } from '../layers/IntroLayer';
import { AudioMixLayer } from '../layers/AudioMixLayer';
import type {
  Capability,
  CapabilityKind,
  MediaVideoProps,
  MediaAudioProps,
  MediaImageProps,
  VisualColorGradeProps,
  VisualTransitionProps,
  VisualVFXProps,
  VisualTextProps,
  VisualIntroProps,
  AudioMixProps,
} from './types';

// ---- Inner renderers (for media kinds) ----

const MediaVideoRenderer: React.FC<MediaVideoProps> = (props) => {
  if (!props.src) return null;
  const src =
    props.src.startsWith('http') || props.src.startsWith('blob:')
      ? props.src
      : staticFile(props.src);
  return (
    <Video
      src={src}
      volume={props.volume ?? 1}
      playbackRate={props.playbackRate ?? 1}
      trimBefore={props.startFromFrame}
      trimAfter={props.endAtFrame}
      objectFit={props.objectFit ?? 'cover'}
      style={{
        width: '100%',
        height: '100%',
        filter: props.cssFilter || 'none',
      }}
    />
  );
};

const MediaAudioRenderer: React.FC<MediaAudioProps> = (props) => {
  if (!props.src) return null;
  const src =
    props.src.startsWith('http') || props.src.startsWith('blob:')
      ? props.src
      : staticFile(props.src);
  return (
    <Audio
      src={src}
      volume={props.volume ?? 1}
      trimBefore={props.startFromFrame}
      trimAfter={props.endAtFrame}
    />
  );
};

const MediaImageRenderer: React.FC<MediaImageProps> = (props) => {
  if (!props.src) return null;
  const src = props.src.startsWith('http') ? props.src : staticFile(props.src);
  return (
    <Img
      src={src}
      style={{
        width: '100%',
        height: '100%',
        objectFit: props.objectFit ?? 'cover',
      }}
    />
  );
};

// ---- Registry ----

type AnyProps = Record<string, unknown>;
type AnyRenderer = (props: AnyProps) => React.ReactNode;

interface CapabilityDescriptor {
  kind: CapabilityKind;
  render: AnyRenderer;
}

function wrap<P extends object>(C: React.FC<P>): AnyRenderer {
  return (props: AnyProps) => {
    const Cmp = C as unknown as React.FC<AnyProps>;
    return <Cmp {...props} />;
  };
}

const REGISTRY: Record<CapabilityKind, CapabilityDescriptor> = {
  'media.video': {
    kind: 'media.video',
    render: wrap<MediaVideoProps>(MediaVideoRenderer),
  },
  'media.audio': {
    kind: 'media.audio',
    render: wrap<MediaAudioProps>(MediaAudioRenderer),
  },
  'media.image': {
    kind: 'media.image',
    render: wrap<MediaImageProps>(MediaImageRenderer),
  },
  'visual.colorGrade': {
    kind: 'visual.colorGrade',
    render: (p) => {
      const { config } = p as unknown as VisualColorGradeProps;
      return <ColorGradeLayer config={config} />;
    },
  },
  'visual.transition': {
    kind: 'visual.transition',
    render: (p) => {
      const { transitions } = p as unknown as VisualTransitionProps;
      return <TransitionLayer transitions={transitions} />;
    },
  },
  'visual.vfx': {
    kind: 'visual.vfx',
    render: (p) => {
      const { effects } = p as unknown as VisualVFXProps;
      return <VFXLayer effects={effects} />;
    },
  },
  'visual.text': {
    kind: 'visual.text',
    render: (p) => {
      const { subtitles, styleConfig } = p as unknown as VisualTextProps;
      return (
        <TextOverlayLayer subtitles={subtitles} styleConfig={styleConfig} />
      );
    },
  },
  'visual.intro': {
    kind: 'visual.intro',
    render: (p) => {
      const props = p as unknown as VisualIntroProps;
      return (
        <IntroLayer
          text={props.text}
          durationInFrames={props.durationInFrames}
          fadeOutFrames={props.fadeOutFrames}
          fontSize={props.fontSize}
          fontFamily={props.fontFamily}
        />
      );
    },
  },
  'audio.mix': {
    kind: 'audio.mix',
    render: (p) => {
      const { config } = p as unknown as AudioMixProps;
      return <AudioMixLayer config={config} />;
    },
  },
};

export function renderCapability(cap: Capability): React.ReactNode {
  if (cap.enabled === false) return null;
  const render = REGISTRY[cap.kind]?.render;
  if (!render) {
    // eslint-disable-next-line no-console
    console.warn(`[capabilities] unknown kind: ${cap.kind}`);
    return null;
  }
  return render(cap.props as unknown as AnyProps);
}
