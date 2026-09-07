(function() {
        const SETTINGS_KEY = 'fedos_settings';
        const DEFAULT_SETTINGS = {
            accent: 'default',
            density: 'comfortable',
            fontSize: 16,
            liquidBg: true,
            reducedMotion: false,
            carouselAutoplay: true,
            carouselSpeed: 5000,
            showEta: true,
            showMarquee: false,
            showTagCloud: true,
            defaultSort: 'hot',
            realtime: true,
            sound: false,
            desktopNotif: false,
            kbdHint: true
        };

        let settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'));

        function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
        function save(key, val) { settings[key] = val; saveSettings(); }

        // ---- Element refs ----
        const settingsBtn = document.getElementById('settingsBtn');
        const settingsClose = document.getElementById('settingsClose');
        const settingsOverlay = document.getElementById('settingsOverlay');
        const navBtns = document.querySelectorAll('.settings-nav-btn');
        const sections = document.querySelectorAll('.settings-section');

        // ---- Open / close ----
        function openSettings() {
            settingsOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
            refreshDynamicLabels();
        }
        function closeSettings() {
            settingsOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
        if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
        if (settingsClose) settingsClose.addEventListener('click', closeSettings);
        if (settingsOverlay) settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) closeSettings(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && settingsOverlay.classList.contains('active')) closeSettings(); });

        // ---- Sidebar navigation ----
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const target = btn.dataset.settingsSection;
                sections.forEach(s => s.classList.toggle('active', s.id === 'settings' + target.charAt(0).toUpperCase() + target.slice(1)));
            });
        });

        // ---- Apply functions ----
        function applyAccent(accent) {
            const root = document.documentElement;
            if (!accent || accent === 'default') {
                root.style.removeProperty('--brand');
                root.style.removeProperty('--brand-2');
            } else {
                root.style.setProperty('--brand', accent);
                root.style.setProperty('--brand-2', accent);
            }
        }

        function applyDensity(d) {
            document.body.classList.toggle('density-compact', d === 'compact');
        }

        function applyFontSize(px) {
            document.documentElement.style.setProperty('--font-base', px + 'px');
            document.body.style.fontSize = px + 'px';
        }

        function applyLiquidBg(on) {
            if (window.liquidBg) { on ? window.liquidBg.enable() : window.liquidBg.disable(); }
        }

        function applyReducedMotion(on) {
            document.documentElement.classList.toggle('reduce-motion', on);
        }

        function applyCarouselAutoplay(on) {
            if (on) { if (typeof startAutoSlide === 'function') startAutoSlide(); }
            else { if (typeof stopAutoSlide === 'function') stopAutoSlide(); }
        }

        function applyCarouselSpeed(ms) {
            if (typeof window.applyCarouselSpeedOverride === 'function') window.applyCarouselSpeedOverride(ms);
        }

        function applyShowEta(on) {
            const p = document.getElementById('etaPanel');
            if (p) p.style.display = on ? '' : 'none';
        }
        function applyShowMarquee(on) {
            const m = document.getElementById('globalMarquee');
            if (m) { m.style.display = on ? '' : 'none'; if (on) m.classList.remove('hidden'); else m.classList.add('hidden'); }
        }
        function applyShowTagCloud(on) {
            const t = document.getElementById('tagCloud');
            if (t) { if (!on) t.classList.add('hidden'); else if (typeof refreshTagCloud === 'function') refreshTagCloud(); }
        }
        function applyDefaultSort(sort) {
            const sel = document.getElementById('sortSelect');
            if (sel) { sel.value = sort; if (typeof currentSort !== 'undefined') { currentSort = sort; localStorage.setItem('forum_sort', sort); } }
        }

        // ---- Wire up controls ----
        // Theme grid
        document.querySelectorAll('.settings-theme-card').forEach(card => {
            card.addEventListener('click', () => {
                const t = card.dataset.themeVal;
                document.querySelectorAll('.settings-theme-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                if (typeof setTheme === 'function') setTheme(t);
                else { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('fedos_theme', t); }
            });
        });
        // Accent swatches
        document.querySelectorAll('.accent-swatch').forEach(sw => {
            sw.addEventListener('click', () => {
                document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('active'));
                sw.classList.add('active');
                const a = sw.dataset.accent;
                save('accent', a); applyAccent(a);
            });
        });
        // Density
        const densitySel = document.getElementById('settingDensity');
        if (densitySel) densitySel.addEventListener('change', () => { save('density', densitySel.value); applyDensity(densitySel.value); });
        // Font size
        const fontSizeRange = document.getElementById('settingFontSize');
        const fontSizeVal = document.getElementById('fontSizeVal');
        if (fontSizeRange) fontSizeRange.addEventListener('input', () => {
            const v = parseInt(fontSizeRange.value, 10);
            fontSizeVal.textContent = v + 'px';
            save('fontSize', v); applyFontSize(v);
        });
        // Liquid bg
        const liquidToggle = document.getElementById('settingLiquidBg');
        if (liquidToggle) liquidToggle.addEventListener('change', () => { save('liquidBg', liquidToggle.checked); applyLiquidBg(liquidToggle.checked); });
        // Reduced motion
        const motionToggle = document.getElementById('settingReducedMotion');
        if (motionToggle) motionToggle.addEventListener('change', () => { save('reducedMotion', motionToggle.checked); applyReducedMotion(motionToggle.checked); });
        // Carousel autoplay
        const autoplayToggle = document.getElementById('settingCarouselAutoplay');
        if (autoplayToggle) autoplayToggle.addEventListener('change', () => { save('carouselAutoplay', autoplayToggle.checked); applyCarouselAutoplay(autoplayToggle.checked); });
        // Carousel speed
        const speedRange = document.getElementById('settingCarouselSpeed');
        const speedVal = document.getElementById('carouselSpeedVal');
        if (speedRange) speedRange.addEventListener('input', () => {
            const v = parseInt(speedRange.value, 10);
            speedVal.textContent = (v / 1000) + 's';
            save('carouselSpeed', v); applyCarouselSpeed(v);
        });
        // Show ETA
        const etaToggle = document.getElementById('settingShowEta');
        if (etaToggle) etaToggle.addEventListener('change', () => { save('showEta', etaToggle.checked); applyShowEta(etaToggle.checked); });
        // Show marquee
        const marqueeToggle = document.getElementById('settingShowMarquee');
        if (marqueeToggle) marqueeToggle.addEventListener('change', () => { save('showMarquee', marqueeToggle.checked); applyShowMarquee(marqueeToggle.checked); });
        // Show tag cloud
        const tagCloudToggle = document.getElementById('settingShowTagCloud');
        if (tagCloudToggle) tagCloudToggle.addEventListener('change', () => { save('showTagCloud', tagCloudToggle.checked); applyShowTagCloud(tagCloudToggle.checked); });
        // Default sort
        const defaultSortSel = document.getElementById('settingDefaultSort');
        if (defaultSortSel) defaultSortSel.addEventListener('change', () => { save('defaultSort', defaultSortSel.value); applyDefaultSort(defaultSortSel.value); });
        // Realtime
        const realtimeToggle = document.getElementById('settingRealtime');
        if (realtimeToggle) realtimeToggle.addEventListener('change', () => {
            save('realtime', realtimeToggle.checked);
            if (realtimeToggle.checked) { if (window.topicsSubscription) window.topicsSubscription.subscribe(); }
            else { if (window.topicsSubscription) window.topicsSubscription.unsubscribe(); }
        });
        // Sound
        const soundToggle = document.getElementById('settingSound');
        if (soundToggle) soundToggle.addEventListener('change', () => { save('sound', soundToggle.checked); });
        // Desktop notifications
        const desktopToggle = document.getElementById('settingDesktopNotif');
        if (desktopToggle) desktopToggle.addEventListener('change', () => {
            save('desktopNotif', desktopToggle.checked);
            if (desktopToggle.checked && 'Notification' in window) {
                Notification.requestPermission().then(p => {
                    if (p !== 'granted') { desktopToggle.checked = false; save('desktopNotif', false); (window.toast ? window.toast('Desktop notifications were not enabled. You can allow them in your browser settings.', 'warning') : _nativeAlertFallback && _nativeAlertFallback('Desktop notifications were not enabled.')); }
                });
            }
        });
        // Kbd hint
        const kbdToggle = document.getElementById('settingKbdHint');
        if (kbdToggle) kbdToggle.addEventListener('change', () => { save('kbdHint', kbdToggle.checked); });

        // ---- Data & Privacy buttons ----
        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) clearCacheBtn.addEventListener('click', () => {
            try { sessionStorage.clear(); } catch(e) {}
            refreshDynamicLabels();
            if (typeof resetAndLoad === 'function') resetAndLoad();
            clearCacheBtn.innerHTML = '<i class="fas fa-check"></i> Cleared';
            setTimeout(() => { clearCacheBtn.innerHTML = '<i class="fas fa-broom"></i> Clear cache'; }, 1800);
        });
        const exportBookmarksBtn = document.getElementById('exportBookmarksBtn');
        if (exportBookmarksBtn) exportBookmarksBtn.addEventListener('click', () => {
            const bm = JSON.parse(localStorage.getItem('fedos_bookmarks') || '[]');
            const blob = new Blob([JSON.stringify(bm, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'fedos-bookmarks.json'; a.click();
            URL.revokeObjectURL(url);
        });
        const clearBookmarksBtn = document.getElementById('clearBookmarksBtn');
        if (clearBookmarksBtn) clearBookmarksBtn.addEventListener('click', () => {
            if (!confirm('Clear all bookmarks? This cannot be undone.')) return;
            localStorage.setItem('fedos_bookmarks', '[]');
            if (typeof bookmarks !== 'undefined') bookmarks.length = 0;
            refreshDynamicLabels();
            if (typeof resetAndLoad === 'function') resetAndLoad();
        });
        const clearDraftsBtn = document.getElementById('clearDraftsBtn');
        if (clearDraftsBtn) clearDraftsBtn.addEventListener('click', () => {
            if (!confirm('Clear all saved drafts?')) return;
            ['fedos_draft_topic', 'fedos_draft_reply'].forEach(k => localStorage.removeItem(k));
            refreshDynamicLabels();
        });
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) resetSettingsBtn.addEventListener('click', () => {
            if (!confirm('Reset all settings to defaults?')) return;
            settings = Object.assign({}, DEFAULT_SETTINGS);
            saveSettings();
            applyAllSettings();
            syncControlsToSettings();
        });

        // About shortcuts link
        const aboutShortcuts = document.getElementById('aboutShortcuts');
        if (aboutShortcuts) aboutShortcuts.addEventListener('click', (e) => {
            e.preventDefault();
            const kh = document.getElementById('keyboardHelp');
            if (kh) { kh.classList.add('visible'); setTimeout(() => kh.classList.remove('visible'), 3000); }
        });

        // ---- Dynamic labels ----
        function refreshDynamicLabels() {
            const cacheLabel = document.getElementById('cacheSizeLabel');
            if (cacheLabel) {
                try {
                    let total = 0;
                    for (let i = 0; i < sessionStorage.length; i++) { total += (sessionStorage.getItem(sessionStorage.key(i)) || '').length; }
                    cacheLabel.textContent = total > 0 ? '(' + (total / 1024).toFixed(1) + ' KB)' : '(empty)';
                } catch(e) { cacheLabel.textContent = '(empty)'; }
            }
            const bmLabel = document.getElementById('bookmarkCountLabel');
            if (bmLabel) {
                const bm = JSON.parse(localStorage.getItem('fedos_bookmarks') || '[]');
                bmLabel.textContent = bm.length + ' bookmark' + (bm.length === 1 ? '' : 's');
            }
        }

        // ---- Sync controls to current settings ----
        function syncControlsToSettings() {
            document.querySelectorAll('.settings-theme-card').forEach(c => c.classList.toggle('active', c.dataset.themeVal === (document.documentElement.getAttribute('data-theme') || 'dark')));
            document.querySelectorAll('.accent-swatch').forEach(s => s.classList.toggle('active', s.dataset.accent === settings.accent));
            if (densitySel) densitySel.value = settings.density;
            if (fontSizeRange) { fontSizeRange.value = settings.fontSize; if (fontSizeVal) fontSizeVal.textContent = settings.fontSize + 'px'; }
            if (liquidToggle) liquidToggle.checked = settings.liquidBg;
            if (motionToggle) motionToggle.checked = settings.reducedMotion;
            if (autoplayToggle) autoplayToggle.checked = settings.carouselAutoplay;
            if (speedRange) { speedRange.value = settings.carouselSpeed; if (speedVal) speedVal.textContent = (settings.carouselSpeed / 1000) + 's'; }
            if (etaToggle) etaToggle.checked = settings.showEta;
            if (marqueeToggle) marqueeToggle.checked = settings.showMarquee;
            if (tagCloudToggle) tagCloudToggle.checked = settings.showTagCloud;
            if (defaultSortSel) defaultSortSel.value = settings.defaultSort;
            if (realtimeToggle) realtimeToggle.checked = settings.realtime;
            if (soundToggle) soundToggle.checked = settings.sound;
            if (desktopToggle) desktopToggle.checked = settings.desktopNotif;
            if (kbdToggle) kbdToggle.checked = settings.kbdHint;
        }

        // ---- Apply all settings (called on load) ----
        function applyAllSettings() {
            applyAccent(settings.accent);
            applyDensity(settings.density);
            applyFontSize(settings.fontSize);
            applyLiquidBg(settings.liquidBg);
            applyReducedMotion(settings.reducedMotion);
            applyShowEta(settings.showEta);
            applyShowMarquee(settings.showMarquee);
            applyShowTagCloud(settings.showTagCloud);
            applyCarouselSpeed(settings.carouselSpeed);
            // carouselAutoplay, defaultSort, realtime applied after forum loads
            window.__pendingSettings = settings;
        }

        // ---- Expose for main script to pick up ----
        window.fedosSettings = settings;
        window.applyCarouselAutoplay = applyCarouselAutoplay;
        window.applyDefaultSort = applyDefaultSort;
        window.getSettings = () => settings;

        // ---- Init on load ----
        applyAllSettings();
        syncControlsToSettings();

        // Re-sync theme card active state when theme changes elsewhere
        const obs = new MutationObserver(() => {
            const t = document.documentElement.getAttribute('data-theme') || 'dark';
            document.querySelectorAll('.settings-theme-card').forEach(c => c.classList.toggle('active', c.dataset.themeVal === t));
        });
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        console.log('⚙️ Settings panel initialized.');
    })();