import { Router } from 'express';

const router = Router();

const styles = [
  {
    id: 'cinematic',
    name: '电影感',
    description: '宽银幕比例、胶片色调、戏剧性光影',
    params: { colorTone: 'teal-orange', transitionSpeed: 1.5, subtitleStyle: 'elegant', filter: 'cinematic' },
  },
  {
    id: 'vlog',
    name: 'Vlog 风格',
    description: '明亮清新、快节奏剪辑、活泼字幕',
    params: { colorTone: 'bright', transitionSpeed: 0.8, subtitleStyle: 'bounce', filter: 'vlog' },
  },
  {
    id: 'tech',
    name: '科技感',
    description: '冷色调、线条动画、数据可视化风格',
    params: { colorTone: 'cyber', transitionSpeed: 1.0, subtitleStyle: 'mono', filter: 'tech' },
  },
  {
    id: 'retro',
    name: '复古风',
    description: '暖色调、颗粒感、怀旧滤镜',
    params: { colorTone: 'sepia', transitionSpeed: 1.2, subtitleStyle: 'classic', filter: 'retro' },
  },
  {
    id: 'minimal',
    name: '极简主义',
    description: '黑白灰、大量留白、简洁转场',
    params: { colorTone: 'mono', transitionSpeed: 1.0, subtitleStyle: 'clean', filter: 'minimal' },
  },
];

router.get('/', (req, res) => {
  res.json(styles);
});

export default router;
