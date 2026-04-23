# 数据库迁移方案

## 术语对照

为了让不懂英文的用户也能跟上这份方案，下文常见英文词按下面理解：

- `JSON（数据文件格式）`
- `TXT（文本文件）`
- `SQLite（轻量数据库）`
- `API（接口）`
- `id（编号）`
- `content（正文）`
- `translation（白话解释）`
- `keywords（关键词）`
- `source_file（来源文件路径）`

## 目标

当前项目使用 `data/*.json` 作为运行时主数据源，随着经典条文、关键词、关联解析持续增长，会出现以下问题：

- 文件数量过多，不便管理和批量修正
- 关键词、翻译、条文之间缺少结构化关系
- 难以支持统计、筛选、全文检索、批量更新
- 用户右键添加关键词时只能直接改 JSON（数据文件格式），后续不利于审计和扩展

因此建议把 `JSON（数据文件格式）直读` 逐步迁移为：

`原始 txt/json（文本/数据文件） -> 导入脚本 -> SQLite（轻量数据库） -> API（接口） -> 前端`

同时保留 `data/` 目录作为导入源、快照或导出格式，而不是长期作为运行时主存储。

## 为什么先选 SQLite（轻量数据库）

现阶段项目更适合 SQLite（轻量数据库），而不是 PostgreSQL（大型数据库服务）：

- 单文件数据库，适合本地开发
- 无需单独部署数据库服务
- 支持事务、索引、联表查询
- 后续可平滑迁移到 PostgreSQL（大型数据库服务）
- 和当前 Vite 本地中间件模式兼容，落地成本最低

数据库文件建议位置：

- `storage/app.db`

## 目标数据模型

### 1. 经典与条文

#### `books（书目表）`

- `id` TEXT PRIMARY KEY
- `name` TEXT NOT NULL
- `sort_order` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

#### `chapters（章节表）`

- `id` TEXT PRIMARY KEY
- `book_id` TEXT NOT NULL
- `title` TEXT NOT NULL
- `sort_order` INTEGER NOT NULL DEFAULT 0
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

索引建议：

- `INDEX idx_chapters_book_id_sort_order (book_id, sort_order)`

#### `clauses（条文表）`

- `id` TEXT PRIMARY KEY
- `book_id` TEXT NOT NULL
- `chapter_id` TEXT NOT NULL
- `clause_no` TEXT
- `title` TEXT NOT NULL
- `content` TEXT NOT NULL
- `translation` TEXT NOT NULL DEFAULT ''`
- `source_file` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

索引建议：

- `INDEX idx_clauses_book_id (book_id)`
- `INDEX idx_clauses_chapter_id (chapter_id)`
- `INDEX idx_clauses_clause_no (clause_no)`

说明：

- `clause_no` 保存“265”“14”这类条号，便于展示和排序
- `source_file` 保存原始来源，如 `457-伤寒论.txt`

### 2. 关键词

#### `keywords（关键词表）`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `name` TEXT NOT NULL UNIQUE
- `normalized_name` TEXT NOT NULL UNIQUE
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

说明：

- `name` 保留用户看到的原始文本
- `normalized_name` 用于去重，例如去除多余空格
- 如果你坚持“选中原文原样写入”，那前台展示继续用 `name`

#### `clause_keywords（条文关键词关系表）`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `clause_id` TEXT NOT NULL
- `keyword_id` INTEGER NOT NULL
- `source` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

唯一约束建议：

- `UNIQUE (clause_id, keyword_id)`

索引建议：

- `INDEX idx_clause_keywords_clause_id (clause_id)`
- `INDEX idx_clause_keywords_keyword_id (keyword_id)`

`source` 建议值：

- `imported`
- `manual`
- `inferred`

这样以后能区分：

- 导入脚本生成的关键词
- 用户右键手工加的关键词
- 规则或模型推断出的关键词

### 3. 关联解析

#### `relation_sources`

- `id` TEXT PRIMARY KEY
- `source_name` TEXT NOT NULL
- `file_base_name` TEXT NOT NULL UNIQUE
- `category` TEXT
- `source_type` TEXT NOT NULL
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

说明：

- `source_type` 用来标记 `json` / `txt`

#### `relation_entries`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `relation_source_id` TEXT NOT NULL
- `title` TEXT NOT NULL
- `content` TEXT NOT NULL
- `raw_keyword` TEXT
- `created_at` TEXT NOT NULL
- `updated_at` TEXT NOT NULL

索引建议：

- `INDEX idx_relation_entries_source_id (relation_source_id)`

#### `relation_entry_keywords`

- `id` INTEGER PRIMARY KEY AUTOINCREMENT
- `relation_entry_id` INTEGER NOT NULL
- `keyword_id` INTEGER NOT NULL
- `created_at` TEXT NOT NULL

唯一约束建议：

- `UNIQUE (relation_entry_id, keyword_id)`

索引建议：

- `INDEX idx_relation_entry_keywords_keyword_id (keyword_id)`

说明：

- 现在的关联解析 JSON 是 `关键词 -> 多条内容`
- 落库后应改成“解析条目”与“关键词”的多对多关系
- 这样同一条解析命中多个关键词时，不需要重复存内容

## 与当前前端字段的映射关系

当前前端条文类型：

```ts
type ClauseData = {
  id: string;
  title: string;
  content: string;
  translation: string;
  keywords: string[];
}
```

数据库返回给前端时，仍然可以组装成同样结构：

- `id <- clauses.id`
- `title <- clauses.title`
- `content <- clauses.content`
- `translation <- clauses.translation`
- `keywords <- clause_keywords + keywords.name`

也就是说，前端几乎不需要先改类型，只要把数据来源改成 API 即可。

## API 迁移建议

当前本地 API 只有一个：

- `POST /api/keywords/add`

建议逐步增加：

### 第一阶段：数据库并行接入

- `GET /api/books`
- `GET /api/clauses/:id`
- `POST /api/keywords/add`

此时：

- 前端仍可保留 `/data/*.json` 直读
- 新 API 可先用于调试和对照

### 第二阶段：前端切数据库

- `App.tsx` 不再 fetch `/data/jingdianconfig.json`
- 改为 fetch `/api/books`
- `loadClauseData` 改为 fetch `/api/clauses/:id`
- `POST /api/keywords/add` 改为直接写数据库

### 第三阶段：关联解析也切数据库

- `prefetchKnowledgeBase` 不再一次性读取全部 `/data/关联解析/*.json/.txt`
- 改为：
  - `GET /api/relations/search?keywords=...`
  - 或 `POST /api/relations/resolve`

这样可以避免前端把大量解析文本一次性加载进内存。

## 导入脚本改造建议

当前已有：

- `scripts/import-shanghan.ts`
- `scripts/import-jingui.ts`

后续改造为：

- `scripts/import-shanghan-db.ts`
- `scripts/import-jingui-db.ts`
- `scripts/import-wenbing-db.ts`
- `scripts/import-relations-db.ts`

导入顺序建议：

1. 导入 `books`
2. 导入 `chapters`
3. 导入 `clauses`
4. 导入 `keywords`
5. 导入 `clause_keywords`
6. 导入 `relation_sources`
7. 导入 `relation_entries`
8. 导入 `relation_entry_keywords`

## 对当前功能的影响

### 1. 右键添加关键词

现在：

- 直接改 `data/经典/*.json`

改造后：

- 查询或创建 `keywords`
- 插入 `clause_keywords`
- 返回最新条文 DTO 给前端

优点：

- 不会再频繁改文件
- 可以记录来源 `manual`
- 后续可以做撤销、审计、时间线

### 2. 关键词复选框

现在：

- 来自条文 JSON 内嵌数组

改造后：

- 来自 `clause_keywords join keywords`

前端表现不变。

### 3. 关联命中

现在：

- 前端预加载 `关联解析` 文件，再按关键词匹配

改造后：

- 由数据库查询
- 支持分页、去重、排序、按来源过滤

## 最小可行迁移路径

建议按下面顺序做，风险最小。

### 第一步

先引入 SQLite 和最小 schema，不改前端：

- 新建 `storage/app.db`
- 新建建表脚本
- 新建一个数据库访问层

### 第二步

把《伤寒论》《金匮要略》导入数据库：

- 保留现有 JSON
- 先做双轨

### 第三步

把 `POST /api/keywords/add` 改成数据库写入，同时返回和现在一样的 `ClauseData`

这是最容易先改的点，因为它现在本来就是 API。

### 第四步

把 `GET books / clause detail` 切到数据库

### 第五步

最后再迁移关联解析搜索

## 不建议现在做的事

- 不建议一开始就删掉 `data/*.json`
- 不建议一开始就换 PostgreSQL
- 不建议一开始就把全文搜索、向量检索一起做进去
- 不建议前后端同时大改

## 推荐下一步

最合理的下一步不是直接大规模改业务代码，而是先完成下面三件事：

1. 引入 SQLite 依赖和数据库文件目录
2. 写第一版 schema 初始化脚本
3. 写一个把《伤寒论》导入 SQLite 的脚本

只要这三步跑通，后面整套迁移就会很顺。
