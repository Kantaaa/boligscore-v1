# MCP-oppsett for Google Stitch (Codex)

Bruk **direkte Google Stitch MCP-endepunkt** i Codex-konfigen din.

## Anbefalt (med miljøvariabel for API key)

Legg API-nøkkelen i miljøet først:

```bash
export STITCH_API_KEY="<din_api_nokkel>"
```

Deretter i Codex-konfig (`~/.codex/config.toml`) kan du bruke:

```toml
[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"

[mcp_servers.stitch.http_headers]
"X-Goog-Api-Key" = "${env:STITCH_API_KEY}"
```

## Hvis du vil lime inn nøkkel direkte (ikke anbefalt)

```toml
[mcp_servers.stitch]
url = "https://stitch.googleapis.com/mcp"

[mcp_servers.stitch.http_headers]
"X-Goog-Api-Key" = "xxxxx....xxxxx"
```

## Sikkerhet

- Ikke commit ekte nøkler i repo.
- Rotér nøkkel hvis den har blitt delt i chat/logg.
- Foretrekk alltid `${env:...}` fremfor hardkodet nøkkel.
