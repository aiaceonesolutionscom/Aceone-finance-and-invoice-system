"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUser, sessions } from "@/lib/db/schema";
import { createSession, destroySession, hashPassword, requireAuth, verifyPassword } from "@/lib/auth";
import { checkLoginRateLimit, recordFailedLogin, resetLoginRateLimit } from "@/lib/rate-limit";
import { loginSchema, changePasswordSchema, type LoginInput, type ChangePasswordInput } from "@/lib/validation/auth";

async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const realIp = headerList.get("x-real-ip");
  const cfConnectingIp = headerList.get("cf-connecting-ip");
  return (forwardedFor ? forwardedFor.split(",")[0].trim() : null) || realIp || cfConnectingIp || "127.0.0.1";
}

export async function login(input: LoginInput) {
  const ip = await getClientIp();
  const rateLimit = checkLoginRateLimit(ip);
  if (!rateLimit.allowed) {
    throw new Error(
      `Too many failed login attempts. Please wait ${rateLimit.waitMinutes} minute(s) before trying again.`
    );
  }

  const parsed = loginSchema.parse(input);

  const [user] = await db.select().from(appUser).where(eq(appUser.id, 1)).limit(1);
  if (!user) {
    throw new Error("No account has been set up yet. Run `npm run seed-user`.");
  }

  const emailMatch = user.email.toLowerCase() === parsed.email.trim().toLowerCase();
  const valid = emailMatch ? await verifyPassword(parsed.password, user.passwordHash) : false;

  if (!emailMatch || !valid) {
    const failedInfo = recordFailedLogin(ip);
    if (failedInfo.isBlocked) {
      throw new Error(
        `Too many failed login attempts. Please wait ${failedInfo.waitMinutes} minute(s) before trying again.`
      );
    }
    const remainingText =
      failedInfo.remainingAttempts > 0 ? ` (${failedInfo.remainingAttempts} attempt(s) remaining)` : "";
    throw new Error(`Invalid email or password.${remainingText}`);
  }

  resetLoginRateLimit(ip);
  await createSession();
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(input: ChangePasswordInput) {
  const user = await requireAuth();
  const parsed = changePasswordSchema.parse(input);

  const valid = await verifyPassword(parsed.currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  const passwordHash = await hashPassword(parsed.newPassword);
  await db.update(appUser).set({ passwordHash, updatedAt: new Date() }).where(eq(appUser.id, 1));

  // Invalidate any older sessions and assign a fresh session for the current browser
  await db.delete(sessions);
  await createSession();
}

