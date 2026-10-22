const CACHE = 'qren-admin-v12';
const BASE = '/CLASH-AREN-/';
const CORE = [
    BASE,
    BASE + 'admin/manifest.json',
    BASE + 'admin/icons/qren-logo.png'
];

async function precache() {
    const cache = await caches.open(CACHE);
    await cache.addAll(CORE).catch(() => { });
    try {
        const res = await fetch(BASE, { cache: 'reload' });
        const html = await res.text();
        const urls = new Set();
        for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
            const value = match[1];
            if (value.startsWith(BASE) && /\.(?:js|css|png|svg|woff2?)(?:\?|$)/.test(value)) urls.add(value);
        }
        await Promise.all([...urls].map(url => cache.add(url).catch(() => { })));
    } catch (e) { }
}

self.addEventListener('install', e => {
    e.waitUntil(precache());
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;

    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req)
                .then(res => {
                    if (res.ok && (res.headers.get('content-type') || '').includes('text/html')) {
                        const copy = res.clone();
                        caches.open(CACHE).then(c => c.put(BASE, copy));
                    }
                    return res;
                })
                .catch(() => caches.match(BASE))
        );
        return;
    }

    e.respondWith(
        caches.match(req).then(cached => {
            if (cached) return cached;
            return fetch(req).then(res => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then(c => c.put(req, copy));
                }
                return res;
            });
        })
    );
});
