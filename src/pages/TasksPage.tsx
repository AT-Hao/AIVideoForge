import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, RotateCcw, Trash2, Download, Film, Eye, X, PlaySquare, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTasks, retryTask, deleteTask } from '@/services/api';
import { useStore } from '@/store/useStore';
import type { Task, TaskStatus, TaskType, VideoParseResult } from '@/types';

const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending: { label: '等待中', icon: Loader2, color: 'text-muted-foreground', bg: 'bg-secondary' },
  processing: { label: '处理中', icon: Loader2, color: 'text-primary', bg: 'bg-primary/10' },
  completed: { label: '已完成', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  failed: { label: '失败', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

const typeConfig: Record<TaskType, string> = {
  upload: '上传',
  parse: '解析',
  render: '渲染',
};

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const navigate = useNavigate();
  const setCurrentVideo = useStore(s => s.setCurrentVideo);
  const setParseResult = useStore(s => s.setParseResult);

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

  const handleContinueEditing = (task: Task) => {
    if (task.video) {
      setCurrentVideo(task.video);
    }
    if (task.type === 'parse' && task.status === 'completed' && task.result) {
      setParseResult(task.result as VideoParseResult);
      navigate('/styles');
    } else {
      navigate('/parse');
    }
  };

  const handleViewResult = (task: Task) => {
    if (task.video) {
      setCurrentVideo(task.video);
    }
    if (task.type === 'parse' && task.status === 'completed' && task.result) {
      setParseResult(task.result as VideoParseResult);
      navigate('/parse');
    } else {
      setSelectedTask(task);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            const status = statusConfig[task.status];
            const StatusIcon = status.icon;
            return (
              <div key={task.id} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
                <div className="relative h-40 bg-secondary flex items-center justify-center overflow-hidden">
                  {task.video ? (
                    <video 
                      src={`${task.video.url}#t=0.1`} 
                      className="w-full h-full object-cover" 
                      preload="metadata"
                    />
                  ) : (
                    <Film className="w-10 h-10 text-muted-foreground/30" />
                  )}
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2 py-1 text-xs font-medium rounded-md bg-background/80 backdrop-blur-sm border border-border">
                      {typeConfig[task.type]}
                    </span>
                  </div>
                  <div className={`absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 backdrop-blur-sm border border-border ${status.bg} ${status.color}`}>
                    <StatusIcon className={`w-3.5 h-3.5 ${task.status === 'processing' ? 'animate-spin' : ''}`} />
                    {status.label}
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-medium truncate mb-1" title={task.video?.name || task.id}>
                    {task.video?.name || '未知视频'}
                  </h3>
                  
                  <div className="text-sm text-muted-foreground flex-1">
                    <p className="truncate" title={task.message}>{task.message}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(task.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {(task.status === 'processing' || task.status === 'pending') && (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium min-w-[3ch]">{task.progress}%</span>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-border flex items-center justify-end gap-4">
                    {task.status === 'failed' && (
                      <Button variant="outline" size="sm" onClick={() => handleRetry(task.id)}>
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        重试
                      </Button>
                    )}
                    {task.status === 'completed' && !!task.result && (
                      <Button variant="outline" size="sm" onClick={() => handleViewResult(task)}>
                        <Eye className="w-4 h-4 mr-1.5" />
                        查看结果
                      </Button>
                    )}
                    {task.status === 'completed' && task.type === 'parse' && (
                      <Button variant="default" size="sm" onClick={() => handleContinueEditing(task)}>
                        <PlaySquare className="w-3 h-4 mr-1.5" />
                        继续编辑
                      </Button>
                    )}
                    {task.status === 'completed' && task.type === 'render' && (
                      <Button variant="default" size="sm">
                        <Download className="w-4 h-4 mr-1.5" />
                        下载视频
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                任务内容 ({typeConfig[selectedTask.type]})
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setSelectedTask(null)} className="rounded-full hover:bg-secondary">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <pre className="bg-secondary/50 p-4 rounded-lg text-sm whitespace-pre-wrap font-mono text-secondary-foreground border border-border/50">
                {JSON.stringify(selectedTask.result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
