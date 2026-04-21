# 经方关系图 - 数据接入与维护说明

本项目当前的数据模型已经从“知识图谱”调整为“关键词关系图”。

目标不是为每条经典条文手工维护复杂的 `nodes`、`links`、`plugins`，而是维护：

- 经典目录配置
- 条文基础信息
- 条文关键词
- 关联解析数据源

系统运行时会根据条文关键词去 `关联解析/` 中检索同名关键词，并建立“条文 -> 关键词 -> 关联文献片段”的关系。

## 1. 数据目录

项目运行时通过 `/data/*` 访问仓库根目录 `data/` 下的文件。

当前建议结构如下：

```text
/data/
├── jingdianconfig.json         # 经典目录与条文入口配置
├── guanlianjiexiconfig.json    # 关联解析来源配置
├── 经典/                        # 条文详情数据
│   ├── 伤寒论/
│   │   ├── 265.json
│   │   └── 29.json
│   └── 金匮要略/
│       └── jingui-13.json
├── 关联解析/                    # 关联检索数据源，优先 JSON，其次 TXT
└── 白话解析/                    # 预留目录；如需拆分白话说明，可独立存放
```

## 2. jingdianconfig.json

`jingdianconfig.json` 用于驱动左侧“经典 / 章节 / 条文”导航。

每条条文建议包含：

- `id`
- `title`
- `dataFile`

示例：

```json
[
  {
    "id": "shanghan",
    "name": "《伤寒论》",
    "chapters": [
      {
        "title": "辨少阳病脉证并治",
        "clauses": [
          {
            "id": "265",
            "title": "第 265 条 · 误汗变证",
            "dataFile": "/data/经典/伤寒论/265.json"
          }
        ]
      }
    ]
  }
]
```

说明：

- `dataFile` 为空时，表示该条文当前未接入详情数据
- 前端会按 `dataFile` 加载条文 JSON

## 3. 条文 JSON

条文详情文件存放在 `data/经典/` 下。

当前最小结构如下：

```json
{
  "id": "265",
  "title": "伤寒论 第265条",
  "content": "伤寒，脉弦细，头痛发热者，属少阳……",
  "translation": "外感伤寒，如果出现脉象弦细……",
  "keywords": ["脉弦细", "头痛发热", "少阳", "谵语"]
}
```

字段说明：

- `id`：条文唯一标识
- `title`：条文标题
- `content`：原文
- `translation`：白话解释
- `keywords`：关系检索关键词数组

## 4. guanlianjiexiconfig.json

该文件用于配置关联解析来源。

示例：

```json
[
  {
    "sourceName": "黄帝内经素问",
    "fileBaseName": "437-黄帝内经素问",
    "category": "内经"
  }
]
```

字段说明：

- `sourceName`：来源名称
- `fileBaseName`：关联到 `关联解析/` 目录下的文件基名
- `category`：前端展示分组名

## 5. 关联解析检索规则

对于每个配置的数据源，系统按以下顺序检索：

1. 优先读取 `/data/关联解析/<fileBaseName>.json`
2. 如果该 JSON 不存在或不可用，再读取 `/data/关联解析/<fileBaseName>.txt`

### 5.1 JSON 结构

推荐统一成“按关键词索引”的结构：

```json
{
  "谵语": [
    {
      "title": "热病论",
      "content": "……"
    }
  ],
  "吐逆": [
    {
      "title": "某篇",
      "content": "……"
    }
  ]
}
```

### 5.2 TXT 检索

TXT 文件不强制改格式，但应尽量具备可切分的篇名或标题。

前端会：

- 按篇名或段落切分文本
- 查找关键词命中
- 返回“篇名 + 摘要片段”

## 6. 当前数据维护原则

- 不再维护 `nodes`
- 不再维护 `links`
- 不再维护 `plugins`
- 优先维护条文关键词质量
- 优先维护关联解析 JSON 结构化程度

## 7. 数据维护建议

- 每条条文关键词不要过多，避免关系图噪声过大
- 关键词优先使用明确术语，避免“病、热、寒”等过泛词
- 同一来源若已提供 JSON，就不要再依赖 TXT 命中行为
- 新增条文时，先保证 `content / translation / keywords` 齐全，再考虑扩充关联源
