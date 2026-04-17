/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { GraphView } from './components/GraphView';
import { ClauseDetail } from './components/ClauseDetail';
import { PluginPanel } from './components/PluginPanel';
import { booksCatalog } from './data';

export default function App() {
  const [activeBookId, setActiveBookId] = useState(booksCatalog[0].id);
  const [activeClauseId, setActiveClauseId] = useState("265");

  const activeBook = booksCatalog.find(b => b.id === activeBookId) || booksCatalog[0];
  
  // Find current clause data
  let activeClauseData = null;
  activeBook.chapters.forEach(ch => {
    const found = ch.clauses.find(c => c.id === activeClauseId);
    if (found && found.data) {
      activeClauseData = found.data;
    }
  });

  const handleBookChange = (bookId: string) => {
    setActiveBookId(bookId);
    const book = booksCatalog.find(b => b.id === bookId);
    if (book) {
      let firstValidId = "";
      for (const ch of book.chapters) {
        const valid = ch.clauses.find(c => c.data !== null);
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
  };

  // Fallback if not found
  const currentData = activeClauseData || booksCatalog[0].chapters[0].clauses.find(c => c.id === "265")!.data!;

  return (
    <div className="flex flex-col h-screen w-full bg-paper overflow-hidden text-ink">
      {/* Header */}
      <header className="h-[70px] border-b border-divider flex items-center justify-between px-10 bg-paper/80 shrink-0">
        <div className="text-[22px] font-bold tracking-[2px] text-sage border-l-4 border-clay pl-3">经方星图 · JINGFANG GRAPH</div>
        <div className="flex gap-5 text-sm text-muted">
          <span>当前锚点: {activeBook.name}</span>
          <span>版本: 宋本原文</span>
          <span>用户: 中医爱好者</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 grid grid-cols-[280px_1fr_320px] min-h-0 bg-paper">
        <Sidebar 
          books={booksCatalog}
          activeBookId={activeBookId}
          onBookChange={handleBookChange}
          activeClauseId={activeClauseId}
          onClauseChange={handleClauseChange}
        />

        {/* Middle Main Area */}
        <div className="flex flex-col min-w-0 bg-[radial-gradient(circle_at_center,#ffffff_0%,#FDFBF7_100%)] overflow-y-auto">
          {/* Top: Graph View */}
          <div className="h-1/2 p-6 flex-shrink-0">
            <div className="w-full h-full relative border border-divider rounded-xl bg-card/50 shadow-sm overflow-hidden">
              <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-md border border-divider shadow-sm">
                <h3 className="text-[13px] font-bold text-sage">知识图谱 (Knowledge Graph)</h3>
                <p className="text-xs text-muted mt-1">拖拽节点以探索关联</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-clay"></span> 锚点</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#E89B86]"></span> 症状</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#D4A373]"></span> 理论</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-sage"></span> 典籍</span>
                  <span className="flex items-center gap-1 text-[10px]"><span className="w-2 h-2 rounded-full bg-[#9A7E6F]"></span> 方剂</span>
                </div>
              </div>
              <GraphView nodes={currentData.nodes} links={currentData.links} />
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

