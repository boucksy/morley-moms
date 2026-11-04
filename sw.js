// Morley Moms service worker: makes the app installable and lets the
// app shell open quickly. It never caches group data from Supabase.
const CACHE = 'mm-shell-v69';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'quickadd.js',
  'demo-calendar.js',
  'config.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Network first, and always asking the server whether the file changed (GitHub
// otherwise lets phones reuse a file for 10 minutes), so updates show up right away.
// Network first (always the newest version), falling back to the cached
// shell when offline. Only same-origin GETs are handled; Supabase requests
// pass straight through and are never stored.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
