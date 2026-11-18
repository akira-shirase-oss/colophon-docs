---
title: "The static Linux server runs allocation-heavy requests five times faster"
date: 2026-11-17
type: Improvement
areas: [Performance, Self-hosting]
docs:
  - label: Installation
    href: /installation/
---

The Linux build of `colophon-server` is a static binary linked against musl, so one file runs on any Linux and the container image needs no C library. musl's own memory allocator takes a single lock for every thread, and it showed: on the same CI runner, validating a realistic rich-text post ran at 4,589 requests a second (p99 29.1 ms) against 23,340 (p99 10.3 ms) for a glibc build of the same code.

The static Linux server now allocates through mimalloc. Measured the same way, it matched glibc: 24,367 requests a second against 23,891, p99 9.6 ms against 10.0 ms. Memory after the run was 38.2 MB resident against glibc's 32.5 MB. These are observations on one CI runner type, not capacity figures.

Nothing to configure. Only the static Linux server and the container image change; macOS, Windows and glibc builds keep their system allocator, and the `colophon` CLI, a short-lived client, keeps musl's.
