// D11 (properties/design.md): the Kommentarer tab is part of the
// stable five-tab structure but its content is owned by a future
// `comments` capability. We render a "Kommer snart" empty state so
// the tab exists but is honest about its state.

export default function KommentarerPage() {
  return (
    <article className="space-y-3 text-center" aria-labelledby="kommentarer-heading">
      <h2 id="kommentarer-heading" className="text-xl font-semibold">
        Kommentarer
      </h2>
      <div className="mx-auto max-w-md rounded-lg border border-dashed border-border bg-surface p-8">
        <div aria-hidden className="text-4xl">💬</div>
        <p className="mt-3 text-base font-medium">Kommer snart</p>
        <p className="mt-2 text-sm text-fg-muted">
          Her vil dere kunne diskutere boligen sammen.
        </p>
      </div>
    </article>
  );
}
