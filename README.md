# 经方星图

这是一个把中医经典条文、关键词、关联解析片段放到同一张关系图里查看的项目。

你可以把它理解成三件事一起工作：

1. 左侧是经典目录。
2. 中间是当前条文和关系图。
3. 右侧是根据关键词查出来的关联解析结果。

现在项目已经支持：

- 查看经典条文
- 给条文添加关键词
- 删除条文关键词
- 根据关键词自动匹配关联解析
- 用 SQLite 数据库存储运行时数据
- 保留 JSON 文件作为最直接、最容易维护的数据来源

---

## 1. 先看哪里

如果你是第一次接触这个项目，请按下面顺序看：

1. 先看本文件 [README.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\README.md)
2. 再看文档目录 [docs/README.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\README.md)
3. 再看交接清单 [项目交接清单.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\项目交接清单.md)
4. 再看新手手册 [新手数据维护手册.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\新手数据维护手册.md)
5. 如果你只想看数据目录说明，再看 [data/README.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\data\README.md)

如果你只记住一句话，请记住这句：

`平时先改 data 里的 JSON 或 TXT，再根据需要导入数据库。`

---

## 2. 这个项目到底在做什么

这个项目不是传统那种特别复杂的“知识图谱”。

它现在更接近“关系图”。

关系图里最重要的三类节点是：

- 条文
- 关键词
- 来源片段

工作流程很简单：

1. 你打开一条经典条文。
2. 条文上有一些关键词。
3. 系统拿这些关键词去 `data/关联解析/` 里查。
4. 如果某个来源里也有同样的关键词，就建立关联。
5. 最后把“条文 -> 关键词 -> 来源片段”显示到图里和右侧面板。

---

## 3. 项目目录怎么理解

项目里你最需要关心的是这几个位置：

```text
jingfangxingtu/
├─ data/                       # 最重要的数据目录
│  ├─ jingdianconfig.json      # 经典目录配置
│  ├─ guanlianjiexiconfig.json # 关联解析来源配置
│  ├─ 经典/                    # 各本经典的条文 JSON
│  ├─ 关联解析/                # 关联解析 TXT / JSON
│  └─ 白话解析/                # 预留目录
├─ docs/                       # 文档目录
├─ scripts/                    # 导入数据库脚本
├─ src/                        # 前端页面代码
├─ storage/
│  └─ app.db                   # SQLite 数据库文件
└─ package.json                # 项目命令
```

---

## 4. 新手最常做的 5 件事

### 4.1 启动项目

```bash
npm install
npm run dev
```

然后打开：

[http://localhost:3000](http://localhost:3000)

### 4.2 添加关键词

方法一：在页面里操作

1. 打开一条经典条文
2. 在“正文原文区”用鼠标选中一段文字
3. 右键
4. 点击“添加为关键词”

方法二：直接改 JSON

打开某条条文 JSON，把关键词写到 `keywords` 数组里。

### 4.3 删除关键词

1. 打开条文
2. 在关键词标签右侧点击“删”
3. 确认删除

### 4.4 添加新的关联解析来源

1. 把 TXT 或 JSON 放进 `data/关联解析/`
2. 在 `data/guanlianjiexiconfig.json` 里登记这个来源

### 4.5 添加新的经典

1. 准备经典原文
2. 生成或手工整理条文 JSON
3. 更新 `data/jingdianconfig.json`
4. 如需进数据库，再执行导入脚本

---

## 5. 数据和数据库的关系

这里非常重要。

请用最简单的话理解：

### 5.1 `data/` 是“源数据”

`data/` 目录里的 JSON 和 TXT，是你平时最应该编辑的地方。

原因：

- 最直观
- 最容易备份
- 最适合新手
- 改错了容易看出来

### 5.2 SQLite 是“运行时数据”

数据库文件在：

[storage/app.db](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\storage\app.db)

数据库的作用是：

- 让读取更快
- 让接口统一
- 让前端不必每次都直接解析很多文件

### 5.3 应该先改哪里，后改哪里

正确顺序：

1. 先改 `data/`
2. 再按需要导入数据库

不要反过来。

对新手来说，最安全的原则是：

`把 data 当成总源头，把数据库当成运行副本。`

---

## 6. 常用命令

### 6.1 启动开发环境

```bash
npm run dev
```

### 6.2 类型检查

```bash
npm run lint
```

### 6.3 构建项目

```bash
npm run build
```

### 6.4 初始化数据库

```bash
npm run db:init
```

### 6.5 导入各本经典到数据库

```bash
npm run db:import:shanghan
npm run db:import:jingui
npm run db:import:wenbing
```

### 6.6 导入关联解析到数据库

```bash
npm run db:import:relations
```

### 6.7 一次性重建数据库内容

```bash
npm run db:seed
```

---

## 7. 强烈建议

如果你只是日常维护数据，请这样做：

1. 改 `data/` 里的文件
2. 保存
3. 刷新页面检查效果
4. 确认没问题后，再决定要不要执行数据库导入

如果你要详细知道：

- 条文 JSON 应该怎么写
- 关联解析 JSON 应该怎么写
- TXT 应该怎么放
- 新增经典的顺序是什么
- 数据库什么时候需要导入

请继续看：

[新手数据维护手册.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\新手数据维护手册.md)

如果你只想看某一个专题，请直接看：

- [新增一本经典操作手册.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\新增一本经典操作手册.md)
- [整理关联解析资料操作手册.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\整理关联解析资料操作手册.md)
- [关键词维护操作手册.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\关键词维护操作手册.md)
- [常见错误与排查手册.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\常见错误与排查手册.md)
