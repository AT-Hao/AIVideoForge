import { Link, useLocation } from 'react-router-dom';
import { Upload, Sparkles, Film, List, Home, Brain, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/upload', label: '视频上传', icon: Upload },
  { path: '/parse', label: '视频解析', icon: Brain },
  { path: '/styles', label: '风格选择', icon: Sparkles },
  { path: '/editor', label: '视频编辑', icon: Film },
  { path: '/preview', label: '预览渲染', icon: Eye },
  { path: '/tasks', label: '任务中心', icon: List },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-background">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-semibold text-primary tracking-tight">
            AI Video Forge
          </h1>
          <p className="text-xs text-muted-foreground mt-1">视频解析及再创造AI智能平台</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            AI Video Platform v0.1.0
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
