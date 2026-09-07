#!/usr/bin/env python3
# FED-OS v2 patch — posting fix (channels) + bigger image previews + carousel thumbs + UI slimming + UX features
import sys, os

SRC = 'fedpromptly-frontend/index.html'
h = open(SRC, encoding='utf-8').read()
orig_len = len(h)
edits = []

def rep(old, new, label, count=1):
    global h
    n = h.count(old)
    if n != count:
        print(f'X ANCHOR MISMATCH [{label}]: expected {count}, found {n}')
        sys.exit(1)
    h = h.replace(old, new)
    edits.append(f'OK {label} ({count}x)')

# ============================ B. POSTING FIX ============================

# B1. Channel pills for announcements / guides / questions
rep('''                            <label class="channel-pill" data-channel="subscribers">
                                <input type="radio" name="channel" value="subscribers" />
                                <i class="fas fa-lock"></i> Subscribers
                            </label>
                        </div>''',
'''                            <label class="channel-pill" data-channel="subscribers">
                                <input type="radio" name="channel" value="subscribers" />
                                <i class="fas fa-lock"></i> Subscribers
                            </label>
                            <label class="channel-pill" data-channel="announcements">
                                <input type="radio" name="channel" value="announcements" />
                                <i class="fas fa-bullhorn"></i> Announcements
                            </label>
                            <label class="channel-pill" data-channel="guides">
                                <input type="radio" name="channel" value="guides" />
                                <i class="fas fa-book-open"></i> Guides
                            </label>
                            <label class="channel-pill" data-channel="questions">
                                <input type="radio" name="channel" value="questions" />
                                <i class="fas fa-question-circle"></i> Questions
                            </label>
                        </div>''',
'pills: add announcements/guides/questions')

# B2. Hints map #1 (pill click handler)
rep('''const hints = {
                        icons: 'Icon posts require an image attachment. Choose Free or Paid below.',
                        notes: 'Notes are admin-only project updates visible to everyone.',
                        feed: 'Feed posts are part of the open social stream from everyone.',
                        subscribers: 'Subscribers posts are only visible to logged-in users.'
                    };''',
'''const hints = {
                        general: 'General posts appear in the main forum for everyone.',
                        icons: 'Icon posts require an image attachment. Choose Free or Paid below.',
                        notes: 'Notes are admin-only project updates visible to everyone.',
                        feed: 'Feed posts are part of the open social stream from everyone.',
                        subscribers: 'Subscribers posts are only visible to logged-in users.',
                        announcements: 'Announcements are admin broadcasts shown on the Announcements tab.',
                        guides: 'Guides are step-by-step tutorials. Attach images to make them shine.',
                        questions: 'Questions go straight to the Q&A tab so the community can help.'
                    };''',
'hints map #1 extended')

# B3. Hints map #2 (resetChannelForm)
rep('''const hints = {
                    general: 'General posts appear in the main forum for everyone.',
                    icons: 'Icon posts require an image attachment. Choose Free or Paid below.',
                    notes: 'Notes are admin-only project updates visible to everyone.',
                    feed: 'Feed posts are part of the open social stream from everyone.',
                    subscribers: 'Subscribers posts are only visible to logged-in users.'
                };''',
'''const hints = {
                    general: 'General posts appear in the main forum for everyone.',
                    icons: 'Icon posts require an image attachment. Choose Free or Paid below.',
                    notes: 'Notes are admin-only project updates visible to everyone.',
                    feed: 'Feed posts are part of the open social stream from everyone.',
                    subscribers: 'Subscribers posts are only visible to logged-in users.',
                    announcements: 'Announcements are admin broadcasts shown on the Announcements tab.',
                    guides: 'Guides are step-by-step tutorials. Attach images to make them shine.',
                    questions: 'Questions go straight to the Q&A tab so the community can help.'
                };''',
'hints map #2 extended')

# B4. classifyTopic: recognize new channels
rep("if (ch === 'icons' || ch === 'notes' || ch === 'feed' || ch === 'subscribers') {",
    "if (ch === 'icons' || ch === 'notes' || ch === 'feed' || ch === 'subscribers' || ch === 'announcements' || ch === 'guides' || ch === 'questions') {",
    'classifyTopic: new channels')

# B5. Card badge maps
rep('''                if (ch && ch !== 'general') {
                    const chLabels = { icons: 'Icons', notes: 'Notes', feed: 'Feed', subscribers: 'Subscribers' };
                    const chIcons = { icons: 'fa-icons', notes: 'fa-sticky-note', feed: 'fa-rss', subscribers: 'fa-lock' };''',
'''                if (ch && ch !== 'general') {
                    const chLabels = { general: 'General', icons: 'Icons', notes: 'Notes', feed: 'Feed', subscribers: 'Subscribers', announcements: 'Announcements', guides: 'Guides', questions: 'Questions' };
                    const chIcons = { general: 'fa-layer-group', icons: 'fa-icons', notes: 'fa-sticky-note', feed: 'fa-rss', subscribers: 'fa-lock', announcements: 'fa-bullhorn', guides: 'fa-book-open', questions: 'fa-question-circle' };''',
    'card channel badge maps')

# B6. Detail badge maps
rep('''                if (topic.channel && topic.channel !== 'general') {
                    const chLabels = { icons: 'Icons', notes: 'Notes', feed: 'Feed', subscribers: 'Subscribers' };
                    const chIcons = { icons: 'fa-icons', notes: 'fa-sticky-note', feed: 'fa-rss', subscribers: 'fa-lock' };''',
'''                if (topic.channel && topic.channel !== 'general') {
                    const chLabels = { general: 'General', icons: 'Icons', notes: 'Notes', feed: 'Feed', subscribers: 'Subscribers', announcements: 'Announcements', guides: 'Guides', questions: 'Questions' };
                    const chIcons = { general: 'fa-layer-group', icons: 'fa-icons', notes: 'fa-sticky-note', feed: 'fa-rss', subscribers: 'fa-lock', announcements: 'fa-bullhorn', guides: 'fa-book-open', questions: 'fa-question-circle' };''',
    'detail channel badge maps')

# B7. "All" tab includes the new content channels
rep("const generalTopics = allTopics.filter(t => !t.channel || t.channel === 'general');",
    "const generalTopics = allTopics.filter(t => !t.channel || ['general', 'announcements', 'guides', 'questions'].includes(t.channel));",
    'All tab includes new channels')

# B8. Category counts: new channels count toward All/Trending
rep('''                if (!ch || ch === 'general') {
                    counts.all++;
                    if (isTrending(t)) counts.trending++;
                    const cat = classifyTopic(t);
                    if (cat && counts[cat] !== undefined) counts[cat]++;
                }''',
'''                if (!ch || ch === 'general') {
                    counts.all++;
                    if (isTrending(t)) counts.trending++;
                    const cat = classifyTopic(t);
                    if (cat && counts[cat] !== undefined) counts[cat]++;
                } else if (ch === 'announcements' || ch === 'guides' || ch === 'questions') {
                    // FED-OS v2: new content channels also count toward the All/Trending tabs
                    counts.all++;
                    if (isTrending(t)) counts.trending++;
                }''',
    'category counts for new channels')

# B9. Admin fallback (owner recognized by username while flag is unset)
rep('''                if (error) { isAdmin = false; }
                else { isAdmin = !!(data && data.is_admin); }''',
'''                if (error) { isAdmin = false; }
                else {
                    isAdmin = !!(data && data.is_admin);
                    // FED-OS v2: fallback - recognize the owner by username when the is_admin flag is unset
                    if (!isAdmin) {
                        try {
                            const { data: prof } = await supabaseClient.from('profiles').select('username').eq('id', currentUser.id).single();
                            const un = ((prof && prof.username) || '').trim().toLowerCase();
                            if (un === 'admin' || un === 'fedpromptly' || un === 'fed_os' || un === 'fedos') isAdmin = true;
                        } catch (e2) { /* profiles.username unavailable - ignore */ }
                    }
                }''',
    'admin detection fallback')

# B10. Gate Announcements pill on admin (like Notes)
rep('''                // Notes channel requires admin
                if (ch === 'notes' && !isAdmin) {
                    pill.classList.add('disabled');
                    pill.style.opacity = '0.45';
                    pill.style.cursor = 'not-allowed';
                    pill.title = 'Only admins can post to Notes';
                } else {''',
'''                // Notes + Announcements channels require admin
                if ((ch === 'notes' || ch === 'announcements') && !isAdmin) {
                    pill.classList.add('disabled');
                    pill.style.opacity = '0.45';
                    pill.style.cursor = 'not-allowed';
                    pill.title = 'Only admins can post to ' + (ch === 'notes' ? 'Notes' : 'Announcements');
                } else {''',
    'announcements pill admin gate')

# ============================ C. IMAGE PREVIEWS ============================

# C1. Card image: 280 -> 440 max
rep('max-height: 280px;', 'max-height: 440px;', 'card image max-height 440px')

# C2. Card image: img height 280 -> 420 (context-qualified; 2nd 280px hit)
rep('''        .topic-card .image-preview img {
            width: 100%;
            height: 280px;''',
'''        .topic-card .image-preview img {
            width: 100%;
            height: 420px;''',
    'card image height 420px')

# C3. Mobile override bigger
rep('.topic-card .image-preview img { height: 200px; }', '.topic-card .image-preview img { height: 260px; }',
    'mobile card image 260px')
rep('.topic-card .image-preview { max-height: 200px; }', '.topic-card .image-preview { max-height: 280px; }',
    'mobile card image max 280px')

# C4. Detail attachment: 360 -> 620
rep('max-height: 360px;', 'max-height: 620px;', 'detail attachment 620px')

# C5. Carousel slide thumbnails
rep('''                const hot = (topic.replyCount || 0) >= 5 ? '<span class="meta-hot"><i class="fas fa-fire"></i> Hot</span>' : '';
                slide.innerHTML = `<div class="slide-rank">${idx + 1}</div><div class="slide-content">''',
'''                const hot = (topic.replyCount || 0) >= 5 ? '<span class="meta-hot"><i class="fas fa-fire"></i> Hot</span>' : '';
                const thumb = (topic.attachment_url && typeof isImageUrl === 'function' && isImageUrl(topic.attachment_url)) ? `<div class="slide-thumb"><img src="${encodeURI(topic.attachment_url)}" alt="" loading="lazy" /></div>` : '';
                slide.innerHTML = `<div class="slide-rank">${idx + 1}</div>${thumb}<div class="slide-content">''',
    'carousel slide thumbnails')

# ============================ D. UI REDUCTION ============================

# D1. Marquee off by default + opt-in logic (two identical defs)
rep('''        function updateMarquee() {
            if (postSnippets.length === 0) { globalMarquee.classList.add('hidden'); return; }
            globalMarquee.classList.remove('hidden');''',
'''        function updateMarquee() {
            // FED-OS v2: marquee is opt-in (reduces clutter); enable it in Settings
            let marqueeOn = false;
            try { marqueeOn = (JSON.parse(localStorage.getItem('fedos_settings') || '{}').showMarquee === true); } catch (e) { marqueeOn = false; }
            if (!marqueeOn || postSnippets.length === 0) { globalMarquee.classList.add('hidden'); return; }
            globalMarquee.classList.remove('hidden');''',
    'marquee opt-in')

rep('showMarquee: true,', 'showMarquee: false,', 'marquee default off')

# D2. applyShowMarquee fully controls visibility (works with the toggle)
rep('''        function applyShowMarquee(on) {
            const m = document.getElementById('globalMarquee');
            if (m) m.style.display = on ? '' : 'none';
        }''',
'''        function applyShowMarquee(on) {
            const m = document.getElementById('globalMarquee');
            if (m) { m.style.display = on ? '' : 'none'; if (on) m.classList.remove('hidden'); else m.classList.add('hidden'); }
        }''',
    'applyShowMarquee toggle fix')

# D3. Tag cloud: top 10 instead of 20
rep('slice(0, 20)', 'slice(0, 10)', 'tag cloud top 10')

# D4. Compact ETA panel
rep('''        .eta-panel {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 22px;
        }''',
'''        .eta-panel {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 14px;
        }''',
    'eta panel compact')

rep('''        .eta-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 14px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: var(--transition);
        }''',
'''        .eta-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            padding: 10px 14px;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: var(--transition);
        }''',
    'eta card compact')

rep('''        .eta-icon {
            width: 38px;
            height: 38px;
            border-radius: var(--radius-xs);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1rem;
            flex-shrink: 0;
        }''',
'''        .eta-icon {
            width: 30px;
            height: 30px;
            border-radius: var(--radius-xs);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.88rem;
            flex-shrink: 0;
        }''',
    'eta icon compact')

# ============================ E. UX + FEATURES ============================

# E1. isNewTopic helper + NEW badge in card template
rep('''        function renderTopicList(topics, append = false) {''',
'''        // FED-OS v2: fresh-topic badge (< 48h) helper
        function isNewTopic(topic) { try { return (Date.now() - new Date(topic.created_at).getTime()) < 48 * 3600 * 1000; } catch (e) { return false; } }
        function renderTopicList(topics, append = false) {''',
    'isNewTopic helper')

rep("${escapeHtml(topic.title)}<button class=\"bookmark-btn",
    "${escapeHtml(topic.title)}${isNewTopic(topic) ? '<span class=\"new-badge\">NEW</span>' : ''}<button class=\"bookmark-btn",
    'NEW badge in card')

# E2. Click-to-expand excerpts
rep('''        function wireModActions() {
            forumList.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', (e) => {''',
'''        function wireModActions() {
            // FED-OS v2: click-to-expand / collapse card excerpts
            forumList.querySelectorAll('.excerpt').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); el.classList.toggle('expanded'); }));
            forumList.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', (e) => {''',
    'excerpt expand wiring')

# E3. Prev/next navigation DOM (detail view)
rep('''                <button id="backToForumBtn" class="text-purple-600 hover:underline mb-4 flex items-center gap-1" style="background:none; border:none; cursor:pointer; font-size:0.92rem; font-weight:600;">
                    <i class="fas fa-arrow-left"></i> Back to forum
                </button>''',
'''                <button id="backToForumBtn" class="text-purple-600 hover:underline mb-4 flex items-center gap-1" style="background:none; border:none; cursor:pointer; font-size:0.92rem; font-weight:600;">
                    <i class="fas fa-arrow-left"></i> Back to forum
                </button>
                <div id="detailNav" class="detail-nav" style="display:none;">
                    <button id="prevTopicBtn" class="detail-nav-btn" type="button"><i class="fas fa-chevron-left"></i> Prev</button>
                    <span id="detailNavPos" class="detail-nav-pos"></span>
                    <button id="nextTopicBtn" class="detail-nav-btn" type="button">Next <i class="fas fa-chevron-right"></i></button>
                </div>''',
    'detail nav DOM')

# E4. Prev/next navigation logic
rep('''                await countTopicView(topicId);
                setTimeout(() => { readingProgress.classList.add('visible'); updateReadingProgress(); }, 100);''',
'''                // FED-OS v2: prev/next topic navigation
                try {
                    const navBar = document.getElementById('detailNav');
                    const navList = sortTopics(allTopics.filter(t => t && t.id), currentSort);
                    const pos = navList.findIndex(t => t.id === topicId);
                    const prevBtn = document.getElementById('prevTopicBtn');
                    const nextBtn = document.getElementById('nextTopicBtn');
                    const posEl = document.getElementById('detailNavPos');
                    if (navBar && pos >= 0 && navList.length > 1) {
                        navBar.style.display = 'flex';
                        if (posEl) posEl.textContent = (pos + 1) + ' / ' + navList.length;
                        const prev = navList[pos - 1], next = navList[pos + 1];
                        if (prevBtn) { prevBtn.style.visibility = prev ? 'visible' : 'hidden'; prevBtn.onclick = () => { if (prev) showTopicDetail(prev.id); }; }
                        if (nextBtn) { nextBtn.style.visibility = next ? 'visible' : 'hidden'; nextBtn.onclick = () => { if (next) showTopicDetail(next.id); }; }
                    } else if (navBar) { navBar.style.display = 'none'; }
                } catch (navErr) { console.warn('Detail nav unavailable:', navErr); }

                await countTopicView(topicId);
                setTimeout(() => { readingProgress.classList.add('visible'); updateReadingProgress(); }, 100);''',
    'detail nav logic')

# E5. Keyboard: "/" focuses search, Esc backs out of detail
rep('''            if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) closeLightboxFn();
            if (e.key === 'Escape' && shopModal.classList.contains('active')) closeShopModal();
        });''',
'''            if (e.key === '/') { e.preventDefault(); const si = document.getElementById('searchInput'); if (si) { si.focus(); si.select(); } }
            if (e.key === 'Escape' && !singleTopicView.classList.contains('hidden')) {
                // FED-OS v2: Esc backs out of the topic detail (unless a modal/lightbox is open)
                const cmEl = document.getElementById('confirmModal');
                const modalOpen = lightboxOverlay.classList.contains('active') || shopModal.classList.contains('active') || (cmEl && cmEl.classList.contains('active'));
                if (!modalOpen) backToForumBtn.click();
            }
            if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) closeLightboxFn();
            if (e.key === 'Escape' && shopModal.classList.contains('active')) closeShopModal();
        });''',
    'keyboard: / search + Esc detail')

# E6. Keyboard help panel text
rep('        <kbd>N</kbd> New topic &nbsp;·&nbsp; <kbd>R</kbd> Reply &nbsp;·&nbsp; <kbd>?</kbd> Help',
'''        <kbd>N</kbd> New topic &nbsp;·&nbsp; <kbd>R</kbd> Reply &nbsp;·&nbsp; <kbd>L</kbd> Like &nbsp;·&nbsp; <kbd>/</kbd> Search &nbsp;·&nbsp; <kbd>Esc</kbd> Back &nbsp;·&nbsp; <kbd>?</kbd> Help''',
    'keyboard help panel')

# E7. All new CSS in one injection before </style>
rep('    </style>',
'''        /* == FED-OS v2 additions == */
        .channel-badge.ch-announcements { background: rgba(239,68,68,0.12); color: var(--red); }
        .channel-badge.ch-guides { background: var(--brand-soft); color: var(--brand); }
        .channel-badge.ch-questions { background: rgba(59,130,246,0.12); color: var(--blue); }
        .topic-card .new-badge {
            display: inline-block;
            margin-left: 8px;
            padding: 2px 8px;
            border-radius: var(--radius-full);
            background: var(--green-soft);
            color: var(--green);
            font-size: 0.62rem;
            font-weight: 800;
            letter-spacing: 0.06em;
            vertical-align: middle;
        }
        .topic-card .excerpt { cursor: zoom-in; }
        .topic-card .excerpt.expanded {
            display: block;
            -webkit-line-clamp: unset;
            line-clamp: unset;
            max-height: none;
            overflow: visible;
            cursor: zoom-out;
        }
        .slide-thumb {
            flex-shrink: 0;
            width: 68px;
            height: 50px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid var(--border);
            background: var(--bg-soft);
        }
        .slide-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .detail-nav {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: -6px 0 14px;
        }
        .detail-nav-btn {
            background: var(--surface-2);
            border: 1px solid var(--border);
            color: var(--text-2);
            border-radius: var(--radius-full);
            padding: 5px 14px;
            font-size: 0.8rem;
            font-weight: 700;
            cursor: pointer;
            transition: var(--transition);
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }
        .detail-nav-btn:hover { border-color: var(--brand); color: var(--brand); }
        .detail-nav-pos { font-size: 0.76rem; color: var(--text-3); font-weight: 600; }
        @media (max-width: 720px) {
            .slide-thumb { width: 54px; height: 42px; }
            .detail-nav { flex-wrap: wrap; }
        }
    </style>''',
    'v2 CSS block')

# ============================ WRITE ============================
tmp = SRC + '.v2tmp'
with open(tmp, 'w', encoding='utf-8') as f:
    f.write(h)
os.replace(tmp, SRC)

print(f'\n=== v2 PATCH COMPLETE: {len(edits)} edits applied ===')
for e in edits:
    print(' ', e)
print(f'\nsize: {orig_len} -> {len(h)} bytes (+{len(h) - orig_len})')

# sanity markers
for marker in ['data-channel="announcements"', 'data-channel="guides"', 'data-channel="questions"',
               'slide-thumb', 'new-badge', 'detailNav', 'ch-announcements', 'isNewTopic',
               'max-height: 440px', 'max-height: 620px', 'showMarquee: false']:
    print(f'  marker {marker!r}: {h.count(marker)}x')
