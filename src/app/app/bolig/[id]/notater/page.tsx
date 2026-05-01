// D11 (properties/design.md): the Notater tab is part of the stable
// five-tab structure but its content is owned by a future capability
// (private per-user notes are scoped differently from scoring's section
// notes). MVP renders a "Kommer snart" empty state.

export default function NotaterPage() {
  return (
    <article className="space-y-3 text-center" aria-labelledby="notater-heading">
      <h2 id="notater-heading" className="text-xl font-semibold">
        Notater
      </h2>
      <div className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-surface p-8">
        <div aria-hidden className="text-4xl">📝</div>
        <p className="mt-3 text-base font-medium">Kommer snart</p>
        <p className="mt-2 text-sm text-fg-muted">
          Du vil få plass til private notater om boligen her.
        </p>
      </div>
    </article>
  );
}
