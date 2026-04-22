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

type AuditIssueType =
  | 'missing-clause-file'
  | 'orphan-clause-file'
  | 'invalid-clause-json'
  | 'missing-clause-field'
  | 'empty-keywords'
  | 'duplicate-keyword'
  | 'generic-keyword'
  | 'keyword-without-hit'
  | 'missing-relation-file'
  | 'orphan-relation-file'
  | 'invalid-relation-json'
  | 'relation-json-empty'
  | 'relation-only-txt';

type AuditIssue = {
  type: AuditIssueType;
  message: string;
};

type ClauseAuditRow = {
  bookId: string;
  bookName: string;
  clauseId: string;
  title: string;
  filePath: string;
  keywords: string[];
};

type KeywordGapRow = {
  clauseId: string;
  keyword: string;
  bookId: string;
  bookName: string;
  title: string;
};

const dataDir = path.join(rootDir, 'data');
const classicsDir = path.join(dataDir, '经典');
const relationsDir = path.join(dataDir, '关联解析');
const docsDir = path.join(rootDir, 'docs');
const auditReportPath = path.join(docsDir, '当前数据体检报告.md');
const priorityReportPath = path.join(docsDir, '首批优先补充清单.md');
const blacklistPath = path.join(dataDir, 'keyword-blacklist.json');

const defaultGenericKeywords = ['病', '证', '热', '寒', '虚', '实', '人', '者', '时'];
const bookPriority: Record<string, number> = {
  shanghan: 1,
  jingui: 2,
  wenbing: 3,
};

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, ' ');
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

function toAbsoluteDataPath(dataFile: string) {
  const rel = dataFile.startsWith('/data/') ? dataFile.slice('/data/'.length) : dataFile;
  return path.join(dataDir, rel);
}

function toWorkspaceRelative(filePath: string) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function parseRelationJsonKeywords(filePath: string) {
  const relationMap = loadJson<Record<string, Array<{title?: string; content?: string}>>>(filePath);
  const keywords = new Set<string>();
  let entryCount = 0;

  for (const [keyword, items] of Object.entries(relationMap)) {
    const normalized = normalizeKeyword(keyword);
    if (normalized) {
      keywords.add(normalized);
    }

    for (const item of items || []) {
      if ((item?.content || '').trim()) {
        entryCount += 1;
      }
    }
  }

  return {keywords, entryCount};
}

function buildTxtKeywordMatcher(filePath: string) {
  const content = readFileSync(filePath, 'utf8');
  return (keyword: string) => content.includes(keyword);
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

function compareClauseRows(a: ClauseAuditRow, b: ClauseAuditRow) {
  const bookDelta = (bookPriority[a.bookId] ?? 99) - (bookPriority[b.bookId] ?? 99);
  if (bookDelta !== 0) return bookDelta;
  return extractSortValue(a.clauseId) - extractSortValue(b.clauseId);
}

function compareKeywordGapRows(a: KeywordGapRow, b: KeywordGapRow) {
  const bookDelta = (bookPriority[a.bookId] ?? 99) - (bookPriority[b.bookId] ?? 99);
  if (bookDelta !== 0) return bookDelta;

  const clauseDelta = extractSortValue(a.clauseId) - extractSortValue(b.clauseId);
  if (clauseDelta !== 0) return clauseDelta;

  return a.keyword.localeCompare(b.keyword, 'zh-CN');
}

function createIssueGroups(issues: AuditIssue[]) {
  return [
    {
      title: '条文文件缺失',
      items: issues.filter(item => item.type === 'missing-clause-file'),
    },
    {
      title: '条文文件孤儿项',
      items: issues.filter(item => item.type === 'orphan-clause-file'),
    },
    {
      title: '条文 JSON 问题',
      items: issues.filter(item => item.type === 'invalid-clause-json' || item.type === 'missing-clause-field'),
    },
    {
      title: '关键词问题',
      items: issues.filter(item =>
        ['empty-keywords', 'duplicate-keyword', 'generic-keyword', 'keyword-without-hit'].includes(item.type),
      ),
    },
    {
      title: '关联解析问题',
      items: issues.filter(item =>
        ['missing-relation-file', 'orphan-relation-file', 'invalid-relation-json', 'relation-json-empty', 'relation-only-txt'].includes(item.type),
      ),
    },
  ];
}

function buildAuditReport(params: {
  summary: {
    books: number;
    configuredClauses: number;
    configuredRelationSources: number;
    allClauseFiles: number;
    totalIssues: number;
    emptyKeywordClauses: number;
    keywordsWithoutHit: number;
    genericKeywords: number;
    relationOnlyTxt: number;
  };
  issues: AuditIssue[];
}) {
  const {summary, issues} = params;
  const lines: string[] = [
    '# 当前数据体检报告',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '## 一、总体概况',
    '',
    `- 经典数量：${summary.books}`,
    `- 已登记条文数量：${summary.configuredClauses}`,
    `- 条文 JSON 文件数量：${summary.allClauseFiles}`,
    `- 已登记关联解析来源：${summary.configuredRelationSources}`,
    `- 发现问题总数：${summary.totalIssues}`,
    '',
    '## 二、重点指标',
    '',
    `- 没有关键词的条文：${summary.emptyKeywordClauses}`,
    `- 没有任何关联命中的关键词：${summary.keywordsWithoutHit}`,
    `- 过泛关键词数量：${summary.genericKeywords}`,
    `- 只有 TXT 的关联解析来源：${summary.relationOnlyTxt}`,
    '',
    '## 三、问题明细',
    '',
  ];

  for (const group of createIssueGroups(issues)) {
    lines.push(`### ${group.title}`, '');
    if (group.items.length === 0) {
      lines.push('- 无', '');
      continue;
    }

    for (const item of group.items) {
      lines.push(`- ${item.message}`);
    }
    lines.push('');
  }

  lines.push('## 四、建议下一步', '');

  if (summary.emptyKeywordClauses > 0) {
    lines.push('- 先补没有关键词的条文，优先补《伤寒论》前段核心条文。');
  }
  if (summary.keywordsWithoutHit > 0) {
    lines.push('- 针对没有命中的关键词，优先补关联解析 JSON；暂时来不及也至少保证 TXT 原文中能搜到。');
  }
  if (summary.relationOnlyTxt > 0) {
    lines.push('- 把仍然只有 TXT 的解析来源逐步整理成 JSON，便于后续精确命中。');
  }
  if (summary.genericKeywords > 0) {
    lines.push('- 清理过泛关键词，尽量改成更具体的症状词、证候词、脉象词、方名词。');
  }
  if (lines[lines.length - 1] === '') {
    lines.push('- 当前未发现明显问题，可以继续进入数据扩充阶段。');
  }

  return `${lines.join('\n')}\n`;
}

function buildPriorityReport(params: {
  clauseRows: ClauseAuditRow[];
  keywordGapRows: KeywordGapRow[];
  relationOnlyTxtSources: string[];
}) {
  const missingKeywordRows = params.clauseRows.filter(row => row.keywords.length === 0).sort(compareClauseRows);
  const keywordGapRows = [...params.keywordGapRows].sort(compareKeywordGapRows);
  const lines: string[] = [
    '# 首批优先补充清单',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '## 一、使用原则',
    '',
    '- 先补核心经典，再补扩展经典。',
    '- 先补“没有关键词”的条文，再补“关键词有但没有关联命中”的条文。',
    '- 每补完一小批，就重新运行一次 `npm run data:audit`，确认数量是否下降。',
    '',
    '## 二、第一优先：没有关键词的核心条文',
    '',
    '建议先从下面这些条文开始补，每条先补 3 到 8 个关键词即可，不要求一步到位。',
    '',
  ];

  const topMissing = missingKeywordRows.slice(0, 60);
  if (topMissing.length === 0) {
    lines.push('- 暂无');
  } else {
    for (const row of topMissing) {
      lines.push(`- [${row.bookId}] ${row.clauseId} ${row.title}`);
    }
  }

  lines.push('', '## 三、第二优先：已有关键词但没有关联命中', '');

  if (keywordGapRows.length === 0) {
    lines.push('- 暂无');
  } else {
    for (const row of keywordGapRows) {
      lines.push(`- [${row.bookId}] ${row.clauseId} ${row.title} -> ${row.keyword}`);
    }
  }

  lines.push('', '## 四、第三优先：优先整理为 JSON 的关联解析来源', '');

  if (params.relationOnlyTxtSources.length === 0) {
    lines.push('- 暂无');
  } else {
    for (const fileBaseName of params.relationOnlyTxtSources) {
      lines.push(`- ${fileBaseName}`);
    }
  }

  lines.push('', '## 五、建议补词顺序', '');
  lines.push('- 第一步：打开条文 JSON，先补最核心的症状词。');
  lines.push('- 第二步：补脉象词、部位词、病机词、方名词。');
  lines.push('- 第三步：运行 `npm run data:audit`，看是否还有“没有命中”的关键词。');
  lines.push('- 第四步：如果关键词没有命中，再去补对应的关联解析 JSON。');

  return `${lines.join('\n')}\n`;
}

function main() {
  const genericKeywords = loadGenericKeywords();
  const issues: AuditIssue[] = [];
  const bookConfigs = loadJson<BookConfig[]>(path.join(dataDir, 'jingdianconfig.json'));
  const relationConfigs = loadJson<RelationSourceConfig[]>(path.join(dataDir, 'guanlianjiexiconfig.json'));
  const configuredClausePaths = new Set<string>();
  const clauseRows: ClauseAuditRow[] = [];
  const keywordGapRows: KeywordGapRow[] = [];
  const relationOnlyTxtSources: string[] = [];

  for (const book of bookConfigs) {
    for (const chapter of book.chapters || []) {
      for (const clause of chapter.clauses || []) {
        if (!clause.dataFile) {
          issues.push({
            type: 'missing-clause-file',
            message: `经典 ${book.id} 的条文 ${clause.id} 没有 dataFile 配置`,
          });
          continue;
        }

        const clausePath = toAbsoluteDataPath(clause.dataFile);
        configuredClausePaths.add(path.normalize(clausePath));

        if (!existsSync(clausePath) || !statSync(clausePath).isFile()) {
          issues.push({
            type: 'missing-clause-file',
            message: `条文文件不存在：${toWorkspaceRelative(clausePath)}（配置条文 ${clause.id}）`,
          });
          continue;
        }

        let clauseData: ClauseData;
        try {
          clauseData = loadJson<ClauseData>(clausePath);
        } catch (error) {
          issues.push({
            type: 'invalid-clause-json',
            message: `条文 JSON 无法解析：${toWorkspaceRelative(clausePath)}（${error instanceof Error ? error.message : '未知错误'}）`,
          });
          continue;
        }

        const missingFields = ['id', 'title', 'content', 'translation', 'keywords'].filter(field => clauseData[field as keyof ClauseData] == null);
        if (missingFields.length > 0) {
          issues.push({
            type: 'missing-clause-field',
            message: `条文文件缺少字段：${toWorkspaceRelative(clausePath)} -> ${missingFields.join(', ')}`,
          });
        }

        const keywords = Array.isArray(clauseData.keywords) ? clauseData.keywords.map(normalizeKeyword).filter(Boolean) : [];
        if (keywords.length === 0) {
          issues.push({
            type: 'empty-keywords',
            message: `条文没有关键词：${clause.id} ${clauseData.title || clause.title}`,
          });
        }

        const seenKeywords = new Set<string>();
        for (const keyword of keywords) {
          if (seenKeywords.has(keyword)) {
            issues.push({
              type: 'duplicate-keyword',
              message: `条文存在重复关键词：${clause.id} -> ${keyword}`,
            });
          }
          seenKeywords.add(keyword);

          if (genericKeywords.has(keyword)) {
            issues.push({
              type: 'generic-keyword',
              message: `条文包含过泛关键词：${clause.id} -> ${keyword}`,
            });
          }
        }

        clauseRows.push({
          bookId: book.id,
          bookName: book.name,
          clauseId: clause.id,
          title: clauseData.title || clause.title,
          filePath: clausePath,
          keywords,
        });
      }
    }
  }

  const allClauseFiles = walkFiles(classicsDir, '.json');
  for (const filePath of allClauseFiles) {
    if (!configuredClausePaths.has(path.normalize(filePath))) {
      issues.push({
        type: 'orphan-clause-file',
        message: `条文文件存在但目录未登记：${toWorkspaceRelative(filePath)}`,
      });
    }
  }

  const relationKeywordSet = new Set<string>();
  const txtMatchers = new Map<string, (keyword: string) => boolean>();
  const configuredRelationBaseNames = new Set(relationConfigs.map(item => item.fileBaseName));

  for (const config of relationConfigs) {
    const jsonPath = path.join(relationsDir, `${config.fileBaseName}.json`);
    const txtPath = path.join(relationsDir, `${config.fileBaseName}.txt`);
    const hasJson = existsSync(jsonPath) && statSync(jsonPath).isFile();
    const hasTxt = existsSync(txtPath) && statSync(txtPath).isFile();

    if (!hasJson && !hasTxt) {
      issues.push({
        type: 'missing-relation-file',
        message: `关联解析来源未找到文件：${config.fileBaseName}`,
      });
      continue;
    }

    if (hasJson) {
      try {
        const {keywords, entryCount} = parseRelationJsonKeywords(jsonPath);
        keywords.forEach(keyword => relationKeywordSet.add(keyword));
        if (entryCount === 0) {
          issues.push({
            type: 'relation-json-empty',
            message: `关联解析 JSON 没有有效内容：${toWorkspaceRelative(jsonPath)}`,
          });
        }
      } catch (error) {
        issues.push({
          type: 'invalid-relation-json',
          message: `关联解析 JSON 无法解析：${toWorkspaceRelative(jsonPath)}（${error instanceof Error ? error.message : '未知错误'}）`,
        });
      }
    }

    if (hasTxt) {
      txtMatchers.set(config.fileBaseName, buildTxtKeywordMatcher(txtPath));
      if (!hasJson) {
        relationOnlyTxtSources.push(config.fileBaseName);
        issues.push({
          type: 'relation-only-txt',
          message: `关联解析来源只有 TXT，建议逐步整理成 JSON：${config.fileBaseName}`,
        });
      }
    }
  }

  for (const relationFile of walkFiles(relationsDir, '.json').concat(walkFiles(relationsDir, '.txt'))) {
    const baseName = path.basename(relationFile, path.extname(relationFile));
    if (!configuredRelationBaseNames.has(baseName)) {
      issues.push({
        type: 'orphan-relation-file',
        message: `关联解析文件存在但配置未登记：${toWorkspaceRelative(relationFile)}`,
      });
    }
  }

  for (const row of clauseRows) {
    for (const keyword of row.keywords) {
      if (relationKeywordSet.has(keyword)) continue;

      let matchedInTxt = false;
      for (const matcher of txtMatchers.values()) {
        if (matcher(keyword)) {
          matchedInTxt = true;
          break;
        }
      }

      if (!matchedInTxt) {
        issues.push({
          type: 'keyword-without-hit',
          message: `关键词没有任何关联命中：${row.clauseId} -> ${keyword}`,
        });
        keywordGapRows.push({
          clauseId: row.clauseId,
          keyword,
          bookId: row.bookId,
          bookName: row.bookName,
          title: row.title,
        });
      }
    }
  }

  const summary = {
    books: bookConfigs.length,
    configuredClauses: clauseRows.length,
    configuredRelationSources: relationConfigs.length,
    allClauseFiles: allClauseFiles.length,
    totalIssues: issues.length,
    emptyKeywordClauses: issues.filter(item => item.type === 'empty-keywords').length,
    keywordsWithoutHit: issues.filter(item => item.type === 'keyword-without-hit').length,
    genericKeywords: issues.filter(item => item.type === 'generic-keyword').length,
    relationOnlyTxt: issues.filter(item => item.type === 'relation-only-txt').length,
  };

  mkdirSync(docsDir, {recursive: true});
  writeFileSync(auditReportPath, buildAuditReport({summary, issues}), 'utf8');
  writeFileSync(
    priorityReportPath,
    buildPriorityReport({
      clauseRows,
      keywordGapRows,
      relationOnlyTxtSources: [...new Set(relationOnlyTxtSources)],
    }),
    'utf8',
  );

  console.log('Data audit completed.');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Audit report written to ${auditReportPath}`);
  console.log(`Priority report written to ${priorityReportPath}`);
}

main();
