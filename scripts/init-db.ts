import {dbFile, initSchema, openDatabase} from './db.ts';

const db = openDatabase();

try {
  initSchema(db);
  console.log(`Initialized database schema at ${dbFile}`);
} finally {
  db.close();
}
