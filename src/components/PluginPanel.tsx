import React, {useEffect, useMemo, useState} from 'react';
import {ChevronDown, ChevronRight, BookOpen} from 'lucide-react';
import type {ClauseData, RelationHit} from '../types/relation';

interface PluginPanelProps {
  clause: ClauseData;
  relationHits: RelationHit[];
}

const INITIAL_VISIBLE_COUNT = 3;

export const PluginPanel: React.FC<PluginPanelProps> = ({clause, relationHits}) => {
  const groupedResults = useMemo(() => {
    const grouped: Record<string, RelationHit[]> = {};
    relationHits.forEach(hit => {
      const key = hit.sourceName;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(hit);
    });
    return grouped;
  }, [relationHits]);

  const allSources = useMemo(() => Object.keys(groupedResults).sort((a, b) => a.localeCompare(b, 'zh-CN')), [groupedResults]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    allSources.reduce((acc, key, index) => ({...acc, [key]: index < 2}), {}),
  );
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(
    allSources.reduce((acc, key) => ({...acc, [key]: INITIAL_VISIBLE_COUNT}), {}),
  );

  useEffect(() => {
    setExpanded(allSources.reduce((acc, key, index) => ({...acc, [key]: index < 2}), {}));
    setVisibleCounts(allSources.reduce((acc, key) => ({...acc, [key]: INITIAL_VISIBLE_COUNT}), {}));
  }, [allSources]);

  const toggleExpand = (source: string) => {
    setExpanded(prev => ({...prev, [source]: !prev[source]}));
  };

  const showMore = (source: string, total: number) => {
    setVisibleCounts(prev => ({
      ...prev,
      [source]: Math.min((prev[source] || INITIAL_VISIBLE_COUNT) + INITIAL_VISIBLE_COUNT, total),
    }));
  };

  const showLess = (source: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [source]: INITIAL_VISIBLE_COUNT,
    }));
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
                {groupedResults[source].slice(0, visibleCounts[source] || INITIAL_VISIBLE_COUNT).map(hit => (
                  <div key={hit.id} className="text-[13px] leading-[1.6] text-ink pl-3 border-l-2 border-sage/50">
                    <div className="font-semibold">{hit.title}</div>
                    <div className="text-[11px] text-muted mb-1">
                      关键词: {(hit.keywords || [hit.keyword]).join(' / ')} · 来源: {hit.sourceName}
                      {hit.category && hit.category !== hit.sourceName ? ` · 分组: ${hit.category}` : ''}
                      {' · '}类型: {hit.matchType.toUpperCase()}
                    </div>
                    <div>{hit.content}</div>
                  </div>
                ))}
                {groupedResults[source].length > (visibleCounts[source] || INITIAL_VISIBLE_COUNT) && (
                  <button
                    type="button"
                    onClick={() => showMore(source, groupedResults[source].length)}
                    className="w-full text-xs text-sage border border-divider rounded-md py-2 hover:border-sage transition-colors"
                  >
                    展开更多（剩余 {groupedResults[source].length - (visibleCounts[source] || INITIAL_VISIBLE_COUNT)} 条）
                  </button>
                )}
                {groupedResults[source].length > INITIAL_VISIBLE_COUNT &&
                  (visibleCounts[source] || INITIAL_VISIBLE_COUNT) > INITIAL_VISIBLE_COUNT && (
                    <button
                      type="button"
                      onClick={() => showLess(source)}
                      className="w-full text-xs text-muted border border-divider rounded-md py-2 hover:border-sage transition-colors"
                    >
                      收起到前 {INITIAL_VISIBLE_COUNT} 条
                    </button>
                  )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};
