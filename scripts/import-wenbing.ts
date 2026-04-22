import {mkdir, readFile, readdir, rm, unlink, writeFile} from 'node:fs/promises';
import path from 'node:path';

type ClauseFile = {
  id: string;
  title: string;
  content: string;
  translation: string;
  keywords: string[];
};

type CatalogClause = {
  id: string;
  title: string;
  dataFile: string;
};

type CatalogChapter = {
  title: string;
  clauses: CatalogClause[];
};

type CatalogBook = {
  id: string;
  name: string;
  chapters: CatalogChapter[];
};

type ExistingClause = ClauseFile;

const rootDir = process.cwd();
const sourceFile = path.join(rootDir, 'external', 'TCM-Ancient-Books', '526-温病条辨.txt');
const outputDir = path.join(rootDir, 'data', '经典', '温病条辨');
const catalogFile = path.join(rootDir, 'data', 'jingdianconfig.json');

function cleanRawText(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/\\x/g, '')
    .replace(/\u0000/g, '')
    .replace(/\uFEFF/g, '')
    .trim();
}

function normalizeClauseText(value: string) {
  return cleanRawText(value)
    .replace(/\n+/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ /g, '')
    .replace(/ +([，。；：！？）])/g, '$1')
    .replace(/([（《]) +/g, '$1')
    .trim();
}

function toPreview(content: string) {
  const firstSentence = content.split(/[。；！？]/)[0]?.trim() || content.trim();
  const preview = firstSentence.slice(0, 12);
  return preview || '条文';
}

function clauseId(chapterIndex: number, clauseIndex: number) {
  return `wenbing-${String(chapterIndex).padStart(2, '0')}-${String(clauseIndex).padStart(2, '0')}`;
}

function splitWenbingClauses(content: string) {
  const normalized = cleanRawText(content);
  const pattern = /(?:^|\n)\s*([一二三四五六七八九十百千]+)、/g;
  const matches = Array.from(normalized.matchAll(pattern));

  if (matches.length < 2) {
    return [normalizeClauseText(normalized)];
  }

  const clauses: string[] = [];
  matches.forEach((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? (matches[index + 1].index ?? normalized.length) : normalized.length;
    const segment = normalizeClauseText(normalized.slice(start, end));
    if (segment) clauses.push(segment);
  });

  return clauses.length > 0 ? clauses : [normalizeClauseText(normalized)];
}

function parseChapters(raw: string) {
  const chapterPattern = /<篇名>(.+?)\n([\s\S]*?)(?=<篇名>|$)/g;
  const chapters: CatalogChapter[] = [];
  const contentMap = new Map<string, string>();
  let match: RegExpExecArray | null;
  let chapterIndex = 0;

  while ((match = chapterPattern.exec(raw)) !== null) {
    const chapterTitle = cleanRawText(match[1]);
    if (!chapterTitle || chapterTitle === '温病条辨') continue;
    chapterIndex += 1;

    const body = cleanRawText(match[2]);
    const contentStart = body.includes('属性：') ? body.slice(body.indexOf('属性：') + 3) : body;
    const clauses = splitWenbingClauses(contentStart);
    const chapterClauses: CatalogClause[] = [];

    clauses.forEach((content, clauseIndex) => {
      const id = clauseId(chapterIndex, clauseIndex + 1);
      contentMap.set(id, content);
      chapterClauses.push({
        id,
        title: `第 ${clauseIndex + 1} 节 · ${toPreview(content)}`,
        dataFile: `/data/经典/温病条辨/${id}.json`,
      });
    });

    if (chapterClauses.length > 0) {
      chapters.push({
        title: chapterTitle,
        clauses: chapterClauses,
      });
    }
  }

  return {chapters, contentMap};
}

async function readExistingClauses(targetDir: string) {
  const entries = await readdir(targetDir, {withFileTypes: true}).catch(() => []);
  const existing = new Map<string, ExistingClause>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const fullPath = path.join(targetDir, entry.name);
    try {
      const raw = await readFile(fullPath, 'utf8');
      const parsed = JSON.parse(raw) as ExistingClause;
      if (parsed?.id) existing.set(parsed.id, parsed);
    } catch {
      // Ignore invalid files and rebuild them.
    }
  }

  return existing;
}

async function clearOutputDir(targetDir: string) {
  await mkdir(targetDir, {recursive: true});
  const entries = await readdir(targetDir, {withFileTypes: true});

  await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        await rm(fullPath, {recursive: true, force: true});
        return;
      }
      if (entry.isFile() && entry.name.endsWith('.json')) {
        await unlink(fullPath);
      }
    }),
  );
}

async function updateCatalog(chapters: CatalogChapter[]) {
  const rawCatalog = await readFile(catalogFile, 'utf8');
  const catalog = JSON.parse(rawCatalog) as CatalogBook[];
  const nextCatalog = catalog.map(book =>
    book.id === 'wenbing'
      ? {
          ...book,
          chapters,
        }
      : book,
  );

  await writeFile(catalogFile, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8');
}

async function main() {
  const raw = cleanRawText(await readFile(sourceFile, 'utf8'));
  const {chapters, contentMap} = parseChapters(raw);
  const existingClauses = await readExistingClauses(outputDir);

  await clearOutputDir(outputDir);
  await mkdir(outputDir, {recursive: true});

  for (const chapter of chapters) {
    for (const clause of chapter.clauses) {
      const existing = existingClauses.get(clause.id);
      const data: ClauseFile = {
        id: clause.id,
        title: existing?.title || `温病条辨 ${chapter.title} ${clause.title}`,
        content: contentMap.get(clause.id) || '',
        translation: existing?.translation || '',
        keywords: existing?.keywords || [],
      };
      await writeFile(path.join(outputDir, `${clause.id}.json`), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    }
  }

  await updateCatalog(chapters);
  const count = chapters.reduce((sum, chapter) => sum + chapter.clauses.length, 0);
  console.log(`Imported ${count} clauses from 温病条辨.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
