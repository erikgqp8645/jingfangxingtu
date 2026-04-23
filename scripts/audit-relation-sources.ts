import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {rootDir} from './db.ts';

type RelationSourceConfig = {
  sourceName: string;
  fileBaseName: string;
  category?: string;
};

type RegisteredSourceRow = {
  sourceName: string;
  fileBaseName: string;
  category: string;
  jsonExists: boolean;
  txtExists: boolean;
  status: 'ok' | 'json-only' | 'txt-only' | 'missing-all';
};

type RelationSourceIssueRow = {
  type:
    | 'missing-all'
    | 'missing-json'
    | 'missing-txt'
    | 'orphan-json'
    | 'orphan-txt'
    | 'duplicate-file-base-name';
  sourceName?: string;
  fileBaseName: string;
  filePath?: string;
  message: string;
};

type TxtOnlySourceRow = {
  sourceName: string;
  fileBaseName: string;
  category: string;
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

const dataDir = path.join(rootDir, 'data');
const relationsDir = path.join(dataDir, '关联解析');
const reportsDir = path.join(rootDir, 'reports');

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function toWorkspaceRelative(filePath: string) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
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

function buildSummaryMarkdown(summary: RelationSourceAuditSummary) {
  return [
    '# 关联来源体检摘要',
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '## 总览',
    '',
    `- 已登记来源数量：${summary.configuredSources}`,
    `- JSON 文件数量：${summary.jsonFiles}`,
    `- TXT 文件数量：${summary.txtFiles}`,
    `- 双文件齐全来源：${summary.healthySources}`,
    `- 只有 TXT 的来源：${summary.txtOnlySources}`,
    `- 只有 JSON 的来源：${summary.jsonOnlySources}`,
    `- 两种文件都缺失的来源：${summary.missingAllSources}`,
    `- 孤儿 JSON 文件：${summary.orphanJsonFiles}`,
    `- 孤儿 TXT 文件：${summary.orphanTxtFiles}`,
    `- 重复 fileBaseName：${summary.duplicateFileBaseNames}`,
    '',
    '## 建议先做什么',
    '',
    '- 先修复两种文件都缺失的来源配置。',
    '- 再处理只有 TXT、没有 JSON 的来源。',
    '- 最后清理目录里没有登记的孤儿文件。',
    '',
  ].join('\n');
}

function main() {
  const configs = loadJson<RelationSourceConfig[]>(path.join(dataDir, 'guanlianjiexiconfig.json'));

  const configCountMap = new Map<string, number>();
  for (const config of configs) {
    configCountMap.set(config.fileBaseName, (configCountMap.get(config.fileBaseName) || 0) + 1);
  }

  const registeredRows: RegisteredSourceRow[] = [];
  const txtOnlyRows: TxtOnlySourceRow[] = [];
  const issueRows: RelationSourceIssueRow[] = [];

  for (const config of configs) {
    const jsonPath = path.join(relationsDir, `${config.fileBaseName}.json`);
    const txtPath = path.join(relationsDir, `${config.fileBaseName}.txt`);
    const jsonExists = existsSync(jsonPath) && statSync(jsonPath).isFile();
    const txtExists = existsSync(txtPath) && statSync(txtPath).isFile();

    let status: RegisteredSourceRow['status'] = 'ok';
    if (jsonExists && txtExists) {
      status = 'ok';
    } else if (!jsonExists && txtExists) {
      status = 'txt-only';
    } else if (jsonExists && !txtExists) {
      status = 'json-only';
    } else {
      status = 'missing-all';
    }

    registeredRows.push({
      sourceName: config.sourceName,
      fileBaseName: config.fileBaseName,
      category: config.category || '',
      jsonExists,
      txtExists,
      status,
    });

    if (configCountMap.get(config.fileBaseName)! > 1) {
      issueRows.push({
        type: 'duplicate-file-base-name',
        sourceName: config.sourceName,
        fileBaseName: config.fileBaseName,
        message: `来源配置里出现重复 fileBaseName：${config.fileBaseName}`,
      });
    }

    if (!jsonExists && !txtExists) {
      issueRows.push({
        type: 'missing-all',
        sourceName: config.sourceName,
        fileBaseName: config.fileBaseName,
        message: `来源已登记，但 JSON 和 TXT 都不存在：${config.fileBaseName}`,
      });
      continue;
    }

    if (!jsonExists && txtExists) {
      txtOnlyRows.push({
        sourceName: config.sourceName,
        fileBaseName: config.fileBaseName,
        category: config.category || '',
      });
      issueRows.push({
        type: 'missing-json',
        sourceName: config.sourceName,
        fileBaseName: config.fileBaseName,
        filePath: toWorkspaceRelative(txtPath),
        message: `来源只有 TXT，没有 JSON：${config.fileBaseName}`,
      });
    }

    if (jsonExists && !txtExists) {
      issueRows.push({
        type: 'missing-txt',
        sourceName: config.sourceName,
        fileBaseName: config.fileBaseName,
        filePath: toWorkspaceRelative(jsonPath),
        message: `来源只有 JSON，没有 TXT：${config.fileBaseName}`,
      });
    }
  }

  const relationFiles = existsSync(relationsDir) ? readdirSync(relationsDir, {withFileTypes: true}) : [];
  const registeredBaseNames = new Set(configs.map(item => item.fileBaseName));
  let jsonFiles = 0;
  let txtFiles = 0;

  for (const entry of relationFiles) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.json' && ext !== '.txt') continue;

    const baseName = path.basename(entry.name, ext);
    const fullPath = path.join(relationsDir, entry.name);

    if (ext === '.json') jsonFiles += 1;
    if (ext === '.txt') txtFiles += 1;

    if (!registeredBaseNames.has(baseName)) {
      issueRows.push({
        type: ext === '.json' ? 'orphan-json' : 'orphan-txt',
        fileBaseName: baseName,
        filePath: toWorkspaceRelative(fullPath),
        message: `来源文件存在但未登记：${toWorkspaceRelative(fullPath)}`,
      });
    }
  }

  registeredRows.sort((a, b) => a.fileBaseName.localeCompare(b.fileBaseName, 'zh-CN'));
  txtOnlyRows.sort((a, b) => a.fileBaseName.localeCompare(b.fileBaseName, 'zh-CN'));
  issueRows.sort((a, b) => (a.fileBaseName + a.type).localeCompare(b.fileBaseName + b.type, 'zh-CN'));

  const summary: RelationSourceAuditSummary = {
    configuredSources: configs.length,
    jsonFiles,
    txtFiles,
    healthySources: registeredRows.filter(row => row.status === 'ok').length,
    txtOnlySources: registeredRows.filter(row => row.status === 'txt-only').length,
    jsonOnlySources: registeredRows.filter(row => row.status === 'json-only').length,
    missingAllSources: registeredRows.filter(row => row.status === 'missing-all').length,
    orphanJsonFiles: issueRows.filter(row => row.type === 'orphan-json').length,
    orphanTxtFiles: issueRows.filter(row => row.type === 'orphan-txt').length,
    duplicateFileBaseNames: issueRows.filter(row => row.type === 'duplicate-file-base-name').length,
  };

  mkdirSync(reportsDir, {recursive: true});

  writeJsonReport('relation-sources-summary', summary);
  writeMarkdownReport('relation-sources-summary', buildSummaryMarkdown(summary));

  writeJsonReport('relation-sources-registered', registeredRows);
  writeMarkdownReport(
    'relation-sources-registered',
    [
      '# 已登记关联来源',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这份报告列出当前已经登记的来源，以及它们的文件完整情况。',
      '',
      registeredRows.length > 0
        ? buildMarkdownTable(registeredRows, [
            {key: 'sourceName', label: '来源名称'},
            {key: 'fileBaseName', label: 'fileBaseName'},
            {key: 'category', label: '分类'},
            {key: 'jsonExists', label: 'JSON 存在'},
            {key: 'txtExists', label: 'TXT 存在'},
            {key: 'status', label: '状态'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('relation-source-issues', issueRows);
  writeMarkdownReport(
    'relation-source-issues',
    [
      '# 关联来源问题清单',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这份报告列出来源配置和来源文件之间的异常项。',
      '',
      issueRows.length > 0
        ? buildMarkdownTable(
            issueRows.map(row => ({
              ...row,
              sourceName: row.sourceName || '',
              filePath: row.filePath || '',
            })),
            [
              {key: 'type', label: '问题类型'},
              {key: 'sourceName', label: '来源名称'},
              {key: 'fileBaseName', label: 'fileBaseName'},
              {key: 'filePath', label: '文件路径'},
              {key: 'message', label: '问题说明'},
            ],
          )
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('txt-only-sources', txtOnlyRows);
  writeMarkdownReport(
    'txt-only-sources',
    [
      '# 只有 TXT 的来源',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些来源已经接入，但目前仍然只有 TXT，后面适合优先整理成 JSON。',
      '',
      txtOnlyRows.length > 0
        ? buildMarkdownTable(txtOnlyRows, [
            {key: 'sourceName', label: '来源名称'},
            {key: 'fileBaseName', label: 'fileBaseName'},
            {key: 'category', label: '分类'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  console.log('Relation source audit completed.');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Reports written to ${reportsDir}`);
}

main();
