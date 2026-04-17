/**
 * 经典条文转化为知识图谱的格式模板
 * 存放位置参考: /src/database/books/[book_name]/clauses/clause_[id].ts
 */

export const clauseTemplate = {
  // 1. 基础信息
  id: "唯一的条文ID",              // 如: "shanghan-265"
  title: "小柴胡汤证/少阳病的概括标题", // 侧边栏/详情页的主要标题
  content: "这里是文言文原文...",    // 宋本原文或其他版本原文
  translation: "这里是现代白话文翻译...", // 面向现代人的白话文准确翻译

  // 2. 知识图谱 (Knowledge Graph) 数据
  // 所有涉及的关系都必须先在这里声明 Node
  nodes: [
    { id: "anchor-node", label: "第XXX条", type: "anchor" },
    { id: "sym-1", label: "症状一", type: "symptom" },
    { id: "sym-2", label: "症状二", type: "symptom" },
    { id: "theory-1", label: "背后病机", type: "theory" },
    { id: "formula-1", label: "处方名", type: "formula" },
    { id: "book-ref", label: "《某本典籍》", type: "book" }
  ],
  
  // 建立节点之间的联系
  links: [
    { source: "anchor-node", target: "sym-1" },
    { source: "anchor-node", target: "sym-2" },
    { source: "sym-1", target: "theory-1" },
    { source: "theory-1", target: "formula-1" }
    // 确保 source 和 target 必须都在上述的 nodes 数组中存在。
  ],

  // 3. 多维解析图层 (Plugins / Layers)
  // 用于填充右侧的深层次解释面板。如果该层面没有解释，留空数组或不写即可。
  plugins: {
    // 比如《黄帝内经》或《难经》对该条文底层机制的印证
    neijing: [
      { 
        title: "《素问·xx论》", 
        content: "引用的原文内经的解释内容..." 
      }
    ],
    // 比如《诸病源候论》对该条文具体病理的分析
    bingyuan: [
      { 
        title: "xx候", 
        content: "风邪入于腠理，搏于营卫..." 
      }
    ],
    // 后世注家（如尤在泾、成无己）对临床逻辑的推演
    mingli: [
      { 
        title: "注家名", 
        content: "这条条文说的是..." 
      }
    ],
    // 涉及的药物及其在《神农本草经》中的性味
    benjing: [
      { 
        title: "柴胡", 
        content: "味苦平。主心腹肠胃中结气，饮食积聚，寒热邪气，推陈致新。" 
      }
    ],
    // 《辅行诀》或《汤液经》中的五味生克与配伍机制
    tangye: [
      { 
        title: "五味化合机理", 
        content: "辛甘化阳，酸甘化阴..." 
      }
    ]
  }
};
