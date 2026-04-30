// TODO(properties): full implementation — overview of the property (key facts, photos, status).

export default function OversiktPage({ params }: { params: { id: string } }) {
  return (
    <article className="space-y-2">
      <h2 className="text-xl font-semibold">Oversikt</h2>
      <p className="text-fg-muted">
        Bolig-id:{" "}
        <code className="rounded bg-surface-raised px-1 py-0.5 text-sm">
          {params.id}
        </code>
      </p>
    </article>
  );
}
