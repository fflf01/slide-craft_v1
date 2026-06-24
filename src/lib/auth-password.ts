import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;

  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}

export function isValidPassword(password: string) {
  return typeof password === "string" && password.length >= 8;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Aceita "admin" ou e-mail completo no login. */
export function resolveLoginIdentifier(login: string) {
  const trimmed = login.trim().toLowerCase();
  if (trimmed === "admin") return "admin@admin.com";
  return normalizeEmail(trimmed);
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
