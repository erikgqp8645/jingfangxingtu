/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, {useEffect, useMemo, useState} from 'react';
import {Sidebar} from './components/Sidebar';
import {GraphView} from './components/GraphView';
import {ClauseDetail} from './components/ClauseDetail';
import {PluginPanel} from './components/PluginPanel';
import {SearchResults} from './components/SearchResults';
import {prefetchKnowledgeBase, resolveClauseRelations, searchKnowledgeBase} from './lib/searchUtils';
import {buildRelationGraph} from './lib/relationGraph';
import type {BookCatalogItem, ClauseData, VisibleNodeTypes} from './types/relation';

async function loadClauseData(dataFile?: string | null): Promise<ClauseData | null> {
  if (!dataFile) return null;
  try {
    const response = await fetch(dataFile);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`Failed to load clause data: ${dataFile}`, error);
    return null;
  }
}

export default function App() {
  const [books, setBooks] = useState<BookCatalogItem[]>([]);
  const [activeBookId, setActiveBookId] = useState('shanghan');
  const [activeClauseId, setActiveClauseId] = useState('265');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHitIds, setSelectedHitIds] = useState<string[]>([]);
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<VisibleNodeTypes>({
    clause: true,
    keyword: true,
    source: true,
  });

  useEffect(() => {
    Promise.all([fetch('/data/jingdianconfig.json').then(r => r.json()), prefetchKnowledgeBase()])
      .then(async ([data]) => {
        const loadedBooks: BookCatalogItem[] = await Promise.all(
          data.map(async (book: any) => ({
            ...book,
            chapters: await Promise.all(
              (book.chapters || []).map(async (chapter: any) => ({
                ...chapter,
                clauses: await Promise.all(
                  (chapter.clauses || []).map(async (clause: any) => ({
                    id: clause.id,
                    title: clause.title,
                    dataFile: clause.dataFile ?? null,
                    data: await loadClauseData(clause.dataFile ?? null),
                  })),
                ),
              })),
            ),
          })),
        );
        setBooks(loadedBooks);
        if (loadedBooks[0]) {
          setActiveBookId(loadedBooks[0].id);
        }
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to load books config:', error);
        setIsLoading(false);
      });
  }, []);

  const activeBook = books.find(book => book.id === activeBookId) || books[0];

  let activeClauseData: ClauseData | null = null;
  activeBook?.chapters?.forEach(chapter => {
    const found = chapter.clauses.find(clause => clause.id === activeClauseId);
    if (found?.data) activeClauseData = found.data;
  });

  const fallbackBook = books?.[0];
  const fallbackClause = fallbackBook?.chapters?.[0]?.clauses?.find(clause => clause.data !== null)?.data || null;
  const currentData = activeClauseData || fallbackClause;
  const relationHits = currentData ? resolveClauseRelations(currentData.keywords) : [];
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
    setSelectedHitIds(recommendedHitIds);
  }, [selectionKey]);

  const selectedRelationHits = relationHits.filter(hit => selectedHitIds.includes(hit.id));
  const visibleSelectedRelationHits = visibleNodeTypes.source ? selectedRelationHits : [];
  const visibleRelationHits = visibleNodeTypes.source ? relationHits : [];
  const currentGraph = currentData
    ? buildRelationGraph(currentData, selectedRelationHits, visibleNodeTypes)
    : {nodes: [], links: []};

  const handleBookChange = (bookId: string) => {
    setActiveBookId(bookId);
    setSearchQuery('');
    const book = books.find(item => item.id === bookId);
    if (!book) return;

    let firstValidId = '';
    for (const chapter of book.chapters) {
      const valid = chapter.clauses.find(clause => clause.data !== null);
      if (valid) {
        firstValidId = valid.id;
        break;
      }
    }

    if (firstValidId) setActiveClauseId(firstValidId);
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

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-paper text-ink">Loading Relations...</div>;
  }

  if (!currentData) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper text-ink">
        当前没有可用条文数据，请检查 data/jingdianconfig.json 与 data/经典/ 目录。
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-paper overflow-hidden text-ink relative">
      <header className="h-[70px] border-b border-divider flex items-center justify-between px-10 bg-paper/80 shrink-0">
        <div className="text-[22px] font-bold tracking-[2px] text-sage border-l-4 border-clay pl-3">经方关系图 · JINGFANG RELATIONS</div>
        <div className="flex gap-5 text-sm text-muted">
          <span>当前经典: {activeBook?.name}</span>
          <span>关系来源: 关键词命中</span>
          <span>用户: 中医爱好者</span>
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
            <ClauseDetail clause={currentData} relationCount={visibleSelectedRelationHits.length} />
          </div>
        </div>

        <PluginPanel
          clause={currentData}
          relationHits={visibleRelationHits}
          selectedHitIds={selectedHitIds}
          sourceVisible={visibleNodeTypes.source}
          onToggleHit={handleToggleHit}
          onSelectSource={handleSelectSource}
          onClearSource={handleClearSource}
          onResetRecommended={handleResetRecommended}
        />
      </main>

      <footer className="h-[40px] border-t border-divider px-10 flex items-center text-[11px] text-muted bg-paper shrink-0">
        <span className="mr-5">● 系统已连接: {books.length} 部经典</span>
        <span className="mr-5">● 当前关键词: {currentData.keywords.length}</span>
        <span>● 当前关联命中: {visibleSelectedRelationHits.length} / {visibleRelationHits.length}</span>
      </footer>
    </div>
  );
}
