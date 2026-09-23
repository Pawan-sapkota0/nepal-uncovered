---
name: External image backfills
description: Durable guidance for migrating legacy remote images into App Storage.
---

When migrating remote image URLs into App Storage, fetch and validate each source before linking the stored object in PostgreSQL. If a category-specific source fails, use another verified image already represented in the database and log the fallback; never persist the remote URL as a substitute for the stored object path.

**Why:** Legacy remote image URLs can return 404 even when the database record still exists, and linking them directly would violate the storage contract.

**How to apply:** Treat the database link as the final commit of the migration: download, validate content type and size, upload, verify the stored object, then update PostgreSQL.