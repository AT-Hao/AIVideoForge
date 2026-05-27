# AI Video Studio - 项目文档

## 1. 项目概述
AI 驱动的视频再创造平台。核心业务流：视频上传 → 火山引擎多模态模型解析（关键帧/场景/情绪/转场） → AI 逐方面风格分析（色彩/转场/字幕/特效/音乐/综析，6 路并行） → 编译为统一的 **RenderPlan（Capability 数组）** → Remotion 渲染合成。每一个 AI 风格分析方面对应一个 Remotion Capability，并支持将解析得到的整套风格保存为可复用的用户风格模板。

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
│   │   ├── PreviewPage.tsx     # Remotion Player 预览 + 提交渲染（基于 RenderPlan）
│   │   └── TasksPage.tsx       # 任务中心 (查看/重试/删除)
│   ├── remotion/               # Remotion 视频合成
│   │   ├── Root.tsx            # 注册 PipelineComposition（接收 RenderPlan）
│   │   ├── PipelineComposition.tsx # 通用合成容器：消费 RenderPlan，按 zIndex 渲染 Capability
│   │   ├── capabilities/       # ★ Remotion 能力抽象层（前后端共用核心）
│   │   │   ├── types.ts        # Capability 类型 + RenderPlan 类型
│   │   │   ├── compile.ts      # styleProfile + 视频源 + 字幕 → RenderPlan 编译器
│   │   │   ├── registry.tsx    # Capability Kind → React 渲染器 注册表
│   │   │   └── index.ts        # 统一导出
│   │   ├── layers/             # 各 Capability 内部的 React 渲染实现
│   │   │   ├── ColorGradeLayer.tsx    # visual.colorGrade
│   │   │   ├── TransitionLayer.tsx    # visual.transition
│   │   │   ├── TextOverlayLayer.tsx   # visual.text
│   │   │   ├── VFXLayer.tsx           # visual.vfx
│   │   │   └── AudioMixLayer.tsx      # audio.mix
│   │   └── index.ts            # 导出
│   ├── services/
│   │   └── api.ts              # API 封装（基于 RenderPlan）
│   ├── store/
│   │   └── useStore.ts         # Zustand 全局状态管理
│   ├── types/
│   │   ├── index.ts            # TypeScript 类型定义（基础类型）
│   │   └── pipeline.ts         # 管线类型定义（PipelineDefinition, VideoStyleProfile 等）
│   ├── App.tsx                 # 路由配置 (react-router-dom v7)
│   ├── main.tsx                # 入口文件
│   ├── App.css                 # 全局样式
│   └── index.css               # Tailwind 入口 + CSS 变量
│
├── server/                     # 后端源码 (Express + ES Module)
│   ├── src/
│   │   ├── index.js            # 服务入口 (路由注册/中间件)
│   │   ├── db.js               # MongoDB 连接管理
│   │   ├── volcengine.js       # 火山引擎 Ark API 集成（上传/解析/风格分析）
│   │   ├── remotion/
│   │   │   └── capabilities.js # ★ 服务端 RenderPlan 编译器（与前端同构，无 React 依赖）
│   │   ├── routes/
│   │   │   ├── upload.js       # 视频上传 (multer, 本地存储)
│   │   │   ├── parse.js        # 视频解析 + AI 风格分析（异步任务 + 轮询）
│   │   │   ├── styles.js       # 风格模板列表
│   │   │   ├── render.js       # 渲染任务（接收 RenderPlan / videoId，预留 Remotion 渲染器接入点）
│   │   │   ├── pipeline.js     # 渲染管线管理（创建/查询/执行，全部围绕 RenderPlan）
│   │   │   └── tasks.js        # 任务管理 (查询/重试/删除)
│   │   └── pipeline/           # 管线编排模块
│   │       ├── orchestrator.js     # 基于 RenderPlan 构建 PipelineDefinition
│   │       ├── ai-prompts.js       # 5 个方面的独立 AI Prompt 模板
│   │       └── template-distill.js # 风格模板「蒸馏 / 应用」模块（跨视频复用核心）
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

### 3.1 视频上传
`POST /api/upload` → 视频存入 MongoDB `videos` 集合。

### 3.2 视频解析与 AI 风格分析
- `POST /api/parse`: 触发异步任务，通过 `volcengine.js` 将视频传至火山引擎 Ark，调用 `doubao-seed` 多模态大模型进行结构化解析（关键帧/场景/情绪/转场/摘要）。
- `GET /api/parse/:videoId/status`: 前端轮询获取解析结果 + 风格分析结果（含 `styleProfile`）。
- 解析完成后自动执行 **6 个独立 AI Prompt 并行调用**，逐方面分析视频风格：
  - `analyzeStyleColorGrade()` — 调色师视角，输出场景级色彩分级（亮度/对比/饱和/色温/色调/暗角）
  - `analyzeStyleTransitions()` — 剪辑师视角，为相邻场景推荐转场（含触发帧/强度/缓动）
  - `analyzeStyleSubtitle()` — 字幕设计师视角，推荐字体/动画/位置/字重/描边/背景
  - `analyzeStyleEffects()` — 视觉特效师视角，根据情绪曲线推荐特效（暗角/颗粒/光晕/故障/色差）
  - `analyzeStyleAudio()` — 音乐总监视角，推荐 mood/genre/BPM/masterVolume 与音轨
  - `analyzeStyleProfile()` — 综合风格描述与整体推荐
- 结果通过 `buildVideoStyleProfile()` 聚合为 `VideoStyleProfile`，存入 MongoDB `style_profiles` 集合。
- `GET /api/parse/:videoId/style-profile`: 直接查询已存储的风格数据。

### 3.3 风格模板（跨视频可复用）
风格模板的核心难点在于**让一份风格能脱离原视频被任意新视频套用**。系统通过「蒸馏 → 应用」两阶段实现：

- **蒸馏（Distill）** — 保存模板时，把 `VideoStyleProfile` 中与原视频强绑定的「绝对帧 / 时间范围 / 具体音轨 URL」剥离，提炼为可迁移的 `StyleTemplate`。
- **应用（Resolve）** — 套用到新视频时，结合新视频的 `parseResult`（场景列表）将模板重新具象化为属于新视频的 `VideoStyleProfile`。

API：
- `GET /api/styles` — 从 `saved_styles` 集合读取，返回内置预设 + 用户风格统一列表。
- `POST /api/styles/save` — 在 `ParsePage` 点击「保存风格」时调用，**先蒸馏再入库**，存入 `saved_styles`。
- `POST /api/styles/:id/apply` — `StylesPage` 选定风格点击「下一步」时调用，传入 `videoId`，服务端基于新视频的 `parseResult` 解析模板并写入 / 更新 `style_profiles`。
- `DELETE /api/styles/:id` — 仅允许删除 `source: 'user'` 的风格，预设受保护。

### 3.4 Remotion 能力抽象与 RenderPlan
**RenderPlan 是前后端通用的渲染指令**：是一份可序列化的 `{ compositionId, width, height, fps, durationInFrames, capabilities[] }`。每个 `Capability` 由 `kind`（能力类型）+ `props`（参数）+ `zIndex`（层级）+ `enabled?` 组成。

支持的 Capability Kind：

| Kind | 含义 | 渲染器 |
|---|---|---|
| `media.video` | 主视频 / 视频图层 | `<Video>` (`@remotion/media`) |
| `media.audio` | 独立音频源 | `<Audio>` |
| `media.image` | 静态图片 | `<Img>` |
| `visual.colorGrade` | 场景级色彩分级 | [ColorGradeLayer](file:///Users/bytedance/AIVideoForge/src/remotion/layers/ColorGradeLayer.tsx) |
| `visual.transition` | 场景间转场 | [TransitionLayer](file:///Users/bytedance/AIVideoForge/src/remotion/layers/TransitionLayer.tsx) |
| `visual.vfx` | 视觉特效（暗角/颗粒/光晕/故障/色差） | [VFXLayer](file:///Users/bytedance/AIVideoForge/src/remotion/layers/VFXLayer.tsx) |
| `visual.text` | 字幕叠加 | [TextOverlayLayer](file:///Users/bytedance/AIVideoForge/src/remotion/layers/TextOverlayLayer.tsx) |
| `audio.mix` | 多轨音频混合 | [AudioMixLayer](file:///Users/bytedance/AIVideoForge/src/remotion/layers/AudioMixLayer.tsx) |

新增能力只需：① 在 [types.ts](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/types.ts) 增加 Kind & Props；② 在 [registry.tsx](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/registry.tsx) 注册一个渲染器。`PipelineComposition` 自动按 `zIndex` 渲染。

### 3.5 渲染管线
```
videoUrl + styleProfile + 字幕
            ↓ compileRenderPlan()  （前后端同构）
        RenderPlan { capabilities[] }
            ↓ derivePassesFromPlan()
   PipelineDefinition { passes[], plan }
            ↓ POST /api/pipeline/:id/execute
        Remotion 单次渲染（所有逻辑 Capability 一次合成）
            ↓
        最终输出视频
```

- **逻辑 Pass**（🟢 零质量损失）：每个 Capability 视为一个 logical pass，最终由 `PipelineComposition` 在 Remotion 中**单次渲染合成**。
- **物理 Pass**（🔴 仅最终编码）：`final-encode` 一个 pass，对应 Remotion CLI / Lambda 输出。

管线 API：
- `POST /api/pipeline/create` — body: `{ videoId, subtitles?, layerToggles?, width?, height?, fps? }`，服务端读取 styleProfile + video URL，编译为 RenderPlan 并构建 PipelineDefinition。返回 `{ ...pipeline, plan }`。
- `GET /api/pipeline/:pipelineId/status` — 返回 passes 状态与 `plan`。
- `POST /api/pipeline/:pipelineId/execute` — 触发执行（接入 Remotion 渲染器之前为占位标记完成）。

### 3.6 渲染 API
- `POST /api/render` — 三种入参皆可：
  - `{ plan }` — 直接传入前端编译好的 RenderPlan（推荐，零额外查询）。
  - `{ videoId, subtitles?, layerToggles?, ... }` — 服务端基于 styleProfile 自动编译。
- `GET /api/render/:taskId/status` — 进度轮询。
- 真实渲染接入点位于 [server/src/routes/render.js](file:///Users/bytedance/AIVideoForge/server/src/routes/render.js) 的 `runRemotionRender(taskId, plan)`，注释中已给出 `@remotion/bundler` + `@remotion/renderer` 的接入模板（`bundle / selectComposition / renderMedia`），inputProps 直接传 `{ plan }` 即可。

### 3.7 前端预览（PreviewPage）
[PreviewPage.tsx](file:///Users/bytedance/AIVideoForge/src/pages/PreviewPage.tsx) 在前端通过 `compileRenderPlan()` 将 store 中的 styleProfile/字幕 编译为 RenderPlan，**同一份 plan 同时**：
1. 作为 `<Player inputProps={{ plan }}>` 的实时预览输入；
2. 通过 `createRender({ plan })` 提交给后端渲染。

---

## 4. 关键模块说明

### 4.1 火山引擎集成 (Ark API)
位于 [server/src/volcengine.js](file:///Users/bytedance/AIVideoForge/server/src/volcengine.js)。依赖 `ARK_API_KEY`(`purpose: user_data`)。功能含视频上传、预处理轮询、视频结构化解析、6 路并行风格分析与聚合。

### 4.2 Remotion 能力抽象层（核心）
位于 [src/remotion/capabilities/](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities)：
- [types.ts](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/types.ts) — `Capability` 联合类型 + `RenderPlan` 类型。
- [compile.ts](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/compile.ts) — `compileRenderPlan({ videoUrl, styleProfile, subtitles, layerToggles, ... })`，自动估算 `durationInFrames`。`emptyRenderPlan()` 提供默认值。
- [registry.tsx](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/registry.tsx) — `kind → renderer` 注册表，对外暴露 `renderCapability(cap)` 一个入口。

[server/src/remotion/capabilities.js](file:///Users/bytedance/AIVideoForge/server/src/remotion/capabilities.js) 是与前端 `compile.ts` 同构的服务端版本（无 React），额外提供 `derivePassesFromPlan(plan)` 把 capabilities 列表转换为 passes 数组。

### 4.3 PipelineComposition
[PipelineComposition.tsx](file:///Users/bytedance/AIVideoForge/src/remotion/PipelineComposition.tsx) 仅接收 `{ plan: RenderPlan }`。Composition 内部不再耦合 styleProfile 数据结构，按 `zIndex` 升序遍历 capabilities，借由 `renderCapability()` dispatch 到注册表。媒体能力会被 `<AbsoluteFill>` 包裹铺满父容器，其它能力本身已是 absolute 定位。

遵循 Remotion 最佳实践：禁止 CSS transition/animation、使用 `useCurrentFrame()` + `interpolate()` 驱动动画、使用 `<Sequence>` 控制时间轴、使用确定性计算替代 `Math.random()`。

### 4.4 风格模板系统（蒸馏 / 应用）
位于 [server/src/pipeline/template-distill.js](file:///Users/bytedance/AIVideoForge/server/src/pipeline/template-distill.js)。提供 `distillStyleTemplate / resolveStyleTemplate / deriveLegacyParams`。

### 4.5 管线编排器
位于 [server/src/pipeline/orchestrator.js](file:///Users/bytedance/AIVideoForge/server/src/pipeline/orchestrator.js)。
- `buildPipelineDefinition({ videoId, styleProfile, videoUrl, subtitles, layerToggles, ... })` — 调用 `compileRenderPlan` + `derivePassesFromPlan`，生成 `{ id, videoId, plan, passes, ... }`。
- `savePipeline(pipelineDef)` / `getPipelineStatus(pipelineId)` — MongoDB `pipelines` 集合读写。

### 4.6 AI Prompt 模板
位于 [server/src/pipeline/ai-prompts.js](file:///Users/bytedance/AIVideoForge/server/src/pipeline/ai-prompts.js)。仅暴露阶段 2 单一 prompt 函数 `adaptCapabilitiesPrompt(parseResult, template)`，约束模型一次性输出与 Capability 字段对齐的 JSON。

---

## 5. MongoDB 集合

| 集合 | 用途 |
|------|------|
| `videos` | 上传的视频文件（含 Buffer 数据） |
| `parses` | 视频解析任务状态与结果（含 `styleProfile`） |
| `style_profiles` | 独立存储的视频风格数据（按 `videoId` 查询；模板套用后会写入此集合并带 `appliedTemplateId`） |
| `saved_styles` | 风格模板（预设 + 用户保存），统一以蒸馏后的 `StyleTemplate` 结构存储 |
| `pipelines` | 渲染管线定义与执行状态（含完整 `plan`） |
| `tasks` | 通用任务记录 |

---

## 6. 开发指南

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

**新增 Remotion 能力的步骤**:
1. 在 [types.ts](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/types.ts) 添加新的 `kind` 与对应的 Props 接口，并加入 `Capability` 联合类型。
2. 在 [registry.tsx](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/registry.tsx) 注册渲染器。
3. 在 [compile.ts](file:///Users/bytedance/AIVideoForge/src/remotion/capabilities/compile.ts) 与 [server/src/remotion/capabilities.js](file:///Users/bytedance/AIVideoForge/server/src/remotion/capabilities.js) 中（同构）追加将 styleProfile 编译为该 Capability 的逻辑。
4. 无需改动 `PipelineComposition` / `RenderPlan` / API。

**开发规范**:
- 代码逻辑变更后，需同步更新本 `AGENTS.md` 文档。
- 运行中出现文档与代码不一致时，以**代码实现逻辑**为准。
