---
title: "Correction: the cold-read benchmark read fewer than a third of its corpus"
date: 2026-11-19
type: Fix
areas: [Performance]
---

The cold-read load test is meant to read every entry of a 2,048-entry corpus, each read a real database fill. It chose entries by a counter that each simulated user keeps for itself, so the 64 users read the same entries in step, and a recount found 675 of the 2,048 read. Every read was still a real fill; the run just covered less than it said.

The test now numbers reads across all users, and a fixed run reads all 2,048. On a CI runner (an AMD EPYC 9V74, commit `079e44d`) it served 30,091 requests at 505 a second with p99 152.6 ms, and 153.0 ms on a second run. That replaces the figure published before, a laptop run at 1,017 a second and p99 68.2 ms: different hardware, so the two aren't comparable, and running the old and fixed tests side by side showed no consistent latency difference.

The same fix applies to every load test that picked its operations or targets this way, and the repository's checks now refuse it.
