# PhantomBugz Site

This folder is the imported PhantomBugz public site prototype and public monthly bug bounty ticker.

## Commands

Verify the Zombie Killer landing-page contract:

```powershell
node .\scripts\test-zombie-killer-page.mjs
```

Preview the static site from the repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/zombie-killer.html.

GitHub and GitLab Pages run the same contract and publish only the reviewed static-site allowlist assembled under `public/`.

## Data Boundary

`data\bugbounty-public.json` is intentionally public-safe. The public headline is submitted bounty potential for the current month. Current accepted, approved, and paid amounts stay internal and must not be exported. Historical public rollups may show last-month made and total made since launch when those fields are intentionally generated from paid records.

Do not add finding titles, evidence paths, hashes, platform URLs, credentials, current accepted amounts, current approved amounts, or current payout details to public site files.

The current-month submitted number resets by calendar month from real `submitted_at` timestamps recorded in the internal ledger. Real platform events refresh the public JSON through `tools\record-bounty-platform-event.ps1`.

## Launch Notes

The current public preview uses a temporary Cloudflare quick tunnel. Permanent launch still needs `phantombugz.com` DNS pointed at a static host such as Cloudflare Pages or GitHub Pages.
