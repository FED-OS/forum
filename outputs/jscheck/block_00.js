const SERVER_ID = '1400235929154879490';
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
        setInterval(getOnlineCount, 60000);