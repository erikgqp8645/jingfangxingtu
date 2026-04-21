export interface ClauseData {
  id: string;
  title: string;
  content: string;
  translation: string;
  keywords: string[];
}

export interface ClauseListItem {
  id: string;
  title: string;
  data: ClauseData | null;
  dataFile?: string | null;
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
