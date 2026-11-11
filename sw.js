// Keeps a copy of the tracker on the phone so it opens without internet.
// Your cycle data is never touched here; it stays in the page's local storage.
const CACHE = "cycle-tracker-v1";
const PAGE = "./index.html";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(["./", PAGE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Open instantly from the saved copy; quietly fetch any update for next time.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(isPage ? PAGE : req, { ignoreSearch: true });
    const update = fetch(req).then(res => {
      if (res && res.ok) cache.put(isPage ? PAGE : req, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(update); return cached; }
    return (await update) || new Response("Offline and not cached yet. Open once with internet.", { status: 503 });
  }));
});
