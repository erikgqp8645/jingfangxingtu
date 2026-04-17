import React from 'react';
import { ClauseData } from '../data';

interface ClauseDetailProps {
  clause: ClauseData;
}

export const ClauseDetail: React.FC<ClauseDetailProps> = ({ clause }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
      <div className="bg-clay text-white px-3 py-1 rounded-full text-xs mb-5 inline-block">
        核心锚点
      </div>
      
      <h1 className="text-[28px] leading-[1.6] font-serif text-[#1a1a1a] mb-[30px]" style={{ fontFamily: "'Libre Baskerville', serif" }}>
        {clause.content.split('。').map((sentence, idx, arr) => (
          <React.Fragment key={idx}>
            {sentence}{idx < arr.length - 1 ? '。' : ''}
            {idx < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </h1>

      <div className="bg-card px-6 py-4 rounded-xl border border-dashed border-clay inline-flex items-center gap-3 shadow-sm">
        <span className="text-clay font-bold text-sm">白话解析:</span>
        <span className="text-sm text-ink text-left leading-relaxed">{clause.translation}</span>
      </div>
    </div>
  );
};

