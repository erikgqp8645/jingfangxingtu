import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {initSchema, normalizeKeyword, openDatabase} from './scripts/db.ts';
import type {Plugin} from 'vite';
import {defineConfig, loadEnv} from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 仓库根目录下的 `data/`，在开发与生产预览中均以 `/data/*` URL 提供；构建时复制到 `dist/data/`。 */
function repoDataAsPublicData(): Plugin {
  const dataRoot = path.resolve(__dirname, 'data');
  const catalogFile = path.resolve(dataRoot, 'jingdianconfig.json');

  function loadBooksCatalog() {
    if (!fs.existsSync(catalogFile)) return [];
    return JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  }

  function resolveClauseDataFileById(clauseId: string) {
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

  function loadClauseFromJsonById(clauseId: string) {
    const dataFile = resolveClauseDataFileById(clauseId);
    if (!dataFile) return null;

    const rel = decodeURIComponent(dataFile.slice('/data/'.length));
    const file = path.resolve(dataRoot, rel);
    const relToRoot = path.relative(dataRoot, file);
    if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) return null;
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;

    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function loadClauseFromDatabase(clauseId: string) {
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
      ).get(clauseId) as
        | {
            id: string;
            title: string;
            content: string;
            translation: string;
          }
        | undefined;

      if (!clause) return null;

      const keywords = db.prepare(
        `
          SELECT k.name
          FROM clause_keywords ck
          JOIN keywords k ON k.id = ck.keyword_id
          WHERE ck.clause_id = ?
          ORDER BY k.name COLLATE NOCASE
        `,
      ).all(clauseId) as Array<{name: string}>;

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
      const dbClauses = new Set((db.prepare('SELECT id FROM clauses').all() as Array<{id: string}>).map(item => item.id));
      const catalogBooks = loadBooksCatalog();

      return catalogBooks.map((book: any) => ({
        id: book.id,
        name: book.name,
        chapters: (book.chapters || []).map((chapter: any) => ({
          title: chapter.title,
          clauses: (chapter.clauses || []).map((clause: any) => ({
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

  function buildRelationsPayload() {
    const configFile = path.resolve(dataRoot, 'guanlianjiexiconfig.json');
    if (!fs.existsSync(configFile)) return [];

    const configs = JSON.parse(fs.readFileSync(configFile, 'utf8')) as Array<{
      sourceName: string;
      fileBaseName: string;
      category?: string;
    }>;

    const parseTxtEntries = (txtContent: string) => {
      return txtContent
        .split(/<篇名>|【篇名】?/)
        .map((segment, index) => {
          const trimmed = segment.trim();
          if (!trimmed) return null;

          const titleMatch = trimmed.match(/([^\n]+)/);
          const title = titleMatch ? titleMatch[1].trim() : `片段 ${index + 1}`;
          const attrMatch = trimmed.match(/属性[：:]([\s\S]+)/);
          const content = attrMatch ? attrMatch[1].trim() : trimmed;
          if (!content) return null;

          return {title, content};
        })
        .filter(Boolean);
    };

    return configs.map(config => {
      const jsonPath = path.resolve(dataRoot, '关联解析', `${config.fileBaseName}.json`);
      const txtPath = path.resolve(dataRoot, '关联解析', `${config.fileBaseName}.txt`);

      let jsonEntries: Array<{title: string; content: string; keyword?: string}> = [];
      let txtEntries: Array<{title: string; content: string; keyword?: string}> = [];

      if (fs.existsSync(jsonPath) && fs.statSync(jsonPath).isFile()) {
        const jsonMap = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<
          string,
          Array<{title?: string; content?: string}>
        >;

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
        txtEntries = parseTxtEntries(fs.readFileSync(txtPath, 'utf8')) as Array<{
          title: string;
          content: string;
          keyword?: string;
        }>;
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

  return {
    name: 'repo-data-as-slash-data',
    configureServer(server) {
      server.middlewares.use('/api/books', (req, res, next) => {
        if (req.method !== 'GET') return next();

        try {
          const books = buildBooksPayload();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(books));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ok: false, error: error instanceof Error ? error.message : 'Unknown error'}));
        }
      });

      server.middlewares.use('/api/relations/index', (req, res, next) => {
        if (req.method !== 'GET') return next();

        try {
          const payload = buildRelationsPayload();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ok: false, error: error instanceof Error ? error.message : 'Unknown error'}));
        }
      });

      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0] || '';
        if (req.method !== 'GET' || !urlPath.startsWith('/api/clauses/')) return next();

        const clauseId = decodeURIComponent(urlPath.slice('/api/clauses/'.length)).trim();
        if (!clauseId) return next();

        try {
          const clause = loadClauseFromDatabase(clauseId) || loadClauseFromJsonById(clauseId);
          if (!clause) {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ok: false, error: 'Clause not found'}));
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(clause));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ok: false, error: error instanceof Error ? error.message : 'Unknown error'}));
        }
      });

      server.middlewares.use('/api/keywords/add', (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          let db = null;
          try {
            const payload = JSON.parse(body || '{}');
            const clauseId = typeof payload.clauseId === 'string' ? payload.clauseId.trim() : '';
            const rawDataFile = typeof payload.dataFile === 'string' ? payload.dataFile : '';
            const keyword = typeof payload.keyword === 'string' ? payload.keyword.trim() : '';
            const dataFile =
              rawDataFile.startsWith('/data/')
                ? rawDataFile
                : clauseId
                  ? resolveClauseDataFileById(clauseId) || ''
                  : '';

            if (!dataFile.startsWith('/data/') || !keyword) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ok: false, error: 'Invalid dataFile or keyword'}));
              return;
            }

            const rel = decodeURIComponent(dataFile.slice('/data/'.length));
            const file = path.resolve(dataRoot, rel);
            const relToRoot = path.relative(dataRoot, file);
            if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ok: false, error: 'Invalid path'}));
              return;
            }

            const clause = JSON.parse(fs.readFileSync(file, 'utf8'));
            const keywords = Array.isArray(clause.keywords) ? clause.keywords : [];
            let added = !keywords.includes(keyword);

            try {
              db = openDatabase();
              initSchema(db);

              const clauseRow = db
                .prepare(
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
                )
                .get(clause.id) as
                | {
                    id: string;
                    title: string;
                    content: string;
                    translation: string;
                  }
                | undefined;

              if (clauseRow) {
                const timestamp = new Date().toISOString();
                const normalizedKeyword = normalizeKeyword(keyword);

                db.exec('BEGIN');
                db.prepare(
                  `
                    INSERT INTO keywords (name, normalized_name, created_at, updated_at)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT(normalized_name) DO UPDATE SET
                      name = excluded.name,
                      updated_at = excluded.updated_at
                  `,
                ).run(keyword, normalizedKeyword, timestamp, timestamp);

                const keywordRow = db
                  .prepare('SELECT id FROM keywords WHERE normalized_name = ? LIMIT 1')
                  .get(normalizedKeyword) as {id: number} | undefined;

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
                ).run(clause.id, keywordRow.id, 'manual', timestamp, timestamp) as {changes?: number};

                added = (insertResult?.changes || 0) > 0;
                db.exec('COMMIT');

                const clauseKeywords = db
                  .prepare(
                    `
                      SELECT k.name
                      FROM clause_keywords ck
                      JOIN keywords k ON k.id = ck.keyword_id
                      WHERE ck.clause_id = ?
                      ORDER BY k.name COLLATE NOCASE
                    `,
                  )
                  .all(clause.id) as Array<{name: string}>;

                clause.title = clauseRow.title;
                clause.content = clauseRow.content;
                clause.translation = clauseRow.translation;
                clause.keywords = clauseKeywords.map(item => item.name);
              }
            } catch (dbError) {
              if (db?.isTransaction) {
                db.exec('ROLLBACK');
              }
              console.error('Failed to sync keyword to database, fallback to JSON only:', dbError);
              clause.keywords = added ? [...keywords, keyword] : keywords;
            } finally {
              db?.close();
            }

            if (!Array.isArray(clause.keywords)) {
              clause.keywords = added ? [...keywords, keyword] : keywords;
            }

            fs.writeFileSync(file, `${JSON.stringify(clause, null, 2)}\n`, 'utf8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ok: true, added, clause}));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ok: false, error: error instanceof Error ? error.message : 'Unknown error'}));
          }
        });
      });

      server.middlewares.use('/api/keywords/remove', (req, res, next) => {
        if (req.method !== 'POST') return next();

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', () => {
          let db = null;
          try {
            const payload = JSON.parse(body || '{}');
            const clauseId = typeof payload.clauseId === 'string' ? payload.clauseId.trim() : '';
            const rawDataFile = typeof payload.dataFile === 'string' ? payload.dataFile : '';
            const keyword = typeof payload.keyword === 'string' ? payload.keyword.trim() : '';
            const dataFile =
              rawDataFile.startsWith('/data/')
                ? rawDataFile
                : clauseId
                  ? resolveClauseDataFileById(clauseId) || ''
                  : '';

            if (!dataFile.startsWith('/data/') || !keyword) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ok: false, error: 'Invalid dataFile or keyword'}));
              return;
            }

            const rel = decodeURIComponent(dataFile.slice('/data/'.length));
            const file = path.resolve(dataRoot, rel);
            const relToRoot = path.relative(dataRoot, file);
            if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ok: false, error: 'Invalid path'}));
              return;
            }

            const clause = JSON.parse(fs.readFileSync(file, 'utf8'));
            const keywords = Array.isArray(clause.keywords) ? clause.keywords : [];
            let removed = keywords.includes(keyword);

            try {
              db = openDatabase();
              initSchema(db);

              const clauseRow = db
                .prepare(
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
                )
                .get(clause.id) as
                | {
                    id: string;
                    title: string;
                    content: string;
                    translation: string;
                  }
                | undefined;

              if (clauseRow) {
                const normalizedKeyword = normalizeKeyword(keyword);

                db.exec('BEGIN');

                const keywordRow = db
                  .prepare('SELECT id FROM keywords WHERE normalized_name = ? LIMIT 1')
                  .get(normalizedKeyword) as {id: number} | undefined;

                if (keywordRow) {
                  const deleteResult = db.prepare(
                    `
                      DELETE FROM clause_keywords
                      WHERE clause_id = ? AND keyword_id = ?
                    `,
                  ).run(clause.id, keywordRow.id) as {changes?: number};

                  removed = (deleteResult?.changes || 0) > 0;
                } else {
                  removed = false;
                }

                db.exec('COMMIT');

                const clauseKeywords = db
                  .prepare(
                    `
                      SELECT k.name
                      FROM clause_keywords ck
                      JOIN keywords k ON k.id = ck.keyword_id
                      WHERE ck.clause_id = ?
                      ORDER BY k.name COLLATE NOCASE
                    `,
                  )
                  .all(clause.id) as Array<{name: string}>;

                clause.title = clauseRow.title;
                clause.content = clauseRow.content;
                clause.translation = clauseRow.translation;
                clause.keywords = clauseKeywords.map(item => item.name);
              }
            } catch (dbError) {
              if (db?.isTransaction) {
                db.exec('ROLLBACK');
              }
              console.error('Failed to sync keyword removal to database, fallback to JSON only:', dbError);
              clause.keywords = keywords.filter((item: string) => item !== keyword);
            } finally {
              db?.close();
            }

            if (!Array.isArray(clause.keywords)) {
              clause.keywords = keywords.filter((item: string) => item !== keyword);
            }

            fs.writeFileSync(file, `${JSON.stringify(clause, null, 2)}\n`, 'utf8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ok: true, removed, clause}));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify({ok: false, error: error instanceof Error ? error.message : 'Unknown error'}));
          }
        });
      });

      server.middlewares.use((req, res, next) => {
        const urlPath = req.url?.split('?')[0];
        if (!urlPath?.startsWith('/data/')) return next();
        const rel = decodeURIComponent(urlPath.slice('/data/'.length));
        const file = path.resolve(dataRoot, rel);
        const relToRoot = path.relative(dataRoot, file);
        if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) return next();
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
        const ext = path.extname(file).toLowerCase();
        const types: Record<string, string> = {
          '.json': 'application/json; charset=utf-8',
          '.txt': 'text/plain; charset=utf-8',
          '.md': 'text/markdown; charset=utf-8',
        };
        res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream');
        fs.createReadStream(file).pipe(res);
      });
    },
    closeBundle() {
      if (!fs.existsSync(dataRoot)) return;
      const out = path.resolve(__dirname, 'dist/data');
      fs.mkdirSync(path.dirname(out), {recursive: true});
      fs.cpSync(dataRoot, out, {recursive: true});
    },
  };
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    // 无 `public/` 目录；静态数据由 `data/` + `repoDataAsPublicData` 插件提供。
    publicDir: false,
    plugins: [react(), tailwindcss(), repoDataAsPublicData()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: ['**/data/**', '**/storage/**'],
      },
    },
  };
});
