/**
 * 全局书籍目录格式模板
 * 存放位置参考: /src/database/catalog.ts
 */

export const booksCatalogTemplate = [
  {
    id: "book-id",               // 书籍唯一标识符 (例如: "shanghan")
    name: "《书名》",            // UI 上显示的完整书名
    chapters: [
      {
        title: "篇章或者卷名称",  // 例如: "辨太阳病脉证并治上"
        clauses: [
          { 
            id: "unique-clause-id", // 条文唯一标识符
            title: "标题/概括",     // 侧边栏列表显示的摘要
            data: null              // 如果数据已准备好，则引入对应的 ClauseData 对象；如果是占位符则填 null
          }
        ]
      }
    ]
  }
];
