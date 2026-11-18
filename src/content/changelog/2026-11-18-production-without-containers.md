---
title: "A production path without containers: a hardened systemd unit and a Caddyfile"
date: 2026-11-18
type: Feature
areas: [Self-hosting]
docs:
  - label: Installation
    href: /installation/
  - label: Security
    href: /self-hosting/security/
---

If you would rather not run Docker, or your database is managed elsewhere, Colophon now ships a path for one Linux host: `colophon-server` under systemd, Caddy in front for HTTPS, and PostgreSQL and object storage wherever you keep them.

The systemd unit keeps secrets out of files and the environment: the database URL, cache URL and storage key are systemd credentials, read through the `COLOPHON_*_FILE` settings. The service runs as a dynamic user with no privileges, a read-only file system and a narrow system-call filter, and shuts down gracefully so in-flight requests finish. The Caddyfile proxies your domain to the server on loopback and passes live events through as they are written.

```ini
LoadCredential=database_url:/etc/colophon/credentials/database_url
Environment=COLOPHON_DATABASE_URL_FILE=%d/database_url
```

The non-secret settings live in an environment file; set `COLOPHON_PUBLIC_URL` to your `https://` address and `COLOPHON_TRUSTED_PROXIES=127.0.0.1/32` so rate limits count each visitor rather than the proxy. The steps start from a release's static binaries; until the first release is published, build them from source.

These files are checked in CI by `systemd-analyze verify` and `caddy validate`. They have not yet been followed end to end on a real host.
