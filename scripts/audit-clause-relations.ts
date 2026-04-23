import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {rootDir} from './db.ts';

type ClauseData = {
  id?: string;
  title?: string;
  content?: string;
  translation?: string;
  keywords?: string[];
};

type ClauseConfig = {
  id: string;
  title: string;
  dataFile?: string | null;
};

type ChapterConfig = {
  title: string;
  clauses: ClauseConfig[];
};

type BookConfig = {
  id: string;
  name: string;
  chapters: ChapterConfig[];
};

type RelationSourceConfig = {
  sourceName: string;
  fileBaseName: string;
  category?: string;
};

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
  hasJson: boolean;
  hasTxt: boolean;
};

type ClauseHitSummaryRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  keywordCount: number;
  hitCount: number;
  jsonHitCount: number;
  txtHitCount: number;
  keywords: string[];
};

type ZeroHitClauseRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  keywords: string[];
};

type KeywordWithoutHitRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  keyword: string;
};

type RelationAuditSummary = {
  books: number;
  configuredClauses: number;
  relationSources: number;
  clausesWithKeywords: number;
  clausesWithHits: number;
  zeroHitClauses: number;
  keywordsChecked: number;
  keywordsWithoutHit: number;
  jsonHitCount: number;
  txtHitCount: number;
};

const dataDir = path.join(rootDir, 'data');
const classicsDir = path.join(dataDir, '经典');
const relationsDir = path.join(dataDir, '关联解析');
const reportsDir = path.join(rootDir, 'reports');

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function toAbsoluteDataPath(dataFile: string) {
  const rel = dataFile.startsWith('/data/') ? dataFile.slice('/data/'.length) : dataFile;
  return path.join(dataDir, rel);
}

function walkFiles(dirPath: string, ext: string, bucket: string[] = []) {
  if (!existsSync(dirPath)) return bucket;

  for (const entry of readdirSync(dirPath, {withFileTypes: true})) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, ext, bucket);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(ext)) {
      bucket.push(fullPath);
    }
  }

  return bucket;
}

function extractSortValue(clauseId: string) {
  const digits = clauseId.match(/\d+/g);
  if (!digits || digits.length === 0) return Number.MAX_SAFE_INTEGER;
  return Number(digits.join(''));
}

function compareByClause(a: {bookId: string; clauseId: string}, b: {bookId: string; clauseId: string}) {
  const bookDelta = a.bookId.localeCompare(b.bookId, 'zh-CN');
  if (bookDelta !== 0) return bookDelta;
  return extractSortValue(a.clauseId) - extractSortValue(b.clauseId);
}

function buildMarkdownTable<T extends Record<string, unknown>>(rows: T[], columns: Array<{key: keyof T; label: string}>) {
  const lines = [
    `| ${columns.map(column => column.label).join(' | ')} |`,
    `| ${columns.map(() => '---').join(' | ')} |`,
  ];

  for (const row of rows) {
    lines.push(`| ${columns.map(column => String(row[column.key] ?? '')).join(' | ')} |`);
  }

  return lines.join('\n');
}

function writeJsonReport(name: string, data: unknown) {
  writeFileSync(path.join(reportsDir, `${name}.json`), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function writeMarkdownReport(name: string, content: string) {
  writeFileSync(path.join(reportsDir, `${name}.md`), `${content.trimEnd()}\n`, 'utf8');
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
        keyword: normalizeKeyword(keyword),
      });
    });
  });

  return entries;
}

function loadSources(configs: RelationSourceConfig[]) {
  const sources: LoadedSource[] = [];

  for (const config of configs) {
    const jsonPath = path.join(relationsDir, `${config.fileBaseName}.json`);
    const txtPath = path.join(relationsDir, `${config.fileBaseName}.txt`);
    const hasJson = existsSync(jsonPath) && statSync(jsonPath).isFile();
    const hasTxt = existsSync(txtPath) && statSync(txtPath).isFile();

    let jsonEntries: LoadedEntry[] = [];
    let txtEntries: LoadedEntry[] = [];

    if (hasJson) {
      try {
        const jsonMap = loadJson<Record<string, StructuredEntry[]>>(jsonPath);
        jsonEntries = buildJsonEntries(jsonMap);
      } catch {
        jsonEntries = [];
      }
    }

    if (hasTxt) {
      try {
        txtEntries = parseTxtEntries(readFileSync(txtPath, 'utf8'));
      } catch {
        txtEntries = [];
      }
    }

    sources.push({
      sourceName: config.sourceName,
      fileBaseName: config.fileBaseName,
      category: config.category,
      jsonEntries,
      txtEntries,
      hasJson,
      hasTxt,
    });
  }

  return sources;
}

function resolveKeywordHits(sources: LoadedSource[], keyword: string) {
  let jsonHitCount = 0;
  let txtHitCount = 0;

  for (const source of sources) {
    const jsonHits = source.jsonEntries.filter(item => item.keyword === keyword && item.content);
    if (jsonHits.length > 0) {
      jsonHitCount += jsonHits.length;
      continue;
    }

    const txtHits = source.txtEntries.filter(item => item.content.includes(keyword));
    txtHitCount += txtHits.length;
  }

  return {
    total: jsonHitCount + txtHitCount,
    jsonHitCount,
    txtHitCount,
  };
}

function buildSummaryMarkdown(summary: RelationAuditSummary) {
  return [
    '# 条文关系体检摘要',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '## 总览',
    '',
    `- 经典数量：${summary.books}`,
    `- 已登记条文数量：${summary.configuredClauses}`,
    `- 已登记关联来源：${summary.relationSources}`,
    `- 含关键词条文数量：${summary.clausesWithKeywords}`,
    `- 有关系命中的条文数量：${summary.clausesWithHits}`,
    `- 零命中条文数量：${summary.zeroHitClauses}`,
    `- 已检查关键词数量：${summary.keywordsChecked}`,
    `- 零命中关键词数量：${summary.keywordsWithoutHit}`,
    `- JSON 命中总数：${summary.jsonHitCount}`,
    `- TXT 命中总数：${summary.txtHitCount}`,
    '',
    '## 建议先做什么',
    '',
    '- 先处理“有关键词但零命中”的条文。',
    '- 再处理“单个关键词没有命中”的条文关键词。',
    '- 优先把高频依赖 TXT 的来源整理成 JSON。',
    '',
  ].join('\n');
}

function main() {
  const bookConfigs = loadJson<BookConfig[]>(path.join(dataDir, 'jingdianconfig.json'));
  const relationConfigs = loadJson<RelationSourceConfig[]>(path.join(dataDir, 'guanlianjiexiconfig.json'));
  const sources = loadSources(relationConfigs);

  const clauseHitSummaryRows: ClauseHitSummaryRow[] = [];
  const zeroHitClauseRows: ZeroHitClauseRow[] = [];
  const keywordWithoutHitRows: KeywordWithoutHitRow[] = [];

  let configuredClauses = 0;
  let clausesWithKeywords = 0;
  let clausesWithHits = 0;
  let keywordsChecked = 0;
  let jsonHitCount = 0;
  let txtHitCount = 0;

  for (const book of bookConfigs) {
    for (const chapter of book.chapters || []) {
      for (const clause of chapter.clauses || []) {
        configuredClauses += 1;
        if (!clause.dataFile) continue;

        const clausePath = toAbsoluteDataPath(clause.dataFile);
        if (!existsSync(clausePath) || !statSync(clausePath).isFile()) continue;

        let clauseData: ClauseData;
        try {
          clauseData = loadJson<ClauseData>(clausePath);
        } catch {
          continue;
        }

        const keywords = Array.isArray(clauseData.keywords) ? Array.from(new Set(clauseData.keywords.map(normalizeKeyword).filter(Boolean))) : [];
        if (keywords.length === 0) continue;

        clausesWithKeywords += 1;
        keywordsChecked += keywords.length;

        let clauseJsonHits = 0;
        let clauseTxtHits = 0;

        for (const keyword of keywords) {
          const keywordHits = resolveKeywordHits(sources, keyword);
          clauseJsonHits += keywordHits.jsonHitCount;
          clauseTxtHits += keywordHits.txtHitCount;

          if (keywordHits.total === 0) {
            keywordWithoutHitRows.push({
              bookId: book.id,
              bookName: book.name,
              clauseId: clause.id,
              title: clauseData.title || clause.title,
              keyword,
            });
          }
        }

        const totalHits = clauseJsonHits + clauseTxtHits;
        if (totalHits > 0) {
          clausesWithHits += 1;
        } else {
          zeroHitClauseRows.push({
            bookId: book.id,
            bookName: book.name,
            clauseId: clause.id,
            title: clauseData.title || clause.title,
            keywords,
          });
        }

        jsonHitCount += clauseJsonHits;
        txtHitCount += clauseTxtHits;

        clauseHitSummaryRows.push({
          bookId: book.id,
          bookName: book.name,
          clauseId: clause.id,
          title: clauseData.title || clause.title,
          keywordCount: keywords.length,
          hitCount: totalHits,
          jsonHitCount: clauseJsonHits,
          txtHitCount: clauseTxtHits,
          keywords,
        });
      }
    }
  }

  clauseHitSummaryRows.sort(compareByClause);
  zeroHitClauseRows.sort(compareByClause);
  keywordWithoutHitRows.sort(compareByClause);

  const summary: RelationAuditSummary = {
    books: bookConfigs.length,
    configuredClauses,
    relationSources: relationConfigs.length,
    clausesWithKeywords,
    clausesWithHits,
    zeroHitClauses: zeroHitClauseRows.length,
    keywordsChecked,
    keywordsWithoutHit: keywordWithoutHitRows.length,
    jsonHitCount,
    txtHitCount,
  };

  mkdirSync(reportsDir, {recursive: true});

  writeJsonReport('clause-relations-summary', summary);
  writeMarkdownReport('clause-relations-summary', buildSummaryMarkdown(summary));

  writeJsonReport('clause-hit-summary', clauseHitSummaryRows);
  writeMarkdownReport(
    'clause-hit-summary',
    [
      '# 条文命中汇总',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这份报告统计每条已有关键词的条文，到当前来源数据里能命中多少结果。',
      '',
      clauseHitSummaryRows.length > 0
        ? buildMarkdownTable(
            clauseHitSummaryRows.map(row => ({
              ...row,
              keywords: row.keywords.join(' / '),
            })),
            [
              {key: 'bookId', label: '经典'},
              {key: 'clauseId', label: '条文编号'},
              {key: 'title', label: '标题'},
              {key: 'keywordCount', label: '关键词数'},
              {key: 'hitCount', label: '总命中'},
              {key: 'jsonHitCount', label: 'JSON 命中'},
              {key: 'txtHitCount', label: 'TXT 命中'},
              {key: 'keywords', label: '关键词'},
            ],
          )
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('zero-hit-clauses', zeroHitClauseRows);
  writeMarkdownReport(
    'zero-hit-clauses',
    [
      '# 零命中条文',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些条文已经有关键词，但当前没有建立任何来源命中关系，建议优先处理。',
      '',
      zeroHitClauseRows.length > 0
        ? buildMarkdownTable(
            zeroHitClauseRows.map(row => ({
              ...row,
              keywords: row.keywords.join(' / '),
            })),
            [
              {key: 'bookId', label: '经典'},
              {key: 'clauseId', label: '条文编号'},
              {key: 'title', label: '标题'},
              {key: 'keywords', label: '关键词'},
            ],
          )
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('keywords-without-hit', keywordWithoutHitRows);
  writeMarkdownReport(
    'keywords-without-hit',
    [
      '# 零命中关键词',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些关键词在当前来源数据中完全没有命中，后面可以据此决定是补来源，还是修关键词。',
      '',
      keywordWithoutHitRows.length > 0
        ? buildMarkdownTable(keywordWithoutHitRows, [
            {key: 'bookId', label: '经典'},
            {key: 'clauseId', label: '条文编号'},
            {key: 'title', label: '标题'},
            {key: 'keyword', label: '零命中关键词'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  console.log('Clause relation audit completed.');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Reports written to ${reportsDir}`);
}

main();
