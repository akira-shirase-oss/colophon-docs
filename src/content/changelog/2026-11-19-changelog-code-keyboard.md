---
title: "Code examples in an opened changelog entry are reachable by keyboard straight away"
date: 2026-11-19
type: Fix
areas: [Docs]
---

A wide code example scrolls sideways, so the keyboard has to be able to reach it: it takes focus with Tab and scrolls with the arrow keys. In a changelog entry that you had just opened, it couldn't for a moment. The code highlighter took a block's focus away while its entry was collapsed, because it had no width then, and gave it back only about a quarter of a second after the entry opened.

Opening an entry now makes its wide code examples focusable at once, the same way they are everywhere else in the docs. Readers who don't use a keyboard won't notice any change.
