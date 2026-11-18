---
title: "Run Colophon with one Docker Compose command, with secrets kept in files"
date: 2026-11-17
type: Feature
areas: [Self-hosting, CLI]
docs:
  - label: Quick start
    href: /quick-start/
  - label: Installation
    href: /installation/
  - label: Configuration
    href: /self-hosting/configuration/
---

Docker is now all you need. The quick start's compose file starts Colophon with PostgreSQL, Valkey and Garage, generates every password and key on first start, and publishes only `127.0.0.1:8080`. One image carries the server, the `colophon` CLI and the Studio, on a distroless base, running as a non-root user. The image is prepared for the first release; until it is published, build it from a clone of the repository and name it in `COLOPHON_IMAGE`.

```sh
docker compose up -d --wait
docker compose logs colophon | grep "Setup code"
```

Then open `https://cms.example.com/studio/`, create the first account and enter the setup code; the Studio's first-run screen shows that command too.

Two pieces help any install, container or not:

- Every secret setting also takes `<KEY>_FILE`, a path to a mounted secret, for example `COLOPHON_DATABASE_URL_FILE` or `COLOPHON_S3_SECRET_KEY_FILE`. Setting both a value and its file stops the server at start-up, and no error ever prints a secret's contents.
- `colophon admin init-roles --app-password-file FILE` creates the database roles the server needs, sending passwords as SCRAM verifiers. It refuses the development password and anything under 16 characters, and is safe to rerun.
