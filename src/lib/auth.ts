import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import nodeCrypto from "crypto";
import { db } from "./db";
import { rateLimitAsync } from "./rate-limit";
import { SESSION_COOKIE_NAME } from "./constants";

for (const key of ["DATABASE_URL", "JWT_SECRET"] as const) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = "7d";
export const COOKIE_NAME = SESSION_COOKIE_NAME;
const BCRYPT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------
export interface JWTPayload {
  sub: string;
  email: string;
  role: "USER" | "VENDOR" | "ADMIN";
  name: string;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Cookie / Session helpers (server-side)
// ---------------------------------------------------------------------------
export async function setSessionCookie(payload: JWTPayload): Promise<string> {
  const token = signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return token;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      isBanned: true,
      avatarUrl: true,
      joinedDate: true,
      subscriptionTier: true,
      brokeragePaid: true,
    },
  });
  if (!user) return null;
  if (user.isBanned) return null;
  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

// ---------------------------------------------------------------------------
// OTP
// ---------------------------------------------------------------------------
export function generateOtp(): string {
  // 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOtp(
  identifier: string,
  purpose: string,
  userId?: string,
) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  // Invalidate previous OTPs for this identifier/purpose
  await db.otp.updateMany({
    where: { identifier, purpose, consumed: false },
    data: { consumed: true },
  });
  const otp = await db.otp.create({
    data: {
      identifier,
      code,
      purpose,
      expiresAt,
      userId: userId || null,
    },
  });
  return otp;
}

export async function verifyOtp(
  identifier: string,
  code: string,
  purpose: string,
) {
  const otp = await db.otp.findFirst({
    where: {
      identifier,
      purpose,
      code,
      consumed: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return false;
  await db.otp.update({ where: { id: otp.id }, data: { consumed: true } });
  return true;
}

// ---------------------------------------------------------------------------
// Input validation / sanitization
// ---------------------------------------------------------------------------
export function sanitizeString(input: string, maxLength = 2000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "") // strip angle brackets to prevent XSS
    .slice(0, maxLength)
    .trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string): boolean {
  return /^[+]?[\d\s\-()]{8,15}$/.test(phone);
}

export function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

// ---------------------------------------------------------------------------
// Rate limiting (sync, MemoryStore — kept for backward-compat call sites)
// ---------------------------------------------------------------------------
// ponytail: sync MemoryStore here. Middleware uses rateLimitAsync which
// can use RedisStore when REDIS_URL is set.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }
  entry.count++;
  return {
    ok: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

// ---------------------------------------------------------------------------
// API response helpers
// ---------------------------------------------------------------------------
export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function authResponse(data: unknown, csrfToken: string, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken,
    },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// ---------------------------------------------------------------------------
// CSRF token helper
// ---------------------------------------------------------------------------
// ponytail: HMAC-based double-submit token. Since session cookie is httpOnly,
// JS cannot read it — token is derived server-side only, impossible to forge
// without JWT_SECRET.
export function generateCsrfToken(sessionToken: string): string {
  return nodeCrypto
    .createHmac("sha256", JWT_SECRET)
    .update(sessionToken)
    .digest("hex");
}

export async function audit(
  action: string,
  actorId: string | null,
  target?: string,
  meta?: Record<string, unknown>,
  ip?: string,
) {
  await db.auditLog.create({
    data: {
      action,
      actorId,
      target,
      meta: meta ? JSON.stringify(meta) : null,
      ip,
    },
  });
}
