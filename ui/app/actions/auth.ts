"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, deleteSession, verifyPassword } from "@/app/lib/session";

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
  redirect("/login");
}
