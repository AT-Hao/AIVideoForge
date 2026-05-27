import { AbsoluteFill } from 'remotion';
import type { RenderPlan, Capability } from './capabilities';
import { renderCapability, emptyRenderPlan } from './capabilities';

export interface PipelineCompositionProps {
  /**
   * 渲染计划。前端 Player 与后端 Remotion 渲染器都直接消费 RenderPlan，
   * Composition 自身不再耦合 styleProfile 数据结构。
   */
  plan: RenderPlan;
}

export const PipelineComposition: React.FC<PipelineCompositionProps> = ({
  plan,
}) => {
  const safePlan = plan ?? emptyRenderPlan();

  // 按 zIndex 升序渲染，未指定的视为 0
  const ordered: Capability[] = [...safePlan.capabilities].sort(
    (a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: safePlan.background ?? '#000',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {ordered.map((cap) => (
        <CapabilitySlot key={cap.id} capability={cap} />
      ))}
    </AbsoluteFill>
  );
};

const CapabilitySlot: React.FC<{ capability: Capability }> = ({
  capability,
}) => {
  const node = renderCapability(capability);
  if (!node) return null;

  // 媒体类直接铺满父容器，其它能力本身已是 absolute
  if (capability.kind.startsWith('media.')) {
    return <AbsoluteFill>{node}</AbsoluteFill>;
  }
  return <>{node}</>;
};
