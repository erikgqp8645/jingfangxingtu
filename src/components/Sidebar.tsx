import React from 'react';
import { Search, FileText, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { BookCatalogItem } from '../types/relation';

interface SidebarProps {
  books: BookCatalogItem[];
  activeBookId: string;
  onBookChange: (id: string) => void;
  activeClauseId: string;
  onClauseChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ books, activeBookId, onBookChange, activeClauseId, onClauseChange, searchQuery, onSearchChange }) => {
  return (
    <div className="border-r border-divider p-6 bg-paper flex flex-col h-full overflow-y-auto">
      <div className="mb-6">
        <span className="text-xs uppercase tracking-[1px] text-clay mb-2 block">选择经典</span>
        <div className="relative">
          <select 
            value={activeBookId}
            onChange={(e) => onBookChange(e.target.value)}
            className="w-full bg-card border border-divider text-sm text-ink rounded-md pl-3 pr-8 py-2.5 outline-none focus:ring-1 focus:ring-sage appearance-none cursor-pointer hover:border-sage transition-colors shadow-sm font-medium"
          >
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        </div>

        <div className="h-px bg-divider my-5"></div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索条文、症状、方剂..." 
            className="w-full bg-card border border-divider text-sm text-ink rounded-md pl-9 pr-3 py-2 outline-none focus:ring-1 focus:ring-sage"
          />
        </div>
      </div>

      <div className="flex-1">
        {books.find(b => b.id === activeBookId)?.chapters.map((chapter, idx) => (
          <div key={idx} className="mb-6">
            <span className="text-xs uppercase tracking-[1px] text-clay mb-3 block">{chapter.title}</span>
            {chapter.clauses.map(clause => {
              const isActive = clause.id === activeClauseId;
              const hasData = !!clause.data;
              return (
                <div 
                  key={clause.id}
                  onClick={() => hasData && onClauseChange(clause.id)}
                  className={cn(
                    "p-3 rounded-lg mb-2 text-sm transition-colors border flex items-center gap-2",
                    isActive 
                      ? "border-divider bg-card shadow-[0_2px_8px_rgba(0,0,0,0.05)] font-semibold text-ink cursor-default" 
                      : hasData 
                        ? "border-transparent text-ink hover:bg-card cursor-pointer" 
                        : "border-transparent text-muted cursor-not-allowed opacity-60"
                  )}
                >
                  <FileText className={cn("w-4 h-4", isActive ? "text-sage" : "text-muted")} />
                  {clause.title}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

