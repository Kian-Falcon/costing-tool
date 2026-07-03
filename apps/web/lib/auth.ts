import { type UserRole } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "kf_session";

const ROLE_RANK: Record<UserRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3
};

export class AuthError extends Error {
  constructor(message: string, public status = 401) {
    super(message);
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, expectedHash] = stored.split(":");
  if (!salt || !expectedHash) return false;
  const actual = Buffer.from(pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("base64url"));
  const expected = Buffer.from(expectedHash);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken(userId: string): string {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 14;
  const payload = Buffer.from(JSON.stringify({ userId, expiresAt })).toString("base64url");
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function readSessionToken(token: string | undefined): { userId: string; expiresAt: number } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { userId?: string; expiresAt?: number };
    if (!parsed.userId || !parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return { userId: parsed.userId, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = readSessionToken(cookies().get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      organizationId: true,
      organization: { select: { id: true, name: true } }
    }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Authentication required.", 401);
  return user;
}

export function requireRole(user: CurrentUser, role: UserRole) {
  if (ROLE_RANK[user.role] < ROLE_RANK[role]) throw new AuthError("Insufficient permissions.", 403);
}

export function authJsonError(error: unknown) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: "Invalid form data." }, { status: 400 });
  if (error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Prisma.PrismaClientInitializationError || error instanceof Prisma.PrismaClientValidationError) {
    return Response.json({ error: databaseSetupMessage(error) }, { status: 500 });
  }
  return Response.json({ error: "Unexpected authentication error." }, { status: 500 });
}

export function setSessionCookie(response: Response, userId: string) {
  const token = createSessionToken(userId);
  response.headers.append("set-cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 14}`);
}

export function clearSessionCookie(response: Response) {
  response.headers.append("set-cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function sign(payload: string): string {
  return createHmac("sha256", authSecret()).update(payload).digest("base64url");
}

function authSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-only-kian-falcon-costing-secret";
}

function databaseSetupMessage(error: Error): string {
  if (/passwordHash|lastLoginAt|column|does not exist/i.test(error.message)) {
    return "Database schema is not updated. Run `npx prisma db push` with the production DATABASE_URL, then redeploy.";
  }
  if (/connect|Can't reach|Authentication failed|database/i.test(error.message)) {
    return "Database connection failed. Check DATABASE_URL in Vercel and Supabase.";
  }
  return "Database setup error. Check Vercel function logs for details.";
}
