# FEDPromptly Forum — v2 Upgrade (posting fix · UI reduce · UX + features · image previews)

## Goal
User feedback: can't post guides/notes/questions/announcements; reduce UI; upgrade UX + add features;
bigger image previews per post; image previews in trending carousel.

## Tasks
### A. Investigate posting/channel architecture
- [x] Map channel pills, updateChannelPillAvailability, filterByCategory channel↔category mapping
- [x] Find why notes/announcements/guides/questions posting is blocked (admin flag? missing pills?)
  → Root causes: (1) no pills existed for announcements/guides/questions; (2) notes gated on
  profiles.is_admin which was false for the owner.

### B. Posting fix
- [x] Full channel set in new-topic form: general, announcements, guides, questions, feed, icons, notes (admin), subscribers
- [x] Admin detection fallback (username 'Admin'/'fedpromptly'/'fed_os'/'fedos') + SQL to set profiles.is_admin = true
- [x] Category tabs filter correctly for the new channels (classifyTopic + All tab + counts + badges)

### C. Image previews
- [x] Bigger image preview on topic cards (280px → 440px; mobile 200px → 260px)
- [x] Bigger attachment preview in topic detail (360px → 620px)
- [x] Image previews inside trending carousel slides (.slide-thumb 68×50 cover-fit)

### D. UI reduction
- [x] Marquee ticker strip off by default (opt-in via Settings; code kept functional)
- [x] Compact the stats cards into a slimmer bar (ETA panel + cards + icons)
- [x] Trim tag cloud to top 10 tags

### E. UX + new features
- [x] `/` focuses search · Esc closes detail/lightbox/modals
- [x] Back-to-top floating button (already existed — verified)
- [x] Prev/next topic navigation in detail view (with position counter)
- [x] NEW badge on fresh topics (< 48h)
- [x] Click-to-expand excerpts on cards
- [x] Keyboard help panel updated (N/R/L///Esc/?)

### F. Verify & deliver
- [x] node --check all 4 JS blocks — all pass
- [x] Serve + browser render verify (live Supabase data: pills 8/8, detail nav 2/10→3/10,
      announcements tab, Esc-close, search focus, marquee hidden, tag cloud top-10)
- [x] UPGRADE_GUIDE.md rewritten for v2 + fed_os_v2_admin_and_channels.sql created
- [x] FEDPromptly-upgrade-v2.zip packaged (index.html + v2 SQL + v1 SQL + guide)
