# Zombie Killer Site Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a truthful Zombie Killer feature link to the PhantomBugz landing page and a polished, accessible `zombie-killer.html` coming-soon page.

**Architecture:** Keep the site dependency-free and static. Extend the existing landing-page markup and shared stylesheet, add one standalone project page, and enforce the public claims/link topology with a Node standard-library contract test that runs before GitHub Pages deployment.

**Tech Stack:** Static HTML5, existing CSS custom properties and local fonts/assets, Node.js 24 standard library, GitHub Pages/GitHub Actions.

---

## File Map

- Create `zombie-killer.html`: canonical project teaser page and truthful alpha/platform copy.
- Create `scripts/test-zombie-killer-page.mjs`: dependency-free contract, link, metadata, claim, and deployment-order checks.
- Modify `enter.html`: add the header link and homepage project feature between the vault and signal sections.
- Modify `styles.css`: add only `.zk-*` scoped project styles plus responsive rules.
- Modify `sitemap.xml`: publish the canonical project URL.
- Modify `.github/workflows/pages.yml`: run the contract test before packaging the Pages artifact.
- Modify `.gitlab-ci.yml`: include every page/runtime file required by the new link in the explicit Pages artifact allowlist.
- Modify `README.md`: document the exact verification and local-preview commands.

### Task 1: Add the failing public-page contract

**Files:**
- Create: `scripts/test-zombie-killer-page.mjs`

- [ ] **Step 1: Create the dependency-free contract test**

Create `scripts/test-zombie-killer-page.mjs` with this complete content:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relativePath) => readFileSync(path.join(root, relativePath), "utf8");

assert.ok(
  existsSync(path.join(root, "zombie-killer.html")),
  "zombie-killer.html must exist",
);

const enter = read("enter.html");
const page = read("zombie-killer.html");
const styles = read("styles.css");
const sitemap = read("sitemap.xml");

assert.match(enter, /<a href="\.\/zombie-killer\.html">Zombie Killer<\/a>/);
assert.match(enter, /<section id="zombie-killer" class="zk-feature"/);
assert.match(enter, /<a class="zk-cta" href="\.\/zombie-killer\.html">Meet Zombie Killer/);

const vaultIndex = enter.indexOf('id="vault"');
const zombieIndex = enter.indexOf('id="zombie-killer"');
const signalIndex = enter.indexOf('id="signal"');
assert.ok(
  vaultIndex >= 0 && vaultIndex < zombieIndex && zombieIndex < signalIndex,
  "Zombie Killer feature must appear between the vault and signal",
);

assert.match(page, /<main id="zk-main"/);
assert.match(page, /<h1 id="zk-title">Zombie Killer<\/h1>/);
assert.match(page, /Local-first process safety for AI-agent workloads\./);
assert.match(page, /v0\.1\.0-alpha\.1/);
assert.match(page, /Coming Soon/);
assert.match(page, /Apache-2\.0/);
assert.match(page, /Windows/);
assert.match(page, /Linux/);
assert.match(page, /pidfd/);
assert.match(page, /macOS/);
assert.match(page, /scan and inspect only/i);
assert.match(page, /auditable receipts/i);
assert.doesNotMatch(page, /\bdata-reveal\b/, "standalone page must remain visible without JavaScript");
assert.match(page, /<link rel="canonical" href="https:\/\/phantombugz\.com\/zombie-killer\.html">/);
assert.match(page, /<meta property="og:url" content="https:\/\/phantombugz\.com\/zombie-killer\.html">/);
assert.match(page, /<a[^>]+href="https:\/\/github\.com\/PhantomBugz"[^>]*>Follow PhantomBugz on GitHub<\/a>/);
assert.doesNotMatch(page, /(?:href|src)="\/(?!\/)/, "rendered asset and navigation URLs must stay relative");
assert.doesNotMatch(
  page,
  /<a[^>]+(?:download|href="[^"]+\.(?:exe|msi|dmg|pkg|zip))/i,
  "coming-soon page must not offer an artifact download",
);

for (const selector of [".zk-feature", ".zk-page", ".zk-hero", ".zk-capability-grid", ".zk-release"]) {
  assert.ok(styles.includes(selector), `styles.css must define ${selector}`);
}
assert.match(styles, /@media \(max-width: 720px\)/);
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(styles, /grid-template-columns:\s*34px minmax\(0, 1fr\)/);
assert.match(styles, /flex-wrap:\s*wrap/);
assert.match(sitemap, /<loc>https:\/\/phantombugz\.com\/zombie-killer\.html<\/loc>/);

for (const match of page.matchAll(/(?:href|src)="(\.\/[^"#?]+)[^\"]*"/g)) {
  const relativePath = match[1].slice(2);
  assert.ok(existsSync(path.join(root, relativePath)), `${match[1]} must resolve inside the static site`);
}

console.log("Zombie Killer public-page contract passed.");
```

- [ ] **Step 2: Run the contract to prove it fails for the missing page**

Run: `node .\scripts\test-zombie-killer-page.mjs`

Expected: exit code `1` with `AssertionError [ERR_ASSERTION]: zombie-killer.html must exist`.

### Task 2: Build the homepage feature and project page

**Files:**
- Modify: `enter.html:59-65`
- Modify: `enter.html:224-226`
- Create: `zombie-killer.html`
- Modify: `styles.css:1221-1230`
- Modify: `styles.css:1321-1407`
- Modify: `sitemap.xml`
- Test: `scripts/test-zombie-killer-page.mjs`

- [ ] **Step 1: Add the landing-page navigation link**

Make the header navigation exactly:

```html
<nav class="header-nav" aria-label="Sections">
  <a href="#vault">Ghost Series</a>
  <a href="./shop.html">Shop</a>
  <a href="./zombie-killer.html">Zombie Killer</a>
  <a href="#signal">Signal</a>
  <a href="https://github.com/PhantomBugz">GitHub</a>
  <a href="https://gitlab.com/Phantombugz">GitLab</a>
</nav>
```

- [ ] **Step 2: Add the homepage feature immediately before `#signal`**

```html
<section id="zombie-killer" class="zk-feature" aria-labelledby="zk-feature-title">
  <div class="zk-feature-grid">
    <div class="zk-feature-copy" data-reveal>
      <p class="eyebrow">Open source / alpha</p>
      <h2 id="zk-feature-title">Zombie Killer</h2>
      <p class="zk-feature-lead">Local-first process safety for AI-agent workloads.</p>
      <p class="zk-feature-text">Detect, inspect, and safely contain abandoned, runaway, or unresponsive agent processes without trusting a PID alone.</p>
      <p class="zk-feature-meta"><span>v0.1.0-alpha.1</span><span>Coming Soon</span><span>Apache-2.0</span></p>
      <a class="zk-cta" href="./zombie-killer.html">Meet Zombie Killer <span aria-hidden="true">&rarr;</span></a>
    </div>
    <div class="zk-process-map" data-reveal aria-hidden="true">
      <span>01 / DETECT</span><i></i>
      <span>02 / VERIFY</span><i></i>
      <span>03 / CONTAIN</span><i></i>
      <span>04 / RECEIPT</span>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Create the teaser page with exact public claims**

Create `zombie-killer.html` from the following exact head and body blocks. Canonical/Open Graph/Twitter metadata uses the required absolute public URL; every rendered local navigation and asset `href`/`src` stays relative. Do not link the existing root-absolute `site.webmanifest` from this project-path-safe page.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zombie Killer — Local-First AI-Agent Process Safety | PhantomBugz</title>
<meta name="description" content="Meet Zombie Killer, an Apache-2.0 local-first desktop tool for detecting, reviewing, and safely containing abandoned or runaway AI-agent processes.">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#010608">
<link rel="canonical" href="https://phantombugz.com/zombie-killer.html">
<meta property="og:site_name" content="PhantomBugz">
<meta property="og:title" content="Zombie Killer — Local-First AI-Agent Process Safety">
<meta property="og:description" content="Detect, verify, contain, and record abandoned or runaway AI-agent processes. v0.1.0-alpha.1 is coming soon.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://phantombugz.com/zombie-killer.html">
<meta property="og:image" content="https://phantombugz.com/assets/exports/phantombugz-og-image.png">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="420">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Zombie Killer — PhantomBugz">
<meta name="twitter:description" content="Local-first process safety for AI-agent workloads. Coming soon under Apache-2.0.">
<meta name="twitter:image" content="https://phantombugz.com/assets/exports/phantombugz-og-image.png">
<link rel="icon" href="./assets/exports/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="./assets/exports/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="./assets/exports/apple-touch-icon.png">
<link rel="preload" href="./assets/fonts/anton.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="./assets/fonts/jetbrains-mono-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="./assets/fonts/fonts.css">
<link rel="stylesheet" href="./styles.css">
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Zombie Killer",
  "applicationCategory": "SecurityApplication",
  "softwareVersion": "0.1.0-alpha.1",
  "operatingSystem": "Windows, Linux, macOS",
  "license": "https://spdx.org/licenses/Apache-2.0.html",
  "url": "https://phantombugz.com/zombie-killer.html",
  "author": { "@type": "Organization", "name": "PhantomBugz", "url": "https://phantombugz.com/" }
}
</script>
</head>
```

```html
<body class="zk-page">
  <a class="skip-link" href="#zk-main">Skip to Zombie Killer</a>
  <header class="site-header" aria-label="Primary">
    <a class="brand-lockup" href="./enter.html#arrival" aria-label="PhantomBugz home">
      <img src="./assets/exports/phantombugz-emblem-transparent.png" alt="" aria-hidden="true" width="34" height="34">
    </a>
    <nav class="header-nav" aria-label="Sections">
      <a href="./enter.html">PhantomBugz</a>
      <a href="https://github.com/PhantomBugz">GitHub</a>
    </nav>
  </header>

  <main id="zk-main" class="zk-shell" tabindex="-1">
    <section class="zk-hero" aria-labelledby="zk-title">
      <div class="zk-hero-copy">
        <p class="eyebrow">Open source / alpha</p>
        <h1 id="zk-title">Zombie Killer</h1>
        <p class="zk-lead">Local-first process safety for AI-agent workloads.</p>
        <p class="zk-intro">Detect, inspect, and safely contain abandoned, runaway, or unresponsive agent processes without trusting a PID alone.</p>
        <p class="zk-status" aria-label="Version 0.1.0 alpha 1, coming soon, Apache 2.0"><span>v0.1.0-alpha.1</span><span>Coming Soon</span><span>Apache-2.0</span></p>
        <div class="zk-actions">
          <a class="zk-cta" href="https://github.com/PhantomBugz">Follow PhantomBugz on GitHub</a>
          <a class="zk-text-link" href="./enter.html">Back to PhantomBugz</a>
        </div>
      </div>
      <div class="zk-console" aria-hidden="true">
        <p><span>01</span> DETECT <b>candidate process tree</b></p>
        <p><span>02</span> VERIFY <b>exact process identity</b></p>
        <p><span>03</span> CONTAIN <b>capability-bound action</b></p>
        <p><span>04</span> RECEIPT <b>local auditable result</b></p>
      </div>
    </section>

    <section class="zk-capabilities" aria-labelledby="zk-capabilities-title">
      <p class="eyebrow">What it does</p>
      <h2 id="zk-capabilities-title">Observe first. Act with proof.</h2>
      <div class="zk-capability-grid">
        <article><p class="zk-card-number">01</p><h3>Local-first detection</h3><p>Inspect likely AI-agent processes and their evidence without sending process data to a remote control plane.</p></article>
        <article><p class="zk-card-number">02</p><h3>Identity-bound containment</h3><p>Bind actions to the reviewed process instance so PID reuse or identity drift fails closed, then record truthful local auditable receipts.</p></article>
        <article><p class="zk-card-number">03</p><h3>Capability-aware platforms</h3><p>Use reviewed actions on Windows and supported Linux systems with pidfd; use scan and inspect only on macOS in this alpha.</p></article>
      </div>
    </section>

    <section class="zk-platforms" aria-labelledby="zk-platforms-title">
      <p class="eyebrow">Alpha platform boundary</p>
      <h2 id="zk-platforms-title">Capability checked at runtime</h2>
      <dl class="zk-platform-list">
        <div><dt>Windows</dt><dd>Reviewed stop actions are available after the stable-binding capability probe succeeds.</dd></div>
        <div><dt>Linux</dt><dd>Stop actions require pidfd support and a successful runtime capability probe.</dd></div>
        <div><dt>macOS</dt><dd>Zombie Killer can scan and inspect only in this alpha; process actions remain unavailable.</dd></div>
      </dl>
    </section>

    <section class="zk-release" aria-labelledby="zk-release-title">
      <p class="eyebrow">Release status</p>
      <h2 id="zk-release-title">Coming soon, after the evidence is complete.</h2>
      <p>The reviewed source candidate is prepared. Public source and signed downloads will appear only after hosted verification, platform signing, and macOS notarization gates complete.</p>
      <p>Zombie Killer software is licensed under Apache-2.0. Bundled artwork, fonts, and third-party components retain their own notices and licenses.</p>
    </section>
  </main>

  <footer class="site-footer">
    <a class="foot-mark" href="./enter.html" aria-label="PhantomBugz home">
      <img src="./assets/exports/phantombugz-emblem-transparent.png" alt="" aria-hidden="true" width="26" height="26">
      <span>PhantomBugz</span>
    </a>
    <nav aria-label="Footer">
      <a href="./enter.html">Home</a>
      <a href="https://github.com/PhantomBugz">GitHub</a>
      <a href="mailto:founder@phantombugz.com">founder@phantombugz.com</a>
    </nav>
  </footer>
</body>
</html>
```

- [ ] **Step 4: Add the scoped homepage and project-page CSS**

Insert this complete block immediately before `/* ---------- Signal ---------- */` in `styles.css`:

```css
/* ---------- Zombie Killer ---------- */
.main-page .header-nav a,
.zk-page .header-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
}

.main-page .zk-feature {
  background: linear-gradient(135deg, rgba(2, 16, 20, .9), rgba(1, 6, 8, .78));
}

.zk-feature {
  position: relative;
  z-index: 2;
  padding: clamp(64px, 11vh, 124px) clamp(20px, 5vw, 64px);
  border-top: 1px solid var(--line);
  overflow: hidden;
}

.zk-feature-grid {
  max-width: 1180px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, .9fr);
  gap: clamp(36px, 7vw, 96px);
  align-items: center;
}

.zk-feature h2,
.zk-capabilities h2,
.zk-platforms h2,
.zk-release h2 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 400;
  font-size: clamp(2.4rem, 7vw, 5.6rem);
  line-height: .95;
  text-transform: uppercase;
}

.zk-feature-lead,
.zk-lead {
  color: var(--cyan-2);
  font-size: clamp(1.05rem, 2vw, 1.4rem);
}

.zk-feature-text,
.zk-intro,
.zk-release > p,
.zk-platform-list dd,
.zk-capability-grid article > p:last-child {
  color: var(--muted);
}

.zk-feature-meta,
.zk-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 24px 0;
}

.zk-feature-meta span,
.zk-status span {
  padding: 7px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--cyan-2);
  font-size: .68rem;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.zk-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 44px;
  padding: 12px 18px;
  border: 1px solid var(--cyan);
  border-radius: 7px;
  background: rgba(0, 231, 255, .1);
  color: var(--ink);
  font-size: .74rem;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.zk-cta:hover {
  background: rgba(0, 231, 255, .2);
  box-shadow: var(--glow);
}

.zk-process-map,
.zk-console {
  padding: clamp(22px, 5vw, 42px);
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: rgba(1, 8, 10, .92);
  box-shadow: inset 0 0 42px rgba(0, 231, 255, .05), 0 0 48px rgba(0, 231, 255, .08);
}

.zk-process-map {
  display: grid;
  gap: 15px;
}

.zk-process-map span {
  color: var(--cyan-2);
  letter-spacing: .18em;
}

.zk-process-map i {
  width: 1px;
  height: 20px;
  margin-left: 7px;
  background: linear-gradient(var(--cyan), transparent);
}

.zk-page {
  background: radial-gradient(circle at 72% 18%, rgba(0, 231, 255, .1), transparent 34%), linear-gradient(160deg, #010608, #020d10 52%, #010608);
}

.zk-page .site-header {
  background: rgba(1, 6, 8, .86);
  border-bottom: 1px solid var(--line);
}

.zk-shell {
  min-height: 100vh;
  padding-top: 80px;
}

.zk-shell:focus,
.zk-shell:focus-visible {
  outline: none;
}

.zk-hero,
.zk-capabilities,
.zk-platforms,
.zk-release {
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(64px, 10vh, 112px) clamp(20px, 5vw, 64px);
}

.zk-hero {
  min-height: calc(100vh - 80px);
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(300px, .85fr);
  gap: clamp(38px, 7vw, 94px);
  align-items: center;
}

.zk-hero h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(4rem, 12vw, 9rem);
  font-weight: 400;
  line-height: .82;
  text-transform: uppercase;
  text-shadow: 0 0 42px rgba(0, 231, 255, .28);
}

.zk-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: center;
}

.zk-text-link {
  color: var(--muted);
  text-decoration: underline;
  text-underline-offset: 5px;
}

.zk-console p {
  display: grid;
  grid-template-columns: 3ch 1fr;
  gap: 10px;
  margin: 0;
  padding: 17px 0;
  border-bottom: 1px solid var(--line);
  color: var(--cyan-2);
}

.zk-console p:last-child { border-bottom: 0; }
.zk-console span { color: var(--green); }
.zk-console b { grid-column: 2; color: var(--muted); font-size: .72rem; font-weight: 400; }

.zk-feature-text,
.zk-intro,
.zk-console b,
.zk-capability-grid p,
.zk-platform-list dd,
.zk-release p {
  overflow-wrap: anywhere;
}

.zk-capabilities,
.zk-platforms,
.zk-release {
  border-top: 1px solid var(--line);
}

.zk-capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 42px;
}

.zk-capability-grid article {
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
}

.zk-card-number { color: var(--green); }

.zk-platform-list {
  margin: 42px 0 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.zk-platform-list > div {
  display: grid;
  grid-template-columns: minmax(100px, .28fr) 1fr;
  gap: 24px;
  padding: 20px 22px;
  border-bottom: 1px solid var(--line);
  background: rgba(2, 12, 15, .68);
}

.zk-platform-list > div:last-child { border-bottom: 0; }
.zk-platform-list dt { color: var(--cyan-2); font-weight: 700; }
.zk-platform-list dd { margin: 0; }
.zk-release { margin-bottom: clamp(40px, 8vh, 90px); }
```

Replace the current mobile header declarations inside `@media (max-width: 720px)` with these declarations, then add the project-grid declarations shown here. The grid and wrapping are required because the current navigation already overflows at 320 px before adding the new link:

```css
  .main-page .site-header,
  .zk-page .site-header {
    position: relative;
    display: grid;
    grid-template-columns: 34px minmax(0, 1fr);
    align-items: start;
    gap: 12px;
    padding: 12px 18px;
  }
  .main-page .header-nav,
  .zk-page .header-nav {
    min-width: 0;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: .62rem;
    letter-spacing: .08em;
  }
  .zk-feature-grid,
  .zk-hero {
    grid-template-columns: 1fr;
  }
  .zk-hero {
    min-height: auto;
    padding-top: 84px;
  }
  .zk-shell {
    padding-top: 0;
  }
  .zk-capability-grid {
    grid-template-columns: 1fr;
  }
  .zk-platform-list > div {
    grid-template-columns: 1fr;
    gap: 6px;
  }
```

Add these declarations inside `@media (max-width: 420px)`:

```css
  .zk-feature-meta span,
  .zk-status span,
  .zk-actions,
  .zk-cta {
    width: 100%;
  }
  .zk-feature-meta span,
  .zk-status span {
    text-align: center;
  }
```

- [ ] **Step 5: Add the canonical URL to `sitemap.xml`**

```xml
<url>
  <loc>https://phantombugz.com/zombie-killer.html</loc>
  <lastmod>2026-08-14</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
```

- [ ] **Step 6: Run the contract and commit the tested page**

Run:

```powershell
node .\scripts\test-zombie-killer-page.mjs
if ($LASTEXITCODE) { throw 'Zombie Killer page contract failed' }
git diff --check
if ($LASTEXITCODE) { throw 'Feature diff contains whitespace errors' }
```

Expected: `Zombie Killer public-page contract passed.` and no whitespace errors.

Commit:

```powershell
git add -- scripts/test-zombie-killer-page.mjs enter.html zombie-killer.html styles.css sitemap.xml
if ($LASTEXITCODE) { throw 'Unable to stage the tested page' }
git commit -s -m "feat: introduce Zombie Killer on PhantomBugz"
if ($LASTEXITCODE) { throw 'Unable to commit the tested page' }
```

### Task 3: Put the contract in both Pages release paths

**Files:**
- Modify: `scripts/test-zombie-killer-page.mjs`
- Modify: `.github/workflows/pages.yml`
- Modify: `.gitlab-ci.yml`
- Modify: `README.md`

- [ ] **Step 1: Extend the test with deployment and documentation checks**

Add `workflow`, `gitlab`, and `readme` reads, then add these exact assertions before `console.log`:

```js
const workflow = read(".github/workflows/pages.yml");
const gitlab = read(".gitlab-ci.yml");
const readme = read("README.md");

assert.match(workflow, /uses: actions\/setup-node@v4/);
assert.match(workflow, /node-version:\s*24/);
assert.match(workflow, /run: node scripts\/test-zombie-killer-page\.mjs/);
assert.match(workflow, /pull_request:/);
assert.match(workflow, /needs:\s*verify/);
assert.match(workflow, /if:\s*github\.event_name != 'pull_request'/);
assert.ok(
  workflow.indexOf("node scripts/test-zombie-killer-page.mjs") < workflow.indexOf("actions/upload-pages-artifact@v3"),
  "static contract must run before the Pages artifact is uploaded",
);
assert.match(gitlab, /image:\s*node:24-alpine/);
assert.match(gitlab, /- node scripts\/test-zombie-killer-page\.mjs/);
assert.ok(
  gitlab.indexOf("node scripts/test-zombie-killer-page.mjs") < gitlab.indexOf("cp -r"),
  "GitLab must verify the site before assembling its Pages artifact",
);
const gitlabCopyLine = gitlab.split(/\r?\n/).find((line) => line.includes("cp -r"));
assert.ok(gitlabCopyLine, "GitLab Pages must assemble an explicit artifact");
const gitlabPublishedPaths = new Set(gitlabCopyLine.trim().split(/\s+/).slice(3, -1));
for (const requiredPath of ["js", "enter.html", "enter.js", "shop.html", "shop.css", "shop.js", "zombie-killer.html"]) {
  assert.ok(gitlabPublishedPaths.has(requiredPath), `.gitlab-ci.yml must publish ${requiredPath}`);
}
assert.match(readme, /node \.\\scripts\\test-zombie-killer-page\.mjs/);
assert.match(readme, /http:\/\/127\.0\.0\.1:4173\/zombie-killer\.html/);
```

- [ ] **Step 2: Run the extended test and observe the expected release-path failure**

Run: `node .\scripts\test-zombie-killer-page.mjs`

Expected: exit code `1` because the GitHub workflow has no Node verification step and the GitLab allowlist omits the new page/runtime files.

- [ ] **Step 3: Split GitHub verification from deployment**

Replace `.github/workflows/pages.yml` with this complete workflow. Pull requests receive a required verification result, while only main-branch/manual runs can deploy:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: pages-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - name: Verify static site
        run: node scripts/test-zombie-killer-page.mjs

  deploy:
    if: github.event_name != 'pull_request'
    needs: verify
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Verify and complete the GitLab Pages artifact**

Replace `.gitlab-ci.yml` with this complete file so GitLab also runs the same contract before copying an explicit artifact allowlist:

```yaml
image: node:24-alpine

pages:
  stage: deploy
  script:
    - node scripts/test-zombie-killer-page.mjs
    - mkdir -p public
    - cp -r assets data js index.html enter.html enter.js zombie-killer.html shop.html shop.css shop.js main.js styles.css site.webmanifest robots.txt sitemap.xml _headers _redirects public/
  artifacts:
    paths:
      - public
  rules:
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

- [ ] **Step 5: Document verification and preview**

After `## Commands` in `README.md`, add:

````markdown
Verify the Zombie Killer landing-page contract:

```powershell
node .\scripts\test-zombie-killer-page.mjs
```

Preview this public repository from its root:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/zombie-killer.html`.
````

- [ ] **Step 6: Run and commit the release-path verification**

Run `node .\scripts\test-zombie-killer-page.mjs` and `git diff --check`; check `$LASTEXITCODE` immediately after each and stop if either is nonzero.

Commit:

```powershell
git add -- scripts/test-zombie-killer-page.mjs .github/workflows/pages.yml .gitlab-ci.yml README.md
if ($LASTEXITCODE) { throw 'Unable to stage release-path verification' }
git commit -s -m "test: verify Zombie Killer Pages release"
if ($LASTEXITCODE) { throw 'Unable to commit release-path verification' }
```

### Task 4: Browser QA and final review

**Files:**
- Verify: `enter.html`
- Verify: `zombie-killer.html`
- Verify: `styles.css`
- Verify: `.github/workflows/pages.yml`
- Verify: `.gitlab-ci.yml`

- [ ] **Step 1: Start root and GitHub-project-subpath previews**

```powershell
$siteRoot = (Resolve-Path -LiteralPath .).Path
$siteParent = Split-Path -Parent $siteRoot
$siteLeaf = Split-Path -Leaf $siteRoot
$previewStatePath = Join-Path $env:TEMP 'phantombugz-zk-preview-state.json'
if (Test-Path -LiteralPath $previewStatePath) { throw "Preview state already exists: $previewStatePath" }
$siteRootServer = $null
$siteSubpathServer = $null
try {
  $siteRootServer = Start-Process -FilePath python -ArgumentList '-m','http.server','4173','--bind','127.0.0.1','--directory',$siteRoot -WindowStyle Hidden -PassThru
  $siteSubpathServer = Start-Process -FilePath python -ArgumentList '-m','http.server','4174','--bind','127.0.0.1','--directory',$siteParent -WindowStyle Hidden -PassThru
  $previewState = @{
    root = @{ pid = $siteRootServer.Id; port = 4173; started = $siteRootServer.StartTime.ToUniversalTime().ToString('O') }
    subpath = @{ pid = $siteSubpathServer.Id; port = 4174; started = $siteSubpathServer.StartTime.ToUniversalTime().ToString('O') }
    subpathBase = "http://127.0.0.1:4174/$siteLeaf"
  }
  [IO.File]::WriteAllText($previewStatePath, ($previewState | ConvertTo-Json -Depth 3))
} catch {
  foreach ($server in @($siteRootServer, $siteSubpathServer)) {
    if ($null -ne $server -and -not $server.HasExited) { Stop-Process -Id $server.Id }
  }
  if (Test-Path -LiteralPath $previewStatePath) { Remove-Item -LiteralPath $previewStatePath -Force }
  throw
}
```

- [ ] **Step 2: Verify HTTP and browser navigation**

All four requests must return `200`:

```powershell
$previewStatePath = Join-Path $env:TEMP 'phantombugz-zk-preview-state.json'
$previewState = Get-Content -Raw -LiteralPath $previewStatePath | ConvertFrom-Json
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/enter.html).StatusCode
(Invoke-WebRequest -UseBasicParsing http://127.0.0.1:4173/zombie-killer.html).StatusCode
(Invoke-WebRequest -UseBasicParsing "$($previewState.subpathBase)/enter.html").StatusCode
(Invoke-WebRequest -UseBasicParsing "$($previewState.subpathBase)/zombie-killer.html").StatusCode
```

Use browser control in both preview modes to open `enter.html`, activate `Zombie Killer`, and confirm that the corresponding relative `zombie-killer.html` page and all local assets load.

- [ ] **Step 3: Run the responsive/accessibility matrix**

At 320 px, 390 px, tablet, and desktop widths verify:

- `document.documentElement.scrollWidth === document.documentElement.clientWidth` on both pages.
- Header links wrap without overlap or clipping.
- One `h1`, ordered `h2`/`h3` headings, and visible main/nav/footer landmarks.
- Tab reaches skip, brand, header, CTA, back, and footer links in order with visible focus.
- Exact alpha, platform, pidfd, coming-soon, and Apache-2.0 language is visible.
- No artifact download exists and macOS actions are not claimed.
- Reduced-motion mode leaves all content visible.
- JavaScript-disabled mode leaves every dedicated-page section visible and usable.
- Browser text zoom at 200% preserves navigation and CTA access without document overflow.
- Browser console has no error.

- [ ] **Step 4: Stop only the two preview servers from Step 1**

```powershell
$previewStatePath = Join-Path $env:TEMP 'phantombugz-zk-preview-state.json'
$previewState = Get-Content -Raw -LiteralPath $previewStatePath | ConvertFrom-Json
foreach ($serverState in @($previewState.root, $previewState.subpath)) {
  $process = Get-Process -Id $serverState.pid -ErrorAction SilentlyContinue
  if ($null -eq $process) { continue }
  $started = $process.StartTime.ToUniversalTime().ToString('O')
  $command = (Get-CimInstance Win32_Process -Filter "ProcessId = $($serverState.pid)").CommandLine
  if ($started -ne $serverState.started -or $command -notmatch 'http\.server' -or $command -notmatch [string]$serverState.port) {
    throw "PID $($serverState.pid) no longer identifies the expected preview server"
  }
  Stop-Process -Id $serverState.pid
  $process.WaitForExit(5000) | Out-Null
  if (-not $process.HasExited) { throw "Preview server $($serverState.pid) did not exit" }
}
Remove-Item -LiteralPath $previewStatePath -Force
```

Expected: both exact preview-server processes exit.

- [ ] **Step 5: Run final checks**

```powershell
node .\scripts\test-zombie-killer-page.mjs
if ($LASTEXITCODE) { throw 'Final Zombie Killer contract failed' }
Get-ChildItem -Recurse -File -Filter '*.js' | ForEach-Object { Get-Content -Raw -LiteralPath $_.FullName | node --input-type=module --check; if ($LASTEXITCODE) { throw "JS check failed: $($_.FullName)" } }
[xml](Get-Content -Raw .\sitemap.xml) | Out-Null
git diff --check origin/main..HEAD
if ($LASTEXITCODE) { throw 'Complete branch diff contains whitespace errors' }
git status --short
if (git status --porcelain) { throw 'Site branch is not clean' }
git log origin/main..HEAD --format="%h %s%n%(trailers:key=Signed-off-by,valueonly)"
if ($LASTEXITCODE) { throw 'Unable to inspect branch signoffs' }
```

Expected: contract passes, the complete branch diff passes, status is empty, and every commit in the branch range has a signoff.

- [ ] **Step 6: Obtain independent exact-branch review**

Request a read-only review of `origin/main..HEAD` for truthful claims, link integrity, mobile wrapping, accessibility, metadata, both deployment paths, and premature downloads. Any validated finding must first receive a failing regression in `scripts/test-zombie-killer-page.mjs`, followed by a separate DCO-signed fix commit and a full rerun of Tasks 2–4.

Expected: reviewer returns `APPROVE` with no Critical or Important finding.

### Task 5: Publish and verify the site change

**External systems:**
- GitHub repository: `PhantomBugz/phantombugz.com`
- GitHub Pages workflow: `.github/workflows/pages.yml`
- Live URLs: `https://phantombugz.com/enter.html` and `https://phantombugz.com/zombie-killer.html`

- [ ] **Step 1: Confirm GitHub identity and exact clean branch**

```powershell
gh auth status
if ($LASTEXITCODE) { throw 'GitHub authentication is unavailable' }
git status --short
if (git status --porcelain) { throw 'Site branch is not clean' }
git log --oneline origin/main..HEAD
$reviewedHead = git rev-parse HEAD
if ($LASTEXITCODE) { throw 'Unable to resolve the reviewed branch head' }
```

Expected: authenticated as the authorized PhantomBugz maintainer, empty status, and only the reviewed design/plan/feature/test series is ahead of `origin/main`. Retain `$reviewedHead` for the merge guard.

- [ ] **Step 2: Push the reviewed feature branch and open a pull request**

```powershell
git push -u origin design/zombie-killer-site-link
if ($LASTEXITCODE) { throw 'Feature branch push failed' }
$prUrl = gh pr create --base main --head design/zombie-killer-site-link --title "feat: introduce Zombie Killer on PhantomBugz" --body "Adds a truthful Zombie Killer coming-soon feature and dedicated page, responsive navigation, static contract tests, and verified GitHub/GitLab Pages packaging. No software download or source release is published by this change."
if ($LASTEXITCODE) { throw 'Pull request creation failed' }
$prUrl
```

Expected: GitHub returns the new pull-request URL.

- [ ] **Step 3: Rebind review to the remote pull request and merge without bypassing protections**

```powershell
$reviewedHead = git rev-parse HEAD
if ($LASTEXITCODE) { throw 'Unable to resolve the locally reviewed head' }
$remoteHead = gh pr view design/zombie-killer-site-link --json headRefOid --jq '.headRefOid'
if ($LASTEXITCODE -or $remoteHead -ne $reviewedHead) { throw 'Remote pull-request head does not match the reviewed commit' }
gh pr diff --color=never
if ($LASTEXITCODE) { throw 'Unable to read the remote pull-request diff' }
gh pr checks --watch
if ($LASTEXITCODE) { throw 'Pull-request verification did not pass' }
gh pr merge --merge --delete-branch --match-head-commit $reviewedHead
if ($LASTEXITCODE) { throw 'Protected pull-request merge failed' }
```

Expected: the remote diff matches the independently approved local branch, required checks pass, and GitHub reports the PR merged. If repository protections reject the merge, stop without bypassing them and report the exact hosted requirement.

- [ ] **Step 4: Watch the Pages deployment for the merged commit**

```powershell
$mergeSha = gh pr view design/zombie-killer-site-link --json mergeCommit --jq '.mergeCommit.oid'
if ($LASTEXITCODE -or -not $mergeSha) { throw 'Unable to resolve the merged commit' }
$runDeadline = (Get-Date).AddMinutes(5)
$pagesRun = $null
do {
  $candidateRuns = gh run list --workflow pages.yml --branch main --commit $mergeSha --limit 1 --json databaseId,status,conclusion,headSha | ConvertFrom-Json
  if ($LASTEXITCODE) { throw 'Unable to query GitHub Pages runs' }
  if ($candidateRuns.Count -gt 0) { $pagesRun = $candidateRuns[0]; break }
  Start-Sleep -Seconds 5
} while ((Get-Date) -lt $runDeadline)
if ($null -eq $pagesRun -or $pagesRun.headSha -ne $mergeSha) { throw 'The Pages run for the reviewed merge commit did not appear' }
gh run watch $pagesRun.databaseId --exit-status
if ($LASTEXITCODE) { throw 'GitHub Pages deployment failed' }
```

Expected: the latest main-branch Pages run concludes `success` and includes the merged commit.

- [ ] **Step 5: Verify the live custom-domain pages**

```powershell
$mergeSha = gh pr view design/zombie-killer-site-link --json mergeCommit --jq '.mergeCommit.oid'
if ($LASTEXITCODE -or -not $mergeSha) { throw 'Unable to resolve the merged commit for live verification' }
$cacheBuster = $mergeSha.Substring(0, 12)
$deadline = (Get-Date).AddMinutes(15)
$liveReady = $false
do {
  try {
    $liveEnter = Invoke-WebRequest -UseBasicParsing "https://phantombugz.com/enter.html?deployment=$cacheBuster"
    $liveZombie = Invoke-WebRequest -UseBasicParsing "https://phantombugz.com/zombie-killer.html?deployment=$cacheBuster"
    $liveReady = $liveEnter.StatusCode -eq 200 -and $liveEnter.Content -match 'zombie-killer\.html' -and $liveZombie.StatusCode -eq 200 -and $liveZombie.Content -match 'v0\.1\.0-alpha\.1'
  } catch {
    $liveReady = $false
  }
  if (-not $liveReady) { Start-Sleep -Seconds 15 }
} while (-not $liveReady -and (Get-Date) -lt $deadline)
if (-not $liveReady) { throw 'Live PhantomBugz deployment did not expose the reviewed Zombie Killer page within 15 minutes' }
```

Expected: both live pages return `200` and contain the reviewed link/version. Finish with a browser check of the live navigation, responsive header, and visible coming-soon/platform text.

- [ ] **Step 6: Use a protected revert path for a confirmed live defect**

If the deployed page exposes a download, contradicts the reviewed platform boundary, breaks main-site navigation, or still fails the exact live checks after the 15-minute cache window, create a revert branch and pull request instead of force-pushing or bypassing protection:

```powershell
$mergeSha = gh pr view design/zombie-killer-site-link --json mergeCommit --jq '.mergeCommit.oid'
if ($LASTEXITCODE -or -not $mergeSha) { throw 'Unable to resolve the merge commit for rollback' }
git fetch origin
if ($LASTEXITCODE) { throw 'Unable to fetch the deployed main branch' }
git switch -c revert/zombie-killer-site-link origin/main
if ($LASTEXITCODE) { throw 'Unable to create the protected revert branch' }
git revert --signoff -m 1 $mergeSha
if ($LASTEXITCODE) { throw 'Unable to create the merge revert' }
git push -u origin revert/zombie-killer-site-link
if ($LASTEXITCODE) { throw 'Unable to push the revert branch' }
$revertPrUrl = gh pr create --base main --head revert/zombie-killer-site-link --title "revert: remove broken Zombie Killer site launch" --body "Reverts the Zombie Killer site merge after a confirmed live deployment failure. Hosted evidence and the failing URL check are recorded in the review thread."
if ($LASTEXITCODE) { throw 'Unable to open the protected revert pull request' }
$revertPrUrl
```

Expected: the rollback stays reviewable and protected. Do not use this path for a transient cache response that clears inside the bounded verification window.

## Publication Boundary

The user's approved request is to put the link on the live site, so the reviewed site branch and GitHub Pages deployment in Task 5 are in scope. This does not authorize publishing the Zombie Killer source repository, binaries, tags, signed artifacts, or package releases.
