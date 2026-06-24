import { createHash, randomBytes } from "node:crypto";
import { nanoid } from "nanoid";

import { ensureDbSchema, getDb } from "./db";
import { SESSION_MAX_AGE_SEC } from "./auth-cookies";
import { deletePresentation } from "./presentation-db";

export type AuthUser = {
  id: string;
  email: string;
};

export type ActiveSession = {
  sessionId: string;
  user: AuthUser | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000).toISOString();
}

export function sessionOwnerKey(sessionId: string) {
  return `session:${sessionId}`;
}

export async function createUserSession(userId: string) {
  await ensureDbSchema();

  const token = createSessionToken();
  const sessionId = nanoid(16);

  await getDb().execute({
    sql: `
      INSERT INTO sessions (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [sessionId, userId, hashToken(token), sessionExpiresAt()],
  });

  return { token, sessionId };
}

export async function getActiveSessionByToken(token: string): Promise<ActiveSession | null> {
  await ensureDbSchema();

  const result = await getDb().execute({
    sql: `
      SELECT s.id AS session_id, u.id AS user_id, u.email, s.expires_at
      FROM sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `,
    args: [hashToken(token)],
  });

  const row = result.rows[0];
  if (!row) return null;

  const expiresAt = String(row.expires_at);
  if (Date.parse(expiresAt) <= Date.now()) {
    await revokeSessionById(String(row.session_id));
    return null;
  }

  return {
    sessionId: String(row.session_id),
    user: {
      id: String(row.user_id),
      email: String(row.email),
    },
  };
}

export async function revokeSessionToken(token: string) {
  await ensureDbSchema();

  const result = await getDb().execute({
    sql: "SELECT id FROM sessions WHERE token_hash = ? LIMIT 1",
    args: [hashToken(token)],
  });

  const sessionId = result.rows[0]?.id;
  if (sessionId) await revokeSessionById(String(sessionId));
}

async function revokeSessionById(sessionId: string) {
  await deletePresentation(sessionOwnerKey(sessionId));
  await getDb().execute({
    sql: "DELETE FROM sessions WHERE id = ?",
    args: [sessionId],
  });
}

/** @deprecated use getActiveSessionByToken */
export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const session = await getActiveSessionByToken(token);
  return session?.user ?? null;
}

export function createGuestSessionId() {
  return nanoid(16);
}

export function guestSessionOwnerKey(guestSessionId: string) {
  return sessionOwnerKey(guestSessionId);
}
