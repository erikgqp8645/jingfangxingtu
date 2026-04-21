import React from 'react';
import type {ClauseData} from '../types/relation';

interface ClauseDetailProps {
  clause: ClauseData;
  relationCount: number;
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
}

export const ClauseDetail: React.FC<ClauseDetailProps> = ({
  clause,
  relationCount,
  selectedKeywords,
  onToggleKeyword,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto gap-5">
      <div className="flex gap-3 flex-wrap justify-center">
        <div className="bg-clay text-white px-3 py-1 rounded-full text-xs inline-block">当前条文</div>
        <div className="bg-sage text-white px-3 py-1 rounded-full text-xs inline-block">关联命中 {relationCount}</div>
      </div>

      <h2 className="text-[18px] tracking-[1px] text-clay font-semibold">{clause.title}</h2>

      <h1 className="text-[28px] leading-[1.6] font-serif text-[#1a1a1a]">
        {clause.content.split('。').map((sentence, idx, arr) => (
          <React.Fragment key={idx}>
            {sentence}
            {idx < arr.length - 1 ? '。' : ''}
            {idx < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </h1>

      <div className="bg-card px-6 py-4 rounded-xl border border-dashed border-clay w-full shadow-sm text-left">
        <div className="text-clay font-bold text-sm mb-2">白话解析</div>
        <div className="text-sm text-ink leading-relaxed">{clause.translation}</div>
      </div>

      <div className="w-full text-left">
        <div className="text-clay font-bold text-sm mb-2">关键词</div>
        <div className="flex flex-wrap gap-2">
          {clause.keywords.map(keyword => (
            <label
              key={keyword}
              className={`px-3 py-1 rounded-full border text-xs inline-flex items-center gap-2 cursor-pointer transition-colors ${
                selectedKeywords.includes(keyword)
                  ? 'bg-panel border-clay text-ink'
                  : 'bg-white border-divider text-muted'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedKeywords.includes(keyword)}
                onChange={() => onToggleKeyword(keyword)}
                className="h-3.5 w-3.5 accent-[var(--color-clay)]"
              />
              <span>{keyword}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
