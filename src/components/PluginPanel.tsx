import React from 'react';
import { ClauseData } from '../data';

interface PluginPanelProps {
  clause: ClauseData;
}

export const PluginPanel: React.FC<PluginPanelProps> = ({ clause }) => {
  return (
    <div className="border-l border-divider p-6 bg-panel flex flex-col gap-4 h-full overflow-y-auto">
      <span className="text-xs uppercase tracking-[1px] text-clay mb-2 block">多维解析图层</span>

      {/* 病理图鉴 - 诸病源候论 */}
      <div className="bg-card rounded-xl p-4 border border-divider shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#E89B86]"></div>
          <div className="text-[13px] font-bold text-sage">诸病源候论 (病理机制)</div>
        </div>
        <div className="text-[13px] leading-relaxed text-muted space-y-2">
          {clause.plugins.bingyuan.map((item, idx) => (
            <div key={idx}>
              <span className="font-semibold text-ink">【{item.title}】</span>{item.content}
            </div>
          ))}
        </div>
      </div>

      {/* 机制底层 - 内经/难经 */}
      <div className="bg-card rounded-xl p-4 border border-divider shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-sage"></div>
          <div className="text-[13px] font-bold text-sage">内经 / 难经 (底层代码)</div>
        </div>
        <div className="text-[13px] leading-relaxed text-muted space-y-2">
          {clause.plugins.neijing.map((item, idx) => (
            <div key={idx}>
              <span className="font-semibold text-ink">{item.title}：</span>{item.content}
            </div>
          ))}
        </div>
      </div>

      {/* 解码器 - 伤寒明理论 */}
      <div className="bg-card rounded-xl p-4 border border-divider shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#D4A373]"></div>
          <div className="text-[13px] font-bold text-sage">伤寒明理论 (逻辑翻译)</div>
        </div>
        <div className="text-[13px] leading-relaxed text-muted space-y-2">
          {clause.plugins.mingli.map((item, idx) => (
            <div key={idx}>
              <span className="font-semibold text-ink">{item.title}：</span>{item.content}
            </div>
          ))}
        </div>
      </div>

      {/* 物质与生化 - 本经/汤液经 */}
      <div className="bg-card rounded-xl p-4 border border-divider shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#9A7E6F]"></div>
          <div className="text-[13px] font-bold text-sage">汤液经 / 本经 (物性构成)</div>
        </div>
        <div className="text-[13px] leading-relaxed text-muted space-y-2">
          {clause.plugins.benjing.map((item, idx) => (
            <div key={idx}>
              <span className="font-semibold text-ink">{item.title}：</span>{item.content}
            </div>
          ))}
          {clause.plugins.tangye.map((item, idx) => (
            <div key={idx}>
              <span className="font-semibold text-ink">{item.title}：</span>{item.content}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

