import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "./constants";
import type { ActionResult } from "@/types/booking";

export { ADMIN_COOKIE };

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const TOKEN_PAYLOAD = "termin-admin";

let missingProductionPasswordLogged = false;

export const UNAUTHORIZED_RESULT = {
  ok: false as const,
  error: "Немате пристап.",
  code: "UNAUTHORIZED" as const,
};

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
}

/** Returns the configured password, or undefined if missing/empty. Never falls back to a default. */
export function getAdminPassword(): string | undefined {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.trim() === "") {
    if (process.env.NODE_ENV === "production" && !missingProductionPasswordLogged) {
      missingProductionPasswordLogged = true;
      console.error("ADMIN_PASSWORD is required in production. Admin authentication is disabled.");
    }
    return undefined;
  }
  return password;
}

function tokenForPassword(password: string): string {
  return createHmac("sha256", password).update(TOKEN_PAYLOAD).digest("hex");
}

export function createAdminToken(): string {
  const password = getAdminPassword();
  if (!password) {
    throw new Error("ADMIN_PASSWORD is required");
  }
  return tokenForPassword(password);
}

export function isValidAdminToken(token: string | undefined): boolean {
  const password = getAdminPassword();
  if (!password || !token) {
    return false;
  }
  return safeEqual(token, tokenForPassword(password));
}

export function isAdminPasswordCorrect(password: string): boolean {
  const expected = getAdminPassword();
  if (!expected) {
    return false;
  }
  return safeEqual(password, expected);
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isValidAdminToken(cookieStore.get(ADMIN_COOKIE)?.value);
}

/** Server Action gate. Callers must return the result when `ok` is false. */
export async function requireAdmin(): Promise<ActionResult> {
  if (await isAdmin()) {
    return { ok: true, data: undefined };
  }
  return UNAUTHORIZED_RESULT;
}

export async function setAdminSessionCookie(): Promise<boolean> {
  if (!getAdminPassword()) {
    return false;
  }
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, createAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return true;
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
