import { nanoid } from "nanoid";

import { ensureDbSchema, getDb } from "./db";
import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
  resolveLoginIdentifier,
  verifyPassword,
} from "./auth-password";
import { createUserSession, type AuthUser } from "./auth-session";

export type { AuthUser };

export async function registerUser(email: string, password: string) {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    throw new AuthError("E-mail inválido.", 400);
  }
  if (!isValidPassword(password)) {
    throw new AuthError("A senha deve ter pelo menos 8 caracteres.", 400);
  }

  await ensureDbSchema();

  const existing = await getDb().execute({
    sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
    args: [normalized],
  });
  if (existing.rows.length > 0) {
    throw new AuthError("Este e-mail já está cadastrado.", 409);
  }

  const userId = nanoid(16);
  const passwordHash = await hashPassword(password);

  await getDb().execute({
    sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    args: [userId, normalized, passwordHash],
  });

  const token = await createUserSession(userId);
  return { user: { id: userId, email: normalized }, token: token.token, sessionId: token.sessionId };
}

export async function loginUser(email: string, password: string) {
  const normalized = resolveLoginIdentifier(email);
  if (!isValidEmail(normalized) || !password) {
    throw new AuthError("E-mail ou senha inválidos.", 400);
  }

  await ensureDbSchema();

  const result = await getDb().execute({
    sql: "SELECT id, email, password_hash FROM users WHERE email = ? LIMIT 1",
    args: [normalized],
  });

  const row = result.rows[0];
  if (!row) {
    throw new AuthError("E-mail ou senha incorretos.", 401);
  }

  const valid = await verifyPassword(password, String(row.password_hash));
  if (!valid) {
    throw new AuthError("E-mail ou senha incorretos.", 401);
  }

  const user: AuthUser = { id: String(row.id), email: String(row.email) };
  const session = await createUserSession(user.id);
  return { user, token: session.token, sessionId: session.sessionId };
}

export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
