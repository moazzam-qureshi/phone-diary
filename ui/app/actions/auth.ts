"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { cookies } from "next/headers";
import { createSession, deleteSession, verifyPassword } from "@/app/lib/session";
import { AUTHOR_COOKIE } from "@/app/lib/identity";

const LoginSchema = z.object({
  password: z.string().min(1, "ENTER ACCESS KEY"),
});

export type LoginState = { error: string } | undefined;

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "ENTER ACCESS KEY" };
  }

  const ok = await verifyPassword(parsed.data.password);
  if (!ok) {
    return { error: "ACCESS DENIED" };
  }

  await createSession();
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  // Also clear identity so logging out is a clean reset on this device.
  (await cookies()).delete(AUTHOR_COOKIE);
  redirect("/login");
}
