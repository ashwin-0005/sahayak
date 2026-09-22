import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { CREATE_TABLES, CREATE_INDEXES } from "./schema.js";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  const raw = process.env.DB_PATH ?? config.dbPath;
  const dbPath = raw === ":memory:" ? ":memory:" : path.resolve(raw);
  if (dbPath !== ":memory:") fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  for (const stmt of CREATE_TABLES) db.exec(stmt);
  for (const stmt of CREATE_INDEXES) db.exec(stmt);
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
