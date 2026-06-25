"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Mode = "signin" | "signup";

function redirectAfterAuth(callbackUrl: string) {
  window.location.assign(callbackUrl);
}

function friendlyAuthError(err: unknown): string {
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code: string }).code)
      : "";

  switch (code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Sign in instead, or use Google if you registered that way.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password. Check your details or create a new account.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      if (err instanceof Error && err.message === "Invalid token") {
        return "Could not verify your session. Refresh the page and try again.";
      }
      if (err instanceof Error && err.message === "Failed to establish session") {
        return "Signed in with Firebase, but the server session could not be created. Refresh and try again.";
      }
      return err instanceof Error ? err.message : "Authentication failed.";
  }
}

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const initialMode: Mode =
    searchParams.get("mode") === "signup" ? "signup" : "signin";

  const { configured, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuth();

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setConfirmPassword("");
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      redirectAfterAuth(callbackUrl);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
      redirectAfterAuth(callbackUrl);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!configured) {
    return (
      <div className="card-glow mx-auto max-w-md rounded-2xl border border-yellow-500/30 bg-felt-800/50 p-8 text-center">
        <h1 className="font-display text-xl font-bold text-white">
          Firebase not configured
        </h1>
        <p className="mt-3 text-sm text-gray-400">
          Firebase client credentials are missing from the deployed build. Add{" "}
          <code className="text-gold-400">NEXT_PUBLIC_FIREBASE_*</code> to{" "}
          <code className="text-gold-400">.env.local</code> locally, or under{" "}
          <strong className="text-gray-300">Cloudflare → Build → Build variables</strong>{" "}
          (not runtime only), then redeploy. See{" "}
          <code className="text-gold-400">docs/FIREBASE-SETUP.md</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="card-glow rounded-2xl border border-white/5 bg-felt-800/50 p-8">
        <h1 className="font-display text-2xl font-bold text-white">
          {mode === "signup" ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          {mode === "signup"
            ? "Get started with PokerProbe — pick a plan after you sign up."
            : "Sign in to manage your servers and subscription."}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-felt-900/80 p-1">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`rounded-lg py-2.5 text-sm font-medium transition ${
              mode === "signin"
                ? "bg-gold-500 text-felt-950"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-lg py-2.5 text-sm font-medium transition ${
              mode === "signup"
                ? "bg-gold-500 text-felt-950"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Create account
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={handleGoogle}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-white/15 py-3 text-sm font-medium text-white transition hover:bg-white/5 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-felt-800/50 px-2 text-gray-500">
              or with email
            </span>
          </div>
        </div>

        <form onSubmit={handleEmail} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-felt-900 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-gold-400/50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-felt-900 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-gold-400/50"
              placeholder="••••••••"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm text-gray-300"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-felt-900 px-4 py-2.5 text-white placeholder-gray-500 outline-none focus:border-gold-400/50"
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gold-500 py-3 text-sm font-semibold text-felt-950 transition hover:bg-gold-400 disabled:opacity-50"
          >
            {loading
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className="text-gold-400 hover:underline"
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New to PokerProbe?{" "}
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className="text-gold-400 hover:underline"
            >
              Create an account
            </button>
            {" · "}
            <Link href="/#pricing" className="text-gold-400 hover:underline">
              View plans
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="felt-texture flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-16">
      <Suspense fallback={<div className="text-gray-400">Loading…</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
