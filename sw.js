// sw.js — مُحْتَسَب
// Firebase Messaging is loaded defensively: if gstatic is unreachable or the
// config is still unset, the whole SW must NOT fail to install — the local
// notification path below (the fallback for when FCM isn't active) has no
// external dependency of its own and needs to keep working regardless.
try{
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

  // Same config as app.js's FIREBASE_CONFIG — must be kept in sync by hand.
  // The two REPLACE_WITH_* placeholders come from Firebase Console → ⚙️
  // Project settings → General → Your apps → Web app → "SDK setup and
  // configuration".
  firebase.initializeApp({
    apiKey: 'AIzaSyDY788zoCkbK5lsby6lHD54LnQ7SUm9eV0',
    authDomain: 'mohtasab.firebaseapp.com',
    projectId: 'mohtasab',
    storageBucket: 'mohtasab.appspot.com',
    messagingSenderId: '351787865386',
    appId: '1:351787865386:web:912acb127d0756cff03a53'
  });

  // Real server-sent push (FCM) arriving while the app is backgrounded/closed.
  // Foreground pushes are handled by messaging.onMessage() in app.js instead —
  // this only fires for the background case, same as notifyBackground() below.
  const swMessaging = firebase.messaging();
  swMessaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    const d = payload.data || {};
    self.registration.showNotification(n.title || 'مُحتسب', {
      body: n.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: d.tag || 'mohtasab',
      renotify: true,
      data: { slot: d.slot },
      dir: 'rtl',
      lang: 'ar',
      requireInteraction: true,
      actions: d.mode === 'quran'
        ? [{ action:'complete', title:'✅ قرأتها والحمد لله' }, { action:'open', title:'📖 افتح للقراءة' }]
        : [{ action:'open', title: d.mode === 'tahlil' ? '🌙 افتح لإتمام التذكير' : '📿 افتح لإتمام الذكر' }]
    });
  });
}catch(e){
  // FCM background handling unavailable this session — local notifications
  // (below) are unaffected and remain the fallback.
}

const CACHE_NAME = 'mohtasab-cache-v15';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for the app shell, network-first for the Quran/prayer-time APIs
// so cached ayahs/timings stay available offline once fetched once.
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isApi = url.includes('alquran.cloud') || url.includes('aladhan.com');

  if (isApi) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Tapping the notification body (or the "open" action) focuses/opens the app
// at the right slot. Tapping "complete" (Quran slots only — no tap-counter to
// enforce there) marks it done without forcing the app open.
self.addEventListener('notificationclick', (event) => {
  const slot = event.notification.data && event.notification.data.slot;
  const isComplete = event.action === 'complete';
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const msg = { type: isComplete ? 'AUTO_COMPLETE_SLOT' : 'OPEN_SLOT', slot };
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage(msg);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        const q = isComplete ? 'autocomplete=1' : '';
        return self.clients.openWindow('./index.html?slot=' + encodeURIComponent(slot || '') + '&' + q);
      }
    })
  );
});

// Allows the page to ask the SW to fire a local notification (used for both
// the 5 major full-screen reminders while backgrounded, and the 2 light
// knowledge notifications). Major reminders get action buttons; dhikr/tahlil
// only get "open" (must go through the in-app tap-counter), Quran also gets
// a direct "complete" shortcut since the app itself doesn't gate it either.
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SHOW_NOTIFICATION') {
    const actions = [];
    if (msg.major) {
      if (msg.mode === 'quran') {
        actions.push({ action: 'complete', title: '✅ قرأتها والحمد لله' });
        actions.push({ action: 'open', title: '📖 افتح للقراءة' });
      } else {
        actions.push({ action: 'open', title: msg.mode === 'tahlil' ? '🌙 افتح لإتمام التذكير' : '📿 افتح لإتمام الذكر' });
      }
    }
    self.registration.showNotification(msg.title, {
      body: msg.body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: msg.tag || 'mohtasab',
      renotify: !!msg.major,
      data: { slot: msg.slot },
      dir: 'rtl',
      lang: 'ar',
      requireInteraction: !!msg.major,
      actions
    });
  }
});
