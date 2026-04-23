import {existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {rootDir} from './db.ts';

type RelationSourceConfig = {
  sourceName: string;
  fileBaseName: string;
  category?: string;
};

type StructuredEntry = {
  title?: string;
  content?: string;
};

type FragmentRow = {
  sourceName: string;
  fileBaseName: string;
  category: string;
  sourceType: 'json' | 'txt';
  title: string;
  content: string;
};

type DuplicateFragmentRow = {
  fragmentHash: string;
  duplicateCount: number;
  sourceNames: string[];
  titles: string[];
};

type FragmentLengthIssueRow = {
  sourceName: string;
  fileBaseName: string;
  sourceType: 'json' | 'txt';
  title: string;
  contentLength: number;
  problemType: 'too-short' | 'too-long';
};

type EmptyFragmentRow = {
  sourceName: string;
  fileBaseName: string;
  sourceType: 'json' | 'txt';
  title: string;
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

const dataDir = path.join(rootDir, 'data');
const relationsDir = path.join(dataDir, '关联解析');
const reportsDir = path.join(rootDir, 'reports');

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
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

function parseTxtEntries(txtContent: string) {
  const segments = txtContent.split(/<篇名>|【篇名】?/);
  const rows: Array<{title: string; content: string}> = [];

  segments.forEach((segment, index) => {
    const trimmed = segment.trim();
    if (!trimmed) return;

    const titleMatch = trimmed.match(/([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `片段 ${index + 1}`;
    const attrMatch = trimmed.match(/属性[：:]([\s\S]+)/);
    const content = (attrMatch ? attrMatch[1] : trimmed).trim();
    rows.push({title, content});
  });

  return rows;
}

function main() {
  const configs = loadJson<RelationSourceConfig[]>(path.join(dataDir, 'guanlianjiexiconfig.json'));
  const fragmentRows: FragmentRow[] = [];
  const emptyFragmentRows: EmptyFragmentRow[] = [];
  const lengthIssueRows: FragmentLengthIssueRow[] = [];

  for (const config of configs) {
    const jsonPath = path.join(relationsDir, `${config.fileBaseName}.json`);
    const txtPath = path.join(relationsDir, `${config.fileBaseName}.txt`);

    if (existsSync(jsonPath) && statSync(jsonPath).isFile()) {
      try {
        const jsonMap = loadJson<Record<string, StructuredEntry[]>>(jsonPath);
        for (const [keyword, items] of Object.entries(jsonMap)) {
          for (const item of items || []) {
            const title = (item.title || keyword || '').trim();
            const content = (item.content || '').trim();
            if (!content) {
              emptyFragmentRows.push({
                sourceName: config.sourceName,
                fileBaseName: config.fileBaseName,
                sourceType: 'json',
                title,
              });
              continue;
            }

            fragmentRows.push({
              sourceName: config.sourceName,
              fileBaseName: config.fileBaseName,
              category: config.category || '',
              sourceType: 'json',
              title,
              content,
            });
          }
        }
      } catch {
        // JSON 解析错误由来源体检脚本负责，这里不重复记异常。
      }
    }

    if (existsSync(txtPath) && statSync(txtPath).isFile()) {
      const txtEntries = parseTxtEntries(readFileSync(txtPath, 'utf8'));
      for (const entry of txtEntries) {
        const content = entry.content.trim();
        if (!content) {
          emptyFragmentRows.push({
            sourceName: config.sourceName,
            fileBaseName: config.fileBaseName,
            sourceType: 'txt',
            title: entry.title,
          });
          continue;
        }

        fragmentRows.push({
          sourceName: config.sourceName,
          fileBaseName: config.fileBaseName,
          category: config.category || '',
          sourceType: 'txt',
          title: entry.title,
          content,
        });
      }
    }
  }

  for (const row of fragmentRows) {
    const contentLength = [...row.content].length;
    if (contentLength < 10) {
      lengthIssueRows.push({
        sourceName: row.sourceName,
        fileBaseName: row.fileBaseName,
        sourceType: row.sourceType,
        title: row.title,
        contentLength,
        problemType: 'too-short',
      });
    } else if (contentLength > 300) {
      lengthIssueRows.push({
        sourceName: row.sourceName,
        fileBaseName: row.fileBaseName,
        sourceType: row.sourceType,
        title: row.title,
        contentLength,
        problemType: 'too-long',
      });
    }
  }

  const duplicateMap = new Map<string, FragmentRow[]>();
  for (const row of fragmentRows) {
    const hash = createHash('sha1').update(row.content.replace(/\s+/g, ' ').trim()).digest('hex');
    const existing = duplicateMap.get(hash) || [];
    existing.push(row);
    duplicateMap.set(hash, existing);
  }

  const duplicateRows: DuplicateFragmentRow[] = Array.from(duplicateMap.entries())
    .filter(([, rows]) => rows.length > 1)
    .map(([fragmentHash, rows]) => ({
      fragmentHash,
      duplicateCount: rows.length,
      sourceNames: Array.from(new Set(rows.map(row => row.sourceName))),
      titles: Array.from(new Set(rows.map(row => row.title))).slice(0, 6),
    }))
    .sort((a, b) => b.duplicateCount - a.duplicateCount || a.fragmentHash.localeCompare(b.fragmentHash, 'zh-CN'));

  lengthIssueRows.sort((a, b) => b.contentLength - a.contentLength || a.sourceName.localeCompare(b.sourceName, 'zh-CN'));
  emptyFragmentRows.sort((a, b) => (a.sourceName + a.title).localeCompare(b.sourceName + b.title, 'zh-CN'));

  const summary: RelationFragmentSummary = {
    sourcesChecked: configs.length,
    fragmentCount: fragmentRows.length,
    duplicateFragmentGroups: duplicateRows.length,
    lengthIssueCount: lengthIssueRows.length,
    emptyFragmentCount: emptyFragmentRows.length,
    jsonFragmentCount: fragmentRows.filter(row => row.sourceType === 'json').length,
    txtFragmentCount: fragmentRows.filter(row => row.sourceType === 'txt').length,
  };

  mkdirSync(reportsDir, {recursive: true});

  writeJsonReport('relation-fragments-summary', summary);
  writeMarkdownReport(
    'relation-fragments-summary',
    [
      '# 来源片段体检摘要',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '## 总览',
      '',
      `- 已检查来源数量：${summary.sourcesChecked}`,
      `- 片段总数：${summary.fragmentCount}`,
      `- JSON 片段数：${summary.jsonFragmentCount}`,
      `- TXT 片段数：${summary.txtFragmentCount}`,
      `- 重复片段组数：${summary.duplicateFragmentGroups}`,
      `- 长度异常片段数：${summary.lengthIssueCount}`,
      `- 空片段数：${summary.emptyFragmentCount}`,
      '',
      '## 建议先做什么',
      '',
      '- 先处理过长片段，避免右侧展示过重。',
      '- 再处理重复片段，减少命中冗余。',
      '- 最后逐步把高质量 TXT 片段转成 JSON。',
      '',
    ].join('\n'),
  );

  writeJsonReport('duplicate-fragments', duplicateRows);
  writeMarkdownReport(
    'duplicate-fragments',
    [
      '# 重复来源片段',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些片段内容完全一致，后面可以考虑去重或合并。',
      '',
      duplicateRows.length > 0
        ? buildMarkdownTable(
            duplicateRows.map(row => ({
              ...row,
              sourceNames: row.sourceNames.join(' / '),
              titles: row.titles.join(' / '),
            })),
            [
              {key: 'fragmentHash', label: '片段哈希'},
              {key: 'duplicateCount', label: '重复次数'},
              {key: 'sourceNames', label: '来源'},
              {key: 'titles', label: '标题'},
            ],
          )
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('fragment-length-issues', lengthIssueRows);
  writeMarkdownReport(
    'fragment-length-issues',
    [
      '# 来源片段长度异常',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些片段过长或过短，后面建议人工复核。',
      '',
      lengthIssueRows.length > 0
        ? buildMarkdownTable(lengthIssueRows, [
            {key: 'sourceName', label: '来源'},
            {key: 'fileBaseName', label: 'fileBaseName'},
            {key: 'sourceType', label: '类型'},
            {key: 'title', label: '标题'},
            {key: 'contentLength', label: '长度'},
            {key: 'problemType', label: '问题类型'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  writeJsonReport('empty-fragments', emptyFragmentRows);
  writeMarkdownReport(
    'empty-fragments',
    [
      '# 空来源片段',
      '',
      `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
      '',
      '这些片段标题存在，但正文为空。',
      '',
      emptyFragmentRows.length > 0
        ? buildMarkdownTable(emptyFragmentRows, [
            {key: 'sourceName', label: '来源'},
            {key: 'fileBaseName', label: 'fileBaseName'},
            {key: 'sourceType', label: '类型'},
            {key: 'title', label: '标题'},
          ])
        : '- 无',
      '',
    ].join('\n'),
  );

  console.log('Relation fragment audit completed.');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Reports written to ${reportsDir}`);
}

main();
