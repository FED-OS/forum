#!/usr/bin/env python3
"""Apply FEDPromptly gap-fix upgrades to index.html with per-edit verification."""
import sys, re

SRC = "fedpromptly-frontend/index.html"
DST = "fedpromptly-frontend/index.html"

with open(SRC, encoding="utf-8") as f:
    h = f.read()

def rep(old, new, label, count=1):
    global h
    found = h.count(old)
    if found != count:
        print(f"  ✗ [{label}] expected {count} match(es), found {found}")
        sys.exit(1)
    h = h.replace(old, new, count)
    print(f"  ✓ [{label}]")

# ══════════════════════════ 1. CSS ADDITIONS ══════════════════════════
rep("    </style>",
"""        /* ═══════════ FED-OS UPGRADE: like / vote UI ═══════════ */
        .like-btn {
            display: inline-flex; align-items: center; gap: 6px;
            background: var(--surface-2); border: 1px solid var(--border);
            color: var(--text-2); cursor: pointer; font-family: inherit;
            padding: 5px 12px; border-radius: var(--radius-full);
            font-size: 0.78rem; font-weight: 700; transition: var(--transition);
            -webkit-user-select: none; user-select: none; line-height: 1.4;
        }
        .like-btn:hover { border-color: var(--border-strong); color: var(--text); transform: translateY(-1px); }
        .like-btn i { font-size: 0.82rem; transition: transform 0.15s ease; }
        .like-btn:hover i { transform: scale(1.15); }
        .like-btn.liked { background: var(--brand-soft); border-color: var(--brand); color: var(--brand); }
        .like-btn.liked:hover { background: var(--brand-soft); color: var(--brand-hover); }
        .like-btn.liked i { color: var(--brand); }
        .like-btn.pending { opacity: 0.55; pointer-events: none; }
        .like-btn .like-count { font-variant-numeric: tabular-nums; }
        .like-btn.broken { color: var(--text-3); cursor: default; }
        .like-btn.broken:hover { transform: none; border-color: var(--border); color: var(--text-3); }

        /* ═══════════ FED-OS UPGRADE: toasts ═══════════ */
        #toastHost {
            position: fixed; top: 84px; right: 18px; z-index: 1200;
            display: flex; flex-direction: column; gap: 10px;
            pointer-events: none; max-width: min(360px, calc(100vw - 36px));
        }
        .toast {
            display: flex; align-items: flex-start; gap: 10px;
            background: var(--surface); border: 1px solid var(--border-strong);
            border-left: 3px solid var(--brand);
            border-radius: var(--radius-sm); box-shadow: var(--shadow-lg);
            padding: 12px 16px; font-size: 0.86rem; color: var(--text);
            pointer-events: auto; opacity: 0; transform: translateX(24px);
            animation: toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            will-change: transform, opacity; word-break: break-word;
        }
        .toast.leaving { animation: toastOut 0.25s ease forwards; pointer-events: none; }
        .toast i { margin-top: 2px; }
        .toast .toast-msg { flex: 1; }
        .toast .toast-close {
            background: none; border: none; color: var(--text-3); cursor: pointer;
            font-size: 0.8rem; padding: 2px; line-height: 1; font-family: inherit;
        }
        .toast .toast-close:hover { color: var(--text); }
        .toast.success { border-left-color: var(--green); }
        .toast.success i { color: var(--green); }
        .toast.error { border-left-color: var(--red); }
        .toast.error i { color: var(--red); }
        .toast.info { border-left-color: var(--blue); }
        .toast.info i { color: var(--blue); }
        .toast.warning { border-left-color: var(--amber); }
        .toast.warning i { color: var(--amber); }
        @keyframes toastIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes toastOut { to { opacity: 0; transform: translateX(24px); } }

        /* ═══════════ FED-OS UPGRADE: edit/delete controls & confirm modal ═══════════ */
        .mod-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
        .mod-actions .btn-icon { padding: 6px 11px; font-size: 0.78rem; }
        .mod-actions .btn-icon.danger:hover { border-color: var(--red); color: var(--red); background: rgba(239,68,68,0.08); }
        .mod-actions .btn-icon.danger { color: var(--text-2); }
        .edited-badge {
            font-size: 0.72rem; color: var(--text-3); font-style: italic; margin-left: 8px;
        }
        .confirm-modal {
            position: fixed; inset: 0; z-index: 1300;
            display: flex; align-items: center; justify-content: center;
            background: rgba(6, 6, 12, 0.72); backdrop-filter: blur(4px);
            opacity: 0; pointer-events: none; transition: opacity 0.2s ease;
        }
        .confirm-modal.active { opacity: 1; pointer-events: auto; }
        .confirm-box {
            background: var(--surface); border: 1px solid var(--border-strong);
            border-radius: var(--radius); box-shadow: var(--shadow-lg);
            padding: 26px; max-width: 420px; width: calc(100% - 40px);
            transform: translateY(12px); transition: transform 0.2s ease;
        }
        .confirm-modal.active .confirm-box { transform: translateY(0); }
        .confirm-box h4 { font-size: 1.05rem; margin-bottom: 8px; color: var(--text); }
        .confirm-box p { font-size: 0.87rem; color: var(--text-2); margin-bottom: 20px; line-height: 1.55; }
        .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .confirm-actions button {
            font-family: inherit; font-size: 0.85rem; font-weight: 700;
            padding: 9px 18px; border-radius: var(--radius-xs); cursor: pointer;
            transition: var(--transition); border: none;
        }
        .confirm-actions .cancel { background: var(--surface-2); color: var(--text-2); border: 1px solid var(--border); }
        .confirm-actions .cancel:hover { color: var(--text); border-color: var(--border-strong); }
        .confirm-actions .danger { background: var(--red); color: #fff; }
        .confirm-actions .danger:hover { filter: brightness(1.1); }
        @media (prefers-reduced-motion: reduce) {
            .toast { animation-duration: 0.01s; }
        }

        /* ═══════════ FED-OS UPGRADE: inline edit form ═══════════ */
        .inline-edit { margin-top: 12px; }
        .inline-edit textarea {
            width: 100%; font-family: inherit; font-size: 0.95rem;
            background: var(--bg-soft); color: var(--text);
            border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
            padding: 10px 12px; line-height: 1.6; resize: vertical; min-height: 120px;
        }
        .inline-edit .inline-actions { display: flex; gap: 10px; margin-top: 10px; }
        .inline-edit .inline-actions button {
            font-family: inherit; font-size: 0.83rem; font-weight: 700;
            padding: 8px 16px; border-radius: state; border-radius: var(--radius-xs);
            cursor: pointer; transition: var(--transition); border: none;
        }
        .inline-edit .inline-actions .save { background: var(--brand); color: #fff; }
        .inline-edit .inline-actions .save:hover { background: var(--brand-hover); }
        .inline-edit .inline-actions .cancel-edit { background: var(--surface-2); color: var(--text-2); border: 1px solid var(--border); }
        .inline-edit .inline-actions .cancel-edit:hover { color: var(--text); }

        /* ═══════════ FED-OS UPGRADE: search highlight + hit counter ═══════════ */
        .search-hits { font-size: 0.8rem; color: var(--text-3); margin: 4px 0 10px; }
        .topic-card mark, .reply-body mark {
            background: var(--brand-soft); color: var(--brand);
            border-radius: 3px; padding: 0 3px;
        }
        .topic-card .excerpt.overlimit {
            -webkit-line-clamp: unset;
        }
        .btn-icon i, .like-btn i { pointer-events: none; }

        /* ═══════════ FED-OS UPGRADE: lightbox caption & misc fixes ═══════════ */
        #lightboxCaption {
            position: absolute; bottom: 18px; left: 50%; transform: translateX(-50%);
            color: #fff; font-size: 0.85rem; background: rgba(0,0,0,0.55);
            padding: 6px 14px; border-radius: var(--radius-full); max-width: 85%;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* ═══════════ FED-OS UPGRE: fed stats panel on Home ═══════════ */
        .fed-drawer { position: fixed; right: 0; top: 84px; bottom: 0; width: min(400px, 92vw); background: var(--surface); border-left: 1px solid var(--border-strong); box-shadow: var(--shadow-lg); transform: translateX(100%); transition: transform 0.28s ease; z-index: 1050; overflow-y: auto; padding: 22px; }
        .fed-drawer.active { transform: translateX(0); }
        .fed-drawer h4 { font-size: 0.98rem; margin-bottom: 14px; color: var(--text); display: flex; align-items: center; gap: 8px; }
        .fed-drawer .fed-close { position: absolute; top: 14px; right: 14px; }
        .fed-drawer .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 0.86rem; }
        .fed-drawer .stat-row span:last-child { color: var(--text-2); font-weight: 600; font-variant-numeric: tabular-nums; }
        .fed-drawer .fed-note { font-size: 0.8rem; color: function; color: var(--text-3); margin-top: 14px; line-height: 1.6; }
        .fed-bell {
            display: inline-flex; align-items: center; justify-content: center;
            width: 36px; height:  opener: 36px; opener: 36px; width: 36px; height: 36px;
            background: var(--surface-2); border: 1px solid var(--border);
            color: var(--text-2); border-radius: var(--radius-full); cursor: pointer;
            transition: var(--transition); font-size: 0.9rem; position: relative;
        }
        .fed-bell:hover { color: var(--brand); border-color: var(--brand); transform: translateY(-1px); }
        .fed-bell .fed-badge-dot {
            position: absolute; top: -3px; right: -3px; width: 8px; height: 8px;
            background: var(--brand); border-radius: 50%;
            display: none;
        }
        .fed-bell.has-new .fed-badge-dot { display: block; }
    </style>""",
"CSS additions")

# fix accidental invalid CSS fragments from long string (self-heal)
h = h.replace("border-radius: state; border-radius: var(--radius-xs);", "border-radius: var(--radius-xs);")
h = h.replace("color: function; color: var(--text-3);", "color: var(--text-3);")
h = h.replace("height:  opener: 36px; opener: 36px; width: 36px; height: 36px;", "height: 36px;")

# ══════════════════════════ 2. TOAST + CONFIRM + ESC HELPERS ══════════════════════════
rep("""        const SUPABASE_URL = 'https://qyuczfpgydgqywgthgrz.supabase.co';""",
"""        // ═══════════ FED-OS UPGRADE: toast system (replaces alert) ═══════════
        const TOAST_ICONS = {
            success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle', warning: 'fas fa-exclamation-triangle'
        };
        window.toast = function toast(msg, type = 'info', duration = 3200) {
            const host = document.getElementById('toastHost');
            if (!host) { console.log('[toast]', type, msg); return; }
            const t = document.createElement('div');
            t.className = 'toast ' + type;
            const icon = TOAST_ICONS[type] || TOAST_ICONS.info;
            t.innerHTML = `<i class="${icon}"></i><div class="toast-msg">${escapeHtml(msg)}</div><button class="toast-close" aria-label="Dismiss"><i class="fas fa-times"></i></button>`;
            t.querySelector('.toast-close').addEventListener('click', () => dismiss(t));
            host.appendChild(t);
            while (host.children.length > 5) dismiss(host.firstElementChild, true);
            const timer = setTimeout(() => dismiss(t), duration);
            t._timer = timer;
            return t;
        };
        window.toastSuccess = (m, d) => window.toast(m, 'success', d);
        window.toastError = (m, d) => window.toast(m, 'error', d || 4200);
        window.toastInfo = (m, d) => window.toast(m, 'info', d);
        window.toastWarning = (m, system) => window.toast(m, 'warning', system || 4200);
        function dismiss(toastEl, immediate = false) {
            if (!toastEl || toastEl._dismissed) return;
            toastEl._dismissed = true;
            clearTimeout(toastEl._timer);
            if (immediate) { toastEl.remove(); return; }
            toastEl.classList.add('leaving');
            setTimeout(() => toastEl.remove(), 260);
        }
        // Backwards compatibility: alert() now routes to toast, never blocks
        const _nativeAlert = window.alert;
        window.alert = function (msg) {
            window.toast(String(msg), 'warning', 4200);
            return undefined;
        };
        window.addEventListener('error', (e) => {
            window.toast('Unexpected error: ' + (e.message || 'unknown'), 'error', 5000);
        });
        window.addEventListener('unhandledrejection', (e) => {
            const r = e.reason;
            window.toast('Something failed: ' + (r && r.message ? r.message : 'unknown'), 'error', 5000);
        });

        // ═══════════ FED-OS UPGRADE: escapeHtml / highlight helpers ═══════════
        function escapeHtml(str) {
            return String(str == null ? '' : str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
        window.escapeHtml = escapeHtml;
        function highlightQuery(text, query) {
            const safe = escapeHtml(text);
            if (!query) return safe;
            const escQuery = escapeHtml(query).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
            try { return safe.replace(new RegExp(escQuery, 'gi'), (m) => `<mark>${m}</mark>`); } catch (e) { return safe; }
        }
        window.highlightQuery = highlightQuery;

        // ═══════════ FED-OS UPGRADE: rate limiter ═══════════
        const rateLimiter = {
            last: {},
            check(key, windowMs, message) {
                const now = Date.now();
                const last = this.last[key] || 0;
                if (now - last < windowMs) {
                    const wait = Math.ceil((windowMs - (now - last)) / 1000);
                    if (message) window.toast(`${message} Try again in ${wait}s.`, 'warning');
                    return false;
                }
                this.last[key] = now;
                return true;
            }
        };

        // ═══════════ FED-OS UPGRADE: confirm modal helper ═══════════
        const confirmModal = document.getElementById('confirmModal');
        let confirmAction = null;
        window.confirmDialog = function (message, action, opts = {}) {
            if (!confirmModal) { if (window.confirm(message)) action(); return; }
            const p = document.querySelector('#confirmModal .confirm-text');
            if (p) p.textContent = message;
            const title = document.querySelector('#confirmModal .confirm-title');
            if (title) title.textContent = opts.title || 'Are you sure?';
            const btn = document.querySelector('#confirmModal .confirm-yes');
            if (btn) btn.textContent = opts.yesLabel || 'Delete';
            confirmAction = action;
            confirmModal.classList.add('active');
        };
        (function wireConfirmModal() {
            if (!confirmModal) return;
            const yes = document.querySelector('#confirmModal .confirm-yes');
            const no = document.querySelector('#confirmModal .confirm-no');
            const box = document.querySelector('#confirmModal .confirm-box');
            if (yes) yes.addEventListener('click', () => {
                confirmModal.classList.remove('active');
                const fn = confirmAction; confirmAction = null;
                if (fn) fn();
            });
            if (no) no.addEventListener('click', () => { confirmModal.classList.remove('active'); confirmAction = null; });
            confirmModal.addEventListener('click', (e) => { if (e.target === confirmModal) { confirmModal.classList.remove('active'); confirmAction = null; } });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && confirmModal.classList.contains('active')) { confirmModal.classList.remove('active'); confirmAction = null; } });
        })();

        const SUPABASE_URL = 'https://qyuczfpgydgqywgthgrz.supabase.co';""",
"toast + confirm + helpers block")

# ══════════════════════════ 3. toastHost + confirmModal DOM ══════════════════════════
rep("<body>",
"""<body>
    <!-- FED-OS UPGRADE: toast host + confirm modal -->
    <div id="toastHost" aria-live="polite" aria-label="Notifications"></div>
    <div class="confirm-modal" id="confirmModal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <div class="confirm-box">
            <h4 class="confirm-title">Are you sure?</h4>
            <p class="confirm-text">This action cannot be undone.</p>
            <div class="actions confirm-actions">
                <button class="cancel confirm-no">Cancel</button>
                <button class="danger confirm-yes">Delete</button>
            </div>
        </div>
    </div>""",
"toastHost + confirmModal DOM")

# ═════════ additions need their references in existing code — anchor before stat helpers ═════════
rep("""        // Marquee
        let postSnippets = [];""",
"""        // ═══════════ FED-OS UPGRADE: topic likes (vote) system ═══════════
        // Requires topic_likes table + toggle_topic_like RPC (see upgrade migration).
        // UI degrades gracefully: if the RPC/table is missing, buttons render inert.
        let likesReady = null; // tri-state: null unknown, true ready, false broken
        async function likesAvailable() {
            if (likesReady !== null) return likesReady;
            try {
                const { data, error } = await supabaseClient.rpc('get_my_likes');
                if (error) throw error;
                likesReady = true;
                const ids = Array.isArray(data) ? data.map(r => r.topic_id) : [];
                myLikes = new Set(ids);
                return true;
            } catch (e) {
                likesReady = false;
                console.warn('[likes] RPC not available — like buttons disabled.', e.message);
                return false;
            }
        }
        let myLikes = new Set();
        window.myLikes = myLikes;
        async function toggleLike(topicId, countEl, btnEl) {
            if (!currentUser) { window.toast('Please log in to like posts.', 'info'); openModal(); return; }
            if (!await likesAvailable()) return;
            if (!rateLimiter.check('like:' + topicId, 800, 'Slow down —')) return;
            const wasLiked = myLikes.has(topicId);
            const current = parseInt(countEl.textContent, 10) || 0;
            const nextCount = wasLiked ? current - 1 : current + 1;
            // optimistic UI
            myLikes[wasLiked ? 'delete' : 'add'](topicId);
            btnEl.classList.add('pending');
            countEl.textContent = nextCount;
            btnEl.classList.toggle('liked', !wasLiked);
            try {
                const { data, error } = await supabaseClient.rpc('toggle_topic_like', { p_topic_id: topicId });
                if (error) throw error;
                if (typeof data === 'number') countEl.textContent = data;
                if (typeof data === 'object' && data && 'like_count' in data) countEl.textContent = data.like_count;
                // reflect in allTopics cache
                const t = allTopics.find(x => x.id === topicId);
                if (t) t.like_count = parseInt(countEl.textContent, 10) || t.like_count || 0;
                window.toast(wasLiked ? 'Like removed' : 'Liked \\u2764\\ufe0f', 'success', 1600);
            } catch (err) {
                // rollback
                myLikes[wasLiked ? 'add' : 'delete'](topicId);
                countEl.textContent = current;
                btnEl.classList.toggle('liked', wasLiked);
                window.toast('Could not save your like: ' + err.message, 'error');
            } finally {
                btnEl.classList.remove('pending');
            }
        }

        // ═══════════ FED-QUICK VIEW BADGE (hidden counts) ═══════════
        function likeBtnHtml(topic, likeCount) {
            const liked = myLikes.has(topic.id);
            return `<button class="like-btn ${liked ? 'liked' : ''}" data-topic-id="${topic.id}" title="${liked ? 'Unlike' : 'Like this topic'}" aria-label="${liked ? 'Unlike topic' : 'Like topic'}" aria-pressed="${liked}"><i class="fas fa-heart"></i> <span class="like-count">${likeCount}</span></button>`;
        }

        // Marquee
        let postSnippets = [];""",
"likes system before marquee")

# 3b. escape marquee + carousel (XSS in injected titles/usernames)
rep("""            let content = postSnippets.map(s => `<span>${s}</span>`).join('');
            marqueeTrack.innerHTML = content + content;""",
"""            let content = postSnippets.map(s => `<span>${escapeHtml(s)}</span>`).join('');
            marqueeTrack.innerHTML = content + content;""",
"marquee XSS fix")

rep("""                slide.innerHTML = `<div class="slide-rank">${idx + 1}</div><div class="slide-content"><div class="slide-title">${topic.title}</div><div class="slide-meta"><span><i class="fas fa-reply"></i> ${topic.replyCount || 0}</span><span><i class="fas fa-eye"></i> ${topic.views || 0}</span>${hot}</div></div>${catLabel}`;""",
"""                slide.innerHTML = `<div class="slide-rank">${idx + 1}</div><div class="slide-content"><div class="slide-title">${escapeHtml(topic.title)}</div><div class="slide-meta"><span><i class="fas fa-reply"></i> ${topic.replyCount || 0}</span><span><i class="fas fa-eye"></i> ${topic.views || 0}</span>${hot}</div></div>${catLabel}`;""",
"carousel XSS fix")

# 3c. tag cloud XSS fix
rep("""            tagCloudContent.innerHTML = sorted.map(([tag, count]) => `<span class="tag-cloud-item" data-tag="${tag}">${tag} <span class="tag-count">(${count})</span></span>`).join('');""",
"""            tagCloudContent.innerHTML = sorted.map(([tag, count]) => `<span class="tag-cloud-item" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <span class="tag-count">(${count})</span></span>`).join('');""",
"tag cloud XSS fix")

# ══════════════════════════ 4. renderTopicList: XSS + like button ══════════════════════════
rep("""            sorted.forEach(topic => {
                const displayName = topic.profiles?.username || topic.profiles?.email || 'Unknown';
                const date = new Date(topic.created_at).toLocaleDateString();
                const tags = topic.tags || [];
                const tagHtml = tags.map(t => `<span class="tag-badge">${t}</span>`).join('');
                const views = topic.views || 0;
                const replyCount = topic.replyCount || 0;
                const reading = getReadingTime(topic.content);
                const readingLabel = reading.mins > 0 ? `${reading.mins} min read` : '';
                const ago = timeAgo(topic.created_at);
                const cat = classifyTopic(topic);
                const catBadge = cat ? `<span class="eta-badge"><i class="fas fa-tag"></i> ${cat}</span>` : '';""",
"""            sorted.forEach(topic => {
                const displayName = escapeHtml(topic.profiles?.username || topic.profiles?.email || 'Unknown');
                const date = new Date(topic.created_at).toLocaleDateString();
                const tags = topic.tags || [];
                const tagHtml = tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('');
                const views = topic.views || 0;
                const replyCount = topic.replyCount || 0;
                const reading = getReadingTime(topic.content);
                const readingLabel = reading.mins > 0 ? `${reading.mins} min read` : '';
                const ago = timeAgo(topic.created_at);
                const cat = classifyTopic(topic);
                const catBadge = cat ? `<span class="eta-badge"><i class="fas fa-tag"></i> ${cat}</span>` : '';
                const likeCount = topic.like_count || 0;""",
"renderTopicList: escaped displayName + likeCount")

rep("""                // Download button for Icons channel (if there's an attachment)
                let iconDownloadHtml = '';
                if (ch === 'icons' && topic.attachment_url) {
                    iconDownloadHtml = `<button class="icon-download-btn" data-download-url="${topic.attachment_url}" data-download-name="${topic.title.replace(/"/g, '')}"><i class="fas fa-download"></i> Download Icon</button>`;
                }""",
"""                // Download button for Icons channel (if there's an attachment)
                let iconDownloadHtml = '';
                if (ch === 'icons' && topic.attachment_url) {
                    iconDownloadHtml = `<button class="icon-download-btn" data-download-url="${encodeURI(topic.attachment_url)}" data-download-name="${escapeHtml(topic.title.replace(/"/g, ''))}"><i class="fas fa-download"></i> Download Icon</button>`;
                }""",
"iconDownloadHtml XSS fix")

rep("""                html += `<div class="topic-card" data-topic-id="${topic.id}"><div class="flex-row"><div><div class="title">${topic.title}<button class="bookmark-btn ${bookmarked ? 'bookmarked' : ''}" data-topic-id="${topic.id}" title="Bookmark"><i class="${bookmarked ? 'fas' : 'far'} fa-bookmark"></i></button></div><div class="meta"><i class="fas fa-user" style="font-size:0.68rem;"></i><a href="#" class="profile-link" data-user-id="${topic.user_id}">${displayName}</a><i class="fas fa-calendar-alt" style="font-size:0.68rem; margin-left:4px;"></i> ${date}<span class="time-ago"><i class="fas fa-clock"></i> ${ago}</span>${readingLabel ? `<span class="reading-time">\u00b7 ${readingLabel}</span>` : ''}${channelBadgeHtml}${priceBadgeHtml}${catBadge}</div><div class="tags">${tagHtml}</div></div><div class="stats-col"><span class="reply-count"><i class="fas fa-reply"></i> ${replyCount}</span><span class="views-badge"><i class="fas fa-eye"></i> ${views}</span></div></div><div class="excerpt">${topic.content}</div>${imageHtml}${iconDownloadHtml}</div>`;""",
"""                const canEditTopic = isAdmin || (currentUser && topic.user_id === currentUser.id);
                html += `<div class="topic-card" data-topic-id="${topic.id}" data-user-id="${topic.user_id}"><div class="flex-row"><div><div class="title">${escapeHtml(topic.title)}<button class="bookmark-btn ${bookmarked ? 'bookmarked' : ''}" data-topic-id="${topic.id}" title="Bookmark"><i class="${bookmarked ? 'fas' : 'far'} fa-bookmark"></i></button></div><div class="meta"><i class="fas fa-user" style="font-size:0.64rem;"></i><a href="#" class="profile-link" data-user-id="${topic.user_id}">${displayName}</a><i class="fas fa-calendar-alt" style="font-size:0.64rem; margin-left:4px;"></i> ${date}<span class="time-now time-ago"><i class="fas fa-clock"></i> ${ago}</span>${readingLabel ? `<span class="reading-time">\u00b7 ${readingLabel}</span>` : ''}${channelBadgeHtml}${priceBadgeHtml}${catBadge}</div><div class="tags">${tagHtml}</div></div><div class="stats-col">${likeBtnHtml(topic, likeCount)}<span class="reply-count"><i class="fas fa-reply"></i> ${replyCount}</span><span class="views-badge"><i class="fas fa-eye"></i> ${views}</span></div></div><div class="excerpt" data-fulltext="${topic.id}">${highlightQuery(topic.content, searchQuery)}</div>${imageHtml}${iconDownloadHtml}${canEditTopic ? `<div class="mod-actions"><button class="btn-icon edit-topic" data-topic-id="${topic.id}"><i class="fas fa-pen"></i> Edit</button><button class="btn-icon danger delete-topic" data-topic-id="${topic.id}"><i class="fas fa-trash"></i> Delete</button></div>` : ''}</div>`;""",
"topic card: escaped title/content + like button + edit/delete")

# fix accidental class typo
h = h.replace('<span class="time-now time-ago">', '<span class="time-ago">')

# like button + edit/delete wiring on topic cards
rep("""            forumList.querySelectorAll('.icon-download-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); downloadIcon(btn.dataset.downloadUrl, btn.dataset.downloadName); }));
            forumList.querySelectorAll('.topic-card').forEach(card => card.addEventListener('click', () => showTopicDetail(card.dataset.topicId)));""",
"""            forumList.querySelectorAll('.icon-download-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); downloadIcon(btn.dataset.downloadUrl, btn.dataset.downloadName); }));
            wireModActions();
            forumList.querySelectorAll('.topic-card').forEach(card => card.addEventListener('click', () => showTopicDetail(card.dataset.topicId)));""",
"replace bogus forumTopicCard() with wireModActions()")

# 4b. Edit/delete wiring helpers (added right before renderTopicList definition)
rep("""        function renderTopicList(topics, append = false) {""",
"""        // ═══════════ FED-OS UPGRADE: edit / delete wiring ═══════════
        function wireModActions() {
            forumList.querySelectorAll('.like-btn').forEach(btn => btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.topic-card');
                if (card && card.dataset.topicId) toggleLike(card.dataset.topicId, btn.querySelector('.like-count'), btn);
            }));
            forumList.querySelectorAll('.edit-topic').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); startEditTopic(btn.dataset.topicId); }));
            forumList.querySelectorAll('.delete-topic').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteTopic(btn.dataset.topicId); }));
        }

        async function startEditTopic(topicId) {
            if (!currentUser) { window.toast('Please log in to edit.', 'info'); openModal(); return; }
            const card = forumList.querySelector(`.topic-card[data-topic-id="${topicId}"]`);
            if (!card) { showTopicDetail(topicId); return; }
            const topic = allTopics.find(t => t.id === topicId);
            if (!topic) { showTopicDetail view unreachable; showTopicDetail(topicId); return; }
            const cardTitle = card.querySelector('.title');
            const oldTitle = topic.title;
            const oldContent = topic.content;
            const titleText = cardTitle.childNodes[0];
            if (titleText && titleText.nodeType === 3) titleText.nodeValue = '';
            card.querySelector('.mod-actions')?.remove();
            const form = document.createElement('div');
            form.className = 'inline-edit';
            form.innerHTML = `<label style="font-size:0.78rem;color:var(--text-3);display:block;margin-bottom:6px;">Title</label><input class="ed-title input-dark" maxlength="300" style="width:100%;margin-bottom:10px;" value="${escapeHtml(oldTitle)}" aria-label="Topic title" /><label style="font-size:0.78rem;color:var(--somedummytext3, var(--text-3));display:block;margin-bottom:6px;">Content</label><textarea class="ed-content" rows="6">${escapeHtml(oldContent)}</textarea><div class="inline-actions"><button class="save" type="button">Save</button><button class="cancel-edit" type="button">Cancel</button></div>`;
            card.appendChild(form);
            form.querySelector('.ed-title').focus();
            const restore = () => {
                if (titleText && titleText.nodeType === 3) titleText.nodeValue = oldTitle;
                form.remove();
                renderTopicList(allTopics, false);
            };
            form.querySelector('.save').addEventListener('click', async () => {
                const newTitle = form.querySelector('.ed-title').value.trim();
                const newContent = form.querySelector('.ed-content').value.trim();
                if (!newTitle || !newContent) { window.toast('Title and content are required.', 'error'); return; }
                if (!rateLimiter.check('edit-topic', 5000, 'Editing too fast —')) return;
                form.querySelector('.save').disabled = true;
                form.querySelector('.save').textContent = 'Saving…';
                try {
                    const { error } = await supabaseClient.from('topics').update({ title: newTitle, content: newContent, updated_at: new Date().toISOString() }).eq('id', topicId);
                    if (error) throw error;
                    window.toastSuccess('Topic updated');
                    sessionStorage.removeItem(CACHE_KEY);
                    resetAndLoad();
                } catch (err) {
                    window.toastError('Update failed: ' + err.message);
                    form.querySelector('.save').disabled = false;
                    form.querySelector('.save').cnt = true; form.querySelector('.save').textContent = 'Save';
                }
            });
            form.querySelector('.cancel-edit').addEventListener('click', restore);
        }

        async function deleteTopic(topicId) {
            const topic = allTopics.find(t => t.id === topicId);
            if (!topic) return;
            if (!currentUser) { window.toast('Please log in to delete.', 'info'); openModal(); return; }
            window.confirmDialog(`Delete topic "${topic.title}"? All replies will be removed. This cannot be undone.`, async () => {
                try {
                    const { error } = await supabaseClient.from('topics').delete().eq('id', topicId);
                    if (error) throw error;
                    window.toastSuccess('Topic deleted');
                    addSnippet(`🗑️ A topic was removed by ${isAdmin ? 'an admin' : 'the author'}`);
                    sessionStorage.removeItem(CTA_WARN('cache-cleared'), '');
                    sessionStorage.removeItem(CACHE_KEY);
                    resetAndLoad();
                } catch (err) {
                    window.toastError('Delete failed: ' + err.message);
                }
            }, { title: 'Delete topic?', yesLabel: 'Delete' });
        }

        function renderTopicList(topics, append = false) {""",
"wireModActions + startEditTopic + deleteTopic")

# fix stray garbage tokens from long-string generation
h = h.replace("if (!topic) { showTopicDetail view unreachable; showTopicDetail(topicId); return; }",
              "if (!topic) { showTopicDetail(topicId); return; }")
h = h.replace("form.querySelector('.save').cnt = true; form.querySelector('.save').textContent = 'Save';",
              "form.querySelector('.save').textContent = 'Save';")
h = h.replace("sessionStorage.removeItem(CTA_WARN('cache-cleared'), '');",
              "")
h = h.replace('style="font-size:0.78rem;color:var(--somedummytext3, var(--text-3));display:block;margin-bottom:6px;"',
              'style="font-size:0.78rem;color:var(--text-3);display:block;margin-bottom:6px;"')

# ══════════════════════════ 5. showTopicDetail: escape + like + reply actions ══════════════════════════
rep("""                detailTitle.textContent = topic.title;
                const displayName = topic.profiles?.username || topic.profiles?.email || 'Unknown';""",
"""                detailTitle.textContent = topic.title; // textContent — safe
                const displayName = escapeHtml(topic.profiles?.username || topic.profiles?.email || 'Unknown');""",
"detail displayName escape")

rep("""                detailMeta.innerHTML = `By ${displayName} · ${date} · 👁️ <span id="topicViewCount">${views}</span> views${detailBadges}`;""",
"""                const canEditTopicDetail = isAdmin || (currentUser && topic.user_id === currentUser.id);
                const editedSuffix = topic.updated_at ? ` <span class="edited-badge">(edited ${new Date(topic.updated_at).toLocaleDateString()})</span>` : '';
                detailMeta.innerHTML = `By ${displayName} · ${date}${editedSuffix} · 👁️ <span id="topicViewCount">${views}</span> views${detailBadges}`;""",
"detailMeta: edited badge + canEdit flag")

rep("""                if (topic.attachment_url) {
                    const url = topic.attachment_url; const ext = url.split('.').pop().toLowerCase(); let html = '';""",
"""                if (topic.attachment_url) {
                    const url = encodeURI(topic.attachment_url); const ext = url.split('.').pop().toLowerCase(); let html = '';""",
"detail attachment URL encode")

rep("""                    detailAttachment.innerHTML = html;
                } else detailAttachment.innerHTML = '';""",
"""                    detailAttachment.innerHTML = html;
                } else detailAttachment.innerHTML = '';

                // ── FED-OS UPGRADE: like button in detail header ──
                const likeBar = document.getElementById('detailLikeBar');
                if (likeBar) {
                    likeBar.innerHTML = likeBtnHtml(topic, topic.like_count || 0);
                    const btn = likeBar.querySelector('.like-btn');
                    if (btn) btn.addEventListener('click', () => toggleLike(topic.id, btn.querySelector('.like-count'), btn));
                }""",
"detail like bar injection")

rep("""                detailTags.innerHTML = tags.map(t => `<span class="tag-badge">${t}</span>`).join('');""",
"""                detailTags.innerHTML = tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('');""",
"detailTags XSS fix")

rep("""                if (replies.length === 0) repliesList.innerHTML = `<p class="text-gray-400 text-sm">No replies yet. Be the first to respond!</p>`;
                else {
                    let html = '';
                    replies.forEach(reply => {
                        const replyName = reply.profiles?.username || reply.profiles?.email || 'Unknown';
                        const replyDate = new Date(reply.created_at).toLocaleString();
                        html += `<div class="reply-item" data-reply-id="${reply.id}"><div class="reply-meta"><span class="name">${replyName}</span><span>${replyDate}</span></div><div class="reply-body">${reply.content}</div></div>`;
                    });
                    repliesList.innerHTML = html;
                }""",
"""                if (replies.length === 0) repliesList.innerHTML = `<p class="text-gray-400 text-sm">No replies yet. Be the first to respond!</p>`;
                else {
                    let html = '';
                    replies.forEach(reply => {
                        const replyName = escapeHtml(reply.profiles?.username || reply.profiles?.email || 'Unknown');
                        const replyDate = new Date(reply.created_at).toLocaleString();
                        const replyEdited = reply.updated_at ? ` <span class="edited-badge">(edited)</span>` : '';
                        const canEditReply = isAdmin || (currentUser && reply.user_id === currentUser.id);
                        const actionsHtml = canEditReply ? `<div class="mod-actions"><button class="btn-icon edit-reply" data-reply-id="${reply.id}"><i class="fas fa-pen"></i> Edit</button><button class="btn-icon danger delete-reply" data-reply-id="${reply.id}"><i class="fas fa-trash"></i> Delete</button></div>` : '';
                        html += `<div class="reply-item" data-reply-id="${reply.id}" data-reply-user="${reply.user_id}"><div class="reply-meta"><span class="name">${replyName}</span><span>${replyDate}${replyEdited}</span></div><div class="reply-body">${escapeHtml(reply.content)}</div>${actionsHtml}</div>`;
                    });
                    repliesList.innerHTML = html;
                    repliesList.querySelectorAll('.edit-reply').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); startEditReply(btn.dataset.replyId); }));
                    repliesList.querySelectorAll('.delete-reply').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); deleteReply(btn.dataset.replyId); }));
                }""",
"replies: escape + edit/delete buttons")

# reply edit/delete helpers — insert before backToForumBtn listener
rep("""        backToForumBtn.addEventListener('click', () => {
            singleTopicView.classList.add('hidden');""",
"""        // ═══════════ FED-OS UPGRADE: reply edit / delete ═══════════
        async function startEditReply(replyId) {
            if (!currentUser) { window.toast('Please log in to edit.', 'info'); openModal(); return; }
            const item = repliesList.querySelector(`.reply-item[data-reply-id="${replyId}"]`);
            if (!item) return;
            const body = item.querySelector('.reply-body');
            const oldContent = body.textContent;
            const origHtml = body.innerHTML;
            body.innerHTML = `<div class="inline-edit"><textarea rows="4">${escapeHtml(oldContent)}</textarea><div class="inline-actions"><button class="save" type="button">Save</button><button class="cancel-edit" type="button">Cancel</button></div></div>`;
            const form = body.querySelector('.inline-edit');
            form.querySelector('textarea').focus();
            form.querySelector('.save').addEventListener('click', async () => {
                const newContent = form.querySelector('textarea').value.trim();
                if (!newContent) { window.toast('Reply cannot be empty.', 'error'); return; }
                if (!rateLimiter.check('edit-reply', 5000, 'Editing too fast —')) return;
                form.querySelector('.save').disabled = true;
                form.querySelector('.save').textContent = 'Saving…';
                try {
                    const { error } = await supabaseClient.from('replies').update({ content: newContent, updated_at: new Date().toISOString() }).eq('id', replyId);
                    if (error) throw error;
                    window.toastSuccess('Reply updated');
                    showTopicDetail(currentTopicId);
                } catch (err) {
                    window.toastError('Update failed: ' + err.message);
                    body.innerHTML = origHtml;
                }
            });
            form.querySelector('.cancel-edit').addEventListener('click', () => { body.innerHTML = origHtml; });
        }

        async function deleteReply(replyId) {
            if (!currentUser) { window.toast('Please log in to delete.', 'info'); openModal(); return; }
            window.confirmDialog('Delete this reply? This cannot be undone.', async () => {
                try {
                    const { error } = await supabaseClient.from('replies').delete().eq('id', replyId);
                    if (errfo) throw errfo;
                    window.toastSuccess('Reply deleted');
                    showTopicDetail(currentTopicId);
                } catch (err) {
                    window.toastError('Delete failed: ' + err.message);
                }
            }, { title: 'Delete reply?', yesLabel: 'Delete' });
        }

        backToForumBtn.addEventListener('click', () => {
            singleTopicView.classList.add('hidden');""",
"reply edit/delete helpers")

h = h.replace("if (errfo) throw errfo;", "if (error) throw error;")

# ══════════════════════════ 6. alerts → toasts ══════════════════════════
rep("if (p !== 'granted') { desktopToggle.checked = false; save('desktopNotif', false); alert('Desktop notifications were not enabled. You can allow them in your browser settings.'); }",
    "if (p !== 'granted') { desktopToggle.checked = false; save('desktopNotif', false); (window.toast ? window.toast('Desktop notifications were not enabled. You can allow them in your browser settings.', 'warning') : _nativeAlertFallback && _nativeAlertFallback('Desktop notifications were not enabled.')); }",
    "settings alert → toast")

rep("""        downloadDesktop.addEventListener('click', () => { alert('🚀 Desktop app download coming soon!\\
Stay tuned for the FEDPromptly desktop client.'); downloadDropdown.classList.remove('open'); });
        downloadMobile.addEventListener('click', () => { alert('📱 Mobile app download coming soon!\\
The FEDPromptly mobile app is in development.'); downloadDropdown.classList.remove('open'); });""",
"""        downloadDesktop.addEventListener('click', () => { window.toast('🚀 Desktop app download coming soon! Stay tuned for the FEDPromptly desktop client.', 'info', 4500); downloadDropdown.classList.remove('open'); });
        downloadMobile.addEventListener('click', () => { window.toast('📱 Mobile app download coming soon! The FEDPromptly mobile app is in development.', 'info', 4500); downloadDropdown.classList.remove('open'); });""",
"download alerts → toasts")

# generic fallback: any remaining alert( → toast via overridden window.alert
# (already overridden globally). Copy-link alerts use native confirm-style copy:
rep("copyLinkBtn.onclick = function() { navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?topic=' + topicId).then(() => alert('Link copied!')).catch(() => alert('Copy failed.')); };",
    "copyLinkBtn.onclick = function() { navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?topic=' + topicId).then(() => window.toast('Link copied!', 'success', 2000)).catch(() => window.toast('Copy failed.', 'error')); };",
    "copyLink toast")

rep("else navigator.clipboard.writeText(shareData.url).then(() => alert('Link copied!'));",
    "else navigator.clipboard.writeText(shareData.url).then(() => window.toast('Link copied!', 'success', 2000));",
    "share fallback toast")

# ══════════════════════════ 7. rate limiting on submit handlers ══════════════════════════
rep("if (!currentUser) { alert('You must be logged in to post.'); openModal(); return; }",
    "if (!currentUser) { window.toast('You must be logged in to post.', 'info'); openModal(); return; }",
    "topic submit: login toast")

rep("if (!title || !content) { alert('Title and content are required.'); return; }",
    "if (!title || !content) { window.toast('Title and content are required.', 'error'); return; }\n            if (!rateLimiter.check('new-topic', 30000, 'Please wait before posting another topic —')) return;",
    "topic submit: validation + rate limit")

rep("alert('Only admins can post to the Notes channel.');",
    "window.toast('Only admins can post to the Notes channel.', 'error');",
    "notes admin toast")

rep("alert('Icon posts require an image attachment. Please attach an image file.');",
    "window.toast('Icon posts require an image attachment. Please attach an image file.', 'error');",
    "icons attachment toast")

rep("alert('Icon posts require an image file (PNG, JPG, SVG, etc.).');",
    "window.toast('Icon posts require an image file (PNG, JPG, SVG, etc.).', 'error');",
    "icons file-type toast")

rep("} catch (err) { console.error('Error creating topic:', err); alert('Failed to create topic: ' + err.message); }",
    "} catch (err) { console.error('Error creating topic:', err); window.toast('Failed to create topic: ' + err.message, 'error', 5000); }",
    "create topic error toast")

rep("} catch (err) { console.error('Error loading topic detail:', err); alert('Failed to load topic details.'); }",
    "} catch (err) { console.error('Error loading topic detail:', err); window.toast('Failed to load topic details.', 'error'); }",
    "detail error toast")

rep("if (!currentUser) { alert('You must be logged in to reply.'); openModal(); return; }",
    "if (!currentUser) { window.toast('You must be logged in to reply.', 'info'); openModal(); return; }\n            if (!rateLimiter.check('new-reply', 10000, 'You are replying too quickly —')) return;",
    "reply: login + rate limit")

rep("} catch (err) { console.error('Error posting reply:', err); alert('Failed to post reply: ' + err.message); }",
    "} catch (err) { console.error('Error posting reply:', err); window.toast('Failed to post reply: ' + err.message, 'error', 5000); }",
    "reply error toast")

rep("} catch (err) { console.error('Profile load error:', err); alert('Could not load profile.'); }",
    "} catch (err) { console.error('Profile load error:', err); window.toast('Could not load profile.', 'error'); }",
    "profile error toast")

rep("if (!currentUser) { alert('Please log in to create a new topic.'); openModal(); return; }",
    "if (!currentUser) { window.toast('Please log in to create a new topic.', 'info'); openModal(); return; }",
    "new topic btn toast")

# ══════════════════════════ 8. search: highlight + hit counter + server-side ilike ══════════════════════════
rep("""            const filtered = allTopics.filter(t => t.title.toLowerCase().includes(searchQuery) || t.content.toLowerCase().includes(searchQuery) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery))));
            renderTopicList(filtered, false);
            if (!filtered.length) forumList.innerHTML = `<p class="text-gray-400 text-center py-8">No topics match your search for "${query}".</p>`;""",
"""            const filtered = allTopics.filter(t => t.title.toLowerCase().includes(searchQuery) || t.content.toLowerCase().includes(searchQuery) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery))));
            renderTopicList(filtered, false);
            if (!searchHitsNote) { searchHitsNote = document.createElement('p'); searchHitsNote.className = 'search-hits'; forumList.parentElement.insertBefore(searchHitsNote, forumList); }
            searchHitsNote.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'} for "${query}"`;
            searchHitsNote.style.display = filtered.length ? '' : 'none';
            if (!filtered.length) { searchHitsNote.style.display = 'none'; forumList.innerHTML = `<p class="text-gray-400 text-center py-8">No topics match your search for "${escapeHtml(query)}".</p>`; }""",
"search: hit counter + escaped query")

rep("""        // Search
        function filterTopics(query) {""",
"""        // Search
        let searchHitsNote = null;
        function filterTopics(query) {""",
"searchHitsNote declaration")

# clear hit counter when leaving search
rep("""        function filterByCategory(cat) {
            currentCategory = cat;
            localStorage.setItem('fedos_category', cat);""",
"""        function filterByCategory(cat) {
            currentCategory = cat;
            if (searchHitsNote) searchHitsNote.style.display = 'none';
            localStorage.setItem('fedos_category', cat);""",
"hide hits note on category change")

# ══════════════════════════ 9. loadTopics: like_count + updated_at select ══════════════════════════
rep(".select(`id, title, content, created_at, user_id, attachment_url, tags, views, channel, price_label, profiles ( username, email ), reply_count:replies(count)`)",
    ".select(`id, title, content, created_at, updated_at, user_id, attachment_url, tags, views, channel, price_label, like_count, profiles ( username, email ), reply_count:replies(count)`)",
    "loadTopics: fetch like_count + updated_at")

rep("""                const { data: topic, error: topicErr } = await supabaseClient.from('topics').select(`id, title, content, created_at, user_id, attachment_url, tags, views, channel, price_label, profiles ( username, email )`).eq('id', topicId).single();""",
"""                const { data: topic, error: topicErr } = await supabaseClient.from('topics').select(`id, title, content, created_at, updated_at, user_id, attachment_url, tags, views, channel, price_label, like_count, profiles ( username, email )`).eq('id', topicId).single();""",
    "detail select: like_count + updated_at")

rep("""                const { data: replies, error: repliesErr } = await supabaseClient.from('replies').select(`id, content, created_at, user_id, profiles ( username, email )`).eq('topic_id', topicId).order('created_at', { ascending: true });""",
"""                const { data: replies, error: repliesErr } = await supabaseClient.from('replies').select(`id, content, created_at, updated_at, user_id, profiles ( username, email )`).eq('topic_id', topicId).order('created_at', { ascending: true });""",
    "replies select: updated_at")

# ══════════════════════════ 10. likes availability probe on load + init ══════════════════════════
rep("        refreshForumViewCount(); loadDrafts(); loadSnippets();",
    "        refreshForumViewCount(); loadDrafts(); loadSnippets(); likesAvailable();",
    "probe likes RPC on load")

# ═══════════════10A. topic detail like bar placeholder in HTML ═══════════════
rep("""                    <div id="detailStats" class="text-sm text-gray-500 mb-3 flex gap-4 flex-wrap">""",
"""                    <div id="detailLikeBar" class="flex gap-2 mb-3"></div>
                    <div id="detailStats" class="text-sm text-gray-500 mb-3 flex gap-4 flex-wrap">""",
"detailLikeBar placeholder in HTML")

# ══════════════════════════ 11. profile view XSS + likes info ══════════════════════════
rep("""                let html = `<div class="profile-card"><div class="avatar">${user.username?.charAt(0).toUpperCase() || '?'}</div><h2>${user.username || 'Anonymous'}</h2><p style="color:var(--text-2); margin-top:4px;">${user.email || ''}</p><p style="color:var(--text-3); margin-top:8px; font-size:0.85rem;">Joined ${new Date(user.created_at).toLocaleDateString()}</p></div><h3 class="section-h" style="margin-bottom:14px;">Topics (${topics.length})</h3>`;""",
"""                let html = `<div class="profile-card"><div class="avatar">${escapeHtml(user.username?.charAt(0).toUpperCase() || '?')}</div><h2>${escapeHtml(user.username || 'Anonymous')}</h2><p style="color:var(--text-2); margin-top:4px;">${escapeHtml(user.email || '')}</p><p style="color:var(--text-3); margin-top:8px; font-size:0.85rem;">Joined ${new Date(user.created_at).toLocaleDateString()}</p></div><h3 class="section-h" style="margin-bottom:14px;">Topics (${topics.length})</h3>`;""",
"profile card XSS fix")

rep("""                        html += `<div class="topic-card" data-topic-id="${t.id}"><div class="flex-row"><div><div class="title">${t.title}</div><div class="meta">${new Date(t.created_at).toLocaleDateString()} · ${t.views || 0} views</div></div><span class="reply-count"><i class="fas fa-reply"></i> ${count}</span></div></div>`;""",
"""                        html += `<div class="topic-card" data-topic-id="${t.id}"><div class="flex-row"><div><div class="title">${escapeHtml(t.title)}</div><div class="meta">${new Date(t.created_at).toLocaleDateString()} · ${t.views || 0} views</div></div><span class="reply-count"><i class="fas fa-reply"></i> ${count}</span></div></div>`;""",
"profile topic card XSS fix")

rep("""                        html += `<div class="reply-item"><div class="reply-meta"><span>Replied to <a href="#" class="text-purple-600 topic-link" data-topic-id="${r.topic_id}">${r.topics?.title || 'a topic'}</a></span><span>${new Date(r.created_at).toLocaleDateString()}</span></div><div class="reply-body">${r.content}</div></div>`;""",
"""                        html += `<div class="reply-item"><div class="reply-meta"><span>Replied to <a href="#" class="text-purple-600 topic-link" data-topic-id="${r.topic_id}">${escapeHtml(r.topics?.title || 'a topic')}</a></span><span>${new Date(r.created_at).toLocaleDateString()}</span></div><div class="reply-body">${escapeHtml(r.content)}</div></div>`;""",
"profile reply XSS fix")

# ══════════════════════════ 12. real footer links (Discord invite from widget) ══════════════════════════
rep("""        const SERVER_ID = '1400235929154879490';
        async function getOnlineCount() {
            try {
                const response = await fetch(`https://discord.com/api/guilds/${SERVER_ID}/widget.json`);
                const data = await response.json();
                const count = data.presence_count || 0;
                document.getElementById('online-number').innerText = count;
            } catch(error) {
                document.getElementById('online-number').innerText = '?';
            }
        }
        getOnlineCount();
        setInterval(getOnlineCount, 60000);""",
"""        const SERVER_ID = '1400235929154879490';
        window.FED_SOCIAL = {
            twitter: 'https://x.com/fedpromptly',
            github: 'https://github.com/fedpromptly',
            kofi: 'https://ko-fi.com/fedpromptly'
        };
        async function getOnlineCount() {
            try {
                const response = await fetch(`https://discord.com/api/guilds/${SERVER_ID}/widget.json`);
                const data = await response.json();
                const count = data.presence_count || 0;
                document.getElementById('online-number').innerText = count;
                // FED-OS UPGRADE: real invite links from the live widget payload
                if (data.instant_invite) {
                    document.querySelectorAll('a[href="https://discord.com"], a.footer-social[title="Discord"], a.about-link[href="https://discord.com"]').forEach(a => a.href = data.instant_invite);
                }
                const dc = document.querySelector('.footer-social[title="Discord"]');
                if (dc) { dc.href = data.instant_invite || dc.href; }
                const aboutDc = document.querySelector('.about-link[href="https://discord.com"]');
                if (aboutDc) aboutDc.href = data.instant_invite || aboutDc.href;
            } catch(error) {
                document.getElementById('online-number').innerText = '?';
            }
        }
        // Apply configurable social links once DOM is ready
        document.addEventListener('DOMContentLoaded', () => {
            const t = document.querySelector('a.footer-social[title="Twitter / X"]');
            if (t) t.href = window.FED_SOCIAL.twitter;
            const g = document.querySelector('a.footer-social[title="GitHub"]');
            if (g) g.href = FED_SOCIAL.github;
            const k = document.querySelector('a.footer-social[title="Ko-fi"]');
            if (k) k.href = FED_SOCIAL.kofi;
        });
        getOnlineCount();
        setInterval(getOnlineCount, 60000);""",
"Discord widget: live invite links + social constants")

# fix socials: twitter → x.com
rep('<a class="footer-social" href="https://twitter.com" target="_blank" rel="noopener" title="Twitter / X"><i class="fab fa-twitter"></i></a>',
    '<a class="footer-social" href="https://x.com/fedpromptly" target="_blank" rel="noopener" title="Twitter / X"><i class="fab fa-x-twitter"></i></a>',
    "footer twitter → x")

rep('<a class="footer-social" href="https://github.com" target="_blank" rel="noopener" title="GitHub"><i class="fab fa-github"></i></a>',
    '<a class="footer-social" href="https://github.com/fedpromptly" target="_blank" rel="noopener" title="GitHub"><i class="fab fa-github"></i></a>',
    "footer github")

# ══════════════════════════ 13. keyboard shortcut: L to like ══════════════════════════
rep("""            if ((e.key === 'r' || e.key === 'R') && !singleTopicView.classList.contains('hidden')) { e.preventDefault(); replyContent.focus(); }""",
"""            if ((e.key === 'r' || e.key === 'R') && !singleTopicView.classList.contains('hidden')) { e.preventDefault(); replyContent.focus(); }
            if ((e.key === 'l' || e.key === 'L') && !singleTopicView.classList.contains('hidden')) { e.preventDefault(); const btn = document.querySelector('#detailLikeBar .like-btn'); if (btn) btn.click(); }""",
    "keyboard: L to like")

# ══════════════════════════ 14. topics realtime: update like counts live ══════════════════════════
rep("window.topicsSubscription = supabaseClient.channel('public:topics').on('postgres_changes', { event: '*', schema: 'public', table: 'topics' }, () => { sessionStorage.removeItem(CACHE_KEY); resetAndLoad(); }).subscribe();",
"""window.topicsSubscription = supabaseClient.channel('public:topics').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'topics' }, (payload) => {
                // Live like-count sync without full reload
                const t = allTopics.find(x => x.id === payload.new.id);
                if (t) {
                    t.like_count = payload.new.like_count ?? t.like_count;
                    t.views = payload.new.views ?? t.views;
                    document.querySelectorAll(`.topic-card[data-topic-id="${payload.new.id}"] .like-btn .like-count`).forEach(el => { el.textContent = payload.new.like_count ?? el.textContent; });
                    const dl = document.querySelector('#detailLikeBar .like-count');
                    if (dl && currentTopicId === payload.new.id) dl.textContent = payload.new.like_count ?? dl.textContent;
                }
            }).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'topics' }, () => { sessionStorage.removeItem(CACHE_KEY); resetAndLoad(); })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'topics' }, () => { sessionStorage.removeItem(CACHE_KEY); resetAndLoad(); }).subscribe();""",
    "topics realtime: granular handlers")

with open(DST, "w", encoding="utf-8") as f:
    f.write(h)

print(f"\\nAll edits applied → {DST} ({len(h)} chars)")
