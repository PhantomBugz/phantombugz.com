# PhantomBugz Brand Pass 001

## Current Completion

The site is not finished yet, but it now has the first usable launch package: founder avatar, primary mark, exported platform assets, WebGL homepage, monthly bug bounty goal ticker, merch section, GitHub profile package, social banner, and layout system.

Approximate completion:

- Brand direction: 70%
- Founder avatar: 70%
- Primary mark: 65%
- WebGL homepage shell: 75%
- Merch shop visual system: 55%
- Platform export assets: 80%
- GitHub profile package: 70%
- Production ecommerce wiring: 10%
- Copy/content/live integrations: 45%

Overall: about 60-65% toward a polished launch. The public preview is usable, but permanent hosting, DNS, GitHub auth, and real checkout still need to be completed.

## Brand Direction

PhantomBugz should feel like a research-led cyber lab with field gear, not a generic neon hacker template.

Core palette:

- Signal green: `#37ff9a`
- Electric blue: `#17a8ff`
- Deep black-green: `#020606`
- Wet graphite: `#061014`
- Muted operational text: `#90afa8`

Avoid:

- Purple-blue AI startup gradients
- Fake cyber gibberish text
- Stock hooded-hacker photography or hooded avatar clichés
- Over-rounded SaaS cards
- Random bokeh/orb decorations

## Asset Concepts

Founder avatar:

- Compact bug-helmet visor with small phantom insect cues.
- Designed to work as GitHub, Discord, HackerOne, Hack The Box, and TryHackMe avatar.
- Exported at 128, 192, 256, 512, and 1024px.
- Needs one more pass after real platform upload screenshots, mainly for small-size contrast tuning if needed.

Primary brand mark:

- Phantom insect signal mark, with full-color, one-color, and favicon variants.
- Roach/cricket energy without becoming gross or cartoonish.
- Binary-like wing cuts can be used on hoodies, mouse pads, stickers, and laptop sleeves.

Shop system:

- Ghost Mesh Hoodie
- Trace Map Mouse Pad
- Packet Runner Pack
- Cold Boot Laptop Sleeve
- Product mockup SVGs are now part of the site and exported with the static package.

Monthly bounty ticker:

- Reads from `data/bugbounty-public.json`, a public-safe projection of the local BugBounties project.
- Shows the 2026-07 sprint goal, collected amount, submitted possible amount, active lane count, and deadline.
- Does not publish finding titles, evidence paths, hashes, platform URLs, notes, or target details.

## Next Pass

1. Complete permanent hosting and DNS for `phantombugz.com`.
2. Authenticate GitHub as PhantomBugz and push the profile README plus `phantombugz.com` site repo.
3. Add actual Discord/HackerOne/Hack The Box/TryHackMe links after accounts are live.
4. Wire merch checkout using Shopify, Stripe, or a static preorder form.
5. Review platform upload screenshots and tune avatar contrast if any platform crops too aggressively.
