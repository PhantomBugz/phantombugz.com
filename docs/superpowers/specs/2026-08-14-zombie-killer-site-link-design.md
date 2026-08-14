# Zombie Killer Site Link Design

Date: 2026-08-14  
Status: Approved direction; implementation pending specification review

## Purpose

Add a visible, polished Zombie Killer presence to `phantombugz.com` without implying that unsigned or unpublished software is already available. The site will introduce the project, state the current alpha/platform boundaries accurately, and provide a stable same-site destination that can later be updated with source and signed-release links.

## Goals

- Add a `Zombie Killer` item to the existing `enter.html` navigation.
- Add a homepage feature section between the Ghost Series vault and the public bounty signal.
- Link both placements to a dedicated `/zombie-killer.html` teaser page.
- Match the existing PhantomBugz dark, high-contrast, cyber/ghost visual language.
- Advertise only capabilities supported by the reviewed `v0.1.0-alpha.1` source candidate.
- Keep the page fast, local-asset-only, responsive, keyboard accessible, and respectful of reduced-motion preferences.

## Non-goals

- Publishing the Zombie Killer source repository or release artifacts.
- Offering unsigned downloads.
- Claiming universal process-containment support on macOS.
- Changing Zombie Killer's Apache-2.0 software license or its separately licensed artwork/fonts.
- Adding analytics, third-party scripts, remote fonts, signup forms, or new data collection.

## Information Architecture

### Existing landing page (`enter.html`)

1. Add `Zombie Killer` to the header navigation, linking to `./zombie-killer.html`.
2. Add a new section after `#vault` and before `#signal`.
3. Give the section a concise project introduction, alpha status, and one primary link: `Meet Zombie Killer`.

This placement keeps merchandise and software visually distinct while giving the project more weight than a footer-only link.

### Dedicated page (`zombie-killer.html`)

The page will contain:

1. PhantomBugz brand header and a clear route back to the main site.
2. Eyebrow: `OPEN SOURCE / ALPHA`.
3. Title: `Zombie Killer`.
4. Lead: `Local-first process safety for AI-agent workloads.`
5. Supporting copy explaining detection, review, and safe containment of abandoned, runaway, or unresponsive agent processes without trusting a PID alone.
6. Status line: `v0.1.0-alpha.1 · Coming Soon · Apache-2.0`.
7. Three compact capability cards:
   - Local-first detection and inspection.
   - Identity-bound containment with auditable receipts.
   - Honest platform support: actions on Windows and supported Linux systems with pidfd; scan/inspect only on macOS for this alpha.
8. A release note explaining that source and signed downloads will appear after hosted verification, signing, and notarization gates complete.
9. Links to the PhantomBugz GitHub profile and back to the main site. No disabled or misleading download control.

When the public repository exists, the GitHub-profile link can be replaced with an exact project-source link without changing the page structure.

## Visual Direction

- Reuse the current black/white/acid-green palette, typography, border language, and focus treatment from `styles.css`.
- Give the homepage section a restrained terminal/process-map motif rather than merchandise imagery.
- Use a compact process-line composition (for example, `DETECT → VERIFY → CONTAIN → RECEIPT`) as decorative text, never as the only explanation.
- Scope new selectors under project-specific classes such as `.zk-feature` and `.zk-page` to avoid regressions in the Ghost Series/shop layouts.
- Prefer CSS shapes, gradients, and existing local brand assets; add no large media file.
- Any motion must be subtle and disabled by the existing reduced-motion policy.

## Truthful Product Language

Approved claims:

- `Local-first process safety for AI-agent workloads.`
- Detection and review of abandoned, runaway, or unresponsive agent processes.
- Identity-bound containment and local receipts.
- Windows action support.
- Linux action support when pidfd and the runtime capability probe are available.
- macOS scan/inspect-only support in this alpha.
- Apache-2.0 software licensing.
- `Coming Soon` for source and signed downloads.

Avoid:

- `Production ready`, `available now`, or equivalent language.
- A live download/source button before an exact public destination exists.
- Suggesting that macOS stop/kill actions are implemented.
- Suggesting all project artwork or bundled third-party materials use Apache-2.0.

## Accessibility and Responsive Behavior

- Preserve semantic landmarks and heading order.
- Use a real link for every navigation/CTA action.
- Maintain visible keyboard focus and current color contrast standards.
- Do not rely on glow, animation, color, or decorative process text to convey status.
- Ensure the feature section and page work at 320 CSS pixels without document-level horizontal scrolling.
- Respect `prefers-reduced-motion: reduce`.
- Provide useful accessible names while keeping decorative glyphs hidden from assistive technology.

## Metadata and Discovery

- Add a unique title, meta description, canonical URL, Open Graph title/description/URL, and social preview fallback using an existing local PhantomBugz asset.
- Add `https://phantombugz.com/zombie-killer.html` to `sitemap.xml`.
- Keep robots behavior unchanged.
- Use only relative same-origin asset links so GitHub Pages and the custom domain behave consistently.

## Files Expected to Change

- `enter.html`: navigation and homepage feature section.
- `zombie-killer.html`: new dedicated teaser page.
- `styles.css`: scoped homepage/page styles and responsive/accessibility rules.
- `sitemap.xml`: new canonical page entry.
- `README.md`: brief note identifying the new page and local preview path, if the existing contributor documentation benefits from it.

No JavaScript change is required unless implementation proves the existing reveal behavior needs an explicit hook. The teaser page should remain useful with JavaScript disabled.

## Verification

- Validate all internal links and asset paths from both GitHub Pages and the custom-domain path model.
- Confirm the nav link, feature CTA, GitHub-profile link, and return link with keyboard-only navigation.
- Check 320 px, 390 px, tablet, and desktop layouts for clipping or horizontal overflow.
- Verify heading order, landmarks, accessible names, focus visibility, contrast, and reduced-motion behavior.
- Confirm that no download/source URL is presented as available.
- Confirm exact version, platform, status, and Apache-2.0 wording.
- Run the repository's existing static checks and a local HTTP preview before deployment.
- After deployment, verify the live page and GitHub Pages workflow result without modifying the Zombie Killer release candidate.

## Rollout

Implement on a feature branch, verify locally, review the exact diff, and then merge through the normal GitHub Pages workflow. The live page is an advertisement for a coming alpha; publishing source, signed installers, or release artifacts remains a separate maintainer-controlled action.
