# 🎬 AI Video Forge

AI 驱动的视频再创造平台——上传视频，由火山引擎多模态大模型自动解析关键帧、场景、情绪与转场，选择风格模板后进行可视化编辑，最终通过 Remotion 渲染合成高质量视频。

---

## 🧩 核心功能

- **视频上传** — 支持拖拽上传，本地存储管理
- **AI 智能解析** — 基于火山引擎 Ark API（`doubao-seed` 多模态大模型）自动识别视频的关键帧、场景、情绪与转场
- **风格模板** — 内置 5 种预设风格：电影感、Vlog、科技感、复古风、极简风，每种风格对应独特的滤镜、转场速度与节奏效果
- **可视化编辑器** — 提供时间轴编辑、字幕编辑、参数调整等能力
- **Remotion 实时预览** — 通过 Remotion Player 在浏览器中实时预览视频合成效果
- **异步渲染** — 提交渲染任务后支持轮询状态，支持任务重试与删除
- **任务中心** — 统一管理所有视频处理任务的进度、结果与历史记录

---

## 💻 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| React 19 | UI 框架 |
| TypeScript 6 | 类型安全 |
| Vite 8 | 构建工具 |
| Tailwind CSS v4 | 原子化 CSS 样式 |
| Remotion 4 | 视频合成与渲染引擎 |
| Zustand 5 | 全局状态管理 |
| React Router DOM v7 | 客户端路由 |
| Lucide React | 图标库 |
| Radix UI + CVA | 无头 UI 组件与样式变体 |

### 后端

| 技术 | 用途 |
|------|------|
| Express 4 | HTTP 服务框架 |
| MongoDB 6 | 数据持久化（videos / parses 集合） |
| Multer | 文件上传中间件 |
| 大模型 API | 多模态视频解析 |

---

## 项目结构

```text
AIVideoForge/
├── public/                     # 静态资源
├── src/                        # 前端源码
│   ├── components/             # 组件（含 Layout、UI 基础组件）
│   ├── lib/                    # 工具函数（cn 等）
│   ├── pages/                  # 页面：Home / Upload / Parse / Styles / Editor / Preview / Tasks
│   ├── remotion/               # Remotion 视频合成（Composition 注册、合成组件）
│   ├── services/               # API 封装（axios）
│   ├── store/                  # Zustand 全局状态
│   ├── types/                  # TypeScript 类型定义
│   ├── App.tsx                 # 路由配置
│   └── main.tsx                # 入口
├── server/                     # 后端源码
│   ├── src/
│   │   ├── index.js            # 服务入口
│   │   └── routes/             # upload / parse / styles / render / tasks 路由
│   ├── uploads/                # 上传文件存储
│   └── package.json
├── package.json
├── vite.config.ts
├── tsconfig.json
└── index.html
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- MongoDB 服务（默认 `mongodb://localhost:27017/ai_video`）
- 火山引擎 Ark API Key（配置于 `server/.env`）

### 安装与运行

```bash
# 1. 安装前端依赖
npm install

# 2. 安装后端依赖
cd server && npm install && cd ..

# 3. 配置环境变量（在 server/.env 中设置）
# ARK_API_KEY=your_api_key_here

# 4. 启动后端（端口 3001）
cd server && npm run dev &

# 5. 启动前端（端口 5173）
npm run dev
```

---

## 📖 API 概览

| 方法 | 路由 | 说明 |
|------|------|------|
| POST | `/api/upload` | 上传视频文件 |
| POST | `/api/parse` | 触发 AI 视频解析 |
| GET | `/api/parse/:videoId/status` | 查询解析任务状态 |
| GET | `/api/styles` | 获取风格模板列表 |
| POST | `/api/render` | 提交视频渲染任务 |
| GET | `/api/render/:taskId/status` | 查询渲染任务进度 |
| GET | `/api/tasks` | 获取所有任务列表 |
| DELETE | `/api/tasks/:taskId` | 删除指定任务 |
| POST | `/api/tasks/:taskId/retry` | 重试失败任务 |

---

## ⭐️ 核心业务流

```
视频上传 → AI 多模态解析（关键帧 / 场景 / 情绪 / 转场）
  → 选择风格模板 → 编辑时间轴与字幕
    → Remotion 实时预览 → 提交渲染 → 轮询获取结果
```

系统整体采用**异步任务 + 轮询**机制串联长耗时业务，确保用户体验流畅。

---

## 🛠️ 开发

```bash
# 前端开发
npm run dev       # 启动 Vite 开发服务器
npm run build     # TypeScript 类型检查 + 构建
npm run lint      # ESLint 检查

# 后端开发
cd server && npm run dev    # node --watch 热重载模式
cd server && npm start      # 生产启动
```