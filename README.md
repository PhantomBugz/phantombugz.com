# PhantomBugz Site

This folder is the imported PhantomBugz public site prototype and public bug bounty signal (all-time report counts by severity).

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

`data\bugbounty-public.json` is intentionally public-safe. The public signal is the all-time count of submitted reports and the breakdown by severity (critical / high / medium / low). No dollar amounts of any kind are published.

Do not add dollar amounts, program names, finding titles, evidence paths, hashes, platform URLs, or credentials to public site files.

The all-time counts come from the internal ledger. Real platform events must refresh the public JSON through an internal, privacy-reviewed process that is not part of this public repository.

## Launch Notes

The current public preview uses a temporary Cloudflare quick tunnel. Permanent launch still needs `phantombugz.com` DNS pointed at a static host such as Cloudflare Pages or GitHub Pages.
