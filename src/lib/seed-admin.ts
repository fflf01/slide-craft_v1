import { nanoid } from "nanoid";

import { hashPassword } from "./auth-password";
import { getDb } from "./db";

export const ADMIN_EMAIL = "admin@admin.com";
export const ADMIN_LOGIN = "admin";
export const ADMIN_PASSWORD = "1234567";

export async function ensureAdminUser() {
  const db = getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
    args: [ADMIN_EMAIL],
  });

  if (existing.rows.length > 0) return;

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db.execute({
    sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    args: [nanoid(16), ADMIN_EMAIL, passwordHash],
  });
}
