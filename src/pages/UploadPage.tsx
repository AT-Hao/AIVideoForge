import { useState, useCallback } from 'react';
import { Upload, FileVideo, Loader2 } from 'lucide-react';
import { uploadVideo } from '@/services/api';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';

export function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const setCurrentVideo = useStore((s) => s.setCurrentVideo);
  const navigate = useNavigate();

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('video/')) {
        setError('请选择视频文件');
        return;
      }
      setError('');
      setUploading(true);
      setProgress(0);
      try {
        const result = await uploadVideo(file, (p) => setProgress(p));
        setCurrentVideo(result);
        setUploading(false);
        navigate('/parse');
      } catch (e) {
        setUploading(false);
        setError('上传失败，请重试');
      }
    },
    [setCurrentVideo, navigate]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">上传视频</h2>
        <p className="text-muted-foreground">拖拽或选择本地视频文件开始解析</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border bg-card'}
        `}
      >
        <input
          type="file"
          accept="video/*"
          onChange={onInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">
              {uploading ? '正在上传...' : '点击或拖拽视频到此处'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              支持 MP4、MOV、AVI 等常见格式
            </p>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">上传进度</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <FileVideo className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
}
