"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUser } from "@/lib/db/schema";
import { createSession, destroySession, getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";
import { loginSchema, changePasswordSchema, type LoginInput, type ChangePasswordInput } from "@/lib/validation/auth";

export async function login(input: LoginInput) {
  const parsed = loginSchema.parse(input);

  const [user] = await db.select().from(appUser).where(eq(appUser.id, 1)).limit(1);
  if (!user) {
    throw new Error("No account has been set up yet. Run `npm run seed-user`.");
  }

  if (user.email.toLowerCase() !== parsed.email.trim().toLowerCase()) {
    throw new Error("Invalid email or password.");
  }

  const valid = await verifyPassword(parsed.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  await createSession();
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function changePassword(input: ChangePasswordInput) {
  const parsed = changePasswordSchema.parse(input);

  const user = await getSessionUser();
  if (!user) {
    throw new Error("Not signed in.");
  }

  const valid = await verifyPassword(parsed.currentPassword, user.passwordHash);
  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  const passwordHash = await hashPassword(parsed.newPassword);
  await db.update(appUser).set({ passwordHash, updatedAt: new Date() }).where(eq(appUser.id, 1));
}
