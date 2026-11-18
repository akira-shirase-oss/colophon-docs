---
title: "A redesigned Studio with entry states, title search, and comparisons for history and review"
date: 2026-10-27
type: Improvement
areas: [Studio]
docs:
  - label: Writing in the Studio
    href: /studio/writing/
  - label: History
    href: /studio/history/
---

The Studio is rebuilt on a design system of its own: warm paper, black ink and one accent colour, Inter throughout, and light, dark and high-contrast schemes. State colours always come with a word, and motion switches off when your system asks for reduced motion. The sign-in page has the same look.

Every project page now sits in one shell: a sidebar with each collection and its entry count, publish requests waiting for review, and the live release with its label; breadcrumbs; and a command palette (⌘K) that finds entries by title across collections.

- **Entry states.** A collection is a table with **Draft**, **Changed** and **Live** filters, worked out by comparing each draft with its published revision.
- **Title search** runs on the server (`q` on the entries list), so it finds entries beyond the first page.
- **History.** The editor compares any earlier revision with the draft (`GET …/entries/{entry}/revisions/{revision}` reads one).
- **Review.** A publish request shows, for each entry, a word-level comparison of what readers have now and what they will get; for a take-down, what goes.

Why it matters: an editor can see what state each entry is in, and what a review is about to approve, without opening raw JSON.
