// ═══════════ FED-OS UPGRADE: toast system (replaces alert) ═══════════
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
            const escQuery = escapeHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            try { return safe.replace(new RegExp(escQuery, 'gi'), (m) => `<mark>${m}</mark>`); } catch (e) { return safe; }
        }
        window.highlightQuery = highlightQuery;

        // ─────────── FED-OS UPGRADE: schema compatibility layer ───────────
        // Works whether or not the Supabase migration (fed_os_upgrade_v1.sql) has been run yet.
        // PostgREST returns PGRST204 ("column not found") when updated_at / like_count
        // don't exist yet. We probe once, cache the result, and retry with legacy select strings.
        const schemaCompat = {
            probed: false,
            hasUpgradeColumns: true, // optimistic default = migration already run
            async probe() {
                if (this.probed) return this.hasUpgradeColumns;
                try {
                    const { data, error } = await supabaseClient.from('topics').select('id, updated_at, like_count').limit(1);
                    if (error && /PGRST204|column .* does not exist/i.test(error.message || '')) {
                        this.hasUpgradeColumns = false;
                        console.warn('[schema] Migration columns not found yet — running in legacy mode. Run fed_os_upgrade_v1.sql to enable likes + edited badges.');
                    } else {
                        this.hasUpgradeColumns = true;
                    }
                } catch (e) {
                    this.hasUpgradeColumns = false; // network/edge cases: safest fallback
                }
                this.probed = true;
                return this.hasUpgradeColumns;
            }
        };
        // Select-string pairs: upgraded (migration run) vs legacy (pre-migration)
        const SELECT_UPGRADED = {
            topics: `id, title, content, created_at, updated_at, user_id, attachment_url, tags, views, channel, price_label, like_count, profiles ( username, email ), reply_count:replies(count)`,
            topic: `id, title, content, created_at, updated_at, user_id, attachment_url, tags, views, channel, price_label, like_count, profiles ( username, email )`,
            replies: `id, content, created_at, updated_at, user_id, profiles ( username, email )`
        };
        const SELECT_LEGACY = {
            topics: `id, title, content, created_at, user_id, attachment_url, tags, views, channel, price_label, profiles ( username, email ), reply_count:replies(count)`,
            topic: `id, title, content, created_at, user_id, attachment_url, tags, views, channel, price_label, profiles ( username, email )`,
            replies: `id, content, created_at, user_id, profiles ( username, email )`
        };
        function isSchemaError(err) {
            return !!(err && /PGRST204|column .* does not exist/i.test(err.message || ''));
        }
        async function fetchTopicsCompat(from, to) {
            const upgraded = await schemaCompat.probe();
            let res = await supabaseClient.from('topics').select(upgraded ? SELECT_UPGRADED.topics : SELECT_LEGACY.topics).order('created_at', { ascending: false }).range(from, to);
            if (isSchemaError(res.error)) {
                schemaCompat.hasUpgradeColumns = false; schemaCompat.probed = true;
                res = await supabaseClient.from('topics').select(SELECT_LEGACY.topics).order('created_at', { ascending: false }).range(from, to);
            }
            return res;
        }
        async function fetchTopicDetailCompat(topicId) {
            const upgraded = await schemaCompat.probe();
            let res = await supabaseClient.from('topics').select(upgraded ? SELECT_UPGRADED.topic : SELECT_LEGACY.topic).eq('id', topicId).single();
            if (isSchemaError(res.error)) {
                schemaCompat.hasUpgradeColumns = false; schemaCompat.probed = true;
                res = await supabaseClient.from('topics').select(SELECT_LEGACY.topic).eq('id', topicId).single();
            }
            return res;
        }
        async function fetchRepliesCompat(topicId) {
            const upgraded = await schemaCompat.probe();
            let res = await supabaseClient.from('replies').select(upgraded ? SELECT_UPGRADED.replies : SELECT_LEGACY.replies).eq('topic_id', topicId).order('created_at', { ascending: true });
            if (isSchemaError(res.error)) {
                schemaCompat.hasUpgradeColumns = false; schemaCompat.probed = true;
                res = await supabaseClient.from('replies').select(SELECT_LEGACY.replies).eq('topic_id', topicId).order('created_at', { ascending: true });
            }
            return res;
        }
        window.fetchTopicsCompat = fetchTopicsCompat;
        window.fetchTopicDetailCompat = fetchTopicDetailCompat;
        window.fetchRepliesCompat = fetchRepliesCompat;

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

        const SUPABASE_URL = 'https://qyuczfpgydgqywgthgrz.supabase.co';
        const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_2NLEuDREplLS9DgUXeA8Tw_f8MJOhCq';
        const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

        let currentUser = null;
        let isSignUp = false;
        let currentTopicId = null;
        let currentPage = 0;
        const PAGE_SIZE = 20;
        let hasMore = true;
        let isLoading = false;
        let currentSort = 'hot';
        let allTopics = [];
        let isAdmin = false;          // set true when logged-in user has is_admin flag
        let selectedChannel = 'general'; // current channel selected in the new-topic form
        let selectedPriceLabel = null;   // 'Free', 'Paid', or a custom string (Icons only)
        let bookmarks = JSON.parse(localStorage.getItem('fedos_bookmarks') || '[]');
        let carouselTopics = [];
        let currentSlide = 0;
        let autoSlideInterval = null;
        const CAROUSEL_AUTO_INTERVAL = 5000;
        let carouselSpeedOverride = null;
        function getCarouselInterval() { return carouselSpeedOverride || (window.getSettings && window.getSettings().carouselSpeed) || CAROUSEL_AUTO_INTERVAL; }
        window.applyCarouselSpeedOverride = function(ms) { carouselSpeedOverride = ms; if (typeof startAutoSlide === 'function') startAutoSlide(); };
        let searchQuery = '';

        const loginBtn = document.getElementById('loginBtn');
        const loginModal = document.getElementById('loginModal');
        const closeModal = document.getElementById('closeModal');
        const loginForm = document.getElementById('loginForm');
        const loginEmail = document.getElementById('loginEmail');
        const loginPassword = document.getElementById('loginPassword');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const authMessage = document.getElementById('authMessage');
        const modalTitle = document.getElementById('modalTitle');
        const modalSub = document.getElementById('modalSub');
        const toggleAuthMode = document.getElementById('toggleAuthMode');
        const toggleText = document.getElementById('toggleText');
        const forgotPassword = document.getElementById('forgotPassword');
        const userAvatar = document.getElementById('userAvatar');
        const loginBtnText = document.getElementById('loginBtnText');

        const forumList = document.getElementById('forumList');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const sortSelect = document.getElementById('sortSelect');
        const categoryTabs = document.getElementById('categoryTabs');
        const etaLatestPost = document.getElementById('etaLatestPost');
        const etaActivity = document.getElementById('etaActivity');
        const etaTotalReplies = document.getElementById('etaTotalReplies');
        const etaAvgRead = document.getElementById('etaAvgRead');
        let currentCategory = localStorage.getItem('fedos_category') || 'all';
        const newTopicBtn = document.getElementById('newTopicBtn');
        const stickyNewTopic = document.getElementById('stickyNewTopic');
        const newTopicForm = document.getElementById('newTopicForm');
        const createTopicForm = document.getElementById('createTopicForm');
        const topicTitle = document.getElementById('topicTitle');
        const topicContent = document.getElementById('topicContent');
        const topicCharCounter = document.getElementById('topicCharCounter');
        const topicAttachment = document.getElementById('topicAttachment');
        const cancelTopicBtn = document.getElementById('cancelTopicBtn');
        const singleTopicView = document.getElementById('singleTopicView');
        const backToForumBtn = document.getElementById('backToForumBtn');
        const detailTitle = document.getElementById('detailTitle');
        const detailMeta = document.getElementById('detailMeta');
        const detailContent = document.getElementById('detailContent');
        const detailAttachment = document.getElementById('detailAttachment');
        const detailTags = document.getElementById('detailTags');
        const detailStats = document.getElementById('detailStats');
        const repliesList = document.getElementById('repliesList');
        const replyForm = document.getElementById('replyForm');
        const replyContent = document.getElementById('replyContent');
        const replyCharCounter = document.getElementById('replyCharCounter');
        const tagCheckboxes = document.getElementById('tagCheckboxes');
        const uploadError = document.getElementById('uploadError');
        const channelSelectWrap = document.getElementById('channelSelectWrap');
        const channelHint = document.getElementById('channelHint');
        const priceFieldWrap = document.getElementById('priceFieldWrap');
        const priceRadioGroup = document.getElementById('priceRadioGroup');
        const priceCustomInput = document.getElementById('priceCustomInput');
        const subscribersTab = document.getElementById('subscribersTab');
        const profileView = document.getElementById('profileView');
        const backFromProfileBtn = document.getElementById('backFromProfileBtn');
        const profileContent = document.getElementById('profileContent');

        const carouselContainer = document.getElementById('carouselContainer');
        const carouselTrack = document.getElementById('carouselTrack');
        const carouselDots = document.getElementById('carouselDots');
        const carouselPrev = document.getElementById('carouselPrev');
        const carouselNext = document.getElementById('carouselNext');

        const topicCountEl = document.getElementById('topicCount');
        const lastUpdatedEl = document.getElementById('lastUpdated');
        const backToTopBtn = document.getElementById('backToTop');
        const searchInput = document.getElementById('searchInput');
        const breadcrumbTopic = document.getElementById('breadcrumbTopic');
        const breadcrumbReplies = document.getElementById('breadcrumbReplies');
        const breadcrumbSepReplies = document.getElementById('breadcrumbSepReplies');
        const copyLinkBtn = document.getElementById('copyLinkBtn');
        const shareBtn = document.getElementById('shareBtn');
        const wordCountDisplay = document.getElementById('wordCountDisplay');
        const readingTimeDisplay = document.getElementById('readingTimeDisplay');
        const keyboardHelp = document.getElementById('keyboardHelp');
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        const themeDropdown = document.getElementById('themeDropdown');
        const THEME_ICONS = {
            dark: 'fas fa-moon', light: 'fas fa-sun', ocean: 'fas fa-water',
            forest: 'fas fa-tree', sunset: 'fas fa-sun', midnight: 'fas fa-star',
            rose: 'fas fa-heart'
        };
        const readingProgress = document.getElementById('readingProgress');
        const progressFill = document.getElementById('progressFill');
        const tagCloud = document.getElementById('tagCloud');
        const tagCloudContent = document.getElementById('tagCloudContent');
        const activeUsersDisplay = document.getElementById('activeUsersDisplay');
        const lightboxOverlay = document.getElementById('lightboxOverlay');
        const lightboxImage = document.getElementById('lightboxImage');
        const closeLightbox = document.getElementById('closeLightbox');
        const downloadToggle = document.getElementById('downloadToggle');
        const downloadDropdown = document.getElementById('downloadDropdown');
        const downloadDesktop = document.getElementById('downloadDesktop');
        const downloadMobile = document.getElementById('downloadMobile');
        const shopModal = document.getElementById('shopModal');
        const shopModalClose = document.getElementById('shopModalClose');
        const shopItemPoster = document.getElementById('shopItemPoster');

        const globalMarquee = document.getElementById('globalMarquee');
        const marqueeTrack = document.getElementById('marqueeTrack');

        const PREDEFINED_TAGS = [
            'Artificial Intelligence', 'Machine Learning', 'Deep Learning',
            'Natural Language Processing', 'Computer Vision', 'Data Science',
            'Web Development', 'Mobile Development', 'Cloud Computing',
            'Cybersecurity', 'Blockchain', 'Internet of Things'
        ];

        let currentTheme = localStorage.getItem('fedos_theme') || 'dark';
        function setTheme(theme) {
            currentTheme = theme;
            document.documentElement.setAttribute('data-theme', theme);
            themeIcon.className = THEME_ICONS[theme] || 'fas fa-palette';
            localStorage.setItem('fedos_theme', theme);
            document.querySelectorAll('.theme-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.themeVal === theme);
            });
        }
        themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            themeDropdown.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!themeDropdown.contains(e.target) && e.target !== themeToggle) {
                themeDropdown.classList.remove('open');
            }
        });
        document.querySelectorAll('.theme-option').forEach(opt => {
            opt.addEventListener('click', () => {
                setTheme(opt.dataset.themeVal);
                themeDropdown.classList.remove('open');
            });
        });
        setTheme(currentTheme);

        // Shop Modal
        function openShopModal() { shopModal.classList.add('active'); document.body.style.overflow = 'hidden'; }
        function closeShopModal() { shopModal.classList.remove('active'); document.body.style.overflow = ''; }
        shopItemPoster.addEventListener('click', openShopModal);
        shopModalClose.addEventListener('click', closeShopModal);
        shopModal.addEventListener('click', (e) => { if (e.target === shopModal) closeShopModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shopModal.classList.contains('active')) closeShopModal(); });

        // Lightbox
        function openLightbox(src) { lightboxImage.src = src; lightboxOverlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
        function closeLightboxFn() { lightboxOverlay.classList.remove('active'); document.body.style.overflow = ''; }
        closeLightbox.addEventListener('click', closeLightboxFn);
        lightboxOverlay.addEventListener('click', (e) => { if (e.target === lightboxOverlay) closeLightboxFn(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) closeLightboxFn(); });
        window.openLightbox = openLightbox;

        // Download dropdown
        downloadToggle.addEventListener('click', (e) => { e.stopPropagation(); downloadDropdown.classList.toggle('open'); });
        document.addEventListener('click', () => downloadDropdown.classList.remove('open'));
        downloadDropdown.addEventListener('click', (e) => e.stopPropagation());
        downloadDesktop.addEventListener('click', () => { window.toast('🚀 Desktop app download coming soon! Stay tuned for the FEDPromptly desktop client.', 'info', 4500); downloadDropdown.classList.remove('open'); });
        downloadMobile.addEventListener('click', () => { window.toast('📱 Mobile app download coming soon! The FEDPromptly mobile app is in development.', 'info', 4500); downloadDropdown.classList.remove('open'); });

        // Auth
        function showMessage(msg, type = 'error') { authMessage.textContent = msg; authMessage.className = 'message ' + type; }
        function hideMessage() { authMessage.className = 'message'; authMessage.textContent = ''; }
        function openModal() { loginModal.classList.add('active'); hideMessage(); loginEmail.focus(); }
        function closeModalFunc() { loginModal.classList.remove('active'); hideMessage(); }
        function updateUIForUser(user) {
            if (user) {
                loginBtn.classList.add('logged-in');
                const name = user.email ? user.email.split('@')[0] : 'User';
                loginBtnText.textContent = name;
                userAvatar.textContent = name.charAt(0).toUpperCase();
                loginBtn.title = 'Click to logout';
                // Show subscribers tab for logged-in users
                if (subscribersTab) subscribersTab.style.display = '';
                // Check admin status asynchronously
                checkAdminStatus();
            } else {
                loginBtn.classList.remove('logged-in');
                loginBtnText.textContent = 'Login';
                userAvatar.textContent = '👤';
                loginBtn.title = 'Click to login';
                // Hide subscribers tab for logged-out users
                if (subscribersTab) subscribersTab.style.display = 'none';
                isAdmin = false;
                // If currently on subscribers tab, switch to all
                if (currentCategory === 'subscribers') {
                    currentCategory = 'all';
                    localStorage.setItem('fedos_category', 'all');
                    filterByCategory('all');
                }
            }
            // Update channel pills based on login/admin state
            updateChannelPillAvailability();
        }

        // Fetch the is_admin flag from the profiles table for the current user
        async function checkAdminStatus() {
            if (!currentUser) { isAdmin = false; updateChannelPillAvailability(); return; }
            try {
                const { data, error } = await supabaseClient.from('profiles').select('is_admin').eq('id', currentUser.id).single();
                if (error) { isAdmin = false; }
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
                }
            } catch (e) { isAdmin = false; }
            updateChannelPillAvailability();
        }

        // Enable/disable channel pills in the new-topic form based on login & admin state
        function updateChannelPillAvailability() {
            if (!channelSelectWrap) return;
            channelSelectWrap.querySelectorAll('.channel-pill').forEach(pill => {
                const ch = pill.dataset.channel;
                // Notes + Announcements channels require admin
                if ((ch === 'notes' || ch === 'announcements') && !isAdmin) {
                    pill.classList.add('disabled');
                    pill.style.opacity = '0.45';
                    pill.style.cursor = 'not-allowed';
                    pill.title = 'Only admins can post to ' + (ch === 'notes' ? 'Notes' : 'Announcements');
                } else {
                    pill.classList.remove('disabled');
                    pill.style.opacity = '';
                    pill.style.cursor = '';
                    pill.title = '';
                }
            });
        }
        async function handleLogout() {
            try { await supabaseClient.auth.signOut(); currentUser = null; updateUIForUser(null); resetAndLoad(); } catch (err) { console.error('Logout error:', err); }
        }
        loginBtn.addEventListener('click', function() { if (currentUser) { if (confirm('Logout?')) handleLogout(); return; } openModal(); });
        closeModal.addEventListener('click', closeModalFunc);
        loginModal.addEventListener('click', function(e) { if (e.target === loginModal) closeModalFunc(); });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && loginModal.classList.contains('active')) closeModalFunc(); });

        toggleAuthMode.addEventListener('click', function() {
            isSignUp = !isSignUp;
            if (isSignUp) { modalTitle.textContent = 'Create Account'; modalSub.textContent = 'Join the community'; authSubmitBtn.textContent = 'Sign Up'; toggleAuthMode.textContent = 'Sign In'; toggleText.textContent = 'Already a citizen?'; }
            else { modalTitle.textContent = 'Sign In'; modalSub.textContent = 'Enter your credentials to continue'; authSubmitBtn.textContent = 'Sign In'; toggleAuthMode.textContent = 'Sign Up'; toggleText.textContent = 'New citizen?'; }
            hideMessage(); loginForm.reset();
        });

        forgotPassword.addEventListener('click', async function() {
            const email = loginEmail.value.trim();
            if (!email) { showMessage('Please enter your email address first.', 'error'); return; }
            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + window.location.pathname });
                if (error) throw error;
                showMessage('📧 Password reset email sent! Check your inbox.', 'info');
            } catch (err) { showMessage(err.message || 'Failed to send reset email.', 'error'); }
        });

        async function handleLogin(email, password) {
            try {
                const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
                if (error) throw error;
                showMessage(`✅ Welcome back, ${email.split('@')[0]}!`, 'success');
                currentUser = data.user; updateUIForUser(currentUser);
                setTimeout(closeModalFunc, 1000); resetAndLoad();
            } catch (err) {
                let msg = err.message;
                if (err.message.includes('Invalid login credentials')) msg = 'Invalid email or password.';
                else if (err.message.includes('Email not confirmed')) msg = 'Please verify your email address first.';
                showMessage(msg, 'error'); throw err;
            }
        }
        async function handleSignUp(email, password) {
            try {
                const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
                if (error) throw error;
                if (data.user && data.user.identities && data.user.identities.length === 0) { showMessage('This email is already registered. Please sign in.', 'error'); return; }
                if (!data.session) { showMessage('📧 Please check your email to confirm your account.', 'info'); }
                else { showMessage(`✅ Account created! Welcome, ${email.split('@')[0]}!`, 'success'); currentUser = data.user; updateUIForUser(currentUser); setTimeout(closeModalFunc, 1000); resetAndLoad(); }
            } catch (err) {
                let msg = err.message;
                if (err.message.includes('User already registered')) msg = 'This email is already registered. Please sign in.';
                showMessage(msg, 'error'); throw err;
            }
        }

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const password = loginPassword.value;
            if (!email || !password) { showMessage('Please fill in all fields.', 'error'); return; }
            authSubmitBtn.disabled = true; authSubmitBtn.textContent = isSignUp ? 'Creating...' : 'Signing in...'; hideMessage();
            try { if (isSignUp) await handleSignUp(email, password); else await handleLogin(email, password); } catch (err) {} finally { authSubmitBtn.disabled = false; authSubmitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In'; }
        });

        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session) { currentUser = session.user; updateUIForUser(currentUser); closeModalFunc(); resetAndLoad(); }
            if (event === 'SIGNED_OUT') { currentUser = null; updateUIForUser(null); resetAndLoad(); }
            if (event === 'USER_UPDATED' && session) { currentUser = session.user; updateUIForUser(currentUser); }
        });

        (async function checkSession() {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session) { currentUser = session.user; updateUIForUser(currentUser); }
                resetAndLoad();
            } catch (err) { console.error('Session check error:', err); resetAndLoad(); }
        })();

        // Bookmark
        function toggleBookmark(topicId) { const index = bookmarks.indexOf(topicId); if (index > -1) bookmarks.splice(index, 1); else bookmarks.push(topicId); localStorage.setItem('fedos_bookmarks', JSON.stringify(bookmarks)); updateBookmarkButtons(); }
        function isBookmarked(topicId) { return bookmarks.includes(topicId); }
        function updateBookmarkButtons() {
            document.querySelectorAll('.bookmark-btn').forEach(btn => {
                const id = btn.dataset.topicId;
                if (id && isBookmarked(id)) { btn.classList.add('bookmarked'); btn.innerHTML = '<i class="fas fa-bookmark"></i>'; }
                else { btn.classList.remove('bookmarked'); btn.innerHTML = '<i class="far fa-bookmark"></i>'; }
            });
        }

        // Download an icon attachment (used on Icons-channel topic cards)
        function downloadIcon(url, name) {
            if (!url) return;
            const a = document.createElement('a');
            a.href = url;
            a.download = name ? name.replace(/[^a-z0-9_\-\.]/gi, '_') : 'icon';
            a.target = '_blank';
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // Counters
        async function refreshForumViewCount() {
            try { const { data, error } = await supabaseClient.from('forum_stats').select('total_views').eq('id', 1).single(); if (error) throw error; const el = document.getElementById('forumViewCount'); if (el) el.textContent = data.total_views || 0; } catch (err) { console.warn('Forum views fetch failed:', err); }
        }
        async function countForumView() {
            if (sessionStorage.getItem('forum_viewed_session')) return;
            try { const { data, error } = await supabaseClient.rpc('increment_forum_views'); if (error) throw error; sessionStorage.setItem('forum_viewed_session', 'true'); const el = document.getElementById('forumViewCount'); if (el) el.textContent = data ?? 0; } catch (err) { console.error('Forum view increment failed:', err); }
        }
        async function countTopicView(topicId) {
            const key = `topic_viewed_${topicId}`;
            if (sessionStorage.getItem(key)) return;
            try { const { data, error } = await supabaseClient.rpc('increment_topic_views', { p_topic_id: topicId }); if (error) throw error; sessionStorage.setItem(key, 'true'); const viewEl = document.getElementById('topicViewCount'); if (viewEl) viewEl.textContent = data ?? 0; updateTopicListViews(topicId, data ?? 0); } catch (err) { console.error('Topic view increment failed:', err); }
        }
        function updateTopicListViews(topicId, newCount) {
            const cards = document.querySelectorAll('.topic-card');
            for (const card of cards) { if (card.dataset.topicId == topicId) { const badge = card.querySelector('.views-badge'); if (badge) badge.innerHTML = `<i class="fas fa-eye"></i> ${newCount}`; break; } }
        }

        // Sorting
        function sortTopics(topics, sortBy) {
            const now = Date.now(); const sorted = [...topics];
            switch (sortBy) {
                case 'latest': sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
                case 'top': sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0)); break;
                case 'most_commented': sorted.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0)); break;
                case 'hot': default: sorted.sort((a, b) => { const aAge = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60); const bAge = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60); const aScore = (a.like_count || 0) + (a.views || 0) / 10 - aAge / 4; const bScore = (b.like_count || 0) + (b.views || 0) / 10 - bAge / 4; return bScore - aScore; }); break;
            }
            return sorted;
        }
        function getReadingTime(text) { const words = text.trim().split(/\\s+/).length; const mins = Math.ceil(words / 200); return { words, mins }; }

        function updateActiveUsers(topics) {
            if (!topics || !topics.length) { activeUsersDisplay.textContent = ''; return; }
            const users = new Set(); const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
            topics.forEach(t => { if (new Date(t.created_at).getTime() > oneDayAgo) users.add(t.user_id); });
            activeUsersDisplay.textContent = users.size > 0 ? `· 👥 ${users.size} active today` : '';
        }

        function buildTagCloud(topics) {
            const tagCounts = {};
            topics.forEach(t => { if (t.tags) t.tags.forEach(tag => tagCounts[tag] = (tagCounts[tag] || 0) + 1); });
            const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
            if (sorted.length < 2) { tagCloud.classList.add('hidden'); return; }
            tagCloud.classList.remove('hidden');
            tagCloudContent.innerHTML = sorted.map(([tag, count]) => `<span class="tag-cloud-item" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <span class="tag-count">(${count})</span></span>`).join('');
            document.querySelectorAll('.tag-cloud-item').forEach(el => { el.addEventListener('click', () => { searchInput.value = el.dataset.tag; filterTopics(el.dataset.tag); }); });
        }

        // ═══════════ FED-OS UPGRADE: topic likes (vote) system ═══════════
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
                window.toast(wasLiked ? 'Like removed' : 'Liked \u2764\ufe0f', 'success', 1600);
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

        // ─────────── FED-OS UPGRADE: like button HTML helper ───────────
        function likeBtnHtml(topic, likeCount) {
            const liked = myLikes.has(topic.id);
            return `<button class="like-btn ${liked ? 'liked' : ''}" data-topic-id="${topic.id}" title="${liked ? 'Unlike' : 'Like this topic'}" aria-label="${liked ? 'Unlike topic' : 'Like topic'}" aria-pressed="${liked}"><i class="fas fa-heart"></i> <span class="like-count">${likeCount}</span></button>`;
        }

        // Marquee
        let postSnippets = [];
        function loadSnippets() {
            const stored = localStorage.getItem('fedos_post_snippets');
            if (stored) { try { postSnippets = JSON.parse(stored); } catch (e) { postSnippets = []; } }
            if (postSnippets.length === 0 || (postSnippets.length === 1 && postSnippets[0].includes('Welcome'))) {
                if (allTopics && allTopics.length > 0) { seedMarqueeWithTopics(allTopics); return; }
                else { postSnippets = ['🚀 Welcome to FEDPromptly!', '💡 Share your thoughts with the community!', '📢 Stay tuned for the latest updates!', '✨ Post a topic to see it scroll here!']; saveSnippets(); }
            }
            updateMarquee();
        }
        function saveSnippets() { localStorage.setItem('fedos_post_snippets', JSON.stringify(postSnippets)); }
        function addSnippet(snippet) { if (postSnippets.includes(snippet)) return; postSnippets.unshift(snippet); if (postSnippets.length > 500) postSnippets = postSnippets.slice(0, 400); saveSnippets(); updateMarquee(); }
        function seedMarqueeWithTopics(topics) {
            if (!topics || topics.length === 0) return;
            const hasRealTopic = postSnippets.some(s => s.includes(' posted: "'));
            if (hasRealTopic) return;
            const newSnippets = topics.slice(0, 10).map(t => { const name = t.profiles?.username || t.profiles?.email || 'Someone'; return `${name} posted: "${t.title}"`; });
            const filtered = newSnippets.filter(s => s && !s.includes('undefined'));
            if (filtered.length > 0) { postSnippets = filtered; postSnippets.push('🚀 Welcome to FEDPromptly!'); saveSnippets(); updateMarquee(); }
        }
        function updateMarquee() {
            // FED-OS v2: marquee is opt-in (reduces clutter); enable it in Settings
            let marqueeOn = false;
            try { marqueeOn = (JSON.parse(localStorage.getItem('fedos_settings') || '{}').showMarquee === true); } catch (e) { marqueeOn = false; }
            if (!marqueeOn || postSnippets.length === 0) { globalMarquee.classList.add('hidden'); return; }
            globalMarquee.classList.remove('hidden');
            let content = postSnippets.map(s => `<span>${escapeHtml(s)}</span>`).join('');
            marqueeTrack.innerHTML = content + content;
        }

        // Carousel
        function buildCarousel(topics) {
            const sorted = [...topics].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            carouselTopics = sorted.slice(0, 10);
            if (carouselTopics.length < 2) { carouselContainer.classList.add('hidden'); return; }
            carouselContainer.classList.remove('hidden');
            carouselTrack.innerHTML = '';
            carouselTopics.forEach((topic, idx) => {
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                slide.dataset.topicId = topic.id;
                const cat = typeof classifyTopic === 'function' ? classifyTopic(topic) : '';
                const catLabel = cat ? `<span class="slide-cat">${cat}</span>` : '';
                const hot = (topic.replyCount || 0) >= 5 ? '<span class="meta-hot"><i class="fas fa-fire"></i> Hot</span>' : '';
                const thumb = (topic.attachment_url && typeof isImageUrl === 'function' && isImageUrl(topic.attachment_url)) ? `<div class="slide-thumb"><img src="${encodeURI(topic.attachment_url)}" alt="" loading="lazy" /></div>` : '';
                slide.innerHTML = `<div class="slide-rank">${idx + 1}</div>${thumb}<div class="slide-content"><div class="slide-title">${escapeHtml(topic.title)}</div><div class="slide-meta"><span><i class="fas fa-reply"></i> ${topic.replyCount || 0}</span><span><i class="fas fa-eye"></i> ${topic.views || 0}</span>${hot}</div></div>${catLabel}`;
                slide.addEventListener('click', () => showTopicDetail(topic.id));
                carouselTrack.appendChild(slide);
            });
            carouselDots.innerHTML = '';
            for (let i = 0; i < carouselTopics.length; i++) {
                const dot = document.createElement('button');
                dot.className = 'dot' + (i === 0 ? ' active' : '');
                dot.dataset.index = i;
                dot.addEventListener('click', () => goToSlide(i));
                carouselDots.appendChild(dot);
            }
            const hasMultiple = carouselTopics.length > 1;
            carouselPrev.classList.toggle('hidden', !hasMultiple);
            carouselNext.classList.toggle('hidden', !hasMultiple);
            currentSlide = 0;
            updateCarouselPosition();
            startAutoSlide();
        }
        function updateCarouselPosition() {
            carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
            carouselDots.querySelectorAll('.dot').forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
        }
        function goToSlide(index) { if (index < 0) index = carouselTopics.length - 1; if (index >= carouselTopics.length) index = 0; currentSlide = index; updateCarouselPosition(); resetAutoSlide(); }
        function nextSlide() { goToSlide(currentSlide + 1); }
        function prevSlide() { goToSlide(currentSlide - 1); }
        function startAutoSlide() { stopAutoSlide(); if (carouselTopics.length > 1 && (window.getSettings ? window.getSettings().carouselAutoplay : true)) autoSlideInterval = setInterval(nextSlide, getCarouselInterval()); }
        function stopAutoSlide() { if (autoSlideInterval) { clearInterval(autoSlideInterval); autoSlideInterval = null; } }
        function resetAutoSlide() { startAutoSlide(); }
        carouselNext.addEventListener('click', (e) => { e.stopPropagation(); nextSlide(); });
        carouselPrev.addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);

        // Search
        let searchHitsNote = null;
        function filterTopics(query) {
            searchQuery = query.toLowerCase().trim();
            if (!searchQuery) { filterByCategory(currentCategory); return; }
            const filtered = allTopics.filter(t => t.title.toLowerCase().includes(searchQuery) || t.content.toLowerCase().includes(searchQuery) || (t.tags && t.tags.some(tag => tag.toLowerCase().includes(searchQuery))));
            renderTopicList(filtered, false);
            if (!searchHitsNote) { searchHitsNote = document.createElement('p'); searchHitsNote.className = 'search-hits'; forumList.parentElement.insertBefore(searchHitsNote, forumList); }
            searchHitsNote.textContent = `${filtered.length} result${filtered.length === 1 ? '' : 's'} for "${query}"`;
            searchHitsNote.style.display = filtered.length ? '' : 'none';
            if (!filtered.length) { searchHitsNote.style.display = 'none'; forumList.innerHTML = `<p class="text-gray-400 text-center py-8">No topics match your search for "${escapeHtml(query)}".</p>`; }
        }
        searchInput.addEventListener('input', debounce(function() { filterTopics(this.value); }, 300));
        function debounce(fn, delay) { let timer; return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); }; }

        // Char counter
        function updateCharCounter(textarea, display, max) { const len = textarea.value.length; display.textContent = `${len} / ${max}`; display.classList.toggle('warning', len > max * 0.8); display.classList.toggle('danger', len > max * 0.95); }
        topicContent.addEventListener('input', () => updateCharCounter(topicContent, topicCharCounter, 10000));
        replyContent.addEventListener('input', () => updateCharCounter(replyContent, replyCharCounter, 5000));

        // Reading progress
        function updateReadingProgress() {
            if (singleTopicView.classList.contains('hidden')) { readingProgress.classList.remove('visible'); return; }
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressFill.style.width = `${Math.min(progress, 100)}%`;
            if (progress > 2 && !readingProgress.classList.contains('visible')) readingProgress.classList.add('visible');
            else if (progress < 2 && readingProgress.classList.contains('visible')) readingProgress.classList.remove('visible');
        }
        window.addEventListener('scroll', updateReadingProgress);

        // Metrics
        function updateMetrics(topics) {
            if (topicCountEl) topicCountEl.textContent = topics.length;
            if (lastUpdatedEl && topics.length > 0) {
                const latest = topics.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
                const diff = Date.now() - new Date(latest.created_at).getTime();
                const minutes = Math.floor(diff / 60000); const hours = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
                let label = 'just now';
                if (days > 0) label = `${days}d ago`; else if (hours > 0) label = `${hours}h ago`; else if (minutes > 0) label = `${minutes}m ago`;
                lastUpdatedEl.textContent = `· 🕐 ${label}`;
            } else if (lastUpdatedEl) lastUpdatedEl.textContent = '';
            updateActiveUsers(topics); buildTagCloud(topics); updateBookmarkButtons();
        }

        function isImageUrl(url) { if (!url) return false; const ext = url.split('.').pop().toLowerCase(); return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext); }

        // ── Time-ago helper for ETA badges ──
        function timeAgo(dateStr) {
            const diff = Date.now() - new Date(dateStr).getTime();
            const mins = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);
            if (days > 30) return new Date(dateStr).toLocaleDateString();
            if (days > 0) return `${days}d ago`;
            if (hours > 0) return `${hours}h ago`;
            if (mins > 0) return `${mins}m ago`;
            return 'just now';
        }

        // ── Classify a topic into a category tab ──
        // If the topic has an explicit `channel` field (icons/notes/feed/subscribers),
        // it maps directly to that tab. Otherwise fall back to title/tags/content heuristics
        // for the original announcement/question/guide classification.
        function classifyTopic(topic) {
            // Channel-based classification takes priority
            const ch = topic.channel;
            if (ch === 'icons' || ch === 'notes' || ch === 'feed' || ch === 'subscribers' || ch === 'announcements' || ch === 'guides' || ch === 'questions') {
                return ch;
            }
            // Heuristic classification for the original general-channel topics
            const title = (topic.title || '').toLowerCase();
            const content = (topic.content || '').toLowerCase();
            const tags = (topic.tags || []).map(t => t.toLowerCase());
            const text = title + ' ' + content + ' ' + tags.join(' ');

            if (/\\b(announcement|launch|milestone|update|release|live now|beta|v1\\.0|desktop app|is here)\\b/.test(text) || title.includes('!!!') || title.includes('🎉'))
                return 'announcements';
            if (/\\b(question|how do|how to|help|error|issue|problem|why|can't|cannot|stuck|fix)\\b/.test(text))
                return 'questions';
            if (/\\b(guide|tutorial|journey|beginner|how-to|step by step|walkthrough|comprehensive|build|building)\\b/.test(text))
                return 'guides';
            return null; // falls into "all" / "trending"
        }

        function isTrending(topic) {
            const score = (topic.replyCount || 0) * 2 + (topic.views || 0) * 0.1;
            return score >= 5;
        }

        function filterByCategory(cat) {
            currentCategory = cat;
            if (searchHitsNote) searchHitsNote.style.display = 'none';
            localStorage.setItem('fedos_category', cat);
            document.querySelectorAll('.cat-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.cat === cat);
            });

            // ── Subscribers tab: requires login ──
            if (cat === 'subscribers') {
                if (!currentUser) {
                    forumList.innerHTML = `<div class="channel-empty"><div class="ce-icon"><i class="fas fa-lock"></i></div><div class="ce-title">Subscribers Only</div><div class="ce-sub">This channel is for logged-in members only. Sign in to view and post exclusive content.</div><button class="ce-cta" onclick="openModal()"><i class="fas fa-sign-in-alt"></i> Sign In</button></div>`;
                    return;
                }
                const subTopics = allTopics.filter(t => t.channel === 'subscribers');
                renderTopicList(subTopics, false);
                if (!subTopics.length) forumList.innerHTML = `<div class="channel-empty"><div class="ce-icon"><i class="fas fa-users"></i></div><div class="ce-title">No subscriber posts yet</div><div class="ce-sub">Be the first to share something exclusive with the community.</div></div>`;
                return;
            }

            // ── Icons tab: only icon-channel topics ──
            if (cat === 'icons') {
                const iconTopics = allTopics.filter(t => t.channel === 'icons');
                renderTopicList(iconTopics, false);
                if (!iconTopics.length) forumList.innerHTML = `<div class="channel-empty"><div class="ce-icon"><i class="fas fa-icons"></i></div><div class="ce-title">No icons yet</div><div class="ce-sub">Share free or paid icons for the community to download.</div></div>`;
                return;
            }

            // ── Notes tab: only notes-channel topics (admin posts) ──
            if (cat === 'notes') {
                const noteTopics = allTopics.filter(t => t.channel === 'notes');
                renderTopicList(noteTopics, false);
                if (!noteTopics.length) forumList.innerHTML = `<div class="channel-empty"><div class="ce-icon"><i class="fas fa-sticky-note"></i></div><div class="ce-title">No notes yet</div><div class="ce-sub">Project notes from the admin will appear here.</div></div>`;
                return;
            }

            // ── Feed tab: only feed-channel topics (open social feed) ──
            if (cat === 'feed') {
                const feedTopics = allTopics.filter(t => t.channel === 'feed');
                renderTopicList(feedTopics, false);
                if (!feedTopics.length) forumList.innerHTML = `<div class="channel-empty"><div class="ce-icon"><i class="fas fa-rss"></i></div><div class="ce-title">The feed is quiet</div><div class="ce-sub">Post something to the Feed channel to start the social stream.</div></div>`;
                return;
            }

            if (cat === 'all') {
                // "All" shows general-channel topics (excludes icons/notes/feed/subscribers
                // since those have their own dedicated tabs)
                if (searchQuery) filterTopics(searchQuery);
                else {
                    const generalTopics = allTopics.filter(t => !t.channel || ['general', 'announcements', 'guides', 'questions'].includes(t.channel));
                    renderTopicList(generalTopics, false);
                }
                return;
            }
            if (cat === 'bookmarks') {
                const bookmarked = allTopics.filter(t => isBookmarked(t.id));
                renderTopicList(bookmarked, false);
                if (!bookmarked.length) forumList.innerHTML = `<p class="text-gray-400 text-center py-8">No bookmarked topics yet. Click the bookmark icon on any topic to save it here.</p>`;
                return;
            }
            if (cat === 'trending') {
                const trending = allTopics.filter(t => isTrending(t));
                renderTopicList(trending, false);
                if (!trending.length) forumList.innerHTML = `<p class="text-gray-400 text-center py-8">No trending topics right now. Topics with more replies and views will appear here.</p>`;
                return;
            }
            const filtered = allTopics.filter(t => classifyTopic(t) === cat);
            renderTopicList(filtered, false);
            if (!filtered.length) forumList.innerHTML = `<p class="text-gray-400 text-center py-8">No topics in this category yet. Be the first to post one!</p>`;
        }

        function updateCategoryCounts() {
            const counts = { all: 0, trending: 0, announcements: 0, questions: 0, guides: 0, icons: 0, notes: 0, feed: 0, subscribers: 0, bookmarks: 0 };
            allTopics.forEach(t => {
                const ch = t.channel;
                // "All" tab counts only general-channel topics
                if (!ch || ch === 'general') {
                    counts.all++;
                    if (isTrending(t)) counts.trending++;
                    const cat = classifyTopic(t);
                    if (cat && counts[cat] !== undefined) counts[cat]++;
                } else if (ch === 'announcements' || ch === 'guides' || ch === 'questions') {
                    // FED-OS v2: new content channels also count toward the All/Trending tabs
                    counts.all++;
                    if (isTrending(t)) counts.trending++;
                }
                // Channel-specific counts
                if (ch && counts[ch] !== undefined) counts[ch]++;
                if (isBookmarked(t.id)) counts.bookmarks++;
            });
            document.getElementById('catCountAll').textContent = counts.all;
            document.getElementById('catCountTrending').textContent = counts.trending;
            document.getElementById('catCountAnnouncements').textContent = counts.announcements;
            document.getElementById('catCountQuestions').textContent = counts.questions;
            document.getElementById('catCountGuides').textContent = counts.guides;
            document.getElementById('catCountIcons').textContent = counts.icons;
            document.getElementById('catCountNotes').textContent = counts.notes;
            document.getElementById('catCountFeed').textContent = counts.feed;
            document.getElementById('catCountSubscribers').textContent = counts.subscribers;
            document.getElementById('catCountBookmarks').textContent = counts.bookmarks;
        }

        // ── ETA / activity panel computation ──
        function updateETAPanel(topics) {
            if (!topics || !topics.length) {
                etaLatestPost.textContent = '—';
                etaActivity.textContent = '—';
                etaTotalReplies.textContent = '—';
                etaAvgRead.textContent = '—';
                return;
            }
            // Latest post time-ago
            const latest = topics.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b);
            etaLatestPost.textContent = timeAgo(latest.created_at);

            // Activity level based on posts in last 7 days
            const weekAgo = Date.now() - 7 * 86400000;
            const recentCount = topics.filter(t => new Date(t.created_at).getTime() > weekAgo).length;
            let level = 'Low';
            if (recentCount >= 7) level = 'High 🔥';
            else if (recentCount >= 3) level = 'Medium';
            etaActivity.textContent = level;

            // Total replies
            const totalReplies = topics.reduce((sum, t) => sum + (t.replyCount || 0), 0);
            etaTotalReplies.textContent = totalReplies;

            // Average reading time
            const avgMins = Math.round(topics.reduce((sum, t) => sum + getReadingTime(t.content).mins, 0) / topics.length);
            etaAvgRead.textContent = avgMins > 0 ? `${avgMins} min` : '—';
        }

        // ═══════════ FED-OS UPGRADE: edit / delete wiring ═══════════
        function wireModActions() {
            // FED-OS v2: click-to-expand / collapse card excerpts
            forumList.querySelectorAll('.excerpt').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); el.classList.toggle('expanded'); }));
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
            if (!topic) { showTopicDetail(topicId); return; }
            const cardTitle = card.querySelector('.title');
            const oldTitle = topic.title;
            const oldContent = topic.content;
            const titleText = cardTitle.childNodes[0];
            if (titleText && titleText.nodeType === 3) titleText.nodeValue = '';
            card.querySelector('.mod-actions')?.remove();
            const form = document.createElement('div');
            form.className = 'inline-edit';
            form.innerHTML = `<label style="font-size:0.78rem;color:var(--text-3);display:block;margin-bottom:6px;">Title</label><input class="ed-title input-dark" maxlength="300" style="width:100%;margin-bottom:10px;" value="${escapeHtml(oldTitle)}" aria-label="Topic title" /><label style="font-size:0.78rem;color:var(--text-3);display:block;margin-bottom:6px;">Content</label><textarea class="ed-content" rows="6">${escapeHtml(oldContent)}</textarea><div class="inline-actions"><button class="save" type="button">Save</button><button class="cancel-edit" type="button">Cancel</button></div>`;
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
                    const patch = { title: newTitle, content: newContent };
                    if (schemaCompat.probed ? schemaCompat.hasUpgradeColumns : true) patch.updated_at = new Date().toISOString();
                    const { error } = await supabaseClient.from('topics').update(patch).eq('id', topicId);
                    if (error) throw error;
                    window.toastSuccess('Topic updated');
                    sessionStorage.removeItem(CACHE_KEY);
                    resetAndLoad();
                } catch (err) {
                    window.toastError('Update failed: ' + err.message);
                    form.querySelector('.save').disabled = false;
                    form.querySelector('.save').textContent = 'Save';
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
                    
                    sessionStorage.removeItem(CACHE_KEY);
                    resetAndLoad();
                } catch (err) {
                    window.toastError('Delete failed: ' + err.message);
                }
            }, { title: 'Delete topic?', yesLabel: 'Delete' });
        }

        // FED-OS v2: fresh-topic badge (< 48h) helper
        function isNewTopic(topic) { try { return (Date.now() - new Date(topic.created_at).getTime()) < 48 * 3600 * 1000; } catch (e) { return false; } }
        function renderTopicList(topics, append = false) {
            const sorted = sortTopics(topics, currentSort);
            if (!append) forumList.innerHTML = '';
            if (!sorted.length) { if (!append) forumList.innerHTML = `<p class="text-gray-400 text-center py-8">${searchQuery ? 'No topics match your search.' : 'No topics yet. Be the first to start a discussion!'}</p>`; return; }
            let html = '';
            sorted.forEach(topic => {
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
                const likeCount = topic.like_count || 0;
                const bookmarked = isBookmarked(topic.id);

                // Channel badge for non-general channels
                const ch = topic.channel;
                let channelBadgeHtml = '';
                if (ch && ch !== 'general') {
                    const chLabels = { general: 'General', icons: 'Icons', notes: 'Notes', feed: 'Feed', subscribers: 'Subscribers', announcements: 'Announcements', guides: 'Guides', questions: 'Questions' };
                    const chIcons = { general: 'fa-layer-group', icons: 'fa-icons', notes: 'fa-sticky-note', feed: 'fa-rss', subscribers: 'fa-lock', announcements: 'fa-bullhorn', guides: 'fa-book-open', questions: 'fa-question-circle' };
                    channelBadgeHtml = `<span class="channel-badge ch-${ch}"><i class="fas ${chIcons[ch] || 'fa-tag'}"></i> ${chLabels[ch] || ch}</span>`;
                }

                // Price badge for Icons channel
                let priceBadgeHtml = '';
                if (ch === 'icons' && topic.price_label) {
                    const isFree = topic.price_label.toLowerCase() === 'free';
                    priceBadgeHtml = `<span class="price-badge ${isFree ? 'free' : 'paid'}"><i class="fas ${isFree ? 'fa-gift' : 'fa-dollar-sign'}"></i> ${topic.price_label}</span>`;
                }

                // Download button for Icons channel (if there's an attachment)
                let iconDownloadHtml = '';
                if (ch === 'icons' && topic.attachment_url) {
                    iconDownloadHtml = `<button class="icon-download-btn" data-download-url="${encodeURI(topic.attachment_url)}" data-download-name="${escapeHtml(topic.title.replace(/"/g, ''))}"><i class="fas fa-download"></i> Download Icon</button>`;
                }

                let imageHtml = '';
                if (topic.attachment_url && isImageUrl(topic.attachment_url)) {
                    imageHtml = `<div class="image-preview" data-full="${topic.attachment_url}"><img src="${topic.attachment_url}" alt="Attachment preview" loading="lazy" /><div class="preview-overlay"><i class="fas fa-expand"></i></div><span class="file-badge"><i class="fas fa-image"></i> Preview</span></div>`;
                } else if (topic.attachment_url) {
                    const ext = topic.attachment_url.split('.').pop().toLowerCase();
                    let icon = 'fa-file';
                    if (ext === 'zip') icon = 'fa-file-archive';
                    else if (ext === 'pdf') icon = 'fa-file-pdf';
                    else if (['mp4', 'webm', 'ogg'].includes(ext)) icon = 'fa-file-video';
                    else if (['mp3', 'wav'].includes(ext)) icon = 'fa-file-audio';
                    imageHtml = `<div class="attachment-icon"><i class="fas ${icon}"></i> Attachment: ${topic.attachment_url.split('/').pop()}</div>`;
                }

                const canEditTopic = isAdmin || (currentUser && topic.user_id === currentUser.id);
                html += `<div class="topic-card" data-topic-id="${topic.id}" data-user-id="${topic.user_id}"><div class="flex-row"><div><div class="title">${escapeHtml(topic.title)}${isNewTopic(topic) ? '<span class="new-badge">NEW</span>' : ''}<button class="bookmark-btn ${bookmarked ? 'bookmarked' : ''}" data-topic-id="${topic.id}" title="Bookmark"><i class="${bookmarked ? 'fas' : 'far'} fa-bookmark"></i></button></div><div class="meta"><i class="fas fa-user" style="font-size:0.64rem;"></i><a href="#" class="profile-link" data-user-id="${topic.user_id}">${displayName}</a><i class="fas fa-calendar-alt" style="font-size:0.64rem; margin-left:4px;"></i> ${date}<span class="time-ago"><i class="fas fa-clock"></i> ${ago}</span>${readingLabel ? `<span class="reading-time">· ${readingLabel}</span>` : ''}${channelBadgeHtml}${priceBadgeHtml}${catBadge}</div><div class="tags">${tagHtml}</div></div><div class="stats-col">${likeBtnHtml(topic, likeCount)}<span class="reply-count"><i class="fas fa-reply"></i> ${replyCount}</span><span class="views-badge"><i class="fas fa-eye"></i> ${views}</span></div></div><div class="excerpt" data-fulltext="${topic.id}">${highlightQuery(topic.content, searchQuery)}</div>${imageHtml}${iconDownloadHtml}${canEditTopic ? `<div class="mod-actions"><button class="btn-icon edit-topic" data-topic-id="${topic.id}"><i class="fas fa-pen"></i> Edit</button><button class="btn-icon danger delete-topic" data-topic-id="${topic.id}"><i class="fas fa-trash"></i> Delete</button></div>` : ''}</div>`;
            });

            if (append) forumList.insertAdjacentHTML('beforeend', html);
            else { forumList.innerHTML = html; forumList.appendChild(loadMoreBtn); }

            forumList.querySelectorAll('.image-preview').forEach(el => el.addEventListener('click', (e) => { e.stopPropagation(); const src = el.dataset.full; if (src) openLightbox(src); }));
            forumList.querySelectorAll('.bookmark-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); toggleBookmark(btn.dataset.topicId); }));
            forumList.querySelectorAll('.profile-link').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); showProfile(link.dataset.userId); }));
            forumList.querySelectorAll('.icon-download-btn').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); downloadIcon(btn.dataset.downloadUrl, btn.dataset.downloadName); }));
            wireModActions();
            forumList.querySelectorAll('.topic-card').forEach(card => card.addEventListener('click', () => showTopicDetail(card.dataset.topicId)));

            loadMoreBtn.classList.remove('hidden');
            loadMoreBtn.disabled = false;
            loadMoreBtn.textContent = hasMore ? 'Load more' : 'No more topics';
            if (!append && !searchQuery && allTopics.length) { buildCarousel(allTopics); seedMarqueeWithTopics(allTopics); }
            updateMetrics(allTopics);
            updateCategoryCounts();
            updateETAPanel(allTopics);
        }

        function showSkeletons(count = 5) {
            let html = '';
            for (let i = 0; i < count; i++) html += `<div class="skeleton"><div class="skeleton-title"></div><div class="skeleton-meta"></div><div class="skeleton-excerpt"></div><div class="skeleton-excerpt" style="width:70%;"></div></div>`;
            forumList.innerHTML = html;
        }

        async function loadTopics(page = 0, append = false) {
            if (isLoading) return;
            isLoading = true; loadMoreBtn.disabled = true;
            if (!append) showSkeletons(5);
            try {
                const from = page * PAGE_SIZE; const to = from + PAGE_SIZE - 1;
                const { data: topics, error } = await fetchTopicsCompat(from, to);
                if (error) throw error;
                const transformed = topics.map(t => ({ ...t, replyCount: t.reply_count?.[0]?.count ?? 0 }));
                if (append) allTopics = [...allTopics, ...transformed]; else allTopics = transformed;
                hasMore = topics.length === PAGE_SIZE;
                if (!append) setCachedTopics(allTopics);
                if (searchQuery) filterTopics(searchQuery); else if (!append) filterByCategory(currentCategory); else renderTopicList(transformed, append);
                loadMoreBtn.classList.toggle('hidden', !hasMore);
            } catch (err) {
                console.error('Error loading topics:', err);
                if (!append) forumList.innerHTML = `<p class="text-red-400 text-center py-8">Failed to load topics.</p>`;
            } finally {
                isLoading = false; loadMoreBtn.disabled = false;
                if (!hasMore) { loadMoreBtn.textContent = 'No more topics'; loadMoreBtn.disabled = true; }
                else loadMoreBtn.textContent = 'Load more';
            }
        }

        function resetAndLoad() {
            currentPage = 0; hasMore = true; searchQuery = ''; searchInput.value = '';
            const cached = getCachedTopics();
            if (cached && cached.length > 0) { allTopics = cached; updateCategoryCounts(); filterByCategory(currentCategory); loadTopics(0, false); }
            else loadTopics(0, false);
            countForumView();
        }

        const CACHE_KEY = 'forum_topics_cache';
        const CACHE_TTL = 5 * 60 * 1000;
        function getCachedTopics() { try { const raw = sessionStorage.getItem(CACHE_KEY); if (!raw) return null; const { data, timestamp } = JSON.parse(raw); if (Date.now() - timestamp > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null; } return data; } catch { return null; } }
        function setCachedTopics(data) { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() })); } catch (e) {} }

        // Drafts
        const DRAFT_KEY = 'fedos_draft';
        const REPLY_DRAFT_KEY = 'fedos_reply_draft';
        function loadDrafts() {
            try {
                const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
                if (draft) { topicTitle.value = draft.title || ''; topicContent.value = draft.content || ''; if (draft.tags) document.querySelectorAll('input[name="tags"]').forEach(cb => cb.checked = draft.tags.includes(cb.value)); }
                const replyDraft = localStorage.getItem(REPLY_DRAFT_KEY);
                if (replyDraft) { replyContent.value = replyDraft; updateCharCounter(replyContent, replyCharCounter, 5000); }
            } catch (e) {}
        }
        function saveDraft() { const tags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(el => el.value); localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: topicTitle.value, content: topicContent.value, tags })); }
        function saveReplyDraft() { localStorage.setItem(REPLY_DRAFT_KEY, replyContent.value); }
        function clearDrafts() { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(REPLY_DRAFT_KEY); }
        topicTitle.addEventListener('input', saveDraft);
        topicContent.addEventListener('input', saveDraft);
        document.querySelectorAll('input[name="tags"]').forEach(cb => cb.addEventListener('change', saveDraft));
        replyContent.addEventListener('input', saveReplyDraft);

        function renderTagCheckboxes() {
            let html = '';
            PREDEFINED_TAGS.forEach(tag => html += `<label class="tag-checkbox"><input type="checkbox" name="tags" value="${tag}" />${tag}</label>`);
            tagCheckboxes.innerHTML = html;
            document.querySelectorAll('input[name="tags"]').forEach(cb => cb.addEventListener('change', saveDraft));
        }
        renderTagCheckboxes();

        newTopicBtn.addEventListener('click', () => {
            if (!currentUser) { window.toast('Please log in to create a new topic.', 'info'); openModal(); return; }
            newTopicForm.classList.toggle('hidden');
            if (!newTopicForm.classList.contains('hidden')) {
                // Pre-select the channel based on the current active tab
                preselectChannelFromTab();
                topicTitle.focus(); loadDrafts(); updateCharCounter(topicContent, topicCharCounter, 10000);
            }
        });

        // Pre-select the channel in the new-topic form based on the current category tab
        function preselectChannelFromTab() {
            const tabCats = ['icons', 'notes', 'feed', 'subscribers'];
            if (tabCats.includes(currentCategory)) {
                // Check if the channel pill is available (notes requires admin)
                const pill = channelSelectWrap ? channelSelectWrap.querySelector(`.channel-pill[data-channel="${currentCategory}"]`) : null;
                if (pill && !pill.classList.contains('disabled')) {
                    selectedChannel = currentCategory;
                    channelSelectWrap.querySelectorAll('.channel-pill').forEach(p => p.classList.remove('active'));
                    pill.classList.add('active');
                    const radio = pill.querySelector('input[type="radio"]');
                    if (radio) radio.checked = true;
                    if (priceFieldWrap) priceFieldWrap.style.display = (selectedChannel === 'icons') ? '' : 'none';
                    const hints = {
                        general: 'General posts appear in the main forum for everyone.',
                        icons: 'Icon posts require an image attachment. Choose Free or Paid below.',
                        notes: 'Notes are admin-only project updates visible to everyone.',
                        feed: 'Feed posts are part of the open social stream from everyone.',
                        subscribers: 'Subscribers posts are only visible to logged-in users.',
                        announcements: 'Announcements are admin broadcasts shown on the Announcements tab.',
                        guides: 'Guides are step-by-step tutorials. Attach images to make them shine.',
                        questions: 'Questions go straight to the Q&A tab so the community can help.'
                    };
                    if (channelHint) channelHint.textContent = hints[selectedChannel] || '';
                } else {
                    resetChannelForm();
                }
            } else {
                resetChannelForm();
            }
        }
        stickyNewTopic.addEventListener('click', () => newTopicBtn.click());
        cancelTopicBtn.addEventListener('click', () => { newTopicForm.classList.add('hidden'); createTopicForm.reset(); uploadError.classList.remove('show'); uploadError.textContent = ''; clearDrafts(); resetChannelForm(); updateCharCounter(topicContent, topicCharCounter, 10000); });

        // ── Channel selector interactivity ──
        function resetChannelForm() {
            selectedChannel = 'general';
            selectedPriceLabel = null;
            if (channelSelectWrap) {
                channelSelectWrap.querySelectorAll('.channel-pill').forEach(p => {
                    p.classList.toggle('active', p.dataset.channel === 'general');
                    const radio = p.querySelector('input[type="radio"]');
                    if (radio) radio.checked = (p.dataset.channel === 'general');
                });
            }
            if (priceFieldWrap) priceFieldWrap.style.display = 'none';
            if (priceCustomInput) priceCustomInput.style.display = 'none';
            if (priceRadioGroup) {
                priceRadioGroup.querySelectorAll('.price-radio').forEach(r => {
                    r.classList.toggle('active', r.dataset.price === 'Free');
                    const radio = r.querySelector('input[type="radio"]');
                    if (radio) radio.checked = (r.dataset.price === 'Free');
                });
            }
            if (channelHint) channelHint.textContent = 'General posts appear in the main forum for everyone.';
        }

        if (channelSelectWrap) {
            channelSelectWrap.addEventListener('click', (e) => {
                const pill = e.target.closest('.channel-pill');
                if (!pill || pill.classList.contains('disabled')) return;
                e.preventDefault();
                selectedChannel = pill.dataset.channel;
                channelSelectWrap.querySelectorAll('.channel-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const radio = pill.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;

                // Show/hide price field for Icons channel
                if (priceFieldWrap) priceFieldWrap.style.display = (selectedChannel === 'icons') ? '' : 'none';

                // Update hint text
                const hints = {
                    general: 'General posts appear in the main forum for everyone.',
                    icons: 'Icon posts require an image attachment. Choose Free or Paid below.',
                    notes: 'Notes are admin-only project updates visible to everyone.',
                    feed: 'Feed posts are part of the open social stream from everyone.',
                    subscribers: 'Subscribers posts are only visible to logged-in users.',
                    announcements: 'Announcements are admin broadcasts shown on the Announcements tab.',
                    guides: 'Guides are step-by-step tutorials. Attach images to make them shine.',
                    questions: 'Questions go straight to the Q&A tab so the community can help.'
                };
                if (channelHint) channelHint.textContent = hints[selectedChannel] || '';
            });
        }

        if (priceRadioGroup) {
            priceRadioGroup.addEventListener('click', (e) => {
                const radio = e.target.closest('.price-radio');
                if (!radio) return;
                e.preventDefault();
                priceRadioGroup.querySelectorAll('.price-radio').forEach(r => r.classList.remove('active'));
                radio.classList.add('active');
                const inp = radio.querySelector('input[type="radio"]');
                if (inp) inp.checked = true;
                // Show custom price input only for Paid
                if (priceCustomInput) priceCustomInput.style.display = (radio.dataset.price === 'Paid') ? '' : 'none';
                if (radio.dataset.price === 'Paid' && priceCustomInput) priceCustomInput.focus();
            });
        }

        createTopicForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = topicTitle.value.trim(); const content = topicContent.value.trim();
            const selectedTags = Array.from(document.querySelectorAll('input[name="tags"]:checked')).map(el => el.value);
            const file = topicAttachment.files[0];
            if (!title || !content) { window.toast('Title and content are required.', 'error'); return; }
            if (!rateLimiter.check('new-topic', 30000, 'Please wait before posting another topic —')) return;
            if (!currentUser) { window.toast('You must be logged in to post.', 'info'); openModal(); return; }

            // Validate channel-specific requirements
            // Notes channel requires admin
            if (selectedChannel === 'notes' && !isAdmin) {
                window.toast('Only admins can post to the Notes channel.', 'error');
                return;
            }
            // Icons channel requires an image attachment
            if (selectedChannel === 'icons' && !file) {
                window.toast('Icon posts require an image attachment. Please attach an image file.', 'error');
                uploadError.textContent = 'Icons channel requires an image attachment.'; uploadError.classList.add('show');
                return;
            }
            if (selectedChannel === 'icons' && file && !file.type.startsWith('image/')) {
                window.toast('Icon posts require an image file (PNG, JPG, SVG, etc.).', 'error');
                uploadError.textContent = 'Please attach an image file for the Icons channel.'; uploadError.classList.add('show');
                return;
            }

            // Determine price label for Icons channel
            let priceLabel = null;
            if (selectedChannel === 'icons') {
                const priceRadio = document.querySelector('input[name="price_label"]:checked');
                const basePrice = priceRadio ? priceRadio.value : 'Free';
                if (basePrice === 'Paid' && priceCustomInput && priceCustomInput.value.trim()) {
                    priceLabel = priceCustomInput.value.trim();
                } else {
                    priceLabel = basePrice;
                }
            }

            const submitButton = createTopicForm.querySelector('button[type="submit"]');
            submitButton.disabled = true; submitButton.textContent = 'Posting...';
            uploadError.classList.remove('show'); uploadError.textContent = '';
            try {
                let attachmentUrl = null;
                if (file) {
                    if (file.size > 10 * 1024 * 1024) { uploadError.textContent = 'File size exceeds 10MB limit.'; uploadError.classList.add('show'); submitButton.disabled = false; submitButton.textContent = 'Post Topic'; return; }
                    const fileExt = file.name.split('.').pop();
                    const filePath = `${currentUser.id}/${Date.now()}.${fileExt}`;
                    const { error: uploadErr } = await supabaseClient.storage.from('forum-attachments').upload(filePath, file, { cacheControl: '3600', upsert: false });
                    if (uploadErr) { if (uploadErr.message.includes('bucket not found')) { uploadError.textContent = 'Storage bucket "forum-attachments" not found. Please create it in Supabase dashboard.'; uploadError.classList.add('show'); submitButton.disabled = false; submitButton.textContent = 'Post Topic'; return; } throw uploadErr; }
                    const { data: urlData } = supabaseClient.storage.from('forum-attachments').getPublicUrl(filePath);
                    attachmentUrl = urlData.publicUrl;
                }
                const { error } = await supabaseClient.from('topics').insert({ title, content, user_id: currentUser.id, attachment_url: attachmentUrl, tags: selectedTags.length ? selectedTags : null, channel: selectedChannel, price_label: priceLabel });
                if (error) throw error;
                if (window.confetti) window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                addSnippet(`${currentUser.email.split('@')[0]} posted: "${title}"`);
                createTopicForm.reset(); newTopicForm.classList.add('hidden'); clearDrafts(); resetChannelForm(); sessionStorage.removeItem(CACHE_KEY); resetAndLoad();
            } catch (err) { console.error('Error creating topic:', err); window.toast('Failed to create topic: ' + err.message, 'error', 5000); }
            finally { submitButton.disabled = false; submitButton.textContent = 'Post Topic'; }
        });

        async function showTopicDetail(topicId) {
            if (window.repliesSubscription) window.repliesSubscription.unsubscribe();
            currentTopicId = topicId;
            try {
                const { data: topic, error: topicErr } = await fetchTopicDetailCompat(topicId);
                if (topicErr) throw topicErr;
                const { data: replies, error: repliesErr } = await fetchRepliesCompat(topicId);
                if (repliesErr) throw repliesErr;

                detailTitle.textContent = topic.title; // textContent — safe
                const displayName = escapeHtml(topic.profiles?.username || topic.profiles?.email || 'Unknown');
                const date = new Date(topic.created_at).toLocaleString();
                const views = topic.views || 0;
                // Build channel & price badges for detail view
                let detailBadges = '';
                if (topic.channel && topic.channel !== 'general') {
                    const chLabels = { general: 'General', icons: 'Icons', notes: 'Notes', feed: 'Feed', subscribers: 'Subscribers', announcements: 'Announcements', guides: 'Guides', questions: 'Questions' };
                    const chIcons = { general: 'fa-layer-group', icons: 'fa-icons', notes: 'fa-sticky-note', feed: 'fa-rss', subscribers: 'fa-lock', announcements: 'fa-bullhorn', guides: 'fa-book-open', questions: 'fa-question-circle' };
                    detailBadges += ` <span class="channel-badge ch-${topic.channel}"><i class="fas ${chIcons[topic.channel] || 'fa-tag'}"></i> ${chLabels[topic.channel] || topic.channel}</span>`;
                }
                if (topic.channel === 'icons' && topic.price_label) {
                    const isFree = topic.price_label.toLowerCase() === 'free';
                    detailBadges += ` <span class="price-badge ${isFree ? 'free' : 'paid'}"><i class="fas ${isFree ? 'fa-gift' : 'fa-dollar-sign'}"></i> ${topic.price_label}</span>`;
                }
                const canEditTopicDetail = isAdmin || (currentUser && topic.user_id === currentUser.id);
                const editedSuffix = topic.updated_at ? ` <span class="edited-badge">(edited ${new Date(topic.updated_at).toLocaleDateString()})</span>` : '';
                detailMeta.innerHTML = `By ${displayName} · ${date}${editedSuffix} · 👁️ <span id="topicViewCount">${views}</span> views${detailBadges}`;
                detailContent.textContent = topic.content;
                const { words, mins } = getReadingTime(topic.content);
                wordCountDisplay.textContent = `📝 ${words} words`;
                readingTimeDisplay.textContent = `⏱️ ${mins > 0 ? mins : '<1'} min read`;
                breadcrumbTopic.textContent = topic.title.length > 30 ? topic.title.slice(0, 30) + '…' : topic.title;
                breadcrumbReplies.style.display = replies.length > 0 ? 'inline' : 'none';
                breadcrumbSepReplies.style.display = replies.length > 0 ? 'inline' : 'none';
                breadcrumbReplies.textContent = `${replies.length} replies`;
                document.getElementById('breadcrumbForum').addEventListener('click', (e) => { e.preventDefault(); backToForumBtn.click(); });

                if (topic.attachment_url) {
                    const url = encodeURI(topic.attachment_url); const ext = url.split('.').pop().toLowerCase(); let html = '';
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) html = `<img src="${url}" alt="Attachment" class="attachment-preview" loading="lazy" style="cursor:pointer;" onclick="openLightbox('${url}')" />`;
                    else if (['mp4', 'webm', 'ogg'].includes(ext)) html = `<video controls class="attachment-preview" preload="metadata"><source src="${url}" type="video/${ext}"></video>`;
                    else if (ext === 'zip') html = `<a href="${url}" target="_blank" class="attachment-link"><i class="fas fa-file-archive"></i> Download ZIP</a>`;
                    else html = `<a href="${url}" target="_blank" class="attachment-link"><i class="fas fa-file"></i> Download attachment</a>`;
                    // Add download button for Icons channel
                    if (topic.channel === 'icons') {
                        const dlName = topic.title.replace(/"/g, '').replace(/[^a-z0-9_\-\.]/gi, '_');
                        html += `<button class="icon-download-btn" style="margin-top:12px; max-width:240px;" onclick="downloadIcon('${url}', '${dlName}')"><i class="fas fa-download"></i> Download Icon</button>`;
                    }
                    detailAttachment.innerHTML = html;
                } else detailAttachment.innerHTML = '';

                // ── FED-OS UPGRADE: like button in detail header ──
                const likeBar = document.getElementById('detailLikeBar');
                if (likeBar) {
                    likeBar.innerHTML = likeBtnHtml(topic, topic.like_count || 0);
                    const btn = likeBar.querySelector('.like-btn');
                    if (btn) btn.addEventListener('click', () => toggleLike(topic.id, btn.querySelector('.like-count'), btn));
                }

                const tags = topic.tags || [];
                detailTags.innerHTML = tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join('');

                if (replies.length === 0) repliesList.innerHTML = `<p class="text-gray-400 text-sm">No replies yet. Be the first to respond!</p>`;
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
                }

                forumList.style.display = 'none';
                newTopicForm.classList.add('hidden');
                singleTopicView.classList.remove('hidden');
                profileView.classList.add('hidden');
                carouselContainer.classList.add('hidden');
                stickyNewTopic.classList.remove('visible');

                copyLinkBtn.onclick = function() { navigator.clipboard.writeText(window.location.origin + window.location.pathname + '?topic=' + topicId).then(() => window.toast('Link copied!', 'success', 2000)).catch(() => window.toast('Copy failed.', 'error')); };
                shareBtn.onclick = function() {
                    const shareData = { title: topic.title, text: topic.content.slice(0, 200) + '…', url: window.location.origin + window.location.pathname + '?topic=' + topicId };
                    if (navigator.share) navigator.share(shareData).catch(() => {});
                    else navigator.clipboard.writeText(shareData.url).then(() => window.toast('Link copied!', 'success', 2000));
                };

                // FED-OS v2: prev/next topic navigation
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
                setTimeout(() => { readingProgress.classList.add('visible'); updateReadingProgress(); }, 100);

                window.repliesSubscription = supabaseClient.channel(`public:replies:topic_id=eq.${topicId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'replies', filter: `topic_id=eq.${topicId}` }, () => showTopicDetail(topicId)).subscribe();
            } catch (err) { console.error('Error loading topic detail:', err); window.toast('Failed to load topic details.', 'error'); }
        }

        // ═══════════ FED-OS UPGRADE: reply edit / delete ═══════════
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
                    const patch = { content: newContent };
                    if (schemaCompat.probed ? schemaCompat.hasUpgradeColumns : true) patch.updated_at = new Date().toISOString();
                    const { error } = await supabaseClient.from('replies').update(patch).eq('id', replyId);
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
                    if (error) throw error;
                    window.toastSuccess('Reply deleted');
                    showTopicDetail(currentTopicId);
                } catch (err) {
                    window.toastError('Delete failed: ' + err.message);
                }
            }, { title: 'Delete reply?', yesLabel: 'Delete' });
        }

        backToForumBtn.addEventListener('click', () => {
            singleTopicView.classList.add('hidden');
            forumList.style.display = 'block';
            carouselContainer.classList.remove('hidden');
            readingProgress.classList.remove('visible');
            if (window.repliesSubscription) window.repliesSubscription.unsubscribe();
            if (allTopics.length) renderTopicList(allTopics, false);
            updateStickyVisibility();
        });

        replyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const content = replyContent.value.trim();
            if (!content || !currentTopicId) return;
            if (!currentUser) { window.toast('You must be logged in to reply.', 'info'); openModal(); return; }
            if (!rateLimiter.check('new-reply', 10000, 'You are replying too quickly —')) return;
            try {
                const { error } = await supabaseClient.from('replies').insert({ topic_id: currentTopicId, content, user_id: currentUser.id });
                if (error) throw error;
                replyContent.value = ''; localStorage.removeItem(REPLY_DRAFT_KEY);
                showTopicDetail(currentTopicId);
                setTimeout(() => document.getElementById('repliesList').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            } catch (err) { console.error('Error posting reply:', err); window.toast('Failed to post reply: ' + err.message, 'error', 5000); }
        });

        async function showProfile(userId) {
            try {
                const { data: user, error } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
                if (error) throw error;
                const { data: topics, error: tErr } = await supabaseClient.from('topics').select('id, title, created_at, views, reply_count:replies(count)').eq('user_id', userId).order('created_at', { ascending: false });
                if (tErr) throw tErr;
                const { data: replies, error: rErr } = await supabaseClient.from('replies').select('id, content, created_at, topic_id, topics(title)').eq('user_id', userId).order('created_at', { ascending: false }).limit(10);
                if (rErr) throw rErr;

                let html = `<div class="profile-card"><div class="avatar">${escapeHtml(user.username?.charAt(0).toUpperCase() || '?')}</div><h2>${escapeHtml(user.username || 'Anonymous')}</h2><p style="color:var(--text-2); margin-top:4px;">${escapeHtml(user.email || '')}</p><p style="color:var(--text-3); margin-top:8px; font-size:0.85rem;">Joined ${new Date(user.created_at).toLocaleDateString()}</p></div><h3 class="section-h" style="margin-bottom:14px;">Topics (${topics.length})</h3>`;
                if (topics.length) {
                    topics.forEach(t => {
                        const count = t.reply_count?.[0]?.count || 0;
                        html += `<div class="topic-card" data-topic-id="${t.id}"><div class="flex-row"><div><div class="title">${escapeHtml(t.title)}</div><div class="meta">${new Date(t.created_at).toLocaleDateString()} · ${t.views || 0} views</div></div><span class="reply-count"><i class="fas fa-reply"></i> ${count}</span></div></div>`;
                    });
                } else html += `<p class="text-gray-400">No topics yet.</p>`;
                html += `<h3 class="section-h" style="margin:24px 0 14px;">Recent Replies</h3>`;
                if (replies.length) {
                    replies.forEach(r => {
                        html += `<div class="reply-item"><div class="reply-meta"><span>Replied to <a href="#" class="text-purple-600 topic-link" data-topic-id="${r.topic_id}">${escapeHtml(r.topics?.title || 'a topic')}</a></span><span>${new Date(r.created_at).toLocaleDateString()}</span></div><div class="reply-body">${escapeHtml(r.content)}</div></div>`;
                    });
                } else html += `<p class="text-gray-400">No replies yet.</p>`;

                profileContent.innerHTML = html;
                forumList.style.display = 'none';
                singleTopicView.classList.add('hidden');
                profileView.classList.remove('hidden');
                carouselContainer.classList.add('hidden');
                stickyNewTopic.classList.remove('visible');
                readingProgress.classList.remove('visible');

                document.querySelectorAll('#profileContent .topic-card').forEach(card => card.addEventListener('click', () => showTopicDetail(card.dataset.topicId)));
                document.querySelectorAll('#profileContent .topic-link').forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showTopicDetail(link.dataset.topicId); }));
            } catch (err) { console.error('Profile load error:', err); window.toast('Could not load profile.', 'error'); }
        }

        backFromProfileBtn.addEventListener('click', () => {
            profileView.classList.add('hidden');
            forumList.style.display = 'block';
            carouselContainer.classList.remove('hidden');
            if (allTopics.length) renderTopicList(allTopics, false);
            updateStickyVisibility();
        });

        sortSelect.addEventListener('change', () => {
            currentSort = sortSelect.value; localStorage.setItem('forum_sort', currentSort);
            if (allTopics.length) { filterByCategory(currentCategory); }
        });
        loadMoreBtn.addEventListener('click', () => { if (!isLoading && hasMore) { currentPage++; loadTopics(currentPage, true); } });

        // Category tab handlers
        document.querySelectorAll('.cat-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                searchQuery = ''; searchInput.value = '';
                filterByCategory(tab.dataset.cat);
            });
        });

        function updateStickyVisibility() {
            const isDetail = !singleTopicView.classList.contains('hidden');
            const isProfile = !profileView.classList.contains('hidden');
            if (isDetail || isProfile) { stickyNewTopic.classList.remove('visible'); return; }
            if (window.scrollY > 300) stickyNewTopic.classList.add('visible');
            else stickyNewTopic.classList.remove('visible');
        }

        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) backToTopBtn.classList.add('visible');
            else backToTopBtn.classList.remove('visible');
            updateStickyVisibility(); updateReadingProgress();
        });
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.key === 'n' || e.key === 'N') { e.preventDefault(); if (!currentUser) { openModal(); return; } newTopicBtn.click(); }
            if ((e.key === 'r' || e.key === 'R') && !singleTopicView.classList.contains('hidden')) { e.preventDefault(); replyContent.focus(); }
            if ((e.key === 'l' || e.key === 'L') && !singleTopicView.classList.contains('hidden')) { e.preventDefault(); const btn = document.querySelector('#detailLikeBar .like-btn'); if (btn) btn.click(); }
            if (e.key === '?' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); keyboardHelp.classList.toggle('visible'); setTimeout(() => keyboardHelp.classList.remove('visible'), 3000); }
            if (e.key === '/') { e.preventDefault(); const si = document.getElementById('searchInput'); if (si) { si.focus(); si.select(); } }
            if (e.key === 'Escape' && !singleTopicView.classList.contains('hidden')) {
                // FED-OS v2: Esc backs out of the topic detail (unless a modal/lightbox is open)
                const cmEl = document.getElementById('confirmModal');
                const modalOpen = lightboxOverlay.classList.contains('active') || shopModal.classList.contains('active') || (cmEl && cmEl.classList.contains('active'));
                if (!modalOpen) backToForumBtn.click();
            }
            if (e.key === 'Escape' && lightboxOverlay.classList.contains('active')) closeLightboxFn();
            if (e.key === 'Escape' && shopModal.classList.contains('active')) closeShopModal();
        });

        if (window.topicsSubscription) window.topicsSubscription.unsubscribe();
        window.topicsSubscription = supabaseClient.channel('public:topics').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'topics' }, (payload) => {
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
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'topics' }, () => { sessionStorage.removeItem(CACHE_KEY); resetAndLoad(); }).subscribe();

        const savedSort = localStorage.getItem('forum_sort') || 'hot';
        sortSelect.value = savedSort; currentSort = savedSort;
        // Restore active category tab
        const savedCategory = localStorage.getItem('fedos_category') || 'all';
        currentCategory = savedCategory;
        document.querySelectorAll('.cat-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.cat === savedCategory);
        });
        refreshForumViewCount(); loadDrafts(); loadSnippets(); likesAvailable();
        updateCharCounter(topicContent, topicCharCounter, 10000);
        updateCharCounter(replyContent, replyCharCounter, 5000);
        setTimeout(() => { keyboardHelp.classList.add('visible'); setTimeout(() => keyboardHelp.classList.remove('visible'), 3000); }, 2000);

        // Apply pending settings now that forum functions exist
        (function() {
            const s = window.__pendingSettings || {};
            if (s.carouselAutoplay !== undefined) { if (s.carouselAutoplay) startAutoSlide(); else stopAutoSlide(); }
            if (s.realtime === false && window.topicsSubscription) { try { window.topicsSubscription.unsubscribe(); } catch(e){} }
            if (s.kbdHint === false) { const kh = document.getElementById('keyboardHelp'); if (kh) kh.classList.remove('visible'); }
        })();

        // ---- Footer interactions ----
        (function() {
            document.getElementById('footerYear').textContent = new Date().getFullYear();
            const newsletter = document.getElementById('footerNewsletter');
            if (newsletter) newsletter.addEventListener('submit', (e) => {
                e.preventDefault();
                const input = newsletter.querySelector('input');
                const btn = newsletter.querySelector('button');
                btn.innerHTML = '<i class="fas fa-check"></i>';
                btn.style.background = 'linear-gradient(135deg,#10b981,#06b6d4)';
                input.value = '';
                input.placeholder = 'Subscribed! 🎉';
                setTimeout(() => { btn.innerHTML = '<i class="fas fa-paper-plane"></i>'; btn.style.background = ''; input.placeholder = 'you@example.com'; }, 2500);
            });
            const footerSettings = document.getElementById('footerSettings');
            if (footerSettings) footerSettings.addEventListener('click', (e) => { e.preventDefault(); const b = document.getElementById('settingsBtn'); if (b) b.click(); });
            const footerShortcuts = document.getElementById('footerShortcuts');
            if (footerShortcuts) footerShortcuts.addEventListener('click', (e) => { e.preventDefault(); keyboardHelp.classList.add('visible'); setTimeout(() => keyboardHelp.classList.remove('visible'), 3000); });
            document.querySelectorAll('[data-footer-action]').forEach(a => {
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = a.dataset.footerAction;
                    if (action === 'newtopic') { const b = document.getElementById('stickyNewTopic'); if (b) b.click(); return; }
                    const tab = document.querySelector('.cat-tab[data-cat="' + action + '"]');
                    if (tab) { tab.click(); window.scrollTo({ top: document.querySelector('.category-tabs').offsetTop - 80, behavior: 'smooth' }); }
                });
            });
            // Footer stats
            const ft = document.getElementById('footerStatTopics');
            const fr = document.getElementById('footerStatReplies');
            const fm = document.getElementById('footerStatMembers');
            const onlineNum = document.getElementById('online-number');
            function updateFooterStats() {
                if (ft) ft.textContent = allTopics.length || '—';
                if (fr) fr.textContent = allTopics.reduce((s, t) => s + (t.replyCount || 0), 0) || '—';
                if (fm && onlineNum) fm.textContent = onlineNum.textContent || '—';
            }
            updateFooterStats();
            setInterval(updateFooterStats, 5000);
            window.updateFooterStats = updateFooterStats;
        })();

        console.log('💬 FEDPromptly — redesigned with a calmer, more focused aesthetic.');