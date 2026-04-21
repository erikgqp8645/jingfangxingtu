import type {KnowledgeSourceConfig, RelationHit, SearchResult} from '../types/relation';

type StructuredEntry = {
  title?: string;
  content?: string;
};

let loadedConfigs: KnowledgeSourceConfig[] = [];
let loadedJsonFiles: Record<string, Record<string, StructuredEntry[]>> = {};
let loadedTxtFiles: Record<string, string> = {};
let isReady = false;

function normalizeCategory(config: KnowledgeSourceConfig) {
  return config.category || `《${config.sourceName}》`;
}

function makeHitId(parts: string[]) {
  return parts
    .join('__')
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-');
}

function excerpt(content: string, keyword: string, radius = 80) {
  const clean = content.replace(/\s+/g, ' ').trim();
  const index = clean.indexOf(keyword);
  if (index < 0) return clean.slice(0, Math.min(clean.length, radius * 2 + 40));
  const start = Math.max(0, index - radius);
  const end = Math.min(clean.length, index + keyword.length + radius);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';
  return `${prefix}${clean.slice(start, end)}${suffix}`;
}

function compareRelationHits(a: RelationHit, b: RelationHit) {
  if (a.matchType !== b.matchType) {
    return a.matchType === 'json' ? -1 : 1;
  }
  return (
    a.sourceName.localeCompare(b.sourceName, 'zh-CN') ||
    a.title.localeCompare(b.title, 'zh-CN') ||
    a.keyword.localeCompare(b.keyword, 'zh-CN')
  );
}

function dedupeAndSortHits(hits: RelationHit[]) {
  const merged = new Map<string, RelationHit>();

  hits.forEach(hit => {
    const key = [
      hit.sourceName,
      hit.category,
      hit.title,
      hit.content,
      hit.matchType,
    ].join('||');
    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, {
        ...hit,
        keywords: [hit.keyword],
      });
      return;
    }

    const keywordSet = new Set([...(existing.keywords || [existing.keyword]), hit.keyword]);
    existing.keywords = Array.from(keywordSet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    existing.keyword = existing.keywords[0];
  });

  return Array.from(merged.values()).sort(compareRelationHits);
}

function parseTxtHits(config: KnowledgeSourceConfig, keyword: string, txtContent: string): RelationHit[] {
  const segments = txtContent.split(/<篇名>|【篇名】/);
  const hits: RelationHit[] = [];

  segments.forEach((segment, index) => {
    const trimmed = segment.trim();
    if (!trimmed || !trimmed.includes(keyword)) return;

    const titleMatch = trimmed.match(/([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `片段 ${index + 1}`;
    const attrMatch = trimmed.match(/属性[：:]([\s\S]+)/);
    const content = attrMatch ? attrMatch[1].trim() : trimmed;

    if (!content.includes(keyword)) return;

    hits.push({
      id: makeHitId([config.fileBaseName, keyword, 'txt', String(index)]),
      keyword,
      sourceName: config.sourceName,
      category: normalizeCategory(config),
      title,
      content: excerpt(content, keyword),
      matchType: 'txt',
    });
  });

  return hits;
}

export async function prefetchKnowledgeBase() {
  if (isReady) return;
  try {
    const configRes = await fetch('/data/guanlianjiexiconfig.json');
    loadedConfigs = await configRes.json();

    for (const config of loadedConfigs) {
      const baseName = config.fileBaseName;
      try {
        const jsonRes = await fetch(`/data/关联解析/${baseName}.json`);
        if (jsonRes.ok) {
          loadedJsonFiles[baseName] = await jsonRes.json();
        }
      } catch {}

      try {
        const txtRes = await fetch(`/data/关联解析/${baseName}.txt`);
        if (txtRes.ok) {
          loadedTxtFiles[baseName] = await txtRes.text();
        }
      } catch {}
    }
    isReady = true;
  } catch (error) {
    console.error('Failed to load knowledge base configs', error);
  }
}

export function resolveClauseRelations(keywords: string[]): RelationHit[] {
  const dedupedKeywords = Array.from(new Set(keywords.map(keyword => keyword.trim()).filter(Boolean)));
  const hits: RelationHit[] = [];

  for (const config of loadedConfigs) {
    const baseName = config.fileBaseName;
    const jsonContext = loadedJsonFiles[baseName];

    if (jsonContext) {
      for (const keyword of dedupedKeywords) {
        const items = jsonContext[keyword] || [];
        items.forEach((item, index) => {
          if (!item?.content) return;
          hits.push({
            id: makeHitId([baseName, keyword, 'json', String(index)]),
            keyword,
            sourceName: config.sourceName,
            category: normalizeCategory(config),
            title: item.title || keyword,
            content: item.content,
            matchType: 'json',
          });
        });
      }
      continue;
    }

    const txtContent = loadedTxtFiles[baseName];
    if (!txtContent) continue;

    for (const keyword of dedupedKeywords) {
      hits.push(...parseTxtHits(config, keyword, txtContent));
    }
  }

  return dedupeAndSortHits(hits);
}

export function searchKnowledgeBase(query: string): SearchResult[] {
  const keyword = query.trim();
  if (!keyword) return [];

  return resolveClauseRelations([keyword]).map(hit => ({
    id: hit.id,
    source: hit.sourceName,
    category: hit.category,
    title: hit.title,
    text: hit.content,
    matchType: hit.matchType,
    keyword: (hit.keywords || [hit.keyword]).join(' / '),
  }));
}
