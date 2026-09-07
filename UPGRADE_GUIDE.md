# FED-OS v2 Upgrade Guide — Posting Fix · UI Slimming · Bigger Previews · UX Features

Welcome to **FED-OS v2** for fedpromptly.com. This release fixes the posting
problem you reported ("I can't post guides, notes, questions, announcements"),
reduces visual clutter, upgrades the UX, and makes image previews much bigger —
including inside the trending carousel.

Deploy is the same as v1: **upload one file** (`index.html`). Everything below
explains what changed and the two optional SQL steps.

---

## 1. What was broken (root causes)

Two things were blocking you:

**a) The channel pills never existed.** The New Topic form only had
General / Icons / Notes / Feed / Subscribers. Announcements, Guides, and
Questions were *display tabs* fed by a title-keyword guesser
(`classifyTopic`) — there was simply no way to *post* into them.

**b) The admin gate was locked.** Notes (and now Announcements) pills disable
themselves unless `profiles.is_admin = true` for your account. Your account
had no admin flag, so Notes was greyed out.

v2 fixes both, plus adds a safety net: if your Supabase username is
`admin`, `fedpromptly`, `fed_os`, or `fedos`, the frontend now auto-recognizes
you as admin even before the SQL flag is set.

---

## 2. Deploy in 3 steps

1. Upload the new `index.html` to your host (same location as before).
2. In Supabase → SQL Editor, run `fed_os_v2_admin_and_channels.sql`
   (promotes your account to admin + optionally backfills old general posts
   into the new channels).
3. Log out and back in (or hard-refresh) so the admin flag is re-read.

That's it. The channel column is free text, so the new channels
`announcements` / `guides` / `questions` require **no schema migration** —
they work immediately on your existing table.

---

## 3. What's new in v2

### Posting (the main fix)
- New pills in the New Topic form: **Announcements** (admin), **Guides**,
  **Questions** — alongside General / Icons / Notes (admin) / Feed / Subscribers.
- Each pill shows a helpful hint under the selector when selected.
- Channel badges on cards and in the topic detail view now cover all 8
  channels with distinct colors and icons (Announcements red, Guides purple,
  Questions blue).
- `classifyTopic` maps the new channels directly — a Questions post lands on
  the Questions tab instantly.
- The **All** tab and **Trending** now include announcements/guides/questions
  posts (they used to vanish into limbo).
- Admin auto-fallback by username (admin / fedpromptly / fed_os / fedos).

### Image previews (much bigger)
- Topic-card image previews: 280px → **440px** tall, full card width,
  cover-fit (mobile: 200px → 260px).
- Topic-detail attachment: 360px → **620px**.
- **Trending carousel slides now show image thumbnails** (68×50px, cover-fit)
  for any topic with an image attachment — text-only slides keep the clean
  rank-number layout.

### UI reduction (less clutter)
- Marquee ticker strip is now **off by default** (opt-in via Settings →
  "Show marquee"). The code stays fully functional if you re-enable it.
- ETA/stats panel compacted (smaller cards, tighter padding, 38px icons →
  30px).
- Tag cloud trimmed from 20 tags to the top **10**.

### UX + new features
- **`/` focuses the search bar** (when not typing in a field).
- **Esc backs out of a topic** detail view (lightbox/shop/confirm modals take
  priority, so nothing gets double-closed).
- **Prev / Next navigation** in the detail view with a "3 / 10" position
  counter — browse the whole list without going back.
- **NEW badge** on topic cards for posts less than 48 hours old.
- **Click-to-expand excerpts**: click a card's text excerpt to read the full
  post inline; click again to collapse.
- Keyboard help panel updated: `N` New · `R` Reply · `L` Like · `/` Search ·
  `Esc` Back · `?` Help.

---

## 4. Files in this package

| File | Purpose |
|---|---|
| `index.html` | The upgraded forum (v2) — upload this one file |
| `fed_os_v2_admin_and_channels.sql` | v2 SQL: admin flag + channel backfill (run after v1 SQL) |
| `supabase_migration_v1.sql` | v1 SQL: likes, views, edited badges, edit/delete RPCs (if not yet run) |
| `UPGRADE_GUIDE.md` | This guide |

Order matters only if you haven't run v1's SQL yet: run
`supabase_migration_v1.sql` first, then `fed_os_v2_admin_and_channels.sql`.
The v2 SQL is safe to run alone if v1 is already applied.

---

## 5. Rollback

Upload your previous `index.html` (or `index_original.html` if you kept the
pre-v1 copy). Frontend features revert; data (topics, channels, replies,
likes) is untouched. To undo the admin promotion:

```sql
UPDATE public.profiles SET is_admin = false WHERE username = 'YOUR_NAME';
```

To undo a channel backfill:

```sql
UPDATE public.topics SET channel = 'general' WHERE channel IN ('announcements','guides','questions');
```

---

## 6. Quick verification checklist

After deploying, confirm:

1. **New Topic → all 8 channel pills visible**; Notes + Announcements active
   for your account (admin), not greyed out.
2. Post a question via the Questions pill → it appears on the Questions tab
   and on All.
3. Any topic with an image shows the **bigger preview** on its card and a
   **thumbnail in the trending carousel**.
4. Marquee is gone (turn it back on in Settings if you miss it).
5. Press `/` → cursor jumps to search. Open a topic → press Esc → back to the
   list. Click an excerpt → it expands.
6. A post made within the last 48h shows a green **NEW** badge on its card.
