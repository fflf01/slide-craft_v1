import { ensureDbSchema, getDb } from "./db";

type PresentationSnapshot = {
  title: string;
  currentSlideId: string;
  slides: unknown[];
};

export async function getPresentation(ownerKey: string) {
  await ensureDbSchema();

  const result = await getDb().execute({
    sql: "SELECT data FROM presentations WHERE client_id = ? LIMIT 1",
    args: [ownerKey],
  });

  const data = result.rows[0]?.data;
  if (typeof data !== "string") return null;

  return JSON.parse(data) as PresentationSnapshot;
}

export async function savePresentation(ownerKey: string, presentation: PresentationSnapshot) {
  await ensureDbSchema();

  await getDb().execute({
    sql: `
      INSERT INTO presentations (client_id, data, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(client_id) DO UPDATE SET
        data = excluded.data,
        updated_at = CURRENT_TIMESTAMP
    `,
    args: [ownerKey, JSON.stringify(presentation)],
  });
}

export async function deletePresentation(ownerKey: string) {
  await ensureDbSchema();
  await getDb().execute({
    sql: "DELETE FROM presentations WHERE client_id = ?",
    args: [ownerKey],
  });
}

/** @deprecated use getPresentation(ownerKey) */
export async function getPresentationByClientId(clientId: string) {
  return getPresentation(clientId);
}

/** @deprecated use savePresentation(ownerKey) */
export async function savePresentationByClientId(clientId: string, presentation: PresentationSnapshot) {
  return savePresentation(clientId, presentation);
}
