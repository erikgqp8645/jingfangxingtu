export type NodeType = 'anchor' | 'symptom' | 'theory' | 'book' | 'formula';

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface PluginData {
  title: string;
  content: string;
}

export interface ClauseData {
  id: string;
  title: string;
  content: string;
  translation: string;
  nodes: GraphNode[];
  links: GraphLink[];
  plugins: {
    bingyuan: PluginData[];
    neijing: PluginData[];
    mingli: PluginData[];
    benjing: PluginData[];
    tangye: PluginData[];
  };
}

export const clause265: ClauseData = {
  id: "265",
  title: "伤寒论 第265条",
  content: "伤寒，脉弦细，头痛发热者，属少阳。少阳不可发汗，发汗则谵语，此属胃，胃和则愈；胃不和，烦而悸。",
  translation: "外感伤寒，如果出现脉象弦细，伴有头痛、发热的症状，这属于少阳病。少阳病是绝对不能用发汗的方法治疗的。如果误用了发汗法，就会导致患者胡言乱语（谵语），这是因为邪热传入了胃。如果胃气能够恢复调和，病就会痊愈；如果胃气不能调和，就会出现心烦和心悸。",
  nodes: [
    { id: "clause-265", label: "第265条", type: "anchor" },
    { id: "symptom-pulse", label: "脉弦细", type: "symptom" },
    { id: "symptom-headache", label: "头痛发热", type: "symptom" },
    { id: "symptom-delirium", label: "谵语", type: "symptom" },
    { id: "symptom-palpitation", label: "烦而悸", type: "symptom" },
    { id: "theory-shaoyang", label: "属少阳", type: "theory" },
    { id: "theory-stomach", label: "此属胃", type: "theory" },
    { id: "book-nanjing", label: "《难经》脉法", type: "book" },
    { id: "book-neijing", label: "《内经》经络", type: "book" },
    { id: "book-bingyuan-1", label: "《病源》谵语候", type: "book" },
    { id: "book-bingyuan-2", label: "《病源》悸候", type: "book" },
    { id: "book-mingli", label: "《明理论》注解", type: "book" },
    { id: "book-tangye", label: "《汤液经》五味", type: "book" },
    { id: "formula-xiaochaihu", label: "小柴胡汤/理中", type: "formula" },
  ],
  links: [
    { source: "clause-265", target: "symptom-pulse" },
    { source: "clause-265", target: "symptom-headache" },
    { source: "clause-265", target: "symptom-delirium" },
    { source: "clause-265", target: "symptom-palpitation" },
    { source: "symptom-pulse", target: "theory-shaoyang" },
    { source: "symptom-headache", target: "theory-shaoyang" },
    { source: "theory-shaoyang", target: "book-nanjing" },
    { source: "theory-shaoyang", target: "book-neijing" },
    { source: "symptom-delirium", target: "theory-stomach" },
    { source: "symptom-delirium", target: "book-bingyuan-1" },
    { source: "symptom-palpitation", target: "book-bingyuan-2" },
    { source: "clause-265", target: "book-mingli" },
    { source: "theory-stomach", target: "formula-xiaochaihu" },
    { source: "formula-xiaochaihu", target: "book-tangye" },
  ],
  plugins: {
    bingyuan: [
      { title: "伤寒谵语候", content: "热乘心……故令谵语。此皆由汗下之后，正气虚扰，邪热乃至也。" },
      { title: "伤寒悸候", content: "悸者，心动欲吐……由发汗后，阴气随虚，邪乘于心，则使心动悸也。" }
    ],
    neijing: [
      { title: "《难经》脉法", content: "春脉弦……肝之脉也。弦细代表少阳胆火内郁，木气不达。" },
      { title: "《灵枢·经脉》", content: "足少阳之脉，起于目锐眦，上抵头角，下耳后……" }
    ],
    mingli: [
      { title: "成无己注", content: "脉弦细者，邪在半表半里也。头痛发热者，邪气外迫也。发汗烁胃中津液，胃中干燥，必发谵语。" }
    ],
    benjing: [
      { title: "柴胡", content: "味苦平。主心腹肠胃中结气……推陈致新。" },
      { title: "人参/甘草/大枣", content: "味甘。补脾胃，防止木继续克土。" }
    ],
    tangye: [
      { title: "五味生克", content: "辛甘化阳，酸甘化阴。用辛味散木之郁，甘味补土（胃）之虚。" }
    ]
  }
};

export const jinguiClause13: ClauseData = {
  id: "jingui-13",
  title: "金匮要略 第13条",
  content: "血痹虚劳病脉证并治第六：虚劳里急，诸不足，黄芪建中汤主之。",
  translation: "虚劳病，出现腹中内里拘急疼痛，以及各种气血阴阳不足的症状，用黄芪建中汤来主治。",
  nodes: [
    { id: "jg-13", label: "第13条", type: "anchor" },
    { id: "symptom-liji", label: "虚劳里急", type: "symptom" },
    { id: "symptom-buzhu", label: "诸不足", type: "symptom" },
    { id: "book-jingui", label: "《金匮要略》", type: "book" },
    { id: "formula-huangqi", label: "黄芪建中汤", type: "formula" },
    { id: "theory-zhongqi", label: "中气不足", type: "theory" },
  ],
  links: [
    { source: "jg-13", target: "symptom-liji" },
    { source: "jg-13", target: "symptom-buzhu" },
    { source: "jg-13", target: "formula-huangqi" },
    { source: "symptom-liji", target: "theory-zhongqi" },
    { source: "symptom-buzhu", target: "theory-zhongqi" },
    { source: "formula-huangqi", target: "theory-zhongqi" },
    { source: "jg-13", target: "book-jingui" }
  ],
  plugins: {
    bingyuan: [
      { title: "虚劳候", content: "虚劳者，五脏气衰，精血不足也。邪气乘之，导致腹中拘急里痛。" }
    ],
    neijing: [
      { title: "《素问·阴阳应象大论》", content: "形不足者，温之以气；精不足者，补之以味。黄芪建中汤正是以此为本。" }
    ],
    mingli: [
      { title: "尤在泾注", content: "中气不给，虚且寒也。黄芪建中汤，建立中气，温养脾胃，则里急可止，诸不足可除。" }
    ],
    benjing: [
      { title: "黄芪", content: "味甘微温。主痈疽久败疮……补虚，小儿百病。" },
      { title: "饴糖", content: "味甘微温。补虚乏，止渴，去血。" }
    ],
    tangye: [
      { title: "五味生克", content: "甘温建中。以甘味（饴糖、甘草、大枣）补脾土，辛温散寒，以缓里急。" }
    ]
  }
};

export const booksCatalog = [
  {
    id: "shanghan",
    name: "《伤寒论》",
    chapters: [
      {
        title: "辨少阳病脉证并治",
        clauses: [
          { id: "263", title: "第 263 条 · 少阳提纲", data: null },
          { id: "264", title: "第 264 条 · 少阳中风", data: null },
          { id: "265", title: "第 265 条 · 误汗变证", data: clause265 },
          { id: "266", title: "第 266 条 · 本证与变证", data: null },
        ]
      }
    ]
  },
  {
    id: "jingui",
    name: "《金匮要略》",
    chapters: [
      {
        title: "血痹虚劳病脉证并治",
        clauses: [
          { id: "11", title: "第 11 条 · 中风漏汗", data: null },
          { id: "12", title: "第 12 条 · 桂枝加龙骨牡蛎", data: null },
          { id: "jingui-13", title: "第 13 条 · 虚劳里急", data: jinguiClause13 },
        ]
      }
    ]
  }
];
