import { Link } from 'react-router-dom';
import { Upload, Sparkles, Film, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center py-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          AI 驱动的视频再创造平台
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground">
          让每一帧都焕发新生
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          上传视频，AI 自动解析内容，选择风格，一键再创造。从解析到渲染，全流程智能化。
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/upload">
            <Button size="lg" className="gap-2">
              <Upload className="w-4 h-4" />
              开始上传
            </Button>
          </Link>
          <Link to="/tasks">
            <Button variant="outline" size="lg" className="gap-2">
              <Film className="w-4 h-4" />
              查看任务
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            icon: Upload,
            title: '视频上传',
            desc: '支持拖拽上传，调用火山引擎 Files API 安全存储',
          },
          {
            icon: Sparkles,
            title: 'AI 解析',
            desc: '多模态模型自动分析视频内容，提取关键帧与场景',
          },
          {
            icon: Film,
            title: '再创造',
            desc: '选择风格、编辑时间轴，Remotion 渲染高质量视频',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <item.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
