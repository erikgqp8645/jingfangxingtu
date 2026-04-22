import React, {useEffect, useMemo, useState} from 'react';
import {BookOpen, ChevronDown, ChevronRight} from 'lucide-react';
import type {ClauseData, RelationHit} from '../types/relation';

interface PluginPanelProps {
  clause: ClauseData;
  activeKeywords: string[];
  relationHits: RelationHit[];
  selectedHitIds: string[];
  sourceVisible: boolean;
  onToggleHit: (hitId: string) => void;
  onSelectSource: (source: string) => void;
  onClearSource: (source: string) => void;
  onResetRecommended: () => void;
}

const INITIAL_VISIBLE_COUNT = 3;

export const PluginPanel: React.FC<PluginPanelProps> = ({
  clause,
  activeKeywords,
  relationHits,
  selectedHitIds,
  sourceVisible,
  onToggleHit,
  onSelectSource,
  onClearSource,
  onResetRecommended,
}) => {
  const groupedResults = useMemo(() => {
    const grouped: Record<string, RelationHit[]> = {};

    relationHits.forEach(hit => {
      const key = hit.sourceName;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(hit);
    });

    Object.keys(grouped).forEach(source => {
      grouped[source].sort((a, b) => {
        const aSelected = selectedHitIds.includes(a.id) ? 1 : 0;
        const bSelected = selectedHitIds.includes(b.id) ? 1 : 0;
        return bSelected - aSelected;
      });
    });

    return grouped;
  }, [relationHits, selectedHitIds]);

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
        <span className="text-[11px] text-muted">
          当前条文：{clause.title}
        </span>
        <span className="text-[11px] text-muted">
          生效关键词：{activeKeywords.length > 0 ? activeKeywords.join(' / ') : '未选择关键词'}
        </span>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onResetRecommended}
            className="text-[11px] px-2 py-1 border border-divider rounded-md text-sage hover:border-sage transition-colors"
          >
            恢复推荐选择
          </button>
          <span className="text-[11px] text-muted self-center">
            已选 {sourceVisible ? selectedHitIds.length : 0} / {sourceVisible ? relationHits.length : 0}
          </span>
        </div>
      </div>

      {!sourceVisible ? (
        <div className="text-muted text-sm mt-4 text-center">已关闭“来源片段”，右侧命中列表暂不显示</div>
      ) : allSources.length === 0 ? (
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
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-ink">{source}</span>
                  <span className="text-[11px] text-muted">
                    已选 {groupedResults[source].filter(hit => selectedHitIds.includes(hit.id)).length} / {groupedResults[source].length}
                  </span>
                </div>
              </div>
              {expanded[source] ? <ChevronDown className="w-4 h-4 text-muted" /> : <ChevronRight className="w-4 h-4 text-muted" />}
            </div>

            {expanded[source] && (
              <div className="p-4 bg-card space-y-3 border-t border-divider">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSource(source)}
                    className="flex-1 text-[11px] px-2 py-1 border border-divider rounded-md text-sage hover:border-sage transition-colors"
                  >
                    全选本来源
                  </button>
                  <button
                    type="button"
                    onClick={() => onClearSource(source)}
                    className="flex-1 text-[11px] px-2 py-1 border border-divider rounded-md text-muted hover:border-sage transition-colors"
                  >
                    清空本来源
                  </button>
                </div>

                {groupedResults[source].slice(0, visibleCounts[source] || INITIAL_VISIBLE_COUNT).map(hit => (
                  <label key={hit.id} className="flex gap-3 text-[13px] leading-[1.6] text-ink pl-3 border-l-2 border-sage/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedHitIds.includes(hit.id)}
                      onChange={() => onToggleHit(hit.id)}
                      className="mt-1 h-4 w-4 accent-[var(--color-sage)]"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold">{hit.title}</div>
                      <div className="text-[11px] text-muted mb-1">
                        关键词 {(hit.keywords || [hit.keyword]).join(' / ')} · 来源: {hit.sourceName}
                        {hit.category && hit.category !== hit.sourceName ? ` · 分组: ${hit.category}` : ''}
                        {` · 类型: ${hit.matchType.toUpperCase()}`}
                      </div>
                      <div>{hit.content}</div>
                    </div>
                  </label>
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
