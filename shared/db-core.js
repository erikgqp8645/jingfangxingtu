import {mkdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {resolveFromAppRoot, resolveAppRoot} from './runtime-paths.js';

export const rootDir = resolveAppRoot();
export const storageDir = resolveFromAppRoot('storage');
export const dbFile = resolveFromAppRoot('storage', 'app.db');

export function ensureStorageDir() {
  mkdirSync(storageDir, {recursive: true});
}

export function now() {
  return new Date().toISOString();
}

export function openDatabase() {
  ensureStorageDir();
  const db = new DatabaseSync(dbFile);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');
  return db;
}

export function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chapters_book_id_sort_order
      ON chapters(book_id, sort_order);

    CREATE TABLE IF NOT EXISTS clauses (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      clause_no TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      translation TEXT NOT NULL DEFAULT '',
      source_file TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_clauses_book_id ON clauses(book_id);
    CREATE INDEX IF NOT EXISTS idx_clauses_chapter_id ON clauses(chapter_id);
    CREATE INDEX IF NOT EXISTS idx_clauses_clause_no ON clauses(clause_no);

    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clause_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clause_id TEXT NOT NULL,
      keyword_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (clause_id, keyword_id),
      FOREIGN KEY (clause_id) REFERENCES clauses(id) ON DELETE CASCADE,
      FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_clause_keywords_clause_id ON clause_keywords(clause_id);
    CREATE INDEX IF NOT EXISTS idx_clause_keywords_keyword_id ON clause_keywords(keyword_id);

    CREATE TABLE IF NOT EXISTS relation_sources (
      id TEXT PRIMARY KEY,
      source_name TEXT NOT NULL,
      file_base_name TEXT NOT NULL UNIQUE,
      category TEXT,
      source_type TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relation_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relation_source_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      raw_keyword TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (relation_source_id) REFERENCES relation_sources(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_relation_entries_source_id ON relation_entries(relation_source_id);

    CREATE TABLE IF NOT EXISTS relation_entry_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      relation_entry_id INTEGER NOT NULL,
      keyword_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (relation_entry_id, keyword_id),
      FOREIGN KEY (relation_entry_id) REFERENCES relation_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_relation_entry_keywords_keyword_id
      ON relation_entry_keywords(keyword_id);
  `);
}

export function normalizeKeyword(value) {
  return value.trim().replace(/\s+/g, ' ');
}
