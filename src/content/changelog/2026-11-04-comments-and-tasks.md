---
title: "Comments pinned to the version you read, and tasks for the editorial team"
date: 2026-11-04
type: Feature
areas: [API, Studio, CLI]
docs:
  - label: Comments and tasks
    href: /studio/comments-and-tasks/
---

Editors can now discuss an entry and hand work to each other inside Colophon.

A comment is anchored to one saved version (revision) of an entry, and optionally to a field such as `author` or `sections/2/byline`. Revisions never change, so a comment always refers to exactly what its author was reading, even after the draft moves on. Comments are kept word for word: they can be resolved and reopened, never edited or deleted. A task names an entry (and optionally a revision or a publish request), has a title, an assignee and a status of `open`, `done` or `cancelled`, and is changed under `If-Match`, so two people can't overwrite each other's update (`409 task_moved`).

Both follow the entry's own permissions, including "only their own" roles, and stay readable after the entry is deleted.

In the Studio, the entry editor has a **Comments** tab for the version on screen, and the project has a **Tasks** page. From the terminal:

```bash
colophon comment create posts {entry} --project my-site --revision {revision} --field title --body "Shorter, please?"
colophon task create --project my-site --entry {entry} --title "Check the quotes" --assignee {identity}
colophon task list --project my-site --assignee me --status open
```

The API routes are `…/entries/{entry}/comments` (with `/resolve` and `/reopen`) and `…/tasks`.
