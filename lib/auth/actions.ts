"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSession, destroySession } from "@/lib/auth/session";

export type AuthState = { error?: string };

const USERNAME_RE = /^[a-zA-Z0-9_.]+$/;

function validate(username: string, password: string): string | null {
  if (username.length < 3) return "ID must be at least 3 characters.";
  if (username.length > 30) return "ID must be 30 characters or fewer.";
  if (!USERNAME_RE.test(username))
    return "ID can only contain letters, numbers, underscores and dots.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const validationError = validate(username, password);
  if (validationError) return { error: validationError };

  const supabase = createAdminClient();

  // Case-insensitive "already taken" check.
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (lookupError) return { error: "Something went wrong. Please try again." };
  if (existing) return { error: "That ID is already taken." };

  const password_hash = await bcrypt.hash(password, 12);

  const { data: created, error: insertError } = await supabase
    .from("users")
    .insert({ username, password_hash })
    .select("id, username")
    .single();

  if (insertError || !created) {
    // Unique index race → treat as taken.
    if (insertError?.code === "23505") return { error: "That ID is already taken." };
    return { error: "Could not create your account. Please try again." };
  }

  await createSession({ userId: created.id, username: created.username });
  redirect("/");
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) return { error: "Enter your ID and password." };

  const supabase = createAdminClient();

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username, password_hash")
    .ilike("username", username)
    .maybeSingle();

  // Generic message — don't reveal whether the ID exists.
  const invalid = { error: "Invalid ID or password." };
  if (error || !user) {
    // Run a dummy compare to reduce timing signal.
    await bcrypt.compare(password, "$2a$12$ABCDEFGHIJKLMNOPQRSTUVWXYZ012345678901234567890123456");
    return invalid;
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return invalid;

  await createSession({ userId: user.id, username: user.username });
  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
