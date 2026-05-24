# AI Video Studio - Agent 项目文档

## 项目概述

AI Video Studio 是一个 AI 驱动的视频再创造平台。用户可以上传视频，AI 自动解析内容（关键帧、场景、情绪、转场），选择风格模板，编辑时间轴，最终通过 Remotion 渲染生成新视频。

**技术栈**: React 19 + TypeScript + Vite + Tailwind CSS v4 + Remotion + Express + Zustand

---

## 项目结构

```
AIVideoForge/
├── public/                     # 静态资源
│   ├── favicon.svg
│   └── icons.svg
│
├── src/                        # 前端源码 (React + TypeScript)
│   ├── assets/                 # 图片资源
│   ├── components/             # 组件
│   │   ├── ui/                 # UI 基础组件 (shadcn)
│   │   │   └── button.tsx      # Button 组件 (Radix + CVA)
│   │   └── Layout.tsx          # 侧边栏布局导航
│   ├── lib/
│   │   └── utils.ts            # cn() 工具函数 (clsx + tailwind-merge)
│   ├── pages/                  # 页面组件
│   │   ├── HomePage.tsx        # 首页 / 功能介绍
│   │   ├── UploadPage.tsx      # 视频上传 (拖拽上传)
│   │   ├── ParsePage.tsx       # 视频解析结果展示
│   │   ├── StylesPage.tsx      # 风格模板选择
│   │   ├── EditorPage.tsx      # 视频编辑器 (时间轴/字幕/参数)
│   │   ├── PreviewPage.tsx     # Remotion 预览与渲染提交
│   │   └── TasksPage.tsx       # 任务中心 (查看/重试/删除)
│   ├── remotion/               # Remotion 视频合成
│   │   ├── Root.tsx            # Remotion Composition 注册
│   │   ├── VideoComposition.tsx # 视频合成组件 (滤镜/字幕/淡入)
│   │   └── index.ts            # 导出
│   ├── services/
│   │   └── api.ts              # API 封装 (axios)
│   ├── store/
│   │   └── useStore.ts         # Zustand 全局状态管理
│   ├── types/
│   │   └── index.ts            # TypeScript 类型定义
│   ├── App.tsx                 # 路由配置 (react-router-dom v7)
│   ├── main.tsx                # 入口文件
│   ├── App.css                 # 全局样式
│   └── index.css               # Tailwind 入口 + CSS 变量
│
├── server/                     # 后端源码 (Express + ES Module)
│   ├── src/
│   │   ├── index.js            # 服务入口 (路由注册/中间件)
│   │   └── routes/
│   │       ├── upload.js       # 视频上传 (multer, 本地存储)
│   │       ├── parse.js        # 视频解析 (模拟 AI 解析)
│   │       ├── styles.js       # 风格模板列表
│   │       ├── render.js       # 渲染任务创建与状态
│   │       └── tasks.js        # 任务管理 (查询/重试/删除)
│   ├── uploads/                # 上传文件存储目录
│   └── package.json
│
├── package.json                # 前端依赖
├── vite.config.ts              # Vite 配置 (路径别名 @/src)
├── tsconfig.json               # TypeScript 配置
├── tailwind.config.js          # Tailwind CSS 配置
├── postcss.config.js           # PostCSS 配置
├── eslint.config.js            # ESLint 配置
└── index.html                  # HTML 入口
```

---

## 核心依赖

### 前端

| 依赖 | 版本 | 用途 |
|------|------|------|
| react | ^19.2.6 | UI 框架 |
| react-router-dom | ^7.15.1 | 路由管理 |
| remotion | ^4.0.465 | 视频程序化渲染 |
| @remotion/player | ^4.0.465 | 视频预览播放器 |
| @remotion/media | ^4.0.465 | 媒体组件 |
| zustand | ^5.0.13 | 状态管理 |
| axios | ^1.16.1 | HTTP 请求 |
| tailwindcss | ^4.3.0 | CSS 框架 |
| @radix-ui/react-slot | ^1.2.4 | 组件插槽 |
| class-variance-authority | ^0.7.1 | 组件变体管理 |
| lucide-react | ^1.16.0 | 图标库 |

### 后端

| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^4.21.0 | Web 框架 |
| cors | ^2.8.5 | 跨域处理 |
| multer | ^1.4.5-lts.1 | 文件上传 |
| uuid | ^10.0.0 | 唯一 ID 生成 |
| dotenv | ^16.4.5 | 环境变量 |


---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/upload | 上传视频 (multipart/form-data) |
| POST | /api/parse | 创建解析任务 |
| GET | /api/parse/:videoId/status | 查询解析状态 |
| GET | /api/styles | 获取风格模板列表 |
| POST | /api/render | 创建渲染任务 |
| GET | /api/render/:taskId/status | 查询渲染状态 |
| GET | /api/tasks | 获取所有任务 |
| POST | /api/tasks/:taskId/retry | 重试任务 |
| DELETE | /api/tasks/:taskId | 删除任务 |
| GET | /api/health | 健康检查 |

---

## 状态管理 (Zustand)

```typescript
interface AppState {
  currentVideo: VideoUploadResult | null;   // 当前上传的视频
  parseResult: VideoParseResult | null;     // 解析结果
  selectedStyle: StyleTemplate | null;      // 选中的风格
  currentProject: EditProject | null;       // 当前编辑项目
  tasks: Task[];                            // 任务列表
}
```

---

## 路由结构

| 路径 | 页面 | 说明 |
|------|------|------|
| / | HomePage | 首页，功能介绍 |
| /upload | UploadPage | 视频上传 (支持拖拽) |
| /parse | ParsePage | 解析结果展示 |
| /styles | StylesPage | 风格模板选择 (5种预设) |
| /editor | EditorPage | 视频编辑 (时间轴/参数) |
| /preview | PreviewPage | Remotion 预览 + 提交渲染 |
| /tasks | TasksPage | 任务列表管理 |

---

## 风格模板

| ID | 名称 | 色调 | 特点 |
|----|------|------|------|
| cinematic | 电影感 | teal-orange | 宽银幕、胶片色调、戏剧性光影 |
| vlog | Vlog 风格 | bright | 明亮清新、快节奏、活泼字幕 |
| tech | 科技感 | cyber | 冷色调、线条动画、数据可视化 |
| retro | 复古风 | sepia | 暖色调、颗粒感、怀旧滤镜 |
| minimal | 极简主义 | mono | 黑白灰、大量留白、简洁转场 |

---

## Remotion 视频合成

- **Composition**: `VideoComposition`
- **分辨率**: 1920x1080 (16:9)
- **帧率**: 30fps
- **默认时长**: 300 帧 (10秒)
- **功能**: 视频播放、CSS 滤镜 (colorToneMap)、字幕叠加、淡入动画

### 滤镜映射
```typescript
const colorToneMap = {
  bright: 'brightness(1.1) saturate(1.2)',
  'teal-orange': 'sepia(0.3) contrast(1.1)',
  cyber: 'hue-rotate(180deg) contrast(1.2) saturate(1.5)',
  sepia: 'sepia(0.6) contrast(1.1)',
  mono: 'grayscale(1) contrast(1.1)',
};
```

---

## 开发命令

### 前端
```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # 构建生产版本 (tsc + vite build)
npm run lint     # ESLint 检查
npm run preview  # 预览生产构建
```

### 后端
```bash
cd server
npm run dev      # 启动开发服务器 (node --watch)
npm start        # 启动生产服务器
```

---

## 关键配置

### Vite 路径别名
```typescript
// vite.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
}
```

### API 基础地址
```typescript
// src/services/api.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
```

### 上传限制
```javascript
// server/src/routes/upload.js
limits: { fileSize: 2 * 1024 * 1024 * 1024 }  // 2GB
```

---

## 开发注意事项
- 在开发时，如果修改了代码实现逻辑，需要**同步更新该文档**。
- 如果该文档与代码实现逻辑不一致，以**代码实现逻辑为准**。
