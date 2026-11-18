---
title: "The Studio no longer shows stale lists after a live update, or closes an entry when a refresh fails"
date: 2026-11-17
type: Fix
areas: [Studio]
docs:
  - label: Live events
    href: /api/live-events/
  - label: Writing in the Studio
    href: /studio/writing/
---

Two Studio bugs that showed up on slow connections and under load are fixed.

**Lists could stay stale until a reload.** When a live change arrived while a page was still loading a list for the first time, the Studio joined the read already in flight instead of sending a new one. If that read had left before the change committed, its old answer stood: a release's deliveries, for example, kept saying "pending" after the job had finished. Now every live change, resync and catch-up cancels matching reads in flight and reads again, so the list always reflects the change that triggered it.

**An open entry could vanish.** After a save, the Studio refreshes the entry. If that refresh failed, for example because a burst of requests hit the rate limit, the editor was replaced by the error screen, heading and all. Now the error screen appears only when there is nothing to show yet; a failed refresh leaves the editor, and your work, where they are.

Nothing to configure: both fixes are in the Studio served by the server.
