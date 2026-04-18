/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { GraphView } from './components/GraphView';
import { ClauseDetail } from './components/ClauseDetail';
import { PluginPanel } from './components/PluginPanel';
import { SearchResults } from './components/SearchResults';
import { searchKnowledgeBase, prefetchKnowledgeBase } from './lib/searchUtils';
import { booksCatalog as tempBooksCatalog, clause265, jinguiClause13 } from './data';

export default function App() {
  const [books, setBooks] = useState(tempBooksCatalog);
  const [activeBookId, setActiveBookId] = useState("shanghan");
  const [activeClauseId, setActiveClauseId] = useState("265");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/data/jingdianconfig.json').then(r => r.json()),
      prefetchKnowledgeBase()
    ])
      .then(([data]) => {
        // Map data strings to actual objects from data.ts
        const loadedBooks = data.map((book: any) => {
          book.chapters.forEach((ch: any) => {
            ch.clauses.forEach((cl: any) => {
              if (cl.data === "static_clause265") cl.data = clause265;
              if (cl.data === "static_jingui-13") cl.data = jinguiClause13;
              if (cl.data === "dynamic_29") {
                cl.data = {
                  id: "29",
                  title: "伤寒论 第29条",
                  content: "伤寒脉浮、自汗出、小便数、心烦、微恶寒、脚挛急，反与桂枝，欲攻其表，此误也。得之便厥、咽中干、烦躁吐逆者，作甘草干姜汤与之，以复其阳。若厥愈足温者，更作芍药甘草汤与之，其脚即伸；若胃气不和谵语者，少与调胃承气汤；若重发汗，复加烧针者，四逆汤主之。",
                  translation: "太阳病被误治，出现诸多变证...",
                  keywords: ["谵语", "吐逆"],
                  nodes: [
                    { id: "c-29", label: "第29条", type: "anchor" },
                    { id: "s-zy", label: "谵语", "type": "symptom" },
                    { id: "s-tn", label: "吐逆", "type": "symptom" }
                  ],
                  links: [
                    { source: "c-29", target: "s-zy" },
                    { source: "c-29", target: "s-tn" }
                  ],
                  plugins: {
                    bingyuan: [], neijing: [], mingli: [], benjing: [], tangye: []
                  }
                };
              }
            });
          });
          return book;
        });
        setBooks(loadedBooks);
        if (loadedBooks[0]) {
            setActiveBookId(loadedBooks[0].id);
        }
        setIsLoading(false);
      })
      .catch(e => {
        console.error('Failed to load books config:', e);
        setIsLoading(false);
      });
  }, []);

  const searchResults = searchKnowledgeBase(searchQuery);
  const isSearching = searchQuery.trim().length > 0;

  const activeBook = books.find(b => b.id === activeBookId) || books[0];
  
  // Find current clause data
  let activeClauseData = null;
  activeBook?.chapters?.forEach(ch => {
    const found = ch.clauses.find((c: any) => c.id === activeClauseId);
    if (found && found.data) {
      activeClauseData = found.data;
    }
  });

  const handleBookChange = (bookId: string) => {
    setActiveBookId(bookId);
    setSearchQuery(""); // Clear search when changing books
    const book = books.find(b => b.id === bookId);
    if (book) {
      let firstValidId = "";
      for (const ch of book.chapters) {
        const valid = ch.clauses.find((c: any) => c.data !== null);
        if (valid) {
          firstValidId = valid.id;
          break;
        }
      }
      if (firstValidId) setActiveClauseId(firstValidId);
    }
  };

  const handleClauseChange = (clauseId: string) => {
    setActiveClauseId(clauseId);
    setSearchQuery(""); // Clear search when changing clause directly
  };

  // Fallback if not found
  const fallbackBook = books?.[0];
  const fallbackClause = fallbackBook?.chapters?.[0]?.clauses?.find((c: any) => c.data !== null)?.data;
  const currentData = activeClauseData || fallbackClause || clause265;

  // Auto-expand graph based on symptoms searching
  const getExpandedGraph = (clause: typeof currentData) => {
    if (!clause) return { nodes: [], links: [] };
    const nodes = [...clause.nodes];
    const links = [...clause.links];
    
    // Find symptom or theory nodes to expand
    const topicsToExpand = nodes.filter((n: any) => n.type === 'symptom' || n.type === 'theory');
    
    topicsToExpand.forEach((topic: any) => {
      const results = searchKnowledgeBase(topic.label);
      let count = 0;
      results.forEach(res => {
        // Only expand a few to avoid clutter
        if (count >= 2) return; 
        if (res.type === 'raw') {
          const autoNodeId = `auto-${res.id}`;
          if (!nodes.find((n: any) => n.id === autoNodeId)) {
            nodes.push({ id: autoNodeId, label: res.source.split('（')[0], type: 'book' });
          }
          links.push({ source: topic.id, target: autoNodeId });
          count++;
        }
      });
    });

    return { nodes, links };
  };

  const currentGraph = getExpandedGraph(currentData);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-paper text-ink">Loading Knowledge Base...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-paper overflow-hidden text-ink relative">
      {/* Header */}
      <header className="h-[70px] border-b border-divider flex items-center justify-between px-10 bg-paper/80 shrink-0">
        <div className="text-[22px] font-bold tracking-[2px] text-sage border-l-4 border-clay pl-3">经方星图 · JINGFANG GRAPH</div>
        <div className="flex gap-5 text-sm text-muted">
          <span>当前锚点: {activeBook?.name}</span>
          <span>版本: 宋本原文</span>
          <span>用户: 中医爱好者</span>
        </div>
      </header>

      {/* Main */}
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

        {/* Middle Main Area */}
        <div className="flex flex-col min-w-0 bg-[radial-gradient(circle_at_center,#ffffff_0%,#FDFBF7_100%)] overflow-y-auto relative">
          
          {isSearching && (
            <SearchResults 
              query={searchQuery} 
              results={searchResults} 
              onClear={() => setSearchQuery("")} 
            />
          )}

          {/* Top: Graph View */}
          <div className="h-1/2 p-6 flex-shrink-0">
            <div className="w-full h-full relative border border-divider rounded-xl bg-card/50 shadow-sm overflow-hidden">
              <GraphView nodes={currentGraph.nodes} links={currentGraph.links} />
            </div>
          </div>

          {/* Bottom: Clause Detail */}
          <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
            <ClauseDetail clause={currentData} />
          </div>
        </div>

        <PluginPanel clause={currentData} />
      </main>

      {/* Footer */}
      <footer className="h-[40px] border-t border-divider px-10 flex items-center text-[11px] text-muted bg-paper shrink-0">
        <span className="mr-5">● 系统已连接: 7 部经典</span>
        <span className="mr-5">● 当前知识图谱节点: 1,428</span>
        <span>● 逻辑验证: 闭环完整</span>
      </footer>
    </div>
  );
}

