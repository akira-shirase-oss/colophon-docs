---
title: "A website starter: pages built from sections, a menu and a theme, with a Look tab"
date: 2026-11-03
type: Feature
areas: [Studio]
docs:
  - label: Concepts
    href: /concepts/
  - label: Preview
    href: /studio/preview/
---

The Studio can now add a ready-made website structure to a project. On **Content types**, choose **A website**: a dialog lists what it will add and what is already there, then **Add to this project** creates a `pages` collection, a `navigation` single type, a `theme` single type and a seeded Home page.

Nothing here is new machinery. A page's `sections` field is an ordinary page-sections field with six layouts (hero, rich text, features, testimonial, call to action, and questions and answers), the menu links to pages through reference fields that can't dangle, and the theme's colours, corner radii, shadows and fonts are an entry like any other. So pages and the theme get drafts, history, publish requests and releases, and republishing the theme changes the whole site's look in one release. Running the starter again only adds what is missing.

Pages and the theme entry gain a **Look** tab beside Content and History. It shows the page exactly as the shared site renderer builds it, from the draft on screen (saved or not), the menu and the theme, and redraws as you type. Click a section to jump to its form. On the theme, the Look tab checks each colour pair's contrast against WCAG AA.
