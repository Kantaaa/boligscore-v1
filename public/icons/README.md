# PWA icons

`icon-192.png` and `icon-512.png` are required by the manifest at
`/manifest.webmanifest`. Until the Stitch logo is available, generate
placeholders any of these ways:

- `npx pwa-asset-generator <source.png> public/icons --background "#3a6ea5" --padding "10%"`
- Export a 512×512 PNG from a vector logo, then resize a 192×192 copy.

Both files are intentionally **not** committed yet — see
`openspec/changes/navigation-shell/tasks.md` task 7.4. Once they exist,
running `npm run build` will pass them straight through `public/`.
