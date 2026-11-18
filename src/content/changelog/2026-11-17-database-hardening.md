---
title: "Database guards trust roles, not session settings, and deleting a project is an operator's job"
date: 2026-11-17
type: Security
areas: [Self-hosting]
docs:
  - label: Security
    href: /self-hosting/security/
  - label: Backups and restore
    href: /self-hosting/backups/
---

Colophon's PostgreSQL schema protects a project's owner role, its last owner and the audit log with triggers. Some of those guards stood aside when a session setting was present, and any session can set one, including the server's own database login. Now the guards stand aside only for the dedicated database roles that do sanctioned work: the retention sweep and project deletion.

Also fixed in the database:

- The guard functions pin their `search_path`, and the check that a project exists answers only inside its trigger.
- Sign-in throttle rows are row-level secured by realm, so staff keys and each project's site-user keys are visible only in their own context.
- The retention sweep keeps pace with the two tables unauthenticated requests grow (magic links and sign-in throttle keys).
- Deleting a project now removes its audience roles, site users and their sessions, magic links, listed origins and upload versions. It runs from the database owner's login, as an operator task; the server's login can no longer call it.

**Rollback floor:** these changes are additive, so an older build would still start on the newer schema and simply ignore them. Once you run a build with these fixes, never roll back to one without them; fix forward instead.
