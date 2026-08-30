import { createHmac } from "crypto";
import { ADMIN_COOKIE } from "./constants";

export { ADMIN_COOKIE };

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "termin";
}

export function createAdminToken(): string {
  return createHmac("sha256", getAdminPassword()).update("termin-admin").digest("hex");
}

export function isValidAdminToken(token: string | undefined): boolean {
  return Boolean(token) && token === createAdminToken();
}
