import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {initSchema, normalizeKeyword, openDatabase} from '../shared/db-core.js';
import {resolveFromAppRoot} from '../shared/runtime-paths.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = resolveFromAppRoot('data');
const catalogFile = path.join(dataRoot, 'jingdianconfig.json');
const relationConfigFile = path.join(dataRoot, 'guanlianjiexiconfig.json');

function ensureInsideRoot(file, root) {
  const relToRoot = path.relative(root, file);
  return !relToRoot.startsWith('..') && !path.isAbsolute(relToRoot);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadBooksCatalog() {
  if (!fs.existsSync(catalogFile)) return [];
  return readJson(catalogFile);
}

function resolveClauseDataFileById(clauseId) {
  const books = loadBooksCatalog();

  for (const book of books) {
    for (const chapter of book.chapters || []) {
      for (const clause of chapter.clauses || []) {
        if (clause?.id === clauseId && typeof clause.dataFile === 'string' && clause.dataFile.startsWith('/data/')) {
          return clause.dataFile;
        }
      }
    }
  }

  return null;
}

function resolveDataFile(rawDataFile, clauseId) {
  if (typeof rawDataFile === 'string' && rawDataFile.startsWith('/data/')) {
    return rawDataFile;
  }

  if (!clauseId) return '';
  return resolveClauseDataFileById(clauseId) || '';
}

function dataUrlToFile(dataFile) {
  if (!dataFile.startsWith('/data/')) return null;
  const rel = decodeURIComponent(dataFile.slice('/data/'.length));
  const file = path.resolve(dataRoot, rel);
  if (!ensureInsideRoot(file, dataRoot)) return null;
  return file;
}

function loadClauseFromJsonById(clauseId) {
  const dataFile = resolveClauseDataFileById(clauseId);
  if (!dataFile) return null;

  const file = dataUrlToFile(dataFile);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return readJson(file);
}

function loadClauseFromDatabase(clauseId) {
  const db = openDatabase();

  try {
    initSchema(db);
    const clause = db.prepare(
      `
        SELECT id, title, content, translation
        FROM clauses
        WHERE id = ?
        LIMIT 1
      `,
    ).get(clauseId);

    if (!clause) return null;

    const keywords = db.prepare(
      `
        SELECT k.name
        FROM clause_keywords ck
        JOIN keywords k ON k.id = ck.keyword_id
        WHERE ck.clause_id = ?
        ORDER BY k.name COLLATE NOCASE
      `,
    ).all(clauseId);

    return {
      ...clause,
      keywords: keywords.map(item => item.name),
    };
  } finally {
    db.close();
  }
}

function buildBooksPayload() {
  const db = openDatabase();

  try {
    initSchema(db);
    const dbClauses = new Set((db.prepare('SELECT id FROM clauses').all() || []).map(item => item.id));
    const catalogBooks = loadBooksCatalog();

    return catalogBooks.map(book => ({
      id: book.id,
      name: book.name,
      chapters: (book.chapters || []).map(chapter => ({
        title: chapter.title,
        clauses: (chapter.clauses || []).map(clause => ({
          id: clause.id,
          title: clause.title,
          dataFile: clause.dataFile ?? null,
          hasData: dbClauses.has(clause.id) || !!clause.dataFile,
        })),
      })),
    }));
  } finally {
    db.close();
  }
}

function parseTxtEntries(txtContent) {
  return txtContent
    .split(/<篇名>|【篇名】/)
    .map((segment, index) => {
      const trimmed = segment.trim();
      if (!trimmed) return null;

      const titleMatch = trimmed.match(/([^\n]+)/);
      const title = titleMatch ? titleMatch[1].trim() : `片段 ${index + 1}`;
      const attrMatch = trimmed.match(/属性[:：]?([\s\S]+)/);
      const content = attrMatch ? attrMatch[1].trim() : trimmed;
      if (!content) return null;

      return {title, content};
    })
    .filter(Boolean);
}

function buildRelationsPayload() {
  if (!fs.existsSync(relationConfigFile)) return [];

  const configs = readJson(relationConfigFile);

  return configs.map(config => {
    const jsonPath = path.join(dataRoot, '关联解析', `${config.fileBaseName}.json`);
    const txtPath = path.join(dataRoot, '关联解析', `${config.fileBaseName}.txt`);

    let jsonEntries = [];
    let txtEntries = [];

    if (fs.existsSync(jsonPath) && fs.statSync(jsonPath).isFile()) {
      const jsonMap = readJson(jsonPath);
      jsonEntries = Object.entries(jsonMap).flatMap(([keyword, items]) =>
        (items || [])
          .filter(item => !!item?.content)
          .map(item => ({
            title: item.title || keyword,
            content: item.content || '',
            keyword,
          })),
      );
    }

    if (fs.existsSync(txtPath) && fs.statSync(txtPath).isFile()) {
      txtEntries = parseTxtEntries(fs.readFileSync(txtPath, 'utf8'));
    }

    return {
      sourceName: config.sourceName,
      fileBaseName: config.fileBaseName,
      category: config.category,
      jsonEntries,
      txtEntries,
    };
  });
}

function updateClauseKeywords({dataFile, keyword, mode}) {
  const file = dataUrlToFile(dataFile);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return {status: 400, body: {ok: false, error: 'Invalid dataFile'}};
  }

  const clause = readJson(file);
  const keywords = Array.isArray(clause.keywords) ? clause.keywords : [];
  let changed = mode === 'add' ? !keywords.includes(keyword) : keywords.includes(keyword);
  let db = null;

  try {
    db = openDatabase();
    initSchema(db);

    const clauseRow = db.prepare(
      `
        SELECT
          c.id,
          c.title,
          c.content,
          c.translation
        FROM clauses c
        WHERE c.id = ?
        LIMIT 1
      `,
    ).get(clause.id);

    if (clauseRow) {
      db.exec('BEGIN');

      if (mode === 'add') {
        const timestamp = new Date().toISOString();
        const normalizedKeyword = normalizeKeyword(keyword);

        db.prepare(
          `
            INSERT INTO keywords (name, normalized_name, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(normalized_name) DO UPDATE SET
              name = excluded.name,
              updated_at = excluded.updated_at
          `,
        ).run(keyword, normalizedKeyword, timestamp, timestamp);

        const keywordRow = db.prepare('SELECT id FROM keywords WHERE normalized_name = ? LIMIT 1').get(normalizedKeyword);

        if (!keywordRow) {
          throw new Error('Keyword insert failed');
        }

        const insertResult = db.prepare(
          `
            INSERT OR IGNORE INTO clause_keywords (
              clause_id, keyword_id, source, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?)
          `,
        ).run(clause.id, keywordRow.id, 'manual', timestamp, timestamp);

        changed = (insertResult?.changes || 0) > 0;
      } else {
        const normalizedKeyword = normalizeKeyword(keyword);
        const keywordRow = db.prepare('SELECT id FROM keywords WHERE normalized_name = ? LIMIT 1').get(normalizedKeyword);

        if (keywordRow) {
          const deleteResult = db.prepare(
            `
              DELETE FROM clause_keywords
              WHERE clause_id = ? AND keyword_id = ?
            `,
          ).run(clause.id, keywordRow.id);
          changed = (deleteResult?.changes || 0) > 0;
        } else {
          changed = false;
        }
      }

      db.exec('COMMIT');

      const clauseKeywords = db.prepare(
        `
          SELECT k.name
          FROM clause_keywords ck
          JOIN keywords k ON k.id = ck.keyword_id
          WHERE ck.clause_id = ?
          ORDER BY k.name COLLATE NOCASE
        `,
      ).all(clause.id);

      clause.title = clauseRow.title;
      clause.content = clauseRow.content;
      clause.translation = clauseRow.translation;
      clause.keywords = clauseKeywords.map(item => item.name);
    }
  } catch (error) {
    if (db?.isTransaction) {
      db.exec('ROLLBACK');
    }

    clause.keywords = mode === 'add' ? (changed ? [...keywords, keyword] : keywords) : keywords.filter(item => item !== keyword);
    console.error(`Failed to sync keyword ${mode} to database, fallback to JSON only:`, error);
  } finally {
    db?.close();
  }

  if (!Array.isArray(clause.keywords)) {
    clause.keywords = mode === 'add' ? (changed ? [...keywords, keyword] : keywords) : keywords.filter(item => item !== keyword);
  }

  fs.writeFileSync(file, `${JSON.stringify(clause, null, 2)}\n`, 'utf8');

  return {
    status: 200,
    body: mode === 'add' ? {ok: true, added: changed, clause} : {ok: true, removed: changed, clause},
  };
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

export function createLocalApp({staticDir} = {}) {
  const app = express();
  app.use(express.json({limit: '1mb'}));

  app.get('/api/health', (_req, res) => {
    sendJson(res, 200, {ok: true});
  });

  app.get('/api/books', (_req, res) => {
    try {
      sendJson(res, 200, buildBooksPayload());
    } catch (error) {
      sendJson(res, 500, {ok: false, error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  app.get('/api/relations/index', (_req, res) => {
    try {
      sendJson(res, 200, buildRelationsPayload());
    } catch (error) {
      sendJson(res, 500, {ok: false, error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  app.get('/api/clauses/:clauseId', (req, res) => {
    try {
      const clauseId = typeof req.params.clauseId === 'string' ? req.params.clauseId.trim() : '';
      if (!clauseId) {
        sendJson(res, 400, {ok: false, error: 'Missing clause id'});
        return;
      }

      const clause = loadClauseFromDatabase(clauseId) || loadClauseFromJsonById(clauseId);
      if (!clause) {
        sendJson(res, 404, {ok: false, error: 'Clause not found'});
        return;
      }

      sendJson(res, 200, clause);
    } catch (error) {
      sendJson(res, 500, {ok: false, error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  app.post('/api/keywords/add', (req, res) => {
    try {
      const clauseId = typeof req.body?.clauseId === 'string' ? req.body.clauseId.trim() : '';
      const keyword = typeof req.body?.keyword === 'string' ? req.body.keyword.trim() : '';
      const dataFile = resolveDataFile(req.body?.dataFile, clauseId);

      if (!dataFile.startsWith('/data/') || !keyword) {
        sendJson(res, 400, {ok: false, error: 'Invalid dataFile or keyword'});
        return;
      }

      const result = updateClauseKeywords({dataFile, keyword, mode: 'add'});
      sendJson(res, result.status, result.body);
    } catch (error) {
      sendJson(res, 500, {ok: false, error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  app.post('/api/keywords/remove', (req, res) => {
    try {
      const clauseId = typeof req.body?.clauseId === 'string' ? req.body.clauseId.trim() : '';
      const keyword = typeof req.body?.keyword === 'string' ? req.body.keyword.trim() : '';
      const dataFile = resolveDataFile(req.body?.dataFile, clauseId);

      if (!dataFile.startsWith('/data/') || !keyword) {
        sendJson(res, 400, {ok: false, error: 'Invalid dataFile or keyword'});
        return;
      }

      const result = updateClauseKeywords({dataFile, keyword, mode: 'remove'});
      sendJson(res, result.status, result.body);
    } catch (error) {
      sendJson(res, 500, {ok: false, error: error instanceof Error ? error.message : 'Unknown error'});
    }
  });

  app.use('/data', express.static(dataRoot, {fallthrough: false}));

  if (staticDir) {
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/data/')) {
        next();
        return;
      }

      res.sendFile(path.resolve(staticDir, 'index.html'));
    });
  }

  return app;
}

export async function startLocalServer({port = 3001, staticDir} = {}) {
  const app = createLocalApp({staticDir});
  const server = createServer(app);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to resolve local server address');
  }

  return {
    app,
    server,
    port: address.port,
    url: `http://127.0.0.1:${address.port}`,
    staticDir: staticDir ? path.resolve(moduleDir, '..', staticDir) : null,
  };
}
