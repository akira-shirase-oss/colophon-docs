---
title: "Write an entry in several languages, one linked version per locale"
date: 2026-11-02
type: Feature
areas: [API, Studio]
docs:
  - label: Languages
    href: /studio/languages/
---

An entry can now carry a locale tag such as `en` or `pt-BR`, and its translations are grouped together, one live entry per tag. Each translation is a full entry with its own draft, slug, history and publish requests, so the French version can be published while the German one is still being written.

In the Studio's entry editor, **Locale** sets the entry's own tag (empty means the project's default), and the **Versions** card lists the group and adds one: type `fr`, choose **Add version**, and a copy of the current draft opens as its own entry, with a slug such as `my-post-fr`.

Through the API, `?locale=` rides create, save and list, and a new translation is one request:

```bash
curl -X POST "https://cms.example.com/api/v1/projects/{project}/environments/{environment}/collections/posts/entries/{entry}/localizations?locale=fr" \
  -H "Authorization: Bearer $COLOPHON_TOKEN" -H "Idempotency-Key: translate-post-fr-0001"
```

Drafts answer with `locale` and `localizations` (each sibling's id and tag). The source needs a tag of its own before it can start a group (`locale_required`). A tag already in the group is `409 locale_taken`, naming the entry that holds it; a malformed tag is `422 invalid_locale`. Published rows don't carry the tag: a site reads each translation as its own entry.
