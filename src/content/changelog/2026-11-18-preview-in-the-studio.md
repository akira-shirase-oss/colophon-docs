---
title: "Preview the saved draft on your own site, beside the editor or in a new tab"
date: 2026-11-18
type: Feature
areas: [Studio]
docs:
  - label: Preview
    href: /studio/preview/
---

Editors can now see a draft as their website will show it, before it is published.

An owner sets the site's preview address once, in **Settings → Website connections → Preview on your site**. The address must contain `{code}`, and may also use `{collection}`, `{id}`, `{slug}` and `{locale}`, so it can open the right page directly.

In the entry editor, the **Preview** menu offers **Side by side** (your site beside the fields; on a narrow screen, switch between Edit and Preview) and **Open on my site** (a new tab). The pane shows your last *saved* version, never unsaved keystrokes, and refreshes after each save the server accepted. It keeps the preview open while you work and ends it when you close the pane.

A publish request's page has **Preview on your site** too, showing exactly what that request will publish, bound to its current content.

Every state is spelled out: not set up yet, opening, the site didn't confirm, unsaved changes, a save that failed, or a browser that blocks the site's cookie inside the pane. In that last case, open the preview in a new tab instead, which always works.

Your site needs a preview route; the SDK's preview helpers provide one.
