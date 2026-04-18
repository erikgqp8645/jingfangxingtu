import React from 'react';
import { RawSearchResult } from '../lib/searchUtils';
import { FileText, Database } from 'lucide-react';

interface SearchResultsProps {
  query: string;
  results: RawSearchResult[];
  onClear: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ query, results, onClear }) => {
  if (!query) return null;

  return (
    <div className="absolute inset-0 bg-paper z-20 overflow-y-auto p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-serif text-ink border-b-2 border-sage pb-2">
            检索结果: "{query}" ({results.length} 条记录)
          </h2>
          <button 
            onClick={onClear}
            className="text-sm px-4 py-2 bg-card border border-divider rounded hover:border-sage transition-colors text-ink shadow-sm"
          >
            返回图谱
          </button>
        </div>

        {results.length === 0 ? (
          <div className="text-muted text-center py-10">未找到相关内容</div>
        ) : (
          <div className="flex flex-col gap-6">
            {results.map((item, idx) => (
              <div 
                key={item.id} 
                className={`p-6 rounded-lg relative ${
                  item.type === 'raw' 
                    ? 'bg-[#FFF8E7] border border-[#F3E2B3] shadow-sm' // Yellowish background for raw text
                    : 'bg-card border-2 border-sage shadow-md' // Distinct border/box for structured nodes
                }`}
              >
                {/* Number tag */}
                <div className={`absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${
                  item.type === 'raw' ? 'bg-[#E5A93D] text-white' : 'bg-sage text-white'
                }`}>
                  #{item.id}
                </div>

                <div className="flex items-center gap-2 mb-3">
                  {item.type === 'raw' ? (
                    <FileText className="w-4 h-4 text-[#C18721]" />
                  ) : (
                    <Database className="w-4 h-4 text-sage" />
                  )}
                  <span className={`text-sm font-bold ${
                    item.type === 'raw' ? 'text-[#A06C12]' : 'text-sage'
                  }`}>
                    {item.source} {item.type === 'raw' ? ' (未 JSON 化的原始文本)' : ' (已结构化数据)'}
                  </span>
                </div>
                
                <div className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap font-serif">
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
