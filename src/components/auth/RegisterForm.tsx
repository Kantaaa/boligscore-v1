"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { validateEmail, validatePassword } from "@/lib/auth/validation";
import { registerWithPassword } from "@/server/auth/registerWithPassword";
import { requestMagicLink } from "@/server/auth/requestMagicLink";

type Mode = "password" | "magic-link";

interface Props {
  /**
   * Pre-validated `next` query param value, or null. Forwarded into the
   * server actions which validate again defensively.
   */
  next: string | null;
}

/**
 * Register form (password primary, magic link alternate). Spec D1:
 * password is the always-available path; the magic-link variant is one
 * click away.
 *
 * After a successful password sign-up:
 *   - dev: redirect to next or /app/onboarding.
 *   - prod with EMAIL_CONFIRM=true: show "kontroller e-post" notice;
 *     the user clicks the link in the email and is sent to next.
 */
export function RegisterForm({ next }: Props) {
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
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      setError(passwordCheck.error);
      return;
    }

    startTransition(async () => {
      const r = await registerWithPassword({ email, password, next });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      if (r.data.requiresConfirmation) {
        setInfo(
          "Vi har sendt en bekreftelseslenke til e-posten din. Klikk på lenken for å fullføre registreringen.",
        );
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
        shouldCreateUser: true,
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
            <label htmlFor="reg-email" className="block text-sm text-fg-muted">
              E-post
            </label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="reg-password" className="block text-sm text-fg-muted">
              Passord
            </label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-fg-muted">Minst 8 tegn.</p>
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
            className="min-h-touch w-full rounded-full bg-primary px-6 font-semibold text-primary-fg shadow-md transition hover:bg-primary-dim hover:shadow-lg disabled:opacity-60"
          >
            {pending ? "Oppretter konto…" : "Opprett konto"}
          </button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={submitMagicLink} noValidate>
          <div className="space-y-1">
            <label htmlFor="reg-magic-email" className="block text-sm text-fg-muted">
              E-post
            </label>
            <input
              id="reg-magic-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-touch rounded-lg bg-surface-muted px-4 text-fg shadow-sm placeholder:text-fg-soft focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="min-h-touch w-full rounded-full bg-primary px-6 font-semibold text-primary-fg shadow-md transition hover:bg-primary-dim hover:shadow-lg disabled:opacity-60"
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
        Har du allerede en konto?{" "}
        <Link href={loginHref(next)} className="text-fg underline-offset-2 hover:underline">
          Logg inn
        </Link>
      </p>
    </div>
  );
}

function loginHref(next: string | null): string {
  return next
    ? `/logg-inn?next=${encodeURIComponent(next)}`
    : "/logg-inn";
}
