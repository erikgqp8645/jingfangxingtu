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

type ClauseFieldIssueRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  filePath: string;
  missingFields: string[];
};

type NoKeywordClauseRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  filePath: string;
  contentLength: number;
};

type ClauseKeywordDensityRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  filePath: string;
  keywordCount: number;
  level: 'low' | 'high';
  keywords: string[];
};

type GenericKeywordRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  filePath: string;
  keyword: string;
};

type DuplicateKeywordRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  filePath: string;
  keyword: string;
};

type MissingClauseFileRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  expectedPath: string;
};

type OrphanClauseFileRow = {
  filePath: string;
};

type InvalidClauseJsonRow = {
  filePath: string;
  message: string;
};

type ClauseAuditSummary = {
  books: number;
  configuredClauses: number;
  clauseFiles: number;
  missingClauseFiles: number;
  orphanClauseFiles: number;
  invalidClauseJsonFiles: number;
  fieldIssueClauses: number;
  noKeywordClauses: number;
  lowKeywordDensityClauses: number;
  highKeywordDensityClauses: number;
  genericKeywordHits: number;
  duplicateKeywordHits: number;
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

function toWorkspaceRelative(filePath: string) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
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

function buildSummaryMarkdown(summary: ClauseAuditSummary) {
  return [
    '# 条文体检摘要',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '## 总览',
    '',
    `- 经典数量：${summary.books}`,
    `- 已登记条文数量：${summary.configuredClauses}`,
    `- 条文 JSON 文件数量：${summary.clauseFiles}`,
    `- 缺失条文文件：${summary.missingClauseFiles}`,
    `- 孤儿条文文件：${summary.orphanClauseFiles}`,
    `- 无法解析的条文 JSON：${summary.invalidClauseJsonFiles}`,
    `- 缺字段条文：${summary.fieldIssueClauses}`,
    `- 没有关键词的条文：${summary.noKeywordClauses}`,
    `- 关键词偏少条文：${summary.lowKeywordDensityClauses}`,
    `- 关键词过密条文：${summary.highKeywordDensityClauses}`,
    `- 过泛关键词命中次数：${summary.genericKeywordHits}`,
    `- 重复关键词命中次数：${summary.duplicateKeywordHits}`,
    '',
    '## 建议先做什么',
    '',
    '- 先处理缺文件和 JSON 无法解析的问题。',
    '- 再处理没有关键词的条文。',
    '- 然后处理关键词偏少、过泛、重复的问题。',
    '',
  ].join('\n');
}

function buildListMarkdown(title: string, intro: string, rows: string[]) {
  return [
    `# ${title}`,
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    intro,
    '',
    ...(rows.length > 0 ? rows.map(item => `- ${item}`) : ['- 无']),
    '',
  ].join('\n');
}

function main() {
  const genericKeywords = loadGenericKeywords();
  const bookConfigs = loadJson<BookConfig[]>(path.join(dataDir, 'jingdianconfig.json'));
  const configuredClausePaths = new Set<string>();

  const missingClauseFiles: MissingClauseFileRow[] = [];
  const orphanClauseFiles: OrphanClauseFileRow[] = [];
  const invalidClauseJsonRows: InvalidClauseJsonRow[] = [];
  const fieldIssueRows: ClauseFieldIssueRow[] = [];
  const noKeywordRows: NoKeywordClauseRow[] = [];
  const keywordDensityRows: ClauseKeywordDensityRow[] = [];
  const genericKeywordRows: GenericKeywordRow[] = [];
  const duplicateKeywordRows: DuplicateKeywordRow[] = [];

  let configuredClauses = 0;

  for (const book of bookConfigs) {
    for (const chapter of book.chapters || []) {
      for (const clause of chapter.clauses || []) {
        configuredClauses += 1;

        if (!clause.dataFile) {
          missingClauseFiles.push({
            bookId: book.id,
            bookName: book.name,
            clauseId: clause.id,
            title: clause.title,
            expectedPath: '(未配置 dataFile)',
          });
          continue;
        }

        const clausePath = toAbsoluteDataPath(clause.dataFile);
        configuredClausePaths.add(path.normalize(clausePath));

        if (!existsSync(clausePath) || !statSync(clausePath).isFile()) {
          missingClauseFiles.push({
            bookId: book.id,
            bookName: book.name,
            clauseId: clause.id,
            title: clause.title,
            expectedPath: toWorkspaceRelative(clausePath),
          });
          continue;
        }

        let clauseData: ClauseData;
        try {
          clauseData = loadJson<ClauseData>(clausePath);
        } catch (error) {
          invalidClauseJsonRows.push({
            filePath: toWorkspaceRelative(clausePath),
            message: error instanceof Error ? error.message : '未知错误',
          });
          continue;
        }

        const missingFields = ['id', 'title', 'content', 'translation', 'keywords'].filter(field => clauseData[field as keyof ClauseData] == null);
        if (missingFields.length > 0) {
          fieldIssueRows.push({
            bookId: book.id,
            bookName: book.name,
            clauseId: clause.id,
            title: clauseData.title || clause.title,
            filePath: toWorkspaceRelative(clausePath),
            missingFields,
          });
        }

        const keywords = Array.isArray(clauseData.keywords) ? clauseData.keywords.map(normalizeKeyword).filter(Boolean) : [];
        const contentLength = (clauseData.content || '').trim().length;

        if (keywords.length === 0) {
          noKeywordRows.push({
            bookId: book.id,
            bookName: book.name,
            clauseId: clause.id,
            title: clauseData.title || clause.title,
            filePath: toWorkspaceRelative(clausePath),
            contentLength,
          });
        } else {
          if (keywords.length <= 3) {
            keywordDensityRows.push({
              bookId: book.id,
              bookName: book.name,
              clauseId: clause.id,
              title: clauseData.title || clause.title,
              filePath: toWorkspaceRelative(clausePath),
              keywordCount: keywords.length,
              level: 'low',
              keywords,
            });
          }

          if (keywords.length > 12) {
            keywordDensityRows.push({
              bookId: book.id,
              bookName: book.name,
              clauseId: clause.id,
              title: clauseData.title || clause.title,
              filePath: toWorkspaceRelative(clausePath),
              keywordCount: keywords.length,
              level: 'high',
              keywords,
            });
          }
        }

        const seenKeywords = new Set<string>();
        for (const keyword of keywords) {
          if (genericKeywords.has(keyword)) {
            genericKeywordRows.push({
              bookId: book.id,
              bookName: book.name,
              clauseId: clause.id,
              title: clauseData.title || clause.title,
              filePath: toWorkspaceRelative(clausePath),
              keyword,
            });
          }

          if (seenKeywords.has(keyword)) {
            duplicateKeywordRows.push({
              bookId: book.id,
              bookName: book.name,
              clauseId: clause.id,
              title: clauseData.title || clause.title,
              filePath: toWorkspaceRelative(clausePath),
              keyword,
            });
            continue;
          }

          seenKeywords.add(keyword);
        }
      }
    }
  }

  const allClauseFiles = walkFiles(classicsDir, '.json');
  for (const filePath of allClauseFiles) {
    if (!configuredClausePaths.has(path.normalize(filePath))) {
      orphanClauseFiles.push({
        filePath: toWorkspaceRelative(filePath),
      });
    }
  }

  missingClauseFiles.sort(compareByClause);
  fieldIssueRows.sort(compareByClause);
  noKeywordRows.sort(compareByClause);
  keywordDensityRows.sort(compareByClause);
  genericKeywordRows.sort(compareByClause);
  duplicateKeywordRows.sort(compareByClause);
  invalidClauseJsonRows.sort((a, b) => a.filePath.localeCompare(b.filePath, 'zh-CN'));
  orphanClauseFiles.sort((a, b) => a.filePath.localeCompare(b.filePath, 'zh-CN'));

  const summary: ClauseAuditSummary = {
    books: bookConfigs.length,
    configuredClauses,
    clauseFiles: allClauseFiles.length,
    missingClauseFiles: missingClauseFiles.length,
    orphanClauseFiles: orphanClauseFiles.length,
    invalidClauseJsonFiles: invalidClauseJsonRows.length,
    fieldIssueClauses: fieldIssueRows.length,
    noKeywordClauses: noKeywordRows.length,
    lowKeywordDensityClauses: keywordDensityRows.filter(row => row.level === 'low').length,
    highKeywordDensityClauses: keywordDensityRows.filter(row => row.level === 'high').length,
    genericKeywordHits: genericKeywordRows.length,
    duplicateKeywordHits: duplicateKeywordRows.length,
  };

  mkdirSync(reportsDir, {recursive: true});

  writeJsonReport('clause-audit-summary', summary);
  writeMarkdownReport('clause-audit-summary', buildSummaryMarkdown(summary));

  writeJsonReport('missing-clause-files', missingClauseFiles);
  writeMarkdownReport(
    'missing-clause-files',
    buildListMarkdown(
      '缺失条文文件',
      '这些条文在目录配置里已经登记，但对应文件不存在，或者没有配置 dataFile。',
      missingClauseFiles.map(row => `[${row.bookId}] ${row.clauseId} ${row.title} -> ${row.expectedPath}`),
    ),
  );

  writeJsonReport('orphan-clause-files', orphanClauseFiles);
  writeMarkdownReport(
    'orphan-clause-files',
    buildListMarkdown(
      '孤儿条文文件',
      '这些条文文件存在，但当前经典目录配置里没有登记。',
      orphanClauseFiles.map(row => row.filePath),
    ),
  );

  writeJsonReport('invalid-clause-json', invalidClauseJsonRows);
  writeMarkdownReport(
    'invalid-clause-json',
    buildListMarkdown(
      '无法解析的条文 JSON',
      '这些条文文件存在，但 JSON（数据文件格式）本身无法正确解析。',
      invalidClauseJsonRows.map(row => `${row.filePath} -> ${row.message}`),
    ),
  );

  writeJsonReport('clause-field-issues', fieldIssueRows);
  writeMarkdownReport(
    'clause-field-issues',
    [
      '# 条文字段缺失报告',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些条文文件可以读取，但缺少标准字段。',
      '',
      fieldIssueRows.length > 0
        ? buildMarkdownTable(fieldIssueRows, [
            {key: 'bookId', label: '经典'},
            {key: 'clauseId', label: '条文编号'},
            {key: 'title', label: '标题'},
            {key: 'missingFields', label: '缺失字段'},
            {key: 'filePath', label: '文件路径'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('no-keywords-clauses', noKeywordRows);
  writeMarkdownReport(
    'no-keywords-clauses',
    [
      '# 没有关键词的条文',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些条文目前没有可用于建立关系的关键词，建议优先补充。',
      '',
      noKeywordRows.length > 0
        ? buildMarkdownTable(noKeywordRows, [
            {key: 'bookId', label: '经典'},
            {key: 'clauseId', label: '条文编号'},
            {key: 'title', label: '标题'},
            {key: 'contentLength', label: '原文长度'},
            {key: 'filePath', label: '文件路径'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('clause-keyword-density', keywordDensityRows);
  writeMarkdownReport(
    'clause-keyword-density',
    [
      '# 条文关键词密度异常',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这里统计关键词偏少或过密的条文。',
      '',
      keywordDensityRows.length > 0
        ? buildMarkdownTable(keywordDensityRows.map(row => ({
            ...row,
            keywords: row.keywords.join(' / '),
          })), [
            {key: 'bookId', label: '经典'},
            {key: 'clauseId', label: '条文编号'},
            {key: 'title', label: '标题'},
            {key: 'level', label: '级别'},
            {key: 'keywordCount', label: '关键词数量'},
            {key: 'keywords', label: '关键词'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('generic-keywords', genericKeywordRows);
  writeMarkdownReport(
    'generic-keywords',
    buildListMarkdown(
      '过泛关键词命中',
      '这些关键词过于宽泛，后面容易污染关系结果，建议优先清洗。',
      genericKeywordRows.map(row => `[${row.bookId}] ${row.clauseId} ${row.title} -> ${row.keyword}`),
    ),
  );

  writeJsonReport('duplicate-keywords', duplicateKeywordRows);
  writeMarkdownReport(
    'duplicate-keywords',
    buildListMarkdown(
      '重复关键词命中',
      '这些条文内部出现了重复关键词，建议去重。',
      duplicateKeywordRows.map(row => `[${row.bookId}] ${row.clauseId} ${row.title} -> ${row.keyword}`),
    ),
  );

  console.log('Clause audit completed.');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Reports written to ${reportsDir}`);
}

main();
