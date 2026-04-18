import React, { useState } from 'react';
import { ClauseData } from '../data';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import { searchKnowledgeBase } from '../lib/searchUtils';

interface PluginPanelProps {
  clause: ClauseData;
}

export const PluginPanel: React.FC<PluginPanelProps> = ({ clause }) => {
  // Grouping both existing plugins and dynamic search results safely
  const groupedResults: Record<string, string[]> = {
    '诸病源候论': clause.plugins?.bingyuan?.map(i => `【${i.title}】${i.content}`) || [],
    '内经': clause.plugins?.neijing?.filter(i => i.title.includes('内经') || i.title.includes('素问') || i.title.includes('灵枢')).map(i => `【${i.title}】${i.content}`) || [],
    '难经': clause.plugins?.neijing?.filter(i => i.title.includes('难经')).map(i => `【${i.title}】${i.content}`) || [],
    '伤寒明理论': clause.plugins?.mingli?.map(i => `【${i.title}】${i.content}`) || [],
    '汤液经 / 本经': [
      ...(clause.plugins?.benjing?.map(i => `【${i.title}】${i.content}`) || []),
      ...(clause.plugins?.tangye?.map(i => `【${i.title}】${i.content}`) || [])
    ]
  };

  // Find topics to search (from explicit keywords or symptoms/theories)
  const keywords = clause.keywords && clause.keywords.length > 0 
    ? clause.keywords 
    : clause.nodes
      .filter(n => n.type === 'symptom' || n.type === 'theory')
      .map(n => n.label);

  keywords.forEach(kw => {
    const results = searchKnowledgeBase(kw);
    results.forEach(res => {
      // Use clean source name 
      const sourceName = res.source.split('（')[0].trim();
      
      // Remove default prefixes if it matches these names
      const key = Object.keys(groupedResults).find(k => sourceName.includes(k) || k.includes(sourceName)) || sourceName;
      
      if (!groupedResults[key]) {
        groupedResults[key] = [];
      }
      
      if (!groupedResults[key].includes(res.text)) {
        groupedResults[key].push(res.text);
      }
    });
  });

  // Filter out empty sources
  const allSources = Object.keys(groupedResults).filter(k => groupedResults[k].length > 0);

  // Start with first 2 expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    allSources.reduce((acc, key, idx) => ({ ...acc, [key]: idx < 2 }), {})
  );

  const toggleExpand = (source: string) => {
    setExpanded(prev => ({ ...prev, [source]: !prev[source] }));
  };

  return (
    <div className="border-l border-divider p-6 bg-panel flex flex-col gap-4 h-full overflow-y-auto w-[320px] shrink-0">
      <div className="flex flex-col mb-2">
        <span className="text-xs uppercase tracking-[1px] text-clay font-bold">跨文本关联解析</span>
        <span className="text-[11px] text-muted">自动检索症状及病机理论</span>
      </div>

      {allSources.length === 0 ? (
        <div className="text-muted text-sm mt-4 text-center">暂无相关典籍记录</div>
      ) : (
        allSources.map(source => (
          <div key={source} className="bg-card border border-divider rounded-lg overflow-hidden shadow-sm flex-shrink-0">
            <div 
              className="flex items-center justify-between p-3 bg-paper cursor-pointer hover:bg-divider/50 transition-colors"
              onClick={() => toggleExpand(source)}
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-sage" />
                <span className="text-[13px] font-bold text-ink">{source}</span>
              </div>
              {expanded[source] ? (
                <ChevronDown className="w-4 h-4 text-muted" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted" />
              )}
            </div>
            
            {expanded[source] && (
              <div className="p-4 bg-card space-y-3 border-t border-divider">
                {groupedResults[source].map((text, idx) => (
                  <div key={idx} className="text-[13px] leading-[1.6] text-ink pl-3 border-l-2 border-sage/50 font-serif">
                    {text}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

