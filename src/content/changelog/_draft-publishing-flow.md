---
title: "The publishing flow: one next step per request, receipts that say what went live, rollbacks that ask first"
date: 2026-11-18
type: Improvement
areas: [Studio]
docs:
  - label: Publishing and review
    href: /studio/publishing/
  - label: Rollback
    href: /studio/rollback/
---

Publish requests, releases and rollbacks were reworked together, so each screen says where things stand and what to do next.

- **One next step per request state.** A publish request shows a single primary button for its state: send it for review, approve, publish, or nothing while it waits for someone else. A double click still does one thing. A reviewer whose role can't read every item in the request is offered **Request changes**, not **Approve**.
- **One meaning of "live".** The Overview, the collection filters and the sidebar all count an entry as live when readers have a version of it. "Has unpublished changes" is shown separately. This fixes the Overview showing *0 live* while entries were published.
- **A new-request dialog that fits.** It works at phone width, and when **Create** is disabled it says why.
- **Receipts say what went live.** A receipt pages through *What went live*: what each release published and took down. It also tells you how many entries your role can't open, without naming them.
- **A rollback asks first.** Before anything is made, you see what the rollback would do: how many entries go back, what it puts back and what it takes down. You also see which entries stay down and why. A rollback doesn't restore an entry taken down after the release you return to, so publish that entry again if you want it back. Confirming sends the hash of exactly what you were shown. If someone publishes in between, you see what changed instead of getting a different rollback from the one you read.
- **Where a request came from.** Requests made by an undo read *Undo of Release N*; those made by a rollback read *Rollback to Release N*.
