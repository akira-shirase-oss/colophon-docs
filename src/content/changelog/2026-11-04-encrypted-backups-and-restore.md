---
title: "Encrypted backups with continuous WAL archiving, and a staged restore that holds unsent work"
date: 2026-11-04
type: Feature
areas: [Self-hosting]
docs:
  - label: Backups and restore
    href: /self-hosting/backups/
---

The backup tooling shipped with Colophon now captures encrypted base backups of the whole PostgreSQL cluster, with continuous WAL archiving (a segment at least every minute) aimed at a 15-minute recovery point. Backups run as a replication-only database role, are encrypted from a passphrase file, and are checked with `pg_verifybackup` at capture and again after decryption. The daily run creates and verifies a backup, copies the deletion ledger beside it, keeps the newest verified backup of each of the last 7 days and 4 weeks, and writes an audit line. A backup that fails verification is never pruned.

A restore runs on clean, separate infrastructure in six stages, each gated on the last: decrypt, verify the schema against the binary, start a new recovery epoch so old cache generations and worker leases can't act, replay deletions made after the backup, hold every unfinished delivery job, then serve.

Why it matters: a restore can't fire a webhook twice or bring a deleted entry back. The database steps are CLI commands:

```sh
colophon admin migrate-status   # current, behind, or exit 4: the schema is newer than this binary
colophon admin restore jobs     # what was held, for you to reconcile
colophon admin restore resume   # only after reconciling
```
