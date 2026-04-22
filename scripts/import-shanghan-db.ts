import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {dbFile, initSchema, normalizeKeyword, now, openDatabase, rootDir} from './db.ts';

type ClauseData = {
  id: string;
  title: string;
  content: string;
  translation: string;
  keywords: string[];
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

type ImportedClause = {
  chapterId: string;
  chapterTitle: string;
  chapterOrder: number;
  clauseOrder: number;
  clause: ClauseConfig;
  data: ClauseData;
  sourceFile: string;
};

function loadJson<T>(filePath: string) {
  return readFile(filePath, 'utf8').then(content => JSON.parse(content) as T);
}

function toPathFromDataFile(dataFile: string) {
  const rel = dataFile.startsWith('/data/') ? dataFile.slice('/data/'.length) : dataFile;
  return path.join(rootDir, 'data', rel);
}

function chapterId(bookId: string, order: number) {
  return `${bookId}-chapter-${String(order).padStart(2, '0')}`;
}

function clauseNoFromId(id: string) {
  const match = id.match(/(\d+)$/);
  return match?.[1] ?? id;
}

function upsertKeyword(db: DatabaseSync, keyword: string, timestamp: string) {
  const normalized = normalizeKeyword(keyword);
  if (!normalized) return null;

  db.prepare(`
    INSERT INTO keywords (name, normalized_name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(normalized_name) DO UPDATE SET
      name = excluded.name,
      updated_at = excluded.updated_at
  `).run(keyword, normalized, timestamp, timestamp);

  const row = db.prepare('SELECT id FROM keywords WHERE normalized_name = ?').get(normalized) as {id: number} | undefined;
  return row?.id ?? null;
}

async function main() {
  const catalogPath = path.join(rootDir, 'data', 'jingdianconfig.json');
  const catalog = await loadJson<BookConfig[]>(catalogPath);
  const book = catalog.find(item => item.id === 'shanghan');

  if (!book) {
    throw new Error('在 jingdianconfig.json 中未找到《伤寒论》配置');
  }

  const db = openDatabase();
  initSchema(db);

  const timestamp = now();
  const importedClauses: ImportedClause[] = [];

  for (const [chapterIndex, chapter] of book.chapters.entries()) {
    const currentChapterId = chapterId(book.id, chapterIndex + 1);
    for (const [clauseIndex, clause] of chapter.clauses.entries()) {
      if (!clause.dataFile) continue;
      const clausePath = toPathFromDataFile(clause.dataFile);
      importedClauses.push({
        chapterId: currentChapterId,
        chapterTitle: chapter.title,
        chapterOrder: chapterIndex + 1,
        clauseOrder: clauseIndex + 1,
        clause,
        data: await loadJson<ClauseData>(clausePath),
        sourceFile: path.basename(clausePath),
      });
    }
  }

  try {
    db.exec('BEGIN');

    db.prepare(`
      INSERT INTO books (id, name, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `).run(book.id, book.name, 0, timestamp, timestamp);

    db.prepare('DELETE FROM clause_keywords WHERE clause_id IN (SELECT id FROM clauses WHERE book_id = ?)').run(book.id);
    db.prepare('DELETE FROM clauses WHERE book_id = ?').run(book.id);
    db.prepare('DELETE FROM chapters WHERE book_id = ?').run(book.id);

    let clauseCount = 0;
    let keywordLinkCount = 0;
    const seenChapters = new Set<string>();

    for (const imported of importedClauses) {
      if (!seenChapters.has(imported.chapterId)) {
        seenChapters.add(imported.chapterId);
        db.prepare(`
          INSERT INTO chapters (id, book_id, title, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(imported.chapterId, book.id, imported.chapterTitle, imported.chapterOrder, timestamp, timestamp);
      }

      db.prepare(`
        INSERT INTO clauses (
          id, book_id, chapter_id, clause_no, title, content, translation, source_file, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        imported.data.id,
        book.id,
        imported.chapterId,
        clauseNoFromId(imported.data.id),
        imported.data.title || imported.clause.title,
        imported.data.content || '',
        imported.data.translation || '',
        imported.sourceFile,
        timestamp,
        timestamp,
      );
      clauseCount += 1;

      for (const keyword of imported.data.keywords || []) {
        const keywordId = upsertKeyword(db, keyword, timestamp);
        if (!keywordId) continue;

        db.prepare(`
          INSERT OR IGNORE INTO clause_keywords (
            clause_id, keyword_id, source, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?)
        `).run(imported.data.id, keywordId, 'imported', timestamp, timestamp);
        keywordLinkCount += 1;
      }
    }

    db.exec('COMMIT');

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM books) AS books,
        (SELECT COUNT(*) FROM chapters WHERE book_id = 'shanghan') AS chapters,
        (SELECT COUNT(*) FROM clauses WHERE book_id = 'shanghan') AS clauses,
        (SELECT COUNT(*) FROM clause_keywords ck JOIN clauses c ON c.id = ck.clause_id WHERE c.book_id = 'shanghan') AS clause_keywords
    `).get() as Record<string, number>;

    console.log(`Imported 《伤寒论》 into ${dbFile}`);
    console.log(JSON.stringify({clauseCount, keywordLinkCount, ...stats}, null, 2));
  } catch (error) {
    if (db.isTransaction) {
      db.exec('ROLLBACK');
    }
    throw error;
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
