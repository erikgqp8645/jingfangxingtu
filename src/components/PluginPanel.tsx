import React, {useEffect, useMemo, useState} from 'react';
import {ChevronDown, ChevronRight, BookOpen} from 'lucide-react';
import type {ClauseData, RelationHit} from '../types/relation';

interface PluginPanelProps {
  clause: ClauseData;
  relationHits: RelationHit[];
}

export const PluginPanel: React.FC<PluginPanelProps> = ({clause, relationHits}) => {
  const groupedResults = useMemo(() => {
    const grouped: Record<string, RelationHit[]> = {};
    relationHits.forEach(hit => {
      const key = hit.category || hit.sourceName;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(hit);
    });
    return grouped;
  }, [relationHits]);

  const allSources = useMemo(() => Object.keys(groupedResults), [groupedResults]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    allSources.reduce((acc, key, index) => ({...acc, [key]: index < 2}), {}),
  );

  useEffect(() => {
    setExpanded(allSources.reduce((acc, key, index) => ({...acc, [key]: index < 2}), {}));
  }, [allSources]);

  const toggleExpand = (source: string) => {
    setExpanded(prev => ({...prev, [source]: !prev[source]}));
  };

  return (
    <div className="border-l border-divider p-6 bg-panel flex flex-col gap-4 h-full overflow-y-auto w-[320px] shrink-0">
      <div className="flex flex-col mb-2">
        <span className="text-xs uppercase tracking-[1px] text-clay font-bold">关联命中</span>
        <span className="text-[11px] text-muted">按关键词检索解析文本: {clause.keywords.join(' / ')}</span>
      </div>

      {allSources.length === 0 ? (
        <div className="text-muted text-sm mt-4 text-center">暂无相关命中</div>
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
              {expanded[source] ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
            </div>

            {expanded[source] && (
              <div className="p-4 bg-card space-y-3 border-t border-divider">
                {groupedResults[source].map(hit => (
                  <div key={hit.id} className="text-[13px] leading-[1.6] text-ink pl-3 border-l-2 border-sage/50">
                    <div className="font-semibold">{hit.title}</div>
                    <div className="text-[11px] text-muted mb-1">
                      关键词: {hit.keyword} · 来源: {hit.sourceName} · 类型: {hit.matchType.toUpperCase()}
                    </div>
                    <div>{hit.content}</div>
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
