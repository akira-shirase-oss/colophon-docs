---
title: "Publish changes appears again when you edit an entry you just published"
date: 2026-11-18
type: Fix
areas: [Studio]
docs:
  - label: Publishing
    href: /studio/publishing/
---

When you published an entry from its editor, the side panel said **Live as Release N**, and it kept saying so until you left the page. That message also hid the publish button. So if you then fixed a typo and saved, the entry showed **Changed**, but the only action offered was **Unpublish**. You had to reload before you could publish the fix.

The message now describes the version it acted on. As soon as you save a newer version, it clears and **Publish changes** comes back, so you can publish the edit straight away. Nothing changed on the server: publishing was always allowed, but the button wasn't shown.

Pressing again after a lost network answer is still safe. Each attempt keeps the same idempotency keys until it ends, so a retry can't create a second publish request.
