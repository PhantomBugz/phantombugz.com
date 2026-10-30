# PhantomBugz Site

This repository contains the [PhantomBugz public site](https://phantombugz.com/) and a privacy-reviewed bug bounty activity signal (all-time report counts by severity). The live site is available over HTTPS.

The [liveD LoRA Studio developer preview](https://phantombugz.com/lived-lora-studio.html) links to the [public source](https://github.com/PhantomBugz/lived-lora-studio), including a synthetic encrypted review/export demo and local or remote NVIDIA GPU selection. Model training is not yet released. The [Zombie Killer preview](https://phantombugz.com/zombie-killer.html) is labeled coming soon. For other public software, see the [PhantomBugz GitHub profile](https://github.com/PhantomBugz).

## Commands

Verify the Zombie Killer landing-page contract:

```powershell
node .\scripts\test-zombie-killer-page.mjs
```

Preview the static site from the repository root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Open http://127.0.0.1:4173/lived-lora-studio.html or http://127.0.0.1:4173/zombie-killer.html.

GitHub and GitLab Pages run the same contract and publish only the reviewed static-site allowlist assembled under `public/`.

## Data Boundary

`data\bugbounty-public.json` is intentionally public-safe. The public signal is the all-time count of submitted reports and the breakdown by severity (critical / high / medium / low). No dollar amounts of any kind are published.

Do not add dollar amounts, program names, finding titles, evidence paths, hashes, platform URLs, or credentials to public site files.

The all-time counts come from the internal ledger. Real platform events must refresh the public JSON through an internal, privacy-reviewed process that is not part of this public repository.

## Hall of Fame

`data/hall-of-fame.json` drives the Hall of Fame section on `enter.html` and the full `hall-of-fame.html` page. Each entry has `title`, `date`, `severity`, `platform`, `summary`, `url`, and `status`. Add an entry only after the affected program has fixed the issue and approved public disclosure, and keep it free of undisclosed details. Entries with `status: "placeholder"` render only as subtle "coming soon" cards; when there are no other entries the page shows "Disclosed write-ups land here once embargoes lift."

## Hosting

The public domain is live at [https://phantombugz.com/](https://phantombugz.com/). This repository records the static site and its publication checks; verify the current hosting and DNS configuration in the deployment system before changing it.
