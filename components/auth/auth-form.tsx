"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { login, signup, type AuthState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const EMPTY: AuthState = {};

type Mode = "signin" | "signup";

export function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);

  const [loginState, loginAction, loginPending] = useActionState(login, EMPTY);
  const [signupState, signupAction, signupPending] = useActionState(signup, EMPTY);

  const isSignup = mode === "signup";
  const state = isSignup ? signupState : loginState;
  const action = isSignup ? signupAction : loginAction;
  const pending = isSignup ? signupPending : loginPending;

  return (
    <div className="w-full max-w-sm animate-rise">
      {/* Brand */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-primary text-primary-foreground shadow-[0_12px_30px_-8px_color-mix(in_oklch,var(--brand)_70%,transparent)]">
          <Lock className="size-6" strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">Ad Tracker</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {isSignup ? "Create your account to start tracking." : "Welcome back. Sign in to continue."}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]">
        {/* Segmented control */}
        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
          <SegmentButton active={!isSignup} onClick={() => setMode("signin")}>
            Sign in
          </SegmentButton>
          <SegmentButton active={isSignup} onClick={() => setMode("signup")}>
            Sign up
          </SegmentButton>
        </div>

        {/* key forces a fresh form (and clears native fields) when switching modes */}
        <form key={mode} action={action} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">ID</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="your unique id"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isSignup ? "new-password" : "current-password"}
                placeholder={isSignup ? "at least 6 characters" : "••••••••"}
                className="pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" strokeWidth={1.5} />
                ) : (
                  <Eye className="size-[18px]" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="mt-1 h-12 rounded-full text-[15px]">
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isSignup ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        {isSignup ? "Already have an account? " : "Don't have an account? "}
        <button
          type="button"
          onClick={() => setMode(isSignup ? "signin" : "signup")}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          {isSignup ? "Sign in" : "Sign up"}
        </button>
      </p>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
