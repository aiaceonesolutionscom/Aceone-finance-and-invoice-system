import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { eq, gt, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { appUser, sessions } from "@/lib/db/schema";

export const SESSION_COOKIE = "session_token";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessions).values({ token, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!session) return null;

  const [user] = await db.select().from(appUser).where(eq(appUser.id, 1)).limit(1);
  return user ?? null;
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized. Please log in.");
  }
  return user;
}

