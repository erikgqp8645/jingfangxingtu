export interface ClauseData {
  id: string;
  title: string;
  content: string;
  translation: string;
  keywords: string[];
}

export interface KeywordSaveResponse {
  ok: boolean;
  added: boolean;
  clause: ClauseData;
}

export interface KeywordRemoveResponse {
  ok: boolean;
  removed: boolean;
  clause: ClauseData;
}

export interface ClauseListItem {
  id: string;
  title: string;
  data: ClauseData | null;
  dataFile?: string | null;
  hasData?: boolean;
}

export interface BookChapter {
  title: string;
  clauses: ClauseListItem[];
}

export interface BookCatalogItem {
  id: string;
  name: string;
  chapters: BookChapter[];
}

export interface SyncStatus {
  ok: boolean;
  lastSyncAt: string | null;
  hasSyncRecord: boolean;
  isStale?: boolean;
  latestDataUpdateAt?: string | null;
  latestDataFile?: string | null;
  stepCount?: number;
}

export interface SyncRuntimeStatus {
  isRunning: boolean;
  startedAt: string | null;
}

export interface SyncRunResponse {
  ok: boolean;
  status: 'completed' | 'failed' | 'running';
  startedAt: string | null;
  finishedAt?: string | null;
  message?: string;
}

export interface SystemStatus {
  ok: boolean;
  appVersion: string;
  nodeEnv: string;
  syncStatus: SyncStatus;
  syncRuntime?: SyncRuntimeStatus;
  database: {
    books: number;
    chapters: number;
    clauses: number;
    keywords: number;
    relationSources: number;
    relationEntries: number;
  };
}

export interface KnowledgeSourceConfig {
  sourceName: string;
  fileBaseName: string;
  category?: string;
}

export interface RelationHit {
  id: string;
  keyword: string;
  keywords?: string[];
  sourceName: string;
  category: string;
  title: string;
  content: string;
  matchType: 'json' | 'txt';
}

export interface SearchResult {
  id: string;
  source: string;
  category?: string;
  title: string;
  text: string;
  matchType: 'json' | 'txt';
  keyword?: string;
}

export interface RelationNode {
  id: string;
  label: string;
  type: 'clause' | 'keyword' | 'source';
}

export interface RelationLink {
  source: string;
  target: string;
}

export interface VisibleNodeTypes {
  clause: boolean;
  keyword: boolean;
  source: boolean;
}
