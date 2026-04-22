# 关联解析目录说明

这个目录专门用来放“关联解析来源”。

系统会拿经典条文里的关键词，到这里来查找相同关键词。

查到以后，就会把结果显示到：

- 右侧关联命中面板
- 中间关系图

---

## 1. 支持的文件格式

支持两种：

1. JSON
2. TXT

---

## 2. 推荐优先级

推荐优先用 JSON。

因为 JSON 更准确。

TXT 适合放全文原始资料。

---

## 3. 同一个来源同时有 JSON 和 TXT 时怎么处理

规则是：

1. 某个关键词先查 JSON
2. 如果这个关键词在 JSON 没找到
3. 再去 TXT 里查

这叫“关键词级别回退”。

---

## 4. 命名规则

文件名要和：

[guanlianjiexiconfig.json](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\data\guanlianjiexiconfig.json)

里的 `fileBaseName` 对应。

例如配置里写：

```json
{
  "sourceName": "黄帝内经素问",
  "fileBaseName": "437-黄帝内经素问",
  "category": "内经"
}
```

那文件可以是：

```text
437-黄帝内经素问.json
437-黄帝内经素问.txt
```

---

## 5. JSON 示例

```json
{
  "谵语": [
    {
      "title": "病能论篇第四十六",
      "content": "其病发热、汗出、谵语。谵语者，阳气独盛，五脏气之所不营也，故心神狂越而妄言。"
    }
  ],
  "恶寒": [
    {
      "title": "宣明五气篇第二十三",
      "content": "五脏所恶：心恶热，肺恶寒，肝恶风，脾恶湿，肾恶燥，是谓五恶。"
    }
  ]
}
```

---

## 6. TXT 示例

```text
<目录>卷第七

<篇名>宣明五气篇第二十三

属性：五味所入∶酸入肝，辛入肺，苦入心，咸入肾，甘入脾，是谓五入。
五脏所恶∶心恶热，肺恶寒，肝恶风，脾恶湿，肾恶燥，是谓五恶。
```

---

## 7. 更详细的操作说明

请看：

[新手数据维护手册.md](C:\Users\hxst01\Documents\aicoding\jingfangxingtu\docs\新手数据维护手册.md)
