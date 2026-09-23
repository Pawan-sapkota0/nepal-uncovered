---
name: Public place images
description: Why stored place images are readable without authentication while upload operations remain protected
---

Stored place image objects must be readable by logged-out visitors because place cards and detail pages render their object paths directly. Upload URL generation and upload confirmation remain authenticated; the public read path is limited to unguessable object paths referenced by place records.

**Why:** Place image paths are part of public place content, and requiring a bearer token for image reads causes cards and detail galleries to fail for visitors who are not signed in.

**How to apply:** Preserve this split when changing image storage or URL helpers: protect writes, but do not reintroduce authentication requirements on the read path used by public place pages.