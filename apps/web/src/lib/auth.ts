/**
 * Simple session-based auth using signed cookies.
 * Uses the Web Crypto API (globalThis.crypto) for HMAC signing,
 * which works in both Edge and Node.js runtimes.
 *
 * Session token format: base64url(payload).base64url(hmac)
 * Payload: { u: username, exp: expiryTimestamp }
 */

const COOKIE_NAME = "predictor_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionPayload {
  u: string;
  exp: number;
}

function getSecret(): string {
  return process.env.AUTH_SECRET || "dev-secret-change-in-production";
}

function strToBuf(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Cast Uint8Array to BufferSource for Web Crypto API (TS 5.7+ compat) */
function asBufferSource(u8: Uint8Array): BufferSource {
  return u8 as unknown as BufferSource;
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64ToBuf(b64: string): Uint8Array {
  const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    asBufferSource(strToBuf(getSecret())),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, asBufferSource(strToBuf(data)));
  return bufToB64(sig);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createSession(username: string): Promise<string> {
  const payload: SessionPayload = {
    u: username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const data = bufToB64(strToBuf(JSON.stringify(payload)));
  const sig = await sign(data);
  return `${data}.${sig}`;
}

export async function verifySession(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [data, sig] = parts;

  // Verify signature
  const expectedSig = await sign(data);
  if (!constantTimeEqual(strToBuf(sig), strToBuf(expectedSig))) return false;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64ToBuf(data)),
    ) as SessionPayload;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function verifyCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.AUTH_USERNAME || "admin";
  const expectedPass = process.env.AUTH_PASSWORD || "predictor123";

  // Use timing-safe comparison to prevent timing attacks
  return (
    constantTimeEqual(strToBuf(username), strToBuf(expectedUser)) &&
    constantTimeEqual(strToBuf(password), strToBuf(expectedPass))
  );
}

export const SESSION_COOKIE = COOKIE_NAME;
export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000; // seconds, for cookie maxAge
