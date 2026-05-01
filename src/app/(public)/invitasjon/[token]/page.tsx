// TODO(households): full implementation — accept invite, create or sign in, join household.

export default function InvitasjonPage({
  params,
}: {
  params: { token: string };
}) {
  return (
    <main className="mx-auto max-w-content px-6 py-16 space-y-4">
      <h1 className="text-3xl font-semibold">Invitasjon til husstand</h1>
      <p className="text-fg-muted">
        Du har fått en invitasjon. Aksepter for å bli med i husstanden.
      </p>
      <p className="text-sm text-fg-muted">
        Token:{" "}
        <code className="rounded bg-surface-raised px-1 py-0.5">
          {params.token}
        </code>
      </p>
    </main>
  );
}
