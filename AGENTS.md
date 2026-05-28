# AI Video Studio - 项目文档

## 1. 项目概述

AI 驱动的视频再创造平台。核心业务流：

```
视频上传 → 火山引擎多模态模型解析（关键帧/场景/情绪/转场/摘要）
       → 选择风格模板（预设 / 用户保存）
       → 阶段 2：基于「解析结果 + 风格模板」让大模型生成 Remotion 能力适配后的
         VideoStyleProfile（失败回退算法版）
       → 编译为统一的 RenderPlan（Capability 数组）
       → Remotion 真渲染（bundle → selectComposition → renderMedia）
       → 下载 mp4
```

风格模板可在 ParsePage 一键保存，并通过「蒸馏（distill）/ 应用（resolve）」机制跨视频复用。

**核心技术栈**:
- **前端**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Zustand, Remotion 4 (`@remotion/player`)
- **后端**: Express 4, MongoDB, 火山引擎 Ark API, `@remotion/bundler` + `@remotion/renderer`

---

## 2. 目录结构

```text
AIVideoForge/
├── public/                     # 静态资源
│   ├── favicon.svg
│   └── icons.svg
│
├── src/                        # 前端源码 (React + TypeScript)
│   ├── assets/                 # 图片资源
│   ├── components/
│   │   ├── ui/button.tsx       # Button 组件 (Radix + CVA)
│   │   └── Layout.tsx          # 侧边栏布局导航
│   ├── lib/utils.ts            # cn() 工具 (clsx + tailwind-merge)
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── UploadPage.tsx      # 视频上传 (拖拽)
│   │   ├── ParsePage.tsx       # 解析结果 + 保存风格
│   │   ├── StylesPage.tsx      # 选择风格 + apply/adapt
│   │   ├── EditorPage.tsx      # 时间轴 / 字幕 / 图层开关
│   │   ├── PreviewPage.tsx     # 前端编译 RenderPlan + Player + 提交渲染
│   │   └── TasksPage.tsx       # 任务中心 (查看/重试/删除)
│   ├── remotion/
│   │   ├── entry.tsx           # registerRoot(RemotionRoot)（bundler 入口）
│   │   ├── Root.tsx            # 注册 PipelineComposition
│   │   ├── PipelineComposition.tsx # 通用合成容器：消费 RenderPlan，按 zIndex 渲染
│   │   ├── capabilities/       # ★ Remotion 能力抽象层（前后端共用核心）
│   │   │   ├── types.ts        # Capability 联合类型 + RenderPlan 类型
│   │   │   ├── compile.ts      # styleProfile + 视频源 + 字幕 → RenderPlan 编译器
│   │   │   ├── registry.tsx    # CapabilityKind → React 渲染器 注册表
│   │   │   └── index.ts        # 统一导出
│   │   ├── layers/             # 各 Capability 内部的 React 渲染实现
│   │   │   ├── ColorGradeLayer.tsx
│   │   │   ├── TransitionLayer.tsx
│   │   │   ├── TextOverlayLayer.tsx
│   │   │   ├── VFXLayer.tsx
│   │   │   └── AudioMixLayer.tsx
│   │   └── index.ts
│   ├── services/api.ts         # API 封装（基于 RenderPlan）
│   ├── store/useStore.ts       # Zustand 全局状态
│   ├── types/
│   │   ├── index.ts            # 基础业务类型（Video / Task / SubtitleItem 等）
│   │   └── pipeline.ts         # 风格管线类型（VideoStyleProfile / 各能力 Config）
│   ├── App.tsx                 # 路由配置 (react-router-dom v7)
│   ├── main.tsx
│   ├── App.css
│   └── index.css               # Tailwind 入口 + CSS 变量
│
├── server/                     # 后端源码 (Express + ESM)
│   ├── src/
│   │   ├── index.js            # 服务入口 / 路由注册 / 视频流接口 / 渲染产物静态目录
│   │   ├── db.js               # MongoDB 连接
│   │   ├── volcengine.js       # 火山引擎 Ark：上传 / 预处理 / 视频解析 / 能力适配
│   │   ├── routes/
│   │   │   ├── upload.js       # POST /api/upload（multer 内存存储 → MongoDB）
│   │   │   ├── parse.js        # POST /api/parse + GET /:id/status + /:id/style-profile
│   │   │   ├── styles.js       # GET /api/styles + /save + /:id/apply + /:id/adapt + DELETE
│   │   │   ├── render.js       # POST /api/render + GET /:taskId/status（真渲染）
│   │   │   └── tasks.js        # 任务管理
│   │   ├── pipeline/
│   │   │   ├── ai-prompts.js       # 阶段 2 单一 Prompt：adaptCapabilitiesPrompt
│   │   │   └── template-distill.js # distillStyleTemplate / resolveStyleTemplate / deriveLegacyParams
│   │   └── remotion/
│   │       ├── capabilities.js  # ★ 服务端 RenderPlan 编译器（与前端 compile.ts 同构）
│   │       ├── bundle.js        # @remotion/bundler 包装，进程内缓存 serveUrl
│   │       └── render-runner.js # bundle → selectComposition → renderMedia + absolutizePlan
│   ├── uploads/
│   │   └── renders/             # 渲染产物 mp4（通过 /uploads/renders/${taskId}.mp4 暴露）
│   └── package.json
│
├── package.json                # 前端依赖
├── vite.config.ts              # Vite 配置（路径别名 @ → src）
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
└── index.html
```

---

## 3. 核心数据流与 API

系统通过**异步任务 + 轮询**串联长耗时业务（上传/解析/渲染）。

### 3.1 视频上传

`POST /api/upload`（multipart）→ 文件以 `Buffer` 形式存入 MongoDB `videos` 集合。
访问视频通过 `GET /api/video/:id`，`server/src/index.js` 实现了带 `Range` 头的 HTTP 流式分段响应。

### 3.2 视频解析（阶段 1）

- `POST /api/parse`（body: `{ videoId }`）触发异步任务。
  `server/src/routes/parse.js`把视频从 MongoDB 写到临时文件，调用 `server/src/volcengine.js` 的 `uploadFileToArk` → `waitForFileProcessing` → `analyzeVideo`，最终把结构化结果（`keyframes / scenes / emotions / transitions / summary`）落到 `parses` 集合。
- `GET /api/parse/:videoId/status` —— 轮询解析状态与结果。
- `GET /api/parse/:videoId/style-profile` —— 直接读取 `style_profiles` 集合（由后续 apply/adapt 阶段写入）。

> 注：阶段 1 仅做「视频内容解析」，不再产出 styleProfile；样式生成全部下沉到阶段 2。

### 3.3 风格模板系统（跨视频复用）

风格模板通过「蒸馏 → 应用」两阶段实现跨视频复用，核心位于
`server/src/pipeline/template-distill.js`：

- **distillStyleTemplate(styleProfile)** —— 把强绑定原视频的 `VideoStyleProfile`（含绝对帧 / 时间范围 / 具体音轨 URL）提炼为可迁移的 `StyleTemplate`（baseline 参数）。
- **resolveStyleTemplate(template, parseResult, videoId)** —— 结合新视频的 `parseResult.scenes` 重新具象化为该视频专属的 `VideoStyleProfile`。
- **deriveLegacyParams(template)** —— 回填给前端列表用的旧 `StyleParams` 形状。

API（`server/src/routes/styles.js`）：

| Endpoint | 用途 |
|---|---|
| `GET /api/styles` | 列出 `saved_styles`（预设 + 用户），返回 `{ id, name, description, source, params, template, ... }` |
| `POST /api/styles/save` | ParsePage「保存风格」：先 `distillStyleTemplate` 再写入 `saved_styles`（`source: 'user'`） |
| `POST /api/styles/:id/apply` | **算法版应用**：`resolveStyleTemplate` 直接生成 `VideoStyleProfile`，写入 `style_profiles` |
| `POST /api/styles/:id/adapt` | **阶段 2 主路径**：调用 `adaptCapabilitiesByTemplate`（大模型）；失败时自动回退到 `resolveStyleTemplate`，响应 `fallback: true` |
| `DELETE /api/styles/:id` | 仅允许删除 `source: 'user'`（预设受保护） |

服务首次启动时 `seedPresetStyles()` 会把 5 个内置预设（cinematic / vlog / tech / retro / minimal）写入 `saved_styles`。

### 3.4 阶段 2：Remotion 能力适配（AI）

`server/src/volcengine.js`中的 `adaptCapabilitiesByTemplate(parseResult, template)` 配合 `server/src/pipeline/ai-prompts.js` 的 `adaptCapabilitiesPrompt`，让模型一次性输出与 Capability 字段对齐的 JSON：`colorGrade / transitions / subtitleStyle / effects / audioMix / pacing / recommendedFilter / styleDescription`。

输出后做兜底（缺失字段回退到 `template`），最终拼上 `videoId` 写入 `style_profiles` 集合。

### 3.5 Remotion 能力抽象与 RenderPlan

**RenderPlan 是前后端通用的渲染指令**：一份可序列化的 `{ compositionId, width, height, fps, durationInFrames, capabilities[] }`，每个 `Capability` 由 `kind`（能力类型）+ `props`（参数）+ `zIndex`（层级）+ `enabled?` 组成。

支持的 Capability Kind：

| Kind | 含义 | 渲染器 |
|---|---|---|
| `media.video` | 主视频 / 视频图层 | `<Video>` |
| `media.audio` | 独立音频源 | `<Audio>` |
| `media.image` | 静态图片 | `<Img>` |
| `visual.colorGrade` | 场景级色彩分级 | [ColorGradeLayer] |
| `visual.transition` | 场景间转场 | [TransitionLayer] |
| `visual.vfx` | 视觉特效（暗角/颗粒/光晕/故障/色差） | [VFXLayer] |
| `visual.text` | 字幕叠加 | [TextOverlayLayer] |
| `audio.mix` | 多轨音频混合 | [AudioMixLayer] |

新增能力只需：
1. 在 `types.ts`增加 `Kind` 字面量与 Props 接口（加入 `Capability` 联合）；
2. 在 `registry.ts`注册渲染器；
3. 在 `src/remotion/capabilities/compile.ts` 与 `server/src/remotion/capabilities.js`（同构）追加将 styleProfile 编译为该 Capability 的逻辑。

`PipelineComposition` 自动按 `zIndex` 升序渲染，无需改动 `RenderPlan` / API。

### 3.6 渲染主链路

```
PreviewPage:
  styleProfile + videoUrl + 字幕  →  compileRenderPlan()
                                  ↓
                              RenderPlan { capabilities[] }
                                  ↓                  ↓
          <Player inputProps={{plan}}>     POST /api/render { plan }
                                                     ↓
                          render.js:
                            absolutizePlan(plan, baseUrl)
                            → runRemotionRender()
                                ├─ bundle.js (getServeUrl，进程内缓存 ~10s)
                                ├─ selectComposition({ id: 'PipelineComposition' })
                                └─ renderMedia({ codec: 'h264' })
                                                     ↓
                              server/uploads/renders/${taskId}.mp4
                              downloadUrl = /uploads/renders/${taskId}.mp4
                                                     ↓
                              GET /api/render/:taskId/status → 轮询
                              下载视频：<a href={SERVER_ORIGIN + downloadUrl} download>
```

#### 渲染 API（`server/src/routes/render.js`）

- `POST /api/render` —— 入参二选一：
  - `{ plan }`：直接传入前端编译好的 RenderPlan（**推荐**，零额外查询，与 Player 同源）；
  - `{ videoId, subtitles?, layerToggles?, width?, height?, fps? }`：服务端读取 `style_profiles` 与 `videos` 后调用 `compileRenderPlan` 自动编译。
- `GET /api/render/:taskId/status` —— 内存任务表（`renderStore`）的进度轮询，`result.downloadUrl` 即下载路径。

#### 静态产物目录

`server/src/index.js` 中：
```js
app.use('/uploads/renders', express.static(RENDERS_DIR));
```
渲染产物落盘到 `server/uploads/renders/${taskId}.mp4` 并直接通过该静态目录暴露下载。

#### URL 绝对化

`render-runner.js` 的 `absolutizePlan(plan, baseUrl)` 会把 RenderPlan 中所有相对 `src`（如 `/api/video/abc`）补全为 `http://localhost:${PORT}/...`（或 `PUBLIC_BASE_URL`），保证 headless Chromium 能加载视频/音频资源。

### 3.7 前端预览（PreviewPage）

`PreviewPage` 通过 `compileRenderPlan()` 把 store 中的 `styleProfile / 字幕 / layerToggles` 编译为 RenderPlan，**同一份 plan 同时**：

1. 作为 `<Player inputProps={{ plan }}>` 的实时预览输入；
2. 通过 `createRender({ plan })` 提交给后端渲染。

---

## 4. 关键模块说明

### 4.1 火山引擎集成

`server/src/volcengine.js`。依赖 `ARK_API_KEY`，对接 `https://ark.cn-beijing.volces.com/api/v3`：
- `uploadFileToArk(filePath)` —— `POST /files`（`purpose=user_data`，预处理 `fps=0.3`）。
- `waitForFileProcessing(fileId)` —— 轮询直到 `status=active`。
- `callArkText / callArkVideo` —— 统一封装到 `POST /responses`。
- `analyzeVideo(fileId)` —— **阶段 1**：多模态视频解析。
- `adaptCapabilitiesByTemplate(parseResult, template)` —— **阶段 2**：能力适配。

### 4.2 Remotion 能力抽象层

- 前端 `src/remotion/capabilities/`：
  - `types.ts` —— `Capability` 联合类型 + `RenderPlan` 类型。
  - `compile.ts` —— `compileRenderPlan({ videoUrl, styleProfile, subtitles, layerToggles, width?, height?, fps? })`，自动估算 `durationInFrames`。`emptyRenderPlan()` 提供默认值。
  - `registry.tsx` —— `kind → renderer` 注册表，对外暴露 `renderCapability(cap)`。
- 服务端 `capabilities.js` —— 与前端 `compile.ts` 同构（无 React 依赖），仅导出 `compileRenderPlan`。

### 4.3 PipelineComposition

`src/remotion/PipelineComposition.tsx` 仅接收 `{ plan: RenderPlan }`。Composition 内部不再耦合 styleProfile 数据结构，按 `zIndex` 升序遍历 capabilities，借由 `renderCapability()` dispatch 到注册表。媒体能力被 `<AbsoluteFill>` 包裹铺满父容器，其它能力自身已是 absolute 定位。

遵循 Remotion 最佳实践：禁止 CSS transition/animation、使用 `useCurrentFrame()` + `interpolate()` 驱动动画、用 `<Sequence>` 控制时间轴、用确定性计算替代 `Math.random()`。

### 4.4 Remotion 渲染器

- `server/src/remotion/bundle.js` —— `getServeUrl()` 调用 `@remotion/bundler` 把前端工程（入口 `src/remotion/entry.tsx`）打包并缓存。webpack 别名 `@` → `<repo>/src` 与 Vite 对齐。
- `server/src/remotion/render-runner.js` —— `runRemotionRender({ taskId, plan, onProgress })`：`selectComposition` 选中 `PipelineComposition`，并用 `plan` 中的 `width / height / fps / durationInFrames` 覆盖默认值，再 `renderMedia({ codec: 'h264' })` 输出到 `uploads/renders/${taskId}.mp4`。

### 4.5 风格模板蒸馏

`server/src/pipeline/template-distill.js` 提供 `distillStyleTemplate / resolveStyleTemplate / deriveLegacyParams`，是跨视频复用的核心。

### 4.6 AI Prompt 模板

`server/src/pipeline/ai-prompts.js` 仅暴露阶段 2 的单一 prompt 函数 `adaptCapabilitiesPrompt(parseResult, template)`，约束模型一次性输出与 Capability 字段对齐的 JSON。

---

## 5. MongoDB 集合

| 集合 | 用途 |
|------|------|
| `videos` | 上传的视频文件（含 Buffer 数据，`/api/video/:id` 流式输出） |
| `parses` | 阶段 1 视频解析任务状态与结果（`taskId = parse-${videoId}`） |
| `style_profiles` | 应用 / 适配后的 `VideoStyleProfile`（按 `videoId` 唯一，含 `appliedTemplateId` 与 `fallback`） |
| `saved_styles` | 风格模板（预设 + 用户保存），统一以蒸馏后的 `template` 字段存储 |
| `tasks` | 通用任务记录（`tasks.js`） |

> 注：渲染任务目前由 `render.js` 内的 `renderStore` Map 持有，进程重启会丢失历史；如需持久化可替换为 BullMQ/Redis。

---

## 6. 开发指南

**环境准备**:
- 启动 MongoDB（默认 `mongodb://localhost:27017/ai_video`）。
- 在 `server/.env` 配置 `ARK_API_KEY`（火山引擎 Ark，purpose=`user_data`）；可选 `ARK_BASE_URL` / `ARK_MODEL_ID` / `PUBLIC_BASE_URL`。

**运行服务**:
```bash
# 前端 (AIVideoForge 目录)
npm run dev

# 后端 (AIVideoForge/server 目录)
npm run dev
```

**新增 Remotion 能力的步骤**:
1. 在 `src/remotion/capabilities/types.ts` 添加 `kind` 与 Props，加入 `Capability` 联合；
2. 在 `src/remotion/capabilities/registry.tsx` 注册渲染器；
3. 在 `src/remotion/capabilities/compile.ts` 与 `server/src/remotion/capabilities.js` 同步追加编译逻辑。
4. 无需改动 `PipelineComposition` / `RenderPlan` / 渲染 API。

**开发规范**:
- 代码逻辑变更后，需同步更新本 `AGENTS.md`。
- 文档与代码不一致时，**以代码实现为准**。
