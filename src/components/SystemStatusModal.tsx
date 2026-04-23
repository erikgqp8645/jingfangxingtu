import React from 'react';
import type {SystemStatus} from '../types/relation';

interface SystemStatusModalProps {
  status: SystemStatus | null;
  isOpen: boolean;
  isSyncRunning: boolean;
  syncMessage: string | null;
  onRunSync: () => Promise<void>;
  onClose: () => void;
}

function formatDateTime(value?: string | null) {
  if (!value) return '未记录';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', {hour12: false});
}

function resolveSyncPresentation(status: SystemStatus | null) {
  if (status?.syncRuntime?.isRunning) {
    return {
      label: '同步进行中',
      badgeClass: 'bg-[#2F6B45] text-white',
      panelClass: 'border-[#B7D7C1] bg-[#F2FAF4] text-[#2F6B45]',
      hint: '系统正在把 JSON 数据同步到 SQLite 数据库。同步完成后，状态会自动刷新。',
    };
  }

  if (!status?.syncStatus?.hasSyncRecord) {
    return {
      label: '未同步',
      badgeClass: 'bg-[#8B3A3A] text-white',
      panelClass: 'border-[#E7B8B8] bg-[#FFF4F4] text-[#7A2F2F]',
      hint: '当前还没有同步记录。如果刚修改了 data 文件夹里的数据，建议点击“立即同步”。',
    };
  }

  if (status.syncStatus.isStale) {
    return {
      label: '可能未同步',
      badgeClass: 'bg-[#B7791F] text-white',
      panelClass: 'border-[#F0D79A] bg-[#FFF9E8] text-[#8A6116]',
      hint: '检测到 data 目录最近有更新，时间晚于最近一次同步。建议点击“立即同步”。',
    };
  }

  return {
    label: '已同步',
    badgeClass: 'bg-sage text-white',
    panelClass: 'border-[#B7D7C1] bg-[#F2FAF4] text-[#2F6B45]',
    hint: '当前数据库时间没有落后于 data 目录，前端读取数据库时应与最近同步结果一致。',
  };
}

export const SystemStatusModal: React.FC<SystemStatusModalProps> = ({
  status,
  isOpen,
  isSyncRunning,
  syncMessage,
  onRunSync,
  onClose,
}) => {
  if (!isOpen) return null;

  const syncPresentation = resolveSyncPresentation(status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-6" onClick={onClose}>
      <div
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-divider bg-paper shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-divider bg-card px-6 py-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[1px] text-clay">系统状态</div>
            <div className="mt-1 text-lg font-semibold text-ink">当前项目运行概况</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-divider px-3 py-1.5 text-sm transition-colors hover:border-sage"
          >
            关闭
          </button>
        </div>

        <div className="space-y-5 p-6 text-sm text-ink">
          <div className={`rounded-xl border px-4 py-3 ${syncPresentation.panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="font-semibold">同步判断</div>
              <div className="flex flex-wrap items-center gap-3">
                <div className={`rounded-full px-3 py-1 text-xs font-bold ${syncPresentation.badgeClass}`}>
                  {syncPresentation.label}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void onRunSync();
                  }}
                  disabled={isSyncRunning}
                  className="rounded-md border border-divider bg-paper px-3 py-1.5 text-ink transition-colors hover:border-sage disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSyncRunning ? '同步中...' : '立即同步'}
                </button>
              </div>
            </div>
            <div className="mt-2 leading-relaxed">{syncPresentation.hint}</div>
            {status?.syncRuntime?.startedAt ? (
              <div className="mt-2 text-xs opacity-80">本次同步开始时间：{formatDateTime(status.syncRuntime.startedAt)}</div>
            ) : null}
            {syncMessage ? <div className="mt-3 font-medium">{syncMessage}</div> : null}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-divider bg-card p-4">
              <div className="mb-3 font-bold text-clay">运行信息</div>
              <div className="space-y-2">
                <div>版本：{status?.appVersion || '读取中...'}</div>
                <div>环境：{status?.nodeEnv || '读取中...'}</div>
                <div>同步状态：{syncPresentation.label}</div>
                <div>最近同步：{formatDateTime(status?.syncStatus?.lastSyncAt)}</div>
                <div>最近数据变更：{formatDateTime(status?.syncStatus?.latestDataUpdateAt)}</div>
                <div className="break-all">最近变更文件：{status?.syncStatus?.latestDataFile || '未记录'}</div>
              </div>
            </div>

            <div className="rounded-xl border border-divider bg-card p-4">
              <div className="mb-3 font-bold text-clay">数据库概况</div>
              <div className="space-y-2">
                <div>经典数：{status?.database.books ?? '-'}</div>
                <div>章节数：{status?.database.chapters ?? '-'}</div>
                <div>条文数：{status?.database.clauses ?? '-'}</div>
                <div>关键词数：{status?.database.keywords ?? '-'}</div>
                <div>关联来源数：{status?.database.relationSources ?? '-'}</div>
                <div>关联片段数：{status?.database.relationEntries ?? '-'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
