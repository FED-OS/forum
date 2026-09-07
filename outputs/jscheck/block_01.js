(function() {
        const canvas = document.getElementById('liquidBg');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let w, h, blobs = [], rafId = null, running = true;

        // Theme color palettes (RGB triplets for the blob gradients)
        const THEME_COLORS = {
            dark:     [[124,92,252], [244,114,182], [99,102,241]],
            light:    [[124,92,252], [244,114,182], [56,189,248]],
            ocean:    [[34,211,238], [45,212,191], [14,165,233]],
            forest:   [[74,222,128], [163,230,53], [34,197,94]],
            sunset:   [[251,146,60], [244,63,94], [251,191,36]],
            midnight: [[129,140,248], [56,189,248], [99,102,241]],
            rose:     [[232,121,249], [251,113,133], [217,70,239]]
        };

        function getColors() {
            const theme = document.documentElement.getAttribute('data-theme') || 'dark';
            return THEME_COLORS[theme] || THEME_COLORS.dark;
        }

        function resize() {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        }

        function initBlobs() {
            const colors = getColors();
            blobs = [];
            const count = 5;
            for (let i = 0; i < count; i++) {
                blobs.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.35,
                    vy: (Math.random() - 0.5) * 0.35,
                    r: Math.max(180, Math.min(w, h) * (0.25 + Math.random() * 0.25)),
                    color: colors[i % colors.length],
                    phase: Math.random() * Math.PI * 2,
                    phaseSpeed: 0.003 + Math.random() * 0.005
                });
            }
        }

        function draw() {
            if (!running) return;
            ctx.clearRect(0, 0, w, h);
            ctx.globalCompositeOperation = 'screen';
            blobs.forEach(b => {
                // Organic movement
                b.x += b.vx + Math.sin(b.phase) * 0.3;
                b.y += b.vy + Math.cos(b.phase * 0.7) * 0.3;
                b.phase += b.phaseSpeed;

                // Bounce off edges with margin
                const margin = b.r * 0.3;
                if (b.x < -margin) b.vx = Math.abs(b.vx);
                if (b.x > w + margin) b.vx = -Math.abs(b.vx);
                if (b.y < -margin) b.vy = Math.abs(b.vy);
                if (b.y > h + margin) b.vy = -Math.abs(b.vy);

                // Pulsing radius
                const pulseR = b.r * (0.85 + Math.sin(b.phase * 1.3) * 0.15);
                const safeR = Math.max(10, pulseR);

                const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, safeR);
                const [r, g, bl] = b.color;
                grad.addColorStop(0, `rgba(${r},${g},${bl},0.22)`);
                grad.addColorStop(0.5, `rgba(${r},${g},${bl},0.08)`);
                grad.addColorStop(1, `rgba(${r},${g},${bl},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(b.x, b.y, safeR, 0, Math.PI * 2);
                ctx.fill();
            });
            rafId = requestAnimationFrame(draw);
        }

        function start() {
            if (running && rafId) return;
            running = true;
            if (!rafId) draw();
        }
        function stop() {
            running = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        }

        function rebuild() {
            resize();
            initBlobs();
        }

        // Respect reduced motion
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (prefersReduced.matches) { canvas.style.display = 'none'; return; }

        rebuild();
        start();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(rebuild, 200);
        });

        // Pause when tab hidden (perf)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) stop();
            else if (!document.body.classList.contains('no-liquid')) start();
        });

        // Re-init colors when theme changes
        const themeObserver = new MutationObserver(() => { initBlobs(); });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        // Expose controls for settings
        window.liquidBg = {
            enable() { document.body.classList.remove('no-liquid'); start(); rebuild(); },
            disable() { document.body.classList.add('no-liquid'); stop(); ctx.clearRect(0,0,w,h); },
            isOn() { return !document.body.classList.contains('no-liquid'); }
        };
    })();