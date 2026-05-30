"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSession, deleteSession } from "@/app/lib/session";
import { authorForPasscode, claimSlot } from "@/app/lib/users";
import { isAuthor } from "@/app/lib/identity";

const LoginSchema = z.object({
  passcode: z.string().min(1, "ENTER PASSCODE"),
});

export type LoginState = { error: string } | undefined;

// Passcode login: the passcode identifies WHO you are. A matching passcode both
// authenticates and proves identity (embedded in the signed session). No
// separate "pick who am I" — that was the security hole.
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    passcode: formData.get("passcode"),
  });
  if (!parsed.success) {
    return { error: "ENTER PASSCODE" };
  }

  const author = await authorForPasscode(parsed.data.passcode);
  if (!author) {
    return { error: "ACCESS DENIED" };
  }

  await createSession(author);
  redirect("/");
}

const SetupSchema = z
  .object({
    author: z.string().refine(isAuthor, "INVALID"),
    passcode: z.string().min(4, "PASSCODE TOO SHORT (MIN 4)"),
    confirm: z.string(),
  })
  .refine((d) => d.passcode === d.confirm, {
    message: "PASSCODES DON'T MATCH",
    path: ["confirm"],
  });

export type SetupState = { error: string } | undefined;

// First-run: a person claims their slot by setting a passcode. On success they
// are logged straight in as that author.
export async function setupUser(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const parsed = SetupSchema.safeParse({
    author: formData.get("author"),
    passcode: formData.get("passcode"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "INVALID" };
  }
  if (!isAuthor(parsed.data.author)) {
    return { error: "INVALID" };
  }

  const res = await claimSlot(parsed.data.author, parsed.data.passcode);
  if (!res.ok) {
    return { error: res.error ?? "SETUP FAILED" };
  }

  await createSession(parsed.data.author);
  revalidatePath("/login");
  redirect("/");
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/login");
}
