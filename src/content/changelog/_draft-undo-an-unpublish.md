---
title: "Unpublish asks first, and Undo puts back exactly what readers had, in one request"
date: 2026-11-18
type: Feature
areas: [Studio, API]
docs:
  - label: Publishing and review
    href: /studio/publishing/
---

Unpublishing an entry used to be one click from Publish, with no way back. Now **Unpublish…** sits in the editor's **⋯ More** menu, apart from the other actions. It opens a confirmation, *Take "…" off your site?*, with **Keep it live** focused and a red **Unpublish**. After you take an entry down, a toast offers **Undo** for ten seconds.

Undo is one request to the server, `POST …/releases/{n}/undo` with an `Idempotency-Key` and no body, made as
the person who took the entry down. In one transaction, it publishes a new release that puts back the exact version readers had before the takedown. It never touches your draft. Before, Undo was four to six separate requests from the browser. Another release could go out between them, and a lost answer could leave an approved request behind. Now, if two people race, exactly one wins, and the other gets a clear refusal.

The undo goes through every check an ordinary publish does: content types, deleted entries, URL names, unique values and website deliveries. It is refused, and nothing is written, when:

- it isn't the newest release any more (`changed_since`);
- the release published something rather than only taking entries down (`not_undoable`);
- you didn't make the release (`not_your_release`);
- more than 60 seconds have passed (`undo_expired`);
- publishing here needs another person: review stages, a different reviewer, or a request from an API token (`needs_review`, `agent_self_review`). The Studio then offers a publish request instead.

An undo is not a rollback. A rollback returns to a past release and still doesn't restore entries taken down since. An undo is an explicit, immediate reversal of one takedown, by the person who made it, while nothing else has gone out. Releases made this way carry `undo_of` (the release they reverse), so receipts, the releases list and the Activity log say *Undo of Release N*.
