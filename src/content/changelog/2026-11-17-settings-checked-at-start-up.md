---
title: "A database on another machine needs sslmode=verify-full, and on/off settings are strict"
date: 2026-11-17
type: Breaking
areas: [Self-hosting]
docs:
  - label: Database TLS
    href: /self-hosting/database-tls/
  - label: Configuration
    href: /self-hosting/configuration/
---

**Old behaviour:** the server had no TLS for PostgreSQL: a remote URL without `sslmode` connected in plain text, and one asking for TLS could not connect. On/off settings with values such as `yes` or `on` were quietly read as "off".

**New behaviour:** the server and the `colophon admin` commands refuse to start when `COLOPHON_DATABASE_URL` or `COLOPHON_MIGRATION_DATABASE_URL` names another machine with anything but `sslmode=verify-full`. `require` accepts any certificate, so anyone on the network path could answer as your database; `verify-ca` here accepts any publicly trusted certificate, for any name. `channel_binding=require` is refused on any host, because the driver would silently ignore it. The error names the problem and the fix, never the URL. A loopback host or a Unix socket needs no certificate, as before.

On/off settings now take only `1`, `true`, `0` or `false`; anything else stops the server at start-up with a message naming the setting.

**What to do:** change a remote database URL to `verify-full`, adding `sslrootcert` if your database uses a private certificate authority:

```sh
COLOPHON_DATABASE_URL="postgres://colophon_app@db.internal:5432/colophon?sslmode=verify-full&sslrootcert=/etc/colophon/db-ca.pem"
```

If you copied a hosted provider's URL with `sslmode=require&channel_binding=require`, replace both parameters with `sslmode=verify-full`.
