# PhantomBugz Site

This folder is the imported PhantomBugz public site prototype and public monthly bug bounty ticker.

## Commands

Refresh the public-safe bounty ticker data:

```powershell
node .\phantombugz-site\scripts\sync-bugbounty-public.mjs
```

Export avatar, banner, Open Graph, and GitHub profile PNG assets:

```powershell
node .\phantombugz-site\scripts\export-brand-assets.mjs
```

Preview locally:

```powershell
node .\phantombugz-site\scripts\serve-phantombugz-site.mjs
```

Verify desktop/mobile layout and WebGL rendering:

```powershell
node .\phantombugz-site\scripts\verify-phantombugz-site.mjs
```

Build a static deployment ZIP from the repository root:

```powershell
Compress-Archive -Path .\phantombugz-site\* -DestinationPath .\deploy\phantombugz-site.zip -Force
```

## Data Boundary

`data\bugbounty-public.json` is intentionally public-safe. The public headline is submitted bounty potential for the current month. Current accepted, approved, and paid amounts stay internal and must not be exported. Historical public rollups may show last-month made and total made since launch when those fields are intentionally generated from paid records.

Do not add finding titles, evidence paths, hashes, platform URLs, credentials, current accepted amounts, current approved amounts, or current payout details to public site files.

The current-month submitted number resets by calendar month from real `submitted_at` timestamps recorded in the internal ledger. Real platform events refresh the public JSON through `tools\record-bounty-platform-event.ps1`.

## Launch Notes

The current public preview uses a temporary Cloudflare quick tunnel. Permanent launch still needs `phantombugz.com` DNS pointed at a static host such as Cloudflare Pages or GitHub Pages.
