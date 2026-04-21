[根目录](../CLAUDE.md) > **data**

# 模块：运行时数据 (`data/`)

## 模块职责

存放经方关系图在浏览器中通过 **`fetch('/data/...')`** 加载的全部 JSON、TXT 与数据说明文档。文件位于**仓库根目录的 `data/`**（不再使用 `public/data/`）。

`vite.config.ts` 中的插件在**开发服务器**上将请求 **`/data/*`** 映射到本目录；**生产构建**结束时将本目录**递归复制**到 **`dist/data/`**，以便 `vite preview` 与静态部署下 URL 仍为 `/data/...`。

## 入口与启动

无独立程序入口；由 Vite 插件与构建流程挂载。

## 对外接口（URL）

| URL 前缀 | 说明 |
|----------|------|
| `/data/jingdianconfig.json` | 书目、章节、条文列表；条文通过 `dataFile` 指向 `data/经典/*.json` |
| `/data/guanlianjiexiconfig.json` | 关联解析数据源列表（`fileBaseName`、`sourceName`、`category` 等） |
| `/data/经典/*.json` | 条文详情：`content`、`translation`、`keywords` |
| `/data/关联解析/{baseName}.json` | 结构化检索：键为查询词，值为条目数组 |
| `/data/关联解析/{baseName}.txt` | 文本分段检索（`<篇名>` / `【篇名】` 分割） |

## 关键依赖与配置

- 与 **`src/lib/searchUtils.ts`**、`src/App.tsx` 中的路径强耦合；若改目录名需同步修改 **`vite.config.ts`** 插件与上述源码。

## 数据模型

- 条文树结构见 [jingdianconfig.json](./jingdianconfig.json)。
- 数据字段语义见 [README.md](./README.md)；当前条文详情以 `content` / `translation` / `keywords` 为主，运行时关系节点由前端生成。

## 相关文件清单

- [README.md](./README.md) — 数据接入与转化规范
- [jingdianconfig.json](./jingdianconfig.json)、[guanlianjiexiconfig.json](./guanlianjiexiconfig.json)
- [关联解析/](./关联解析/)、[白话解析/](./白话解析/)

## 变更记录 (Changelog)

| 日期 | 说明 |
|------|------|
| 2026-04-21 09:40:04 | 再次增量重初始化：确认 `data/` 是唯一运行时数据根，运行时 URL 仍为 `/data/*`，开发映射与构建复制策略保持不变。 |
| 2026-04-21 | 初版模块文档 |
| 2026-04-21 | 数据迁至仓库根目录 `data/`；文档从旧 `public/` 模块说明更正为本模块 |
