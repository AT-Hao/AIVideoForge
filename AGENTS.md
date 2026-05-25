# AI Video Studio - 项目文档

## 1. 项目概述
AI 驱动的视频再创造平台。核心业务流：视频上传 → 火山引擎多模态模型解析（关键帧/场景/情绪/转场） → 选择风格模板及编辑 → Remotion 渲染合成。

**核心技术栈**:
- **前端**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Zustand, Remotion 4
- **后端**: Express 4, MongoDB, 火山引擎 Ark API

---

## 2. 核心架构与目录结构

```text
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

## 3. 核心数据流与 API
系统整体通过**异步任务 + 轮询**的机制串联长耗时业务。

1. **上传**: `POST /api/upload` → 视频存入 MongoDB `videos` 集合。
2. **解析**:
   - `POST /api/parse`: 触发异步任务，通过 `volcengine.js` 将视频传至火山引擎 Ark，调用 `doubao-seed` 多模态大模型。
   - `GET /api/parse/:videoId/status`: 前端轮询获取解析结果，存入 MongoDB `parses` 集合。
3. **编辑**: 结合 `StylesPage` (选择模板) 和 `EditorPage` (编辑时间轴/字幕)，生成前端 `EditProject` 状态。
4. **预览与渲染**:
   - 前端通过 Remotion Player 实时预览组合效果。
   - `POST /api/render` 提交渲染，`GET /api/render/:taskId/status` 获取进度（当前后端基于内存模拟）。

---

## 4. 关键模块说明

### 4.1 火山引擎集成 (Ark API)
位于 `server/src/volcengine.js`。依赖 `ARK_API_KEY`，使用模型 `doubao-seed-1-6-251015` (`purpose: user_data`)。
包含三大步骤：上传视频 → 轮询等待预处理激活 → 提交 Prompt 进行视频结构化解析 (生成摘要、场景、情绪、转场)。

### 4.2 Remotion 视频合成
位于 `src/remotion/VideoComposition.tsx`。
接收 `videoUrl`, `styleParams`, `subtitles` 属性。利用 CSS 滤镜(实现 `colorTone`)、CSS 动画(转场与暗角)以及按时间轴动态叠加字幕。分辨率固定为 `1920×1080` (16:9)，帧率 `30fps`。

### 4.3 风格模板系统
预设 5 种风格：`cinematic`(电影感), `vlog`, `tech`(科技感), `retro`(复古风), `minimal`(极简)。
通过 `colorTone` (亮色/复古/黑白等), `transitionSpeed` (转场速度), 和 `filter` 映射具体的视觉与节奏效果。

---

## 5. 开发指南

**环境准备**:
- 确保启动 MongoDB 服务 (默认 `mongodb://localhost:27017/ai_video`)。
- 在 `server/.env` 目录下配置 `ARK_API_KEY` 环境变量。

**运行服务**:
```bash
# 前端 (AIVideoForge 目录下)
npm run dev

# 后端 (AIVideoForge/server 目录下)
npm run dev
```

**开发规范**:
- 代码逻辑变更后，需同步更新本 `AGENTS.md` 文档。
- 运行中出现文档与代码不一致时，以**代码实现逻辑**为准。