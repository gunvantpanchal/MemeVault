import { createHash } from "crypto";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const COOKIE = "mm_admin";

function makeToken(password: string) {
  const secret = process.env.ADMIN_PASSWORD ?? "changeme";
  return createHash("sha256").update(`${password}:${secret}`).digest("hex");
}

export function checkPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return input === expected;
}

export function makeSessionToken(): string {
  return makeToken(process.env.ADMIN_PASSWORD ?? "");
}

export function isValidToken(token: string): boolean {
  const expected = makeToken(process.env.ADMIN_PASSWORD ?? "");
  return token === expected;
}

export async function isAdminRequest(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE)?.value;
  return Boolean(token && isValidToken(token));
}

export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return Boolean(token && isValidToken(token));
}

export const COOKIE_NAME = COOKIE;
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: "/",
};
