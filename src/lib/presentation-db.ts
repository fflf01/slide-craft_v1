import { createClient, type Client } from "@libsql/client";

const DB_URL =
  process.env.LIBSQL_DATABASE_URL ??
  process.env.TURSO_DATABASE_URL ??
  "file:/tmp/canvify.sqlite";

const DB_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

type PresentationSnapshot = {
  title: string;
  currentSlideId: string;
  slides: unknown[];
};

let client: Client | undefined;
let schemaPromise: Promise<void> | undefined;

function getClient() {
  if (!client) {
    client = createClient({
      url: DB_URL,
      authToken: DB_AUTH_TOKEN,
    });
  }

  return client;
}

async function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = getClient()
      .execute({
        sql: `
          CREATE TABLE IF NOT EXISTS presentations (
            client_id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
        args: [],
      })
      .then(() => undefined);
  }

  return schemaPromise;
}

export async function getPresentation(clientId: string) {
  await ensureSchema();

  const result = await getClient().execute({
    sql: "SELECT data FROM presentations WHERE client_id = ? LIMIT 1",
    args: [clientId],
  });

  const data = result.rows[0]?.data;
  if (typeof data !== "string") return null;

  return JSON.parse(data) as PresentationSnapshot;
}

export async function savePresentation(clientId: string, presentation: PresentationSnapshot) {
  await ensureSchema();

  await getClient().execute({
    sql: `
      INSERT INTO presentations (client_id, data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(client_id) DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [clientId, JSON.stringify(presentation)],
  });
}
