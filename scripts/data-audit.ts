import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {rootDir} from './db.ts';

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

type RelationSourceAuditSummary = {
  configuredSources: number;
  jsonFiles: number;
  txtFiles: number;
  healthySources: number;
  txtOnlySources: number;
  jsonOnlySources: number;
  missingAllSources: number;
  orphanJsonFiles: number;
  orphanTxtFiles: number;
  duplicateFileBaseNames: number;
};

type KeywordSummary = {
  totalKeywordOccurrences: number;
  uniqueKeywords: number;
  weakKeywordCount: number;
  lengthIssueCount: number;
  similarKeywordGroups: number;
};

type RelationFragmentSummary = {
  sourcesChecked: number;
  fragmentCount: number;
  duplicateFragmentGroups: number;
  lengthIssueCount: number;
  emptyFragmentCount: number;
  jsonFragmentCount: number;
  txtFragmentCount: number;
};

type AggregateSummary = {
  clause: ClauseAuditSummary;
  clauseRelations: RelationAuditSummary;
  relationSources: RelationSourceAuditSummary;
  keywords: KeywordSummary;
  relationFragments: RelationFragmentSummary;
};

const reportsDir = path.join(rootDir, 'reports');
const docsDir = path.join(rootDir, 'docs');
const aggregateJsonPath = path.join(reportsDir, 'data-audit-summary.json');
const aggregateMdPath = path.join(reportsDir, 'data-audit-summary.md');
const docsAuditReportPath = path.join(docsDir, '当前数据体检报告.md');
const docsPriorityReportPath = path.join(docsDir, '首批优先补充清单.md');

const auditCommands = [
  ['audit:clauses', '条文结构体检'],
  ['audit:clause-relations', '条文关系体检'],
  ['audit:relation-sources', '关联来源体检'],
  ['audit:keywords', '关键词体检'],
  ['audit:relation-fragments', '来源片段体检'],
] as const;

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function readIfExists(filePath: string) {
  return existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
}

function runAuditScript(scriptName: string, label: string) {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args = process.platform === 'win32' ? ['/d', '/s', '/c', `npm run ${scriptName}`] : ['run', scriptName];
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${label} 执行失败：${scriptName}`);
  }
}

function buildAggregateMarkdown(summary: AggregateSummary) {
  return [
    '# 数据体检总摘要',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '## 一、条文层',
    '',
    `- 已登记条文数量：${summary.clause.configuredClauses}`,
    `- 没有关键词的条文：${summary.clause.noKeywordClauses}`,
    `- 关键词偏少条文：${summary.clause.lowKeywordDensityClauses}`,
    `- 缺字段条文：${summary.clause.fieldIssueClauses}`,
    '',
    '## 二、关系层',
    '',
    `- 含关键词条文数量：${summary.clauseRelations.clausesWithKeywords}`,
    `- 零命中条文数量：${summary.clauseRelations.zeroHitClauses}`,
    `- 零命中关键词数量：${summary.clauseRelations.keywordsWithoutHit}`,
    `- JSON 命中总数：${summary.clauseRelations.jsonHitCount}`,
    `- TXT 命中总数：${summary.clauseRelations.txtHitCount}`,
    '',
    '## 三、来源层',
    '',
    `- 已登记来源数量：${summary.relationSources.configuredSources}`,
    `- 健康来源数量：${summary.relationSources.healthySources}`,
    `- TXT-only 来源：${summary.relationSources.txtOnlySources}`,
    `- 孤儿来源文件：${summary.relationSources.orphanJsonFiles + summary.relationSources.orphanTxtFiles}`,
    '',
    '## 四、关键词层',
    '',
    `- 唯一关键词数量：${summary.keywords.uniqueKeywords}`,
    `- 弱关键词数量：${summary.keywords.weakKeywordCount}`,
    `- 长度异常关键词数量：${summary.keywords.lengthIssueCount}`,
    `- 相似关键词候选组数：${summary.keywords.similarKeywordGroups}`,
    '',
    '## 五、来源片段层',
    '',
    `- 片段总数：${summary.relationFragments.fragmentCount}`,
    `- JSON 片段数：${summary.relationFragments.jsonFragmentCount}`,
    `- TXT 片段数：${summary.relationFragments.txtFragmentCount}`,
    `- 长度异常片段数：${summary.relationFragments.lengthIssueCount}`,
    `- 重复片段组数：${summary.relationFragments.duplicateFragmentGroups}`,
    '',
    '## 六、当前最主要的问题',
    '',
    `1. 还没有关键词的条文很多：${summary.clause.noKeywordClauses} 条。`,
    `2. 来源片段过长问题明显：${summary.relationFragments.lengthIssueCount} 条。`,
    `3. 当前命中高度依赖 TXT：TXT ${summary.clauseRelations.txtHitCount}，JSON ${summary.clauseRelations.jsonHitCount}。`,
    '',
    '## 七、建议下一步',
    '',
    '- 先继续补核心条文关键词。',
    '- 再优先把高频命中的 TXT 来源切段并整理成 JSON。',
    '- 最后再进入数据库导入和一致性校验阶段。',
    '',
  ].join('\n');
}

function buildPriorityMarkdown(summary: AggregateSummary) {
  const zeroHitKeywordReport = readIfExists(path.join(reportsDir, 'keywords-without-hit.md'));
  const noKeywordReport = readIfExists(path.join(reportsDir, 'no-keywords-clauses.md'));
  const txtOnlyReport = readIfExists(path.join(reportsDir, 'txt-only-sources.md'));

  const lines = [
    '# 首批优先补充清单',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '## 一、当前优先级判断',
    '',
    `- 没有关键词的条文：${summary.clause.noKeywordClauses}`,
    `- 零命中条文：${summary.clauseRelations.zeroHitClauses}`,
    `- 零命中关键词：${summary.clauseRelations.keywordsWithoutHit}`,
    `- TXT-only 来源：${summary.relationSources.txtOnlySources}`,
    '',
    '## 二、第一优先：先补没有关键词的条文',
    '',
    '建议从 `reports/no-keywords-clauses.md` 开始，优先补核心经典和当前常用条文。',
    '',
    '## 三、第二优先：处理零命中关键词',
    '',
    summary.clauseRelations.keywordsWithoutHit > 0
      ? '当前已经发现零命中关键词，建议优先决定是补来源，还是调整关键词。'
      : '当前没有零命中条文，可暂时不把这一项放在最高优先级。',
    '',
    '## 四、第三优先：整理来源片段',
    '',
    `当前长度异常片段数：${summary.relationFragments.lengthIssueCount}。建议优先处理高频来源里的超长 TXT 片段。`,
    '',
    '## 五、相关报告入口',
    '',
    '- `reports/no-keywords-clauses.md`',
    '- `reports/keywords-without-hit.md`',
    '- `reports/fragment-length-issues.md`',
    '- `reports/relation-source-issues.md`',
    '',
  ];

  if (summary.clauseRelations.keywordsWithoutHit > 0 && zeroHitKeywordReport) {
    lines.push('## 六、零命中关键词报告摘录', '', zeroHitKeywordReport.trim(), '');
  }

  if (summary.relationSources.txtOnlySources > 0 && txtOnlyReport) {
    lines.push('## 七、TXT-only 来源报告摘录', '', txtOnlyReport.trim(), '');
  }

  if (summary.clause.noKeywordClauses > 0 && noKeywordReport) {
    lines.push('## 八、没有关键词条文报告摘录', '', noKeywordReport.trim(), '');
  }

  return lines.join('\n');
}

function main() {
  mkdirSync(reportsDir, {recursive: true});
  mkdirSync(docsDir, {recursive: true});

  for (const [scriptName, label] of auditCommands) {
    runAuditScript(scriptName, label);
  }

  const summary: AggregateSummary = {
    clause: loadJson<ClauseAuditSummary>(path.join(reportsDir, 'clause-audit-summary.json')),
    clauseRelations: loadJson<RelationAuditSummary>(path.join(reportsDir, 'clause-relations-summary.json')),
    relationSources: loadJson<RelationSourceAuditSummary>(path.join(reportsDir, 'relation-sources-summary.json')),
    keywords: loadJson<KeywordSummary>(path.join(reportsDir, 'keyword-summary.json')),
    relationFragments: loadJson<RelationFragmentSummary>(path.join(reportsDir, 'relation-fragments-summary.json')),
  };

  writeFileSync(aggregateJsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  writeFileSync(aggregateMdPath, `${buildAggregateMarkdown(summary)}\n`, 'utf8');
  writeFileSync(docsAuditReportPath, `${buildAggregateMarkdown(summary)}\n`, 'utf8');
  writeFileSync(docsPriorityReportPath, `${buildPriorityMarkdown(summary)}\n`, 'utf8');

  console.log('All audits completed.');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Aggregate report written to ${aggregateMdPath}`);
}

main();
