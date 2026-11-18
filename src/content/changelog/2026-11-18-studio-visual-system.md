---
title: "A new look for the Studio: one accent, clear buttons and one status badge"
date: 2026-11-18
type: Improvement
areas: [Studio]
docs:
  - label: Publishing
    href: /studio/publishing/
---

The Studio now takes its look from Colophon's public site, toned down for all-day work. The aim is that you can tell at a glance what each screen asks you to do and what state your content is in.

- **One accent colour, and one primary button per screen.** The main action on a screen, such as *Publish changes* or *Create request*, is the only button filled with the accent colour. Every other action is secondary, ghost, destructive or a link. Screens that used to show two filled buttons now show one.
- **One status badge everywhere.** Entries, publish requests, releases and schedules all show their state with the same badge: an icon and a word on a tinted background, in five tones (live, changed, pending, attention, draft). The words changed too: *Live with changes*, *In review*, *Taken down*, *Published*. Releases are called *Release N* instead of *No. N*.
- **Dialogs fit the screen.** A dialog's body scrolls while its buttons stay visible at the bottom, and form rows stack inside dialogs, so a long dialog is usable on a phone.
- **Calmer surfaces.** Cards are flat, with a thin border. Empty states no longer have a dashed box. Page titles use DM Sans, served by your own Colophon like every other asset, so the Studio still makes no requests to other sites. Checkboxes and radio buttons use the accent colour.

Every colour pair is checked for contrast in light and dark mode, and with the system's "more contrast" setting. Each of the six main screens is checked with axe at desktop and phone widths and has exactly one primary button. You can see the tokens, the status colours, the badge and the button styles on the Studio's own design page, at `/studio/design`.
