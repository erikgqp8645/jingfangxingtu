import React from 'react';
import {FileText, Database} from 'lucide-react';
import type {SearchResult} from '../types/relation';

interface SearchResultsProps {
  query: string;
  results: SearchResult[];
  onClear: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({query, results, onClear}) => {
  if (!query) return null;

  return (
    <div className="absolute inset-0 bg-paper z-20 overflow-y-auto p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-serif text-ink border-b-2 border-sage pb-2">检索结果: "{query}" ({results.length} 条命中)</h2>
          <button
            onClick={onClear}
            className="text-sm px-4 py-2 bg-card border border-divider rounded hover:border-sage transition-colors text-ink shadow-sm"
          >
            返回关系图
          </button>
        </div>

        {results.length === 0 ? (
          <div className="text-muted text-center py-10">未找到相关内容</div>
        ) : (
          <div className="flex flex-col gap-6">
            {results.map(item => (
              <div
                key={item.id}
                className={`p-6 rounded-lg relative ${
                  item.matchType === 'txt'
                    ? 'bg-[#FFF8E7] border border-[#F3E2B3] shadow-sm'
                    : 'bg-card border-2 border-sage shadow-md'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  {item.matchType === 'txt' ? (
                    <FileText className="w-4 h-4 text-[#C18721]" />
                  ) : (
                    <Database className="w-4 h-4 text-sage" />
                  )}
                  <span className={`text-sm font-bold ${item.matchType === 'txt' ? 'text-[#A06C12]' : 'text-sage'}`}>
                    {item.source} · {item.title} · {item.matchType.toUpperCase()}
                  </span>
                </div>

                {item.keyword && <div className="text-xs text-muted mb-2">命中关键词: {item.keyword}</div>}
                {item.category && item.category !== item.source && (
                  <div className="text-xs text-muted mb-2">分组: {item.category}</div>
                )}

                <div className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap font-serif">{item.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
