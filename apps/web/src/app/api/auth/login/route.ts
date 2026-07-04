import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  verifyCredentials,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return NextResponse.json(
      { message: "Username and password are required" },
      { status: 400 },
    );
  }

  if (!verifyCredentials(username, password)) {
    return NextResponse.json(
      { message: "Invalid username or password" },
      { status: 401 },
    );
  }

  const token = await createSession(username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
  return res;
}
