import {existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {dbFile, initSchema, normalizeKeyword, now, openDatabase, rootDir} from './db.ts';

type RelationSourceConfig = {
  sourceName: string;
  fileBaseName: string;
  category?: string;
};

type StructuredEntry = {
  title?: string;
  content?: string;
};

type JsonKnowledgeMap = Record<string, StructuredEntry[]>;

type ImportedEntry = {
  title: string;
  content: string;
  keyword?: string;
};

function loadJson<T>(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function parseTxtEntries(txtContent: string) {
  const segments = txtContent.split(/<篇名>|【篇名】?/);
  const entries: ImportedEntry[] = [];

  segments.forEach((segment, index) => {
    const trimmed = segment.trim();
    if (!trimmed) return;

    const titleMatch = trimmed.match(/([^\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : `片段 ${index + 1}`;
    const attrMatch = trimmed.match(/属性[：:]([\s\S]+)/);
    const content = (attrMatch ? attrMatch[1] : trimmed).trim();

    if (!content) return;
    entries.push({title, content});
  });

  return entries;
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

  const row = db.prepare('SELECT id FROM keywords WHERE normalized_name = ? LIMIT 1').get(normalized) as
    | {id: number}
    | undefined;

  return row?.id ?? null;
}

async function main() {
  const configPath = path.join(rootDir, 'data', 'guanlianjiexiconfig.json');
  const relationDir = path.join(rootDir, 'data', '关联解析');
  const configs = loadJson<RelationSourceConfig[]>(configPath);

  const db = openDatabase();
  initSchema(db);

  const timestamp = now();
  let sourceCount = 0;
  let entryCount = 0;
  let keywordLinkCount = 0;

  try {
    db.exec('BEGIN');

    for (const config of configs) {
      const jsonPath = path.join(relationDir, `${config.fileBaseName}.json`);
      const txtPath = path.join(relationDir, `${config.fileBaseName}.txt`);
      const hasJson = existsSync(jsonPath);
      const hasTxt = existsSync(txtPath);

      if (!hasJson && !hasTxt) {
        continue;
      }

      const sourceType = hasJson ? 'json' : 'txt';
      const sourceId = config.fileBaseName;

      db.prepare('DELETE FROM relation_sources WHERE id = ?').run(sourceId);
      db.prepare(`
        INSERT INTO relation_sources (
          id, source_name, file_base_name, category, source_type, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(sourceId, config.sourceName, config.fileBaseName, config.category || null, sourceType, timestamp, timestamp);
      sourceCount += 1;

      const insertEntry = db.prepare(`
        INSERT INTO relation_entries (
          relation_source_id, title, content, raw_keyword, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const linkKeyword = db.prepare(`
        INSERT OR IGNORE INTO relation_entry_keywords (
          relation_entry_id, keyword_id, created_at
        )
        VALUES (?, ?, ?)
      `);

      if (hasJson) {
        const knowledgeMap = loadJson<JsonKnowledgeMap>(jsonPath);
        for (const [keyword, items] of Object.entries(knowledgeMap)) {
          for (const item of items || []) {
            if (!item?.content) continue;

            const entryResult = insertEntry.run(
              sourceId,
              item.title?.trim() || keyword,
              item.content.trim(),
              keyword,
              timestamp,
              timestamp,
            ) as {lastInsertRowid?: number | bigint};
            entryCount += 1;

            const keywordId = upsertKeyword(db, keyword, timestamp);
            const relationEntryId = Number(entryResult.lastInsertRowid || 0);
            if (!keywordId || !relationEntryId) continue;

            linkKeyword.run(relationEntryId, keywordId, timestamp);
            keywordLinkCount += 1;
          }
        }
        continue;
      }

      const txtContent = readFileSync(txtPath, 'utf8');
      const entries = parseTxtEntries(txtContent);

      for (const entry of entries) {
        insertEntry.run(sourceId, entry.title, entry.content, null, timestamp, timestamp);
        entryCount += 1;
      }
    }

    db.exec('COMMIT');

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM relation_sources) AS sources,
        (SELECT COUNT(*) FROM relation_entries) AS entries,
        (SELECT COUNT(*) FROM relation_entry_keywords) AS entry_keywords
    `).get() as Record<string, number>;

    console.log(`Imported relation sources into ${dbFile}`);
    console.log(JSON.stringify({sourceCount, entryCount, keywordLinkCount, ...stats}, null, 2));
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
