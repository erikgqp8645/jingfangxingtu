import {existsSync, mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {rootDir} from './db.ts';

type RelationSourceConfig = {
  sourceName: string;
  fileBaseName: string;
  category?: string;
};

type DraftFragment = {
  sourceName: string;
  fileBaseName: string;
  category: string;
  title: string;
  chunkIndex: number;
  content: string;
  contentLength: number;
};

const dataDir = path.join(rootDir, 'data');
const relationsDir = path.join(dataDir, '关联解析');
const reportsDir = path.join(rootDir, 'reports');
const draftsDir = path.join(reportsDir, 'relation-txt-drafts');

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
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
    if (!content) return;
    rows.push({title, content});
  });

  return rows;
}

function splitIntoSentences(content: string) {
  return content
    .replace(/\r/g, '')
    .split(/(?<=[。！？；])/u)
    .map(sentence => sentence.trim())
    .filter(Boolean);
}

function chunkContent(content: string, maxLength = 220, minLength = 80) {
  const sentences = splitIntoSentences(content);
  if (sentences.length === 0) return [content.trim()].filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    const next = current ? `${current}${sentence}` : sentence;
    if ([...next].length <= maxLength) {
      current = next;
      continue;
    }

    if (current) {
      chunks.push(current.trim());
      current = sentence;
      continue;
    }

    const hardSplitParts = sentence.match(new RegExp(`.{1,${maxLength}}`, 'gu')) || [sentence];
    for (const part of hardSplitParts) {
      chunks.push(part.trim());
    }
    current = '';
  }

  if (current.trim()) {
    if (chunks.length > 0 && [...current].length < minLength) {
      const merged = `${chunks[chunks.length - 1]}${current}`.trim();
      if ([...merged].length <= maxLength + minLength) {
        chunks[chunks.length - 1] = merged;
      } else {
        chunks.push(current.trim());
      }
    } else {
      chunks.push(current.trim());
    }
  }

  return chunks.filter(Boolean);
}

function buildMarkdown(sourceName: string, fragments: DraftFragment[]) {
  const lines = [
    `# ${sourceName} TXT 切段草稿`,
    '',
    `生成时间：${new Date().toLocaleString('zh-CN', {hour12: false})}`,
    '',
    '这份文件是自动切段草稿。',
    '',
    '它的作用不是直接替代正式 JSON，而是帮助后续人工整理更短、更适合命中的来源片段。',
    '',
  ];

  for (const fragment of fragments) {
    lines.push(`## ${fragment.title} · 第 ${fragment.chunkIndex} 段`, '');
    lines.push(`- 长度：${fragment.contentLength}`, '');
    lines.push(fragment.content, '', '---', '');
  }

  return lines.join('\n');
}

function main() {
  const targetBaseName = process.argv[2]?.trim();
  const configs = loadJson<RelationSourceConfig[]>(path.join(dataDir, 'guanlianjiexiconfig.json'));

  const targets = targetBaseName ? configs.filter(item => item.fileBaseName === targetBaseName) : configs;
  if (targets.length === 0) {
    throw new Error(targetBaseName ? `未找到来源：${targetBaseName}` : '没有可处理的来源配置');
  }

  mkdirSync(draftsDir, {recursive: true});

  for (const config of targets) {
    const txtPath = path.join(relationsDir, `${config.fileBaseName}.txt`);
    if (!existsSync(txtPath) || !statSync(txtPath).isFile()) {
      console.log(`跳过 ${config.fileBaseName}，因为 TXT 不存在。`);
      continue;
    }

    const txtContent = readFileSync(txtPath, 'utf8');
    const entries = parseTxtEntries(txtContent);
    const draftFragments: DraftFragment[] = [];

    for (const entry of entries) {
      const chunks = chunkContent(entry.content);
      chunks.forEach((chunk, index) => {
        draftFragments.push({
          sourceName: config.sourceName,
          fileBaseName: config.fileBaseName,
          category: config.category || '',
          title: entry.title,
          chunkIndex: index + 1,
          content: chunk,
          contentLength: [...chunk].length,
        });
      });
    }

    const jsonPath = path.join(draftsDir, `${config.fileBaseName}.draft.json`);
    const mdPath = path.join(draftsDir, `${config.fileBaseName}.draft.md`);

    writeFileSync(jsonPath, `${JSON.stringify(draftFragments, null, 2)}\n`, 'utf8');
    writeFileSync(mdPath, `${buildMarkdown(config.sourceName, draftFragments)}\n`, 'utf8');

    console.log(`Draft written: ${jsonPath}`);
    console.log(`Draft written: ${mdPath}`);
  }
}

main();
