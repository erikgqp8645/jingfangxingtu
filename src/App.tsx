/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Sidebar} from './components/Sidebar';
import {GraphView} from './components/GraphView';
import {ClauseDetail} from './components/ClauseDetail';
import {PluginPanel} from './components/PluginPanel';
import {SearchResults} from './components/SearchResults';
import {SystemStatusModal} from './components/SystemStatusModal';
import {prefetchKnowledgeBase, resolveClauseRelations, searchKnowledgeBase} from './lib/searchUtils';
import {buildRelationGraph} from './lib/relationGraph';
import type {
  BookCatalogItem,
  ClauseData,
  ClauseListItem,
  KeywordRemoveResponse,
  KeywordSaveResponse,
  SyncRunResponse,
  SyncStatus,
  SystemStatus,
  VisibleNodeTypes,
} from './types/relation';

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    const preview = text.slice(0, 80).replace(/\s+/g, ' ').trim();
    throw new Error(preview ? `接口没有返回 JSON：${preview}` : '接口没有返回 JSON');
  }
}

async function fetchApiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  return parseJsonResponse<T>(response);
}

async function loadClauseData(clauseId?: string | null): Promise<ClauseData | null> {
  if (!clauseId) return null;
  try {
    const response = await fetch(`/api/clauses/${encodeURIComponent(clauseId)}`);
    if (!response.ok) return null;
    return await parseJsonResponse<ClauseData>(response);
  } catch (error) {
    console.error(`Failed to load clause data: ${clauseId}`, error);
    return null;
  }
}

function findFirstValidClauseId(book?: BookCatalogItem) {
  if (!book) return '';
  for (const chapter of book.chapters) {
    const valid = chapter.clauses.find(clause => (clause.hasData ?? false) || clause.data !== null);
    if (valid) return valid.id;
  }
  return '';
}

export default function App() {
  const [books, setBooks] = useState<BookCatalogItem[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isSystemStatusOpen, setIsSystemStatusOpen] = useState(false);
  const [isSyncRunning, setIsSyncRunning] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [activeBookId, setActiveBookId] = useState('shanghan');
  const [activeClauseId, setActiveClauseId] = useState('265');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isClauseLoading, setIsClauseLoading] = useState(false);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<VisibleNodeTypes>({
    clause: true,
    keyword: true,
    source: true,
  });
  const lastSyncedClauseIdRef = useRef<string | null>(null);
  const lastClauseKeywordsRef = useRef<string[]>([]);

  const syncStatusLabel = useMemo(() => {
    if (!syncStatus?.hasSyncRecord || !syncStatus.lastSyncAt) {
      return '未记录';
    }

    const date = new Date(syncStatus.lastSyncAt);
    if (Number.isNaN(date.getTime())) {
      return syncStatus.lastSyncAt;
    }

    return date.toLocaleString('zh-CN', {hour12: false});
  }, [syncStatus]);

  const syncStateText = useMemo(() => {
    if (!syncStatus?.hasSyncRecord) {
      return '未同步';
    }

    return syncStatus.isStale ? '可能未同步' : '已同步';
  }, [syncStatus]);

  const refreshStatuses = async () => {
    const [syncData, systemData] = await Promise.all([
      fetch('/api/sync/status')
        .then(async r => (r.ok ? await parseJsonResponse<SyncStatus>(r) : null))
        .catch(() => null),
      fetch('/api/system/status')
        .then(async r => (r.ok ? await parseJsonResponse<SystemStatus>(r) : null))
        .catch(() => null),
    ]);

    setSyncStatus(syncData);
    setSystemStatus(systemData);
  };

  const refreshClauseData = async (clauseId?: string | null) => {
    if (!clauseId) return;

    const data = await loadClauseData(clauseId);
    if (!data) return;

    setBooks(prev =>
      prev.map(book => ({
        ...book,
        chapters: book.chapters.map(chapter => ({
          ...chapter,
          clauses: chapter.clauses.map(clause => (clause.id === clauseId ? {...clause, data} : clause)),
        })),
      })),
    );
  };

  useEffect(() => {
    Promise.all([
      fetchApiJson<BookCatalogItem[]>('/api/books'),
      fetch('/api/sync/status')
        .then(async r => (r.ok ? await parseJsonResponse<SyncStatus>(r) : null))
        .catch(() => null),
      fetch('/api/system/status')
        .then(async r => (r.ok ? await parseJsonResponse<SystemStatus>(r) : null))
        .catch(() => null),
      prefetchKnowledgeBase(),
    ])
      .then(([data, syncData, systemData]) => {
        const loadedBooks: BookCatalogItem[] = data.map((book: any) => ({
          ...book,
          chapters: (book.chapters || []).map((chapter: any) => ({
            ...chapter,
            clauses: (chapter.clauses || []).map((clause: any) => ({
              id: clause.id,
              title: clause.title,
              dataFile: clause.dataFile ?? null,
              hasData: clause.hasData ?? !!clause.dataFile,
              data: null,
            })),
          })),
        }));
        setBooks(loadedBooks);
        if (loadedBooks[0]) {
          setActiveBookId(loadedBooks[0].id);
          setActiveClauseId(findFirstValidClauseId(loadedBooks[0]));
        }
        setSyncStatus(syncData);
        setSystemStatus(systemData);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load books config:', error);
        setIsLoading(false);
      });
  }, []);

  const activeBook = books.find(book => book.id === activeBookId) || books[0];

  let activeClauseItem: ClauseListItem | null = null;
  let activeClauseData: ClauseData | null = null;
  activeBook?.chapters?.forEach(chapter => {
    const found = chapter.clauses.find(clause => clause.id === activeClauseId);
    if (found) activeClauseItem = found;
    if (found?.data) activeClauseData = found.data;
  });

  useEffect(() => {
    if (!activeClauseItem || activeClauseItem.data || !(activeClauseItem.hasData ?? false)) return;

    let cancelled = false;
    setIsClauseLoading(true);

    loadClauseData(activeClauseItem.id)
      .then(data => {
        if (cancelled || !data) return;
        setBooks(prev =>
          prev.map(book => ({
            ...book,
            chapters: book.chapters.map(chapter => ({
              ...chapter,
              clauses: chapter.clauses.map(clause =>
                clause.id === activeClauseItem?.id ? {...clause, data} : clause,
              ),
            })),
          })),
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsClauseLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeClauseItem?.id]);

  const fallbackBook = books?.[0];
  const fallbackClauseItem = fallbackBook?.chapters?.[0]?.clauses?.find(clause => clause.data !== null) || null;
  const fallbackClause = fallbackClauseItem?.data || null;
  const activeBookHasData = !!activeBook?.chapters?.some(chapter =>
    chapter.clauses.some(clause => (clause.hasData ?? false) || clause.data !== null),
  );
  const currentData = activeClauseData || (activeBook?.id === fallbackBook?.id ? fallbackClause : null);
  const currentDataFile =
    activeClauseItem?.dataFile ||
    (activeBook?.id === fallbackBook?.id ? fallbackClauseItem?.dataFile : null) ||
    null;
  const effectiveKeywords = currentData ? currentData.keywords.filter(keyword => selectedKeywords.includes(keyword)) : [];
  const relationHits = currentData ? resolveClauseRelations(effectiveKeywords) : [];
  const searchResults = searchKnowledgeBase(searchQuery);
  const isSearching = searchQuery.trim().length > 0;

  const recommendedHitIds = useMemo(() => {
    const seenSources = new Set<string>();
    const ids: string[] = [];
    relationHits.forEach(hit => {
      if (seenSources.has(hit.sourceName)) return;
      seenSources.add(hit.sourceName);
      ids.push(hit.id);
    });
    return ids;
  }, [relationHits]);
  const selectionKey = `${currentData?.id || 'none'}::${relationHits.map(hit => hit.id).join('|')}`;

  useEffect(() => {
    if (!currentData) {
      lastSyncedClauseIdRef.current = null;
      lastClauseKeywordsRef.current = [];
      setSelectedKeywords([]);
      return;
    }

    if (lastSyncedClauseIdRef.current !== currentData.id) {
      lastSyncedClauseIdRef.current = currentData.id;
      lastClauseKeywordsRef.current = currentData.keywords;
      setSelectedKeywords(currentData.keywords);
      return;
    }

    const previousKeywords = lastClauseKeywordsRef.current;
    const currentKeywords = currentData.keywords;
    const keywordChanged =
      previousKeywords.length !== currentKeywords.length ||
      previousKeywords.some((keyword, index) => keyword !== currentKeywords[index]);

    if (!keywordChanged) return;

    const newlyAddedKeywords = currentKeywords.filter(keyword => !previousKeywords.includes(keyword));
    lastClauseKeywordsRef.current = currentKeywords;

    setSelectedKeywords(prev => {
      const retainedKeywords = prev.filter(keyword => currentKeywords.includes(keyword));
      const next = [...retainedKeywords];

      newlyAddedKeywords.forEach(keyword => {
        if (!next.includes(keyword)) {
          next.push(keyword);
        }
      });

      return next;
    });
  }, [currentData?.id, currentData?.keywords]);

  useEffect(() => {
    setSelectedHitIds(recommendedHitIds);
  }, [selectionKey]);

  const selectedRelationHits = relationHits.filter(hit => selectedHitIds.includes(hit.id));
  const visibleSelectedRelationHits = visibleNodeTypes.source ? selectedRelationHits : [];
  const visibleRelationHits = visibleNodeTypes.source ? relationHits : [];
  const currentGraph = currentData
    ? buildRelationGraph({...currentData, keywords: effectiveKeywords}, selectedRelationHits, visibleNodeTypes)
    : {nodes: [], links: []};

  const handleBookChange = (bookId: string) => {
    setActiveBookId(bookId);
    setSearchQuery('');
    const book = books.find(item => item.id === bookId);
    if (!book) return;
    setActiveClauseId(findFirstValidClauseId(book));
  };

  const handleClauseChange = (clauseId: string) => {
    setActiveClauseId(clauseId);
    setSearchQuery('');
  };

  const handleToggleHit = (hitId: string) => {
    setSelectedHitIds(prev => (prev.includes(hitId) ? prev.filter(id => id !== hitId) : [...prev, hitId]));
  };

  const handleSelectSource = (sourceName: string) => {
    const sourceHitIds = relationHits.filter(hit => hit.sourceName === sourceName).map(hit => hit.id);
    setSelectedHitIds(prev => Array.from(new Set([...prev, ...sourceHitIds])));
  };

  const handleClearSource = (sourceName: string) => {
    const sourceHitIds = new Set(relationHits.filter(hit => hit.sourceName === sourceName).map(hit => hit.id));
    setSelectedHitIds(prev => prev.filter(id => !sourceHitIds.has(id)));
  };

  const handleResetRecommended = () => {
    setSelectedHitIds(recommendedHitIds);
  };

  const handleToggleNodeType = (type: keyof VisibleNodeTypes) => {
    setVisibleNodeTypes(prev => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleToggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => (prev.includes(keyword) ? prev.filter(item => item !== keyword) : [...prev, keyword]));
  };

  const handleAddKeyword = async (keyword: string) => {
    if (!currentData?.id && !currentDataFile) {
      throw new Error('当前条文没有可写入的标识');
    }

    const response = await fetch('/api/keywords/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clauseId: currentData?.id ?? null,
        dataFile: currentDataFile,
        keyword,
      }),
    });

    const result = (await parseJsonResponse<KeywordSaveResponse & {error?: string}>(response)) as KeywordSaveResponse & {
      error?: string;
    };
    if (!response.ok || !result.ok) {
      throw new Error(result.error || '关键词保存失败');
    }

    setBooks(prev =>
      prev.map(book => ({
        ...book,
        chapters: book.chapters.map(chapter => ({
          ...chapter,
          clauses: chapter.clauses.map(clause => (clause.id === activeClauseId ? {...clause, data: result.clause} : clause)),
        })),
      })),
    );
    setSelectedKeywords(prev => (prev.includes(keyword) ? prev : [...prev, keyword]));
    return result.added;
  };

  const handleRemoveKeyword = async (keyword: string) => {
    if (!currentData?.id && !currentDataFile) {
      throw new Error('当前条文没有可写入的标识');
    }

    const response = await fetch('/api/keywords/remove', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clauseId: currentData?.id ?? null,
        dataFile: currentDataFile,
        keyword,
      }),
    });

    const result = (await parseJsonResponse<KeywordRemoveResponse & {error?: string}>(response)) as KeywordRemoveResponse & {
      error?: string;
    };
    if (!response.ok || !result.ok) {
      throw new Error(result.error || '关键词删除失败');
    }

    setBooks(prev =>
      prev.map(book => ({
        ...book,
        chapters: book.chapters.map(chapter => ({
          ...chapter,
          clauses: chapter.clauses.map(clause => (clause.id === activeClauseId ? {...clause, data: result.clause} : clause)),
        })),
      })),
    );
    setSelectedKeywords(prev => prev.filter(item => item !== keyword));
    return result.removed;
  };

  const handleRunSync = async () => {
    setIsSyncRunning(true);
    setSyncMessage('正在同步数据，请稍候...');

    try {
      const response = await fetch('/api/sync/run', {
        method: 'POST',
      });
      const result = (await parseJsonResponse<SyncRunResponse & {error?: string}>(response)) as SyncRunResponse & {
        error?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || result.error || '同步失败');
      }

      await Promise.all([refreshStatuses(), refreshClauseData(activeClauseId)]);
      setSyncMessage(result.message || '同步完成，状态已刷新。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '同步失败';
      setSyncMessage(`同步失败：${message}`);
    } finally {
      setIsSyncRunning(false);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-paper text-ink">Loading Relations...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-paper overflow-hidden text-ink relative">
      <header className="h-[70px] border-b border-divider flex items-center justify-between px-10 bg-paper/80 shrink-0">
        <div className="text-[22px] font-bold tracking-[2px] text-sage border-l-4 border-clay pl-3">经方关系图 · JINGFANG RELATIONS</div>
        <div className="flex gap-5 text-sm text-muted items-center">
          <span>当前经典: {activeBook?.name}</span>
          <span>关系来源: 关键词命中</span>
          <span>用户: 中医爱好者</span>
          <button
            type="button"
            onClick={() => setIsSystemStatusOpen(true)}
            className="px-3 py-1.5 border border-divider rounded-md text-ink hover:border-sage transition-colors bg-card"
          >
            系统状态
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[280px_1fr_320px] min-h-0 bg-paper relative">
        <Sidebar
          books={books}
          activeBookId={activeBookId}
          onBookChange={handleBookChange}
          activeClauseId={activeClauseId}
          onClauseChange={handleClauseChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="flex flex-col min-w-0 bg-[radial-gradient(circle_at_center,#ffffff_0%,#FDFBF7_100%)] overflow-y-auto relative">
          {currentData ? (
            <>
              {isSearching && <SearchResults query={searchQuery} results={searchResults} onClear={() => setSearchQuery('')} />}

              <div className="h-1/2 p-6 flex-shrink-0">
                <div className="mb-3 flex items-center gap-4 text-xs text-ink flex-wrap">
                  <span className="text-clay font-bold">节点显示</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleNodeTypes.clause}
                      onChange={() => handleToggleNodeType('clause')}
                      className="h-4 w-4 accent-[var(--color-clay)]"
                    />
                    <span>条文</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleNodeTypes.keyword}
                      onChange={() => handleToggleNodeType('keyword')}
                      className="h-4 w-4 accent-[var(--color-clay)]"
                    />
                    <span>关键词</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleNodeTypes.source}
                      onChange={() => handleToggleNodeType('source')}
                      className="h-4 w-4 accent-[var(--color-clay)]"
                    />
                    <span>关联结果</span>
                  </label>
                </div>
                <div className="w-full h-full relative border border-divider rounded-xl bg-card/50 shadow-sm overflow-hidden">
                  <GraphView nodes={currentGraph.nodes} links={currentGraph.links} />
                </div>
              </div>

              <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                <ClauseDetail
                  clause={currentData}
                  relationCount={visibleSelectedRelationHits.length}
                  selectedKeywords={selectedKeywords}
                  onToggleKeyword={handleToggleKeyword}
                  onAddKeyword={handleAddKeyword}
                  onRemoveKeyword={handleRemoveKeyword}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 p-6 flex items-center justify-center text-ink">
              {activeBookHasData
                ? isClauseLoading
                  ? '条文加载中...'
                  : '当前条文没有可用数据，请重新选择条文。'
                : `《${activeBook?.name?.replace(/[《》]/g, '') || '当前经典'}》当前还没有接入条文数据。`}
            </div>
          )}
        </div>

        {currentData ? (
          <PluginPanel
            clause={currentData}
            activeKeywords={effectiveKeywords}
            relationHits={visibleRelationHits}
            selectedHitIds={selectedHitIds}
            sourceVisible={visibleNodeTypes.source}
            onToggleHit={handleToggleHit}
            onSelectSource={handleSelectSource}
            onClearSource={handleClearSource}
            onResetRecommended={handleResetRecommended}
          />
        ) : (
          <div className="border-l border-divider p-6 bg-panel h-full overflow-y-auto w-[320px] shrink-0 text-sm text-muted flex items-center justify-center">
            当前经典暂无关联结果
          </div>
        )}
      </main>

      <footer className="h-[40px] border-t border-divider px-10 flex items-center text-[11px] text-muted bg-paper shrink-0">
        <span className="mr-5">● 系统已连接: {books.length} 部经典</span>
        <span className="mr-5">● 同步状态: {syncStateText}</span>
        <span className="mr-5">● 最近同步: {syncStatusLabel}</span>
        <span className="mr-5">● 当前关键词: {currentData ? `${selectedKeywords.length} / ${currentData.keywords.length}` : '0 / 0'}</span>
        <span>● 当前关联命中: {currentData ? `${visibleSelectedRelationHits.length} / ${visibleRelationHits.length}` : '0 / 0'}</span>
      </footer>

      <SystemStatusModal
        status={systemStatus}
        isOpen={isSystemStatusOpen}
        isSyncRunning={isSyncRunning}
        syncMessage={syncMessage}
        onRunSync={handleRunSync}
        onClose={() => setIsSystemStatusOpen(false)}
      />
    </div>
  );
}
