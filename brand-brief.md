# PhantomBugz Brand Pass 002

## Permanent Identity

The PhantomBugz logo and branding mark is the cyan bug head from the supplied reference image. The full uploaded image is treated as a visual direction reference for atmosphere only. The site does not use the uploaded banner as the page banner.

## Site Direction

The homepage should feel like the reference: dark center stage, cyan dot-wave fields, faint hex circuitry, and a slight binary swarm in the background. The mark and the monthly bounty console stay readable and centered in the experience.

Core palette:

- Phantom cyan: `#00e7ff`
- Signal green: `#55f6a5`
- Warning amber: `#ffd166`
- Deep black-green: `#010608`
- Operational graphite: `#020a0d`
- Muted telemetry: `#84a8aa`

Avoid:

- Full-banner placement as the hero image
- Purple-blue startup gradients
- Stock hooded-hacker photography
- Decorative bokeh orbs
- Fake cyber gibberish as page copy

## Asset Exports

All primary platform exports now derive from the bug head:

- `phantombugz-emblem-transparent.png`
- `phantombugz-avatar-128.png`
- `phantombugz-avatar-192.png`
- `phantombugz-avatar-256.png`
- `phantombugz-avatar-512.png`
- `phantombugz-avatar-1024.png`
- `phantombugz-mark-512.png`
- `favicon-16.png`
- `favicon-32.png`
- `apple-touch-icon.png`
- `phantombugz-og-image.png`
- `phantombugz-social-banner.png`

## Bounty Ticker

The public ticker reads from `data/bugbounty-public.json` and shows:

- Submitted possible
- Collected received
- Remaining goal
- Approval-ready package count
- Active lanes and deadline

Remaining goal is based on collected received. Submitted possible is tracked separately until funds actually arrive.
