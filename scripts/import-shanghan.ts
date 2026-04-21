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

const rootDir = process.cwd();
const sourceFile = path.join(rootDir, 'external', 'TCM-Ancient-Books', '457-伤寒论.txt');
const outputDir = path.join(rootDir, 'data', '经典', '伤寒论');
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
    .replace(/([（]) +/g, '$1')
    .trim();
}

function toPreview(content: string) {
  const firstSentence = content.split(/[。；！？]/)[0]?.trim() || content.trim();
  const preview = firstSentence.slice(0, 12);
  return preview || '条文';
}

function parseChapters(raw: string) {
  const chapterPattern = /<篇名>(.+?)\n([\s\S]*?)(?=<篇名>|$)/g;
  const chapters: CatalogChapter[] = [];
  let match: RegExpExecArray | null;

  while ((match = chapterPattern.exec(raw)) !== null) {
    const chapterTitle = cleanRawText(match[1]);
    if (!chapterTitle || chapterTitle === '伤寒论') continue;

    const body = cleanRawText(match[2]);
    const contentStart = body.includes('属性：') ? body.slice(body.indexOf('属性：') + 3) : body;
    const clausePattern = /(?:^|\n)\s*(\d+)\s*[．.]\s*([\s\S]*?)(?=(?:\n\s*\d+\s*[．.]\s*)|$)/g;
    const clauses: CatalogClause[] = [];
    let clauseMatch: RegExpExecArray | null;

    while ((clauseMatch = clausePattern.exec(contentStart)) !== null) {
      const id = clauseMatch[1].trim();
      const content = normalizeClauseText(clauseMatch[2]);
      if (!id || !content) continue;

      const title = `第 ${id} 条 · ${toPreview(content)}`;
      clauses.push({
        id,
        title,
        dataFile: `/data/经典/伤寒论/${id}.json`,
      });
    }

    if (clauses.length > 0) {
      chapters.push({
        title: chapterTitle,
        clauses,
      });
    }
  }

  return chapters;
}

async function readExistingClauses(targetDir: string) {
  const entries = await readdir(targetDir, {withFileTypes: true}).catch(() => []);
  const existing = new Map<string, ClauseFile>();

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const fullPath = path.join(targetDir, entry.name);

    try {
      const raw = await readFile(fullPath, 'utf8');
      const parsed = JSON.parse(raw) as ClauseFile;
      if (parsed?.id) {
        existing.set(parsed.id, parsed);
      }
    } catch {
      // Ignore invalid legacy files and let the importer rebuild them.
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

function buildClauseContentMap(raw: string) {
  const map = new Map<string, string>();
  const chapterPattern = /<篇名>(.+?)\n([\s\S]*?)(?=<篇名>|$)/g;
  let match: RegExpExecArray | null;

  while ((match = chapterPattern.exec(raw)) !== null) {
    const chapterTitle = cleanRawText(match[1]);
    if (!chapterTitle || chapterTitle === '伤寒论') continue;

    const body = cleanRawText(match[2]);
    const contentStart = body.includes('属性：') ? body.slice(body.indexOf('属性：') + 3) : body;
    const clausePattern = /(?:^|\n)\s*(\d+)\s*[．.]\s*([\s\S]*?)(?=(?:\n\s*\d+\s*[．.]\s*)|$)/g;
    let clauseMatch: RegExpExecArray | null;

    while ((clauseMatch = clausePattern.exec(contentStart)) !== null) {
      map.set(clauseMatch[1].trim(), normalizeClauseText(clauseMatch[2]));
    }
  }

  return map;
}

async function updateCatalog(chapters: CatalogChapter[]) {
  const rawCatalog = await readFile(catalogFile, 'utf8');
  const catalog = JSON.parse(rawCatalog) as CatalogBook[];
  const nextCatalog = catalog.map(book =>
    book.id === 'shanghan'
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
  const chapters = parseChapters(raw);
  const contentMap = buildClauseContentMap(raw);
  const existingClauses = await readExistingClauses(outputDir);

  await clearOutputDir(outputDir);
  await mkdir(outputDir, {recursive: true});

  for (const chapter of chapters) {
    for (const clause of chapter.clauses) {
      const content = contentMap.get(clause.id) || '';
      const existing = existingClauses.get(clause.id);
      const data: ClauseFile = {
        id: clause.id,
        title: existing?.title || `伤寒论 第${clause.id}条`,
        content,
        translation: existing?.translation || '',
        keywords: existing?.keywords || [],
      };
      await writeFile(path.join(outputDir, `${clause.id}.json`), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    }
  }

  await updateCatalog(chapters);
  console.log(`Imported ${chapters.reduce((sum, chapter) => sum + chapter.clauses.length, 0)} clauses from 伤寒论.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
