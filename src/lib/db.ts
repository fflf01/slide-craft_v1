import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";

import { ensureAdminUser } from "./seed-admin";

function defaultLocalDbUrl() {
  const dir = path.join(process.cwd(), ".data");
  mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, "canvify.sqlite").replace(/\\/g, "/");
  return `file:${filePath}`;
}

const DB_URL =
  process.env.LIBSQL_DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  defaultLocalDbUrl();

const DB_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

let client: Client | undefined;
let schemaPromise: Promise<void> | undefined;

export function getDb() {
  if (!client) {
    client = createClient({
      url: DB_URL,
      authToken: DB_AUTH_TOKEN,
    });
  }
  return client;
}

export async function ensureDbSchema() {
  if (!schemaPromise) {
    schemaPromise = getDb()
      .batch([
        {
          sql: `
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `,
          args: [],
        },
        {
          sql: `
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              token_hash TEXT NOT NULL UNIQUE,
              expires_at TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `,
          args: [],
        },
        {
          sql: `
            CREATE TABLE IF NOT EXISTS presentations (
              client_id TEXT PRIMARY KEY,
              data TEXT NOT NULL,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `,
          args: [],
        },
        {
          sql: `CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)`,
          args: [],
        },
        {
          sql: `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
          args: [],
        },
      ])
      .then(() => ensureAdminUser());
  }

  return schemaPromise;
}
