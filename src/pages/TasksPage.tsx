import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, RotateCcw, Trash2, Download, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTasks, retryTask, deleteTask } from '@/services/api';
import type { Task, TaskStatus, TaskType } from '@/types';

const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; color: string }> = {
  pending: { label: '等待中', icon: Loader2, color: 'text-muted-foreground' },
  processing: { label: '处理中', icon: Loader2, color: 'text-primary' },
  completed: { label: '已完成', icon: CheckCircle, color: 'text-green-500' },
  failed: { label: '失败', icon: XCircle, color: 'text-destructive' },
};

const typeConfig: Record<TaskType, string> = {
  upload: '上传',
  parse: '解析',
  render: '渲染',
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const data = await getTasks();
      setTasks(data);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (id: string) => {
    await retryTask(id);
    fetchTasks();
  };

  const handleDelete = async (id: string) => {
    await deleteTask(id);
    fetchTasks();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">任务中心</h2>
        <p className="text-muted-foreground">查看所有上传、解析和渲染任务的状态</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 space-y-4">
          <Film className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">暂无任务，去上传一个视频吧</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">类型</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">状态</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">进度</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">消息</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">时间</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const status = statusConfig[task.status];
                const StatusIcon = status.icon;
                return (
                  <tr key={task.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">{typeConfig[task.type]}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 ${status.color}`}>
                        <StatusIcon className={`w-4 h-4 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{task.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{task.message}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(task.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {task.status === 'failed' && (
                          <Button variant="ghost" size="icon" onClick={() => handleRetry(task.id)}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {task.status === 'completed' && task.type === 'render' && (
                          <Button variant="ghost" size="icon">
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
