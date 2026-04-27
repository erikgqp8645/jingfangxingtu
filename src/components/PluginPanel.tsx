import React, {useEffect, useMemo, useState} from 'react';
import {BookOpen, ChevronDown, ChevronRight} from 'lucide-react';
import type {ClauseData, RelationHit, RelationSourceInfo} from '../types/relation';

interface PluginPanelProps {
  clause: ClauseData;
  activeKeywords: string[];
  relationHits: RelationHit[];
  selectedHitIds: string[];
  sourceVisible: boolean;
  availableSources: RelationSourceInfo[];
  enabledSourceBaseNames: string[];
  onToggleHit: (hitId: string) => void;
  onToggleSourceEnabled: (fileBaseName: string) => void;
  onEnableAllSources: () => void;
  onDisableAllSources: () => void;
  onSelectSource: (fileBaseName: string) => void;
  onClearSource: (fileBaseName: string) => void;
  onResetRecommended: () => void;
}

const INITIAL_VISIBLE_COUNT = 3;

export const PluginPanel: React.FC<PluginPanelProps> = ({
  clause,
  activeKeywords,
  relationHits,
  selectedHitIds,
  sourceVisible,
  availableSources,
  enabledSourceBaseNames,
  onToggleHit,
  onToggleSourceEnabled,
  onEnableAllSources,
  onDisableAllSources,
  onSelectSource,
  onClearSource,
  onResetRecommended,
}) => {
  const enabledSourceSet = useMemo(() => new Set(enabledSourceBaseNames), [enabledSourceBaseNames]);

  const sourceMap = useMemo(() => {
    const map = new Map<string, RelationSourceInfo>();
    availableSources.forEach(source => {
      map.set(source.fileBaseName, source);
    });
    return map;
  }, [availableSources]);

  const groupedResults = useMemo(() => {
    const grouped: Record<string, RelationHit[]> = {};

    relationHits.forEach(hit => {
      const key = hit.fileBaseName;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(hit);
    });

    Object.keys(grouped).forEach(fileBaseName => {
      grouped[fileBaseName].sort((a, b) => {
        const aSelected = selectedHitIds.includes(a.id) ? 1 : 0;
        const bSelected = selectedHitIds.includes(b.id) ? 1 : 0;
        return bSelected - aSelected;
      });
    });

    return grouped;
  }, [relationHits, selectedHitIds]);

  const allSourceKeys = useMemo(() => Object.keys(groupedResults), [groupedResults]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    allSourceKeys.reduce((acc, key, index) => ({...acc, [key]: index < 2}), {}),
  );
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(
    allSourceKeys.reduce((acc, key) => ({...acc, [key]: INITIAL_VISIBLE_COUNT}), {}),
  );

  useEffect(() => {
    setExpanded(allSourceKeys.reduce((acc, key, index) => ({...acc, [key]: index < 2}), {}));
    setVisibleCounts(allSourceKeys.reduce((acc, key) => ({...acc, [key]: INITIAL_VISIBLE_COUNT}), {}));
  }, [allSourceKeys]);

  const toggleExpand = (fileBaseName: string) => {
    setExpanded(prev => ({...prev, [fileBaseName]: !prev[fileBaseName]}));
  };

  const showMore = (fileBaseName: string, total: number) => {
    setVisibleCounts(prev => ({
      ...prev,
      [fileBaseName]: Math.min((prev[fileBaseName] || INITIAL_VISIBLE_COUNT) + INITIAL_VISIBLE_COUNT, total),
    }));
  };

  const showLess = (fileBaseName: string) => {
    setVisibleCounts(prev => ({
      ...prev,
      [fileBaseName]: INITIAL_VISIBLE_COUNT,
    }));
  };

  const sourceOptions = useMemo(
    () => [...availableSources].sort((a, b) => a.sourceName.localeCompare(b.sourceName, 'zh-CN')),
    [availableSources],
  );

  return (
    <div className="border-l border-divider p-6 bg-panel flex flex-col gap-4 h-full overflow-y-auto w-[320px] shrink-0">
      <div className="flex flex-col mb-2">
        <span className="text-xs uppercase tracking-[1px] text-clay font-bold">关联命中</span>
        <span className="text-[11px] text-muted">当前条文：{clause.title}</span>
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

      <div className="bg-card border border-divider rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-bold text-ink">关联解析来源</span>
          <span className="text-[11px] text-muted">
            已启用 {enabledSourceBaseNames.length} / {availableSources.length}
          </span>
        </div>
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={onEnableAllSources}
            className="flex-1 text-[11px] px-2 py-1 border border-divider rounded-md text-sage hover:border-sage transition-colors"
          >
            全部启用
          </button>
          <button
            type="button"
            onClick={onDisableAllSources}
            className="flex-1 text-[11px] px-2 py-1 border border-divider rounded-md text-muted hover:border-sage transition-colors"
          >
            全部取消
          </button>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {sourceOptions.map(source => (
            <label key={source.fileBaseName} className="flex items-start gap-2 text-[12px] text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={enabledSourceSet.has(source.fileBaseName)}
                onChange={() => onToggleSourceEnabled(source.fileBaseName)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-clay)]"
              />
              <div className="min-w-0">
                <div className="font-medium">{source.sourceName}</div>
                <div className="text-[11px] text-muted">
                  {source.hasJson ? 'JSON' : ''}
                  {source.hasJson && source.hasTxt ? ' / ' : ''}
                  {source.hasTxt ? 'TXT' : ''}
                  {source.category ? ` · ${source.category}` : ''}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {!sourceVisible ? (
        <div className="text-muted text-sm mt-4 text-center">已关闭“来源片段”，右侧命中列表暂不显示</div>
      ) : allSourceKeys.length === 0 ? (
        <div className="text-muted text-sm mt-4 text-center">暂无相关命中</div>
      ) : (
        allSourceKeys.map(fileBaseName => {
          const source = sourceMap.get(fileBaseName);
          const sourceLabel = source?.sourceName || fileBaseName;
          const sourceHits = groupedResults[fileBaseName];

          return (
            <div key={fileBaseName} className="bg-card border border-divider rounded-lg overflow-hidden shadow-sm flex-shrink-0">
              <div
                className="flex items-center justify-between p-3 bg-paper cursor-pointer hover:bg-divider/50 transition-colors"
                onClick={() => toggleExpand(fileBaseName)}
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sage" />
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-ink">{sourceLabel}</span>
                    <span className="text-[11px] text-muted">
                      已选 {sourceHits.filter(hit => selectedHitIds.includes(hit.id)).length} / {sourceHits.length}
                    </span>
                  </div>
                </div>
                {expanded[fileBaseName] ? (
                  <ChevronDown className="w-4 h-4 text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted" />
                )}
              </div>

              {expanded[fileBaseName] && (
                <div className="p-4 bg-card space-y-3 border-t border-divider">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectSource(fileBaseName)}
                      className="flex-1 text-[11px] px-2 py-1 border border-divider rounded-md text-sage hover:border-sage transition-colors"
                    >
                      全选本来源
                    </button>
                    <button
                      type="button"
                      onClick={() => onClearSource(fileBaseName)}
                      className="flex-1 text-[11px] px-2 py-1 border border-divider rounded-md text-muted hover:border-sage transition-colors"
                    >
                      清空本来源
                    </button>
                  </div>

                  {sourceHits.slice(0, visibleCounts[fileBaseName] || INITIAL_VISIBLE_COUNT).map(hit => (
                    <label
                      key={hit.id}
                      className="flex gap-3 text-[13px] leading-[1.6] text-ink pl-3 border-l-2 border-sage/50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedHitIds.includes(hit.id)}
                        onChange={() => onToggleHit(hit.id)}
                        className="mt-1 h-4 w-4 accent-[var(--color-sage)]"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold">{hit.title}</div>
                        <div className="text-[11px] text-muted mb-1">
                          关键词：{(hit.keywords || [hit.keyword]).join(' / ')} · 来源：{hit.sourceName}
                          {hit.category && hit.category !== hit.sourceName ? ` · 分组：${hit.category}` : ''}
                          {` · 类型：${hit.matchType.toUpperCase()}`}
                        </div>
                        <div>{hit.content}</div>
                      </div>
                    </label>
                  ))}

                  {sourceHits.length > (visibleCounts[fileBaseName] || INITIAL_VISIBLE_COUNT) && (
                    <button
                      type="button"
                      onClick={() => showMore(fileBaseName, sourceHits.length)}
                      className="w-full text-xs text-sage border border-divider rounded-md py-2 hover:border-sage transition-colors"
                    >
                      展开更多（剩余 {sourceHits.length - (visibleCounts[fileBaseName] || INITIAL_VISIBLE_COUNT)} 条）
                    </button>
                  )}

                  {sourceHits.length > INITIAL_VISIBLE_COUNT &&
                    (visibleCounts[fileBaseName] || INITIAL_VISIBLE_COUNT) > INITIAL_VISIBLE_COUNT && (
                      <button
                        type="button"
                        onClick={() => showLess(fileBaseName)}
                        className="w-full text-xs text-muted border border-divider rounded-md py-2 hover:border-sage transition-colors"
                      >
                        收起到前 {INITIAL_VISIBLE_COUNT} 条
                      </button>
                    )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
