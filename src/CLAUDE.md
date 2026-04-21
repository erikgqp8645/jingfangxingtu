[根目录](../CLAUDE.md) > **src**

# 模块：应用源码 (`src/`)

## 模块职责

经方关系图的前端应用：**三栏布局**（侧栏导航、中部关系图+条文、右侧关联面板）、**D3 力导向图**、基于预取 JSON/TXT 的**离线关系检索**，以及 `types/relation.ts` 中的**关系类型定义**。

## 入口与启动

| 文件 | 说明 |
|------|------|
| [main.tsx](./main.tsx) | React 18+ `createRoot`，挂载 `App`，引入 `index.css` |
| [App.tsx](./App.tsx) | 根组件：加载 `/data/jingdianconfig.json`、条文 `dataFile`、`prefetchKnowledgeBase()`，组合 Sidebar / GraphView / ClauseDetail / PluginPanel / SearchResults |

## 对外接口（UI 契约）

- **无独立 HTTP API**；对外为浏览器内 `fetch('/data/...')` 的静态资源约定（文件位于仓库根目录 **`data/`**，由 `vite.config.ts` 映射并在构建时复制到 `dist/data/`）。
- **核心类型**（导出自 [types/relation.ts](./types/relation.ts)）：`ClauseData`、`RelationHit`、`RelationNode`、`RelationLink`。

## 关键依赖与配置

- **运行时**：`react`、`react-dom`、`d3`、`lucide-react`、`motion`、`clsx`、`tailwind-merge`。
- **构建**：`vite`、`@vitejs/plugin-react`、`@tailwindcss/vite`、`tailwindcss`。
- **可选/预留**：`@google/genai` 已在 `package.json`，**当前 `src/` 内无引用**；`GEMINI_API_KEY` 由 Vite `define` 注入（见根目录 `vite.config.ts`）。

## 组件与库（要点）

| 路径 | 作用 |
|------|------|
| [components/Sidebar.tsx](./components/Sidebar.tsx) | 书目、章节条文列表、搜索框 |
| [components/GraphView.tsx](./components/GraphView.tsx) | D3 `forceSimulation`、节点类型配色、拖拽 |
| [components/ClauseDetail.tsx](./components/ClauseDetail.tsx) | 当前条文正文与白话 |
| [components/PluginPanel.tsx](./components/PluginPanel.tsx) | 按来源分组展示关键词命中的关联结果 |
| [components/SearchResults.tsx](./components/SearchResults.tsx) | 搜索态下的结果列表 |
| [lib/searchUtils.ts](./lib/searchUtils.ts) | `prefetchKnowledgeBase`、`searchKnowledgeBase`（读 `guanlianjiexiconfig.json` 与 `关联解析/*`） |
| [lib/utils.ts](./lib/utils.ts) | 通用工具（如 `cn` 类名合并） |
| [types/relation.ts](./types/relation.ts) | 条文、关系命中、关系图节点等类型定义 |

## 数据模型

见 [types/relation.ts](./types/relation.ts)：`ClauseData` 只保留 `content` / `translation` / `keywords`；关系图节点为 `clause` / `keyword` / `source`。

## 测试与质量

- **无 `*.test.*` / `*.spec.*`**；以 `npm run lint`（根目录）做 TS 检查。

## 相关文件清单

- [index.css](./index.css) — Tailwind 与主题 token（如 `paper`、`ink`、`sage`）。

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-04-21 09:40:04 | 再次增量重初始化：复核 `src/` 入口和 `fetch('/data/*')` 依赖契约，确认模块边界不含 `public/`。 |
| 2026-04-21 | 初版模块文档 |
| 2026-04-21 | 静态数据路径改为仓库 `data/`（见根 `vite.config.ts`） |
