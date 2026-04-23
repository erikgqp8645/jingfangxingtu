import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {rootDir} from './db.ts';

type ClauseData = {
  id?: string;
  title?: string;
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

type WeakKeywordRow = {
  keyword: string;
  count: number;
  sampleClauseIds: string[];
  suggestedLevel: 'D';
};

type KeywordLengthIssueRow = {
  keyword: string;
  count: number;
  length: number;
  issueType: 'too-short' | 'too-long' | 'too-long-block';
  sampleClauseIds: string[];
};

type SimilarKeywordRow = {
  normalizedCandidate: string;
  keywords: string[];
  totalCount: number;
  sampleClauseIds: string[];
};

type KeywordSummary = {
  totalKeywordOccurrences: number;
  uniqueKeywords: number;
  weakKeywordCount: number;
  lengthIssueCount: number;
  similarKeywordGroups: number;
};

const dataDir = path.join(rootDir, 'data');
const classicsDir = path.join(dataDir, '经典');
const reportsDir = path.join(rootDir, 'reports');
const blacklistPath = path.join(dataDir, 'keyword-blacklist.json');

const defaultGenericKeywords = ['病', '证', '热', '寒', '虚', '实', '人', '者', '时'];

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

function loadGenericKeywords() {
  if (!existsSync(blacklistPath)) {
    return new Set(defaultGenericKeywords);
  }

  try {
    const fileData = loadJson<string[]>(blacklistPath);
    return new Set(fileData.map(normalizeKeyword).filter(Boolean));
  } catch {
    return new Set(defaultGenericKeywords);
  }
}

function similarityKey(keyword: string) {
  return keyword
    .replace(/\s+/g, '')
    .replace(/[、，,。；;：:“”"'‘’（）()《》〈〉【】\[\]·]/g, '')
    .replace(/者$/u, '')
    .replace(/之$/u, '')
    .replace(/不和$/u, '和')
    .trim();
}

function main() {
  const bookConfigs = loadJson<BookConfig[]>(path.join(dataDir, 'jingdianconfig.json'));
  const genericKeywords = loadGenericKeywords();

  const keywordCountMap = new Map<string, number>();
  const keywordClauseMap = new Map<string, Set<string>>();
  const similarityMap = new Map<string, Set<string>>();
  let totalKeywordOccurrences = 0;

  for (const book of bookConfigs) {
    for (const chapter of book.chapters || []) {
      for (const clause of chapter.clauses || []) {
        if (!clause.dataFile) continue;
        const clausePath = toAbsoluteDataPath(clause.dataFile);
        if (!existsSync(clausePath) || !statSync(clausePath).isFile()) continue;

        let clauseData: ClauseData;
        try {
          clauseData = loadJson<ClauseData>(clausePath);
        } catch {
          continue;
        }

        const keywords = Array.isArray(clauseData.keywords) ? clauseData.keywords.map(normalizeKeyword).filter(Boolean) : [];
        for (const keyword of keywords) {
          totalKeywordOccurrences += 1;
          keywordCountMap.set(keyword, (keywordCountMap.get(keyword) || 0) + 1);

          const existingClauses = keywordClauseMap.get(keyword) || new Set<string>();
          existingClauses.add(String(clauseData.id || clause.id));
          keywordClauseMap.set(keyword, existingClauses);

          const key = similarityKey(keyword);
          const existingSimilar = similarityMap.get(key) || new Set<string>();
          existingSimilar.add(keyword);
          similarityMap.set(key, existingSimilar);
        }
      }
    }
  }

  const weakKeywordRows: WeakKeywordRow[] = [];
  const lengthIssueRows: KeywordLengthIssueRow[] = [];
  const similarKeywordRows: SimilarKeywordRow[] = [];

  for (const [keyword, count] of keywordCountMap.entries()) {
    const clauseIds = Array.from(keywordClauseMap.get(keyword) || []).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const keywordLength = [...keyword].length;

    if (genericKeywords.has(keyword)) {
      weakKeywordRows.push({
        keyword,
        count,
        sampleClauseIds: clauseIds.slice(0, 5),
        suggestedLevel: 'D',
      });
    }

    if (keywordLength < 2) {
      lengthIssueRows.push({
        keyword,
        count,
        length: keywordLength,
        issueType: 'too-short',
        sampleClauseIds: clauseIds.slice(0, 5),
      });
    } else if (keywordLength > 30) {
      lengthIssueRows.push({
        keyword,
        count,
        length: keywordLength,
        issueType: 'too-long-block',
        sampleClauseIds: clauseIds.slice(0, 5),
      });
    } else if (keywordLength > 12) {
      lengthIssueRows.push({
        keyword,
        count,
        length: keywordLength,
        issueType: 'too-long',
        sampleClauseIds: clauseIds.slice(0, 5),
      });
    }
  }

  for (const [normalizedCandidate, keywords] of similarityMap.entries()) {
    if (!normalizedCandidate || keywords.size <= 1) continue;

    const sortedKeywords = Array.from(keywords).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    const sampleClauseIds = sortedKeywords.flatMap(keyword => Array.from(keywordClauseMap.get(keyword) || []).slice(0, 3));
    const totalCount = sortedKeywords.reduce((sum, keyword) => sum + (keywordCountMap.get(keyword) || 0), 0);

    similarKeywordRows.push({
      normalizedCandidate,
      keywords: sortedKeywords,
      totalCount,
      sampleClauseIds: Array.from(new Set(sampleClauseIds)).slice(0, 6),
    });
  }

  weakKeywordRows.sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword, 'zh-CN'));
  lengthIssueRows.sort((a, b) => b.length - a.length || b.count - a.count || a.keyword.localeCompare(b.keyword, 'zh-CN'));
  similarKeywordRows.sort((a, b) => b.totalCount - a.totalCount || a.normalizedCandidate.localeCompare(b.normalizedCandidate, 'zh-CN'));

  const summary: KeywordSummary = {
    totalKeywordOccurrences,
    uniqueKeywords: keywordCountMap.size,
    weakKeywordCount: weakKeywordRows.length,
    lengthIssueCount: lengthIssueRows.length,
    similarKeywordGroups: similarKeywordRows.length,
  };

  mkdirSync(reportsDir, {recursive: true});

  writeJsonReport('keyword-summary', summary);
  writeMarkdownReport(
    'keyword-summary',
    [
      '# 关键词体检摘要',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '## 总览',
      '',
      `- 关键词总出现次数：${summary.totalKeywordOccurrences}`,
      `- 唯一关键词数量：${summary.uniqueKeywords}`,
      `- 弱关键词数量：${summary.weakKeywordCount}`,
      `- 长度异常关键词数量：${summary.lengthIssueCount}`,
      `- 相似关键词候选组数：${summary.similarKeywordGroups}`,
      '',
      '## 建议先做什么',
      '',
      '- 先处理高频弱关键词。',
      '- 再处理长度异常关键词。',
      '- 最后人工审核相似关键词候选组。',
      '',
    ].join('\n'),
  );

  writeJsonReport('weak-keywords', weakKeywordRows);
  writeMarkdownReport(
    'weak-keywords',
    [
      '# 弱关键词',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些关键词过于宽泛，后面容易污染关系结果，建议优先清洗。',
      '',
      weakKeywordRows.length > 0
        ? buildMarkdownTable(
            weakKeywordRows.map(row => ({
              ...row,
              sampleClauseIds: row.sampleClauseIds.join(' / '),
            })),
            [
              {key: 'keyword', label: '关键词'},
              {key: 'count', label: '出现次数'},
              {key: 'sampleClauseIds', label: '示例条文'},
              {key: 'suggestedLevel', label: '建议等级'},
            ],
          )
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('keyword-length-issues', lengthIssueRows);
  writeMarkdownReport(
    'keyword-length-issues',
    [
      '# 关键词长度异常',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些关键词长度过短或过长，建议人工复核。',
      '',
      lengthIssueRows.length > 0
        ? buildMarkdownTable(
            lengthIssueRows.map(row => ({
              ...row,
              sampleClauseIds: row.sampleClauseIds.join(' / '),
            })),
            [
              {key: 'keyword', label: '关键词'},
              {key: 'count', label: '出现次数'},
              {key: 'length', label: '长度'},
              {key: 'issueType', label: '问题类型'},
              {key: 'sampleClauseIds', label: '示例条文'},
            ],
          )
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('duplicate-or-similar-keywords', similarKeywordRows);
  writeMarkdownReport(
    'duplicate-or-similar-keywords',
    [
      '# 相似关键词候选组',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些关键词可能属于重复词或近义变体，建议后面进入人工标准化流程。',
      '',
      similarKeywordRows.length > 0
        ? buildMarkdownTable(
            similarKeywordRows.map(row => ({
              ...row,
              keywords: row.keywords.join(' / '),
              sampleClauseIds: row.sampleClauseIds.join(' / '),
            })),
            [
              {key: 'normalizedCandidate', label: '归并候选'},
              {key: 'keywords', label: '关键词组'},
              {key: 'totalCount', label: '总出现次数'},
              {key: 'sampleClauseIds', label: '示例条文'},
            ],
          )
        : '- 无',
      '',
    ].join('\n'),
  );

  console.log('Keyword audit completed.');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Reports written to ${reportsDir}`);
}

main();
