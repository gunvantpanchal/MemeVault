import { NextRequest, NextResponse } from "next/server";
import { checkPassword, makeSessionToken, COOKIE_NAME, COOKIE_OPTIONS } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json() as { password?: string };

  if (!password || !checkPassword(password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, makeSessionToken(), COOKIE_OPTIONS);
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTIONS, maxAge: 0 });
  return res;
}
