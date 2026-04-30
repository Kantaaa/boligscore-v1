import { notFound } from "next/navigation";

// TODO(auth-onboarding): full implementation — env-gated dev sign-in form.
//
// Per design.md ("Risks / Trade-offs"):
//   - Hard-block in production unless DEV_LOGIN_FORCE is explicitly set.
//   - Returns 404 in prod builds so the route is invisible.

export default function DevLoginPage() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DEV_LOGIN_FORCE !== "1"
  ) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-content px-6 py-16 space-y-4">
      <h1 className="text-3xl font-semibold">Dev-login</h1>
      <p className="text-fg-muted">
        Dette er en testbypass kun for utvikler- og e2e-miljø. Skjemaet
        leveres av <code>auth-onboarding</code>.
      </p>
    </main>
  );
}
