import type {KnowledgeSourceConfig, RelationHit, SearchResult} from '../types/relation';

type StructuredEntry = {
  title?: string;
  content?: string;
};

type LoadedEntry = {
  title: string;
  content: string;
  keyword?: string;
};

type LoadedSource = {
  sourceName: string;
  fileBaseName: string;
  category?: string;
  jsonEntries: LoadedEntry[];
  txtEntries: LoadedEntry[];
};

let loadedConfigs: KnowledgeSourceConfig[] = [];
let loadedJsonFiles: Record<string, Record<string, StructuredEntry[]>> = {};
let loadedTxtFiles: Record<string, string> = {};
let loadedSources: LoadedSource[] = [];
let isReady = false;

function normalizeCategory(config: KnowledgeSourceConfig) {
  return config.category || `《${config.sourceName}》`;
}

function makeHitId(parts: string[]) {
  return parts.join('__').replace(/\s+/g, '-').replace(/[^\p{L}\p{N}_-]+/gu, '-');
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
    const key = [hit.sourceName, hit.category, hit.title, hit.content, hit.matchType].join('||');
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

function parseTxtEntries(txtContent: string): LoadedEntry[] {
  const segments = txtContent.split(/<篇名>|【篇名】?/);
  const entries: LoadedEntry[] = [];

  segments.forEach((segment, index) => {
    const trimmed = segment.trim();
    if (!trimmed) return;

    const titleMatch = trimmed.match(/([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `片段 ${index + 1}`;
    const attrMatch = trimmed.match(/属性[：:]([\s\S]+)/);
    const content = attrMatch ? attrMatch[1].trim() : trimmed;

    if (!content) return;
    entries.push({title, content});
  });

  return entries;
}

function buildJsonEntries(jsonContext: Record<string, StructuredEntry[]>) {
  const entries: LoadedEntry[] = [];

  Object.entries(jsonContext).forEach(([keyword, items]) => {
    (items || []).forEach(item => {
      if (!item?.content) return;
      entries.push({
        title: item.title || keyword,
        content: item.content,
        keyword,
      });
    });
  });

  return entries;
}

function hydrateLoadedSourcesFromFiles() {
  const nextSources: LoadedSource[] = [];

  for (const config of loadedConfigs) {
    const baseName = config.fileBaseName;
    const jsonContext = loadedJsonFiles[baseName];
    const txtContent = loadedTxtFiles[baseName];

    nextSources.push({
      sourceName: config.sourceName,
      fileBaseName: baseName,
      category: config.category,
      jsonEntries: jsonContext ? buildJsonEntries(jsonContext) : [],
      txtEntries: txtContent ? parseTxtEntries(txtContent) : [],
    });
  }

  loadedSources = nextSources;
}

export async function prefetchKnowledgeBase() {
  if (isReady) return;

  try {
    try {
      const apiRes = await fetch('/api/relations/index');
      if (apiRes.ok) {
        loadedSources = await apiRes.json();
        isReady = true;
        return;
      }
    } catch {}

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

    hydrateLoadedSourcesFromFiles();
    isReady = true;
  } catch (error) {
    console.error('Failed to load knowledge base configs', error);
  }
}

function resolveJsonHits(
  source: LoadedSource,
  config: KnowledgeSourceConfig,
  keyword: string,
) {
  return source.jsonEntries
    .map((item, index) => ({item, index}))
    .filter(({item}) => item.keyword === keyword && !!item.content)
    .map(({item, index}) => ({
      id: makeHitId([source.fileBaseName, keyword, 'json', String(index)]),
      keyword,
      sourceName: source.sourceName,
      category: normalizeCategory(config),
      title: item.title || keyword,
      content: item.content,
      matchType: 'json' as const,
    }));
}

function resolveTxtHits(
  source: LoadedSource,
  config: KnowledgeSourceConfig,
  keyword: string,
) {
  return source.txtEntries
    .map((entry, index) => ({entry, index}))
    .filter(({entry}) => entry.content.includes(keyword))
    .map(({entry, index}) => ({
      id: makeHitId([source.fileBaseName, keyword, 'txt', String(index)]),
      keyword,
      sourceName: source.sourceName,
      category: normalizeCategory(config),
      title: entry.title,
      content: excerpt(entry.content, keyword),
      matchType: 'txt' as const,
    }));
}

export function resolveClauseRelations(keywords: string[]): RelationHit[] {
  const dedupedKeywords = Array.from(new Set(keywords.map(keyword => keyword.trim()).filter(Boolean)));
  const hits: RelationHit[] = [];

  for (const source of loadedSources) {
    const config: KnowledgeSourceConfig = {
      sourceName: source.sourceName,
      fileBaseName: source.fileBaseName,
      category: source.category,
    };

    for (const keyword of dedupedKeywords) {
      const jsonHits = resolveJsonHits(source, config, keyword);
      if (jsonHits.length > 0) {
        hits.push(...jsonHits);
        continue;
      }

      hits.push(...resolveTxtHits(source, config, keyword));
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
