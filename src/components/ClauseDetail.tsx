import React, {useEffect, useMemo, useRef, useState} from 'react';
import type {ClauseData} from '../types/relation';

interface ClauseDetailProps {
  clause: ClauseData;
  relationCount: number;
  selectedKeywords: string[];
  onToggleKeyword: (keyword: string) => void;
  onAddKeyword: (keyword: string) => Promise<boolean>;
  onRemoveKeyword: (keyword: string) => Promise<boolean>;
}

export const ClauseDetail: React.FC<ClauseDetailProps> = ({
  clause,
  relationCount,
  selectedKeywords,
  onToggleKeyword,
  onAddKeyword,
  onRemoveKeyword,
}) => {
  const contentRef = useRef<HTMLHeadingElement>(null);
  const [pendingKeyword, setPendingKeyword] = useState('');
  const [menuState, setMenuState] = useState<{x: number; y: number} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [removingKeyword, setRemovingKeyword] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const existingKeywordSet = useMemo(() => new Set(clause.keywords), [clause.keywords]);
  const keywordAlreadyExists = !!pendingKeyword && existingKeywordSet.has(pendingKeyword);

  useEffect(() => {
    const handleGlobalClick = () => setMenuState(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuState(null);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalClick, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleGlobalClick, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const canAddPendingKeyword = useMemo(() => {
    return !!pendingKeyword && pendingKeyword.length <= 30 && !keywordAlreadyExists;
  }, [pendingKeyword, keywordAlreadyExists]);

  const handleContentContextMenu = (event: React.MouseEvent<HTMLHeadingElement>) => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';
    if (!text) return;

    const anchorNode = selection?.anchorNode;
    if (!anchorNode || !contentRef.current?.contains(anchorNode)) return;

    event.preventDefault();
    setPendingKeyword(text);
    setMenuState({x: event.clientX, y: event.clientY});
    setFeedback(null);
  };

  const handleConfirmAddKeyword = async () => {
    if (!canAddPendingKeyword) return;

    setIsSaving(true);
    try {
      const added = await onAddKeyword(pendingKeyword);
      setFeedback(added ? `已添加关键词：${pendingKeyword}` : `关键词已存在：${pendingKeyword}`);
      setMenuState(null);
      setPendingKeyword('');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '关键词保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    const confirmed = window.confirm(`确认删除关键词“${keyword}”吗？`);
    if (!confirmed) return;

    setRemovingKeyword(keyword);
    setFeedback(null);

    try {
      const removed = await onRemoveKeyword(keyword);
      setFeedback(removed ? `已删除关键词：${keyword}` : `关键词未删除：${keyword}`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : '关键词删除失败');
    } finally {
      setRemovingKeyword(null);
    }
  };

  return (
    <div className="flex flex-col items-start justify-center text-left max-w-4xl w-full mx-auto gap-5">
      <div className="flex gap-3 flex-wrap">
        <div className="bg-clay text-white px-3 py-1 rounded-full text-xs inline-block">当前条文</div>
        <div className="bg-sage text-white px-3 py-1 rounded-full text-xs inline-block">关联命中 {relationCount}</div>
      </div>

      <h2 className="text-[18px] tracking-[1px] text-clay font-semibold">{clause.title}</h2>

      <h1
        ref={contentRef}
        onContextMenu={handleContentContextMenu}
        className="text-[28px] leading-[1.8] font-serif text-[#1a1a1a] w-full text-left"
      >
        {clause.content.split('。').map((sentence, idx, arr) => (
          <React.Fragment key={idx}>
            {sentence}
            {idx < arr.length - 1 ? '。' : ''}
            {idx < arr.length - 1 && <br />}
          </React.Fragment>
        ))}
      </h1>

      <div className="text-xs text-muted">在正文原文区选中文字后右键，可添加为关键词</div>
      {feedback && <div className={`text-xs ${feedback.includes('失败') ? 'text-red-600' : 'text-sage'}`}>{feedback}</div>}

      {menuState && (
        <div
          className="fixed z-50 bg-white border border-divider rounded-lg shadow-lg p-2 min-w-[180px]"
          style={{left: menuState.x, top: menuState.y}}
          onClick={event => event.stopPropagation()}
        >
          <div className="text-xs text-muted px-2 py-1">选中文本</div>
          <div className="px-2 py-1 text-sm text-ink break-all">{pendingKeyword}</div>
          <div className="px-2 py-1 text-xs text-muted">
            {keywordAlreadyExists
              ? '该文本已经在关键词列表中'
              : pendingKeyword.length > 30
                ? '关键词长度不能超过 30 个字符'
                : '将按选中的原文文本原样写入'}
          </div>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={!canAddPendingKeyword || isSaving}
              onClick={handleConfirmAddKeyword}
              className="flex-1 text-left px-2 py-2 text-sm rounded-md bg-panel hover:bg-divider disabled:opacity-50"
            >
              {isSaving ? '保存中...' : keywordAlreadyExists ? '已存在' : '添加为关键词'}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => setMenuState(null)}
              className="px-3 py-2 text-sm rounded-md border border-divider hover:border-sage disabled:opacity-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      <div className="bg-card px-6 py-4 rounded-xl border border-dashed border-clay w-full shadow-sm text-left">
        <div className="text-clay font-bold text-sm mb-2">白话解析</div>
        <div className="text-sm text-ink leading-relaxed">{clause.translation}</div>
      </div>

      <div className="w-full text-left">
        <div className="text-clay font-bold text-sm mb-2">关键词</div>
        <div className="flex flex-wrap gap-2">
          {clause.keywords.map(keyword => (
            <div
              key={keyword}
              className={`px-3 py-1 rounded-full border text-xs inline-flex items-center gap-2 transition-colors ${
                selectedKeywords.includes(keyword)
                  ? 'bg-panel border-clay text-ink'
                  : 'bg-white border-divider text-muted'
              }`}
            >
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedKeywords.includes(keyword)}
                  onChange={() => onToggleKeyword(keyword)}
                  className="h-3.5 w-3.5 accent-[var(--color-clay)]"
                />
                <span>{keyword}</span>
              </label>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(keyword)}
                disabled={removingKeyword === keyword}
                className="rounded-full border border-divider px-1.5 py-0.5 text-[10px] text-muted hover:border-red-400 hover:text-red-600 disabled:opacity-50"
                title={`删除关键词 ${keyword}`}
              >
                {removingKeyword === keyword ? '...' : '删'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
