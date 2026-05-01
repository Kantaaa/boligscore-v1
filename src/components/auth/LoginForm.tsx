"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { validateEmail } from "@/lib/auth/validation";
import { loginWithPassword } from "@/server/auth/loginWithPassword";
import { requestMagicLink } from "@/server/auth/requestMagicLink";

type Mode = "password" | "magic-link";

interface Props {
  /** Pre-validated `next` query param value, or null. */
  next: string | null;
}

/**
 * Login form (password primary, magic link alternate). Spec D1.
 *
 * Errors are surfaced inline; the form does not redirect to an error
 * page. After a successful sign-in we use `router.replace` so the
 * /logg-inn URL doesn't sit in browser history.
 */
export function LoginForm({ next }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.error);
      return;
    }
    if (!password) {
      setError("Skriv inn passordet ditt");
      return;
    }

    startTransition(async () => {
      const r = await loginWithPassword({ email, password, next });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.replace(r.data.next);
      router.refresh();
    });
  }

  function submitMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.error);
      return;
    }
    startTransition(async () => {
      const r = await requestMagicLink({
        email,
        next,
        shouldCreateUser: false,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setInfo("Sjekk e-posten din for å logge inn.");
    });
  }

  return (
    <div className="space-y-4">
      {mode === "password" ? (
        <form className="space-y-3" onSubmit={submitPassword} noValidate>
          <div className="space-y-1">
            <label htmlFor="login-email" className="block text-sm text-fg-muted">
              E-post
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <label htmlFor="login-password" className="block text-sm text-fg-muted">
                Passord
              </label>
              {/*
                Forgot-password points at Supabase's default reset flow.
                Spec 4.4: "Forgot-password link routes to Supabase's
                default reset flow." We expose a "/glemt-passord" stub
                later if a custom UI is needed.
              */}
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-status-bud-inne">
              {error}
            </p>
          ) : null}
          {info ? (
            <p role="status" className="text-sm text-fg">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="min-h-touch w-full rounded-md bg-primary px-4 text-primary-fg disabled:opacity-60"
          >
            {pending ? "Logger inn…" : "Logg inn"}
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={submitMagicLink} noValidate>
          <div className="space-y-1">
            <label htmlFor="login-magic-email" className="block text-sm text-fg-muted">
              E-post
            </label>
            <input
              id="login-magic-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-touch rounded-md border border-border bg-surface px-3 text-fg"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-status-bud-inne">
              {error}
            </p>
          ) : null}
          {info ? (
            <p role="status" className="text-sm text-fg">
              {info}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="min-h-touch w-full rounded-md bg-primary px-4 text-primary-fg disabled:opacity-60"
          >
            {pending ? "Sender…" : "Send innloggingslenke"}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "password" ? "magic-link" : "password"));
          setError(null);
          setInfo(null);
        }}
        className="block w-full text-center text-sm text-fg-muted underline-offset-2 hover:underline"
      >
        {mode === "password"
          ? "Logg inn med e-postlenke i stedet"
          : "Bruk passord i stedet"}
      </button>

      <p className="text-center text-sm text-fg-muted">
        Har du ikke en konto?{" "}
        <Link href={registerHref(next)} className="text-fg underline-offset-2 hover:underline">
          Registrer deg
        </Link>
      </p>
    </div>
  );
}

function registerHref(next: string | null): string {
  return next
    ? `/registrer?next=${encodeURIComponent(next)}`
    : "/registrer";
}
