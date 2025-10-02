const CACHE_NAME = "env-intel-cache-v1";
const CACHE_KEY_PREFIX = "/env-intel/cache/";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", async (event) => {
  const data = event.data || {};
  const type = data.type;
  if (!type) return;

  if (type === "env-intel:update" && data.key && data.payload) {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(data.payload), {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put(CACHE_KEY_PREFIX + data.key, response);
    return;
  }

  if (type === "env-intel:request" && data.key) {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(CACHE_KEY_PREFIX + data.key);
    const payload = match ? await match.json() : null;
    if (event.source) {
      event.source.postMessage({ type: "env-intel:cached", key: data.key, payload });
    }
  }
});
