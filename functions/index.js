'use strict';

const { DateTime } = require('luxon');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { computeSlotTimes } = require('./levels');

admin.initializeApp();
const db = admin.firestore();

// Same idea as the client's missedQueue/advanceMissedQueue in app.js: don't
// fire several catch-up reminders back-to-back, space them out.
const MISSED_QUEUE_GAP_MS = 7 * 60 * 1000;

// Server-side version of the client's nagRepeat() in app.js — re-sends an
// unfinished major reminder a few times, since a single background push is
// easy to miss and this is the only thing that keeps working with the app
// fully closed (nagRepeat itself is skipped client-side while FCM is active).
// 90s apart, up to 3 times — matches app.js's own NAG_INTERVAL_MS/NAG_MAX.
const NAG_INTERVAL_MS = 90 * 1000;
const NAG_MAX = 3;

// Mirrors fetchTimingsByCity/fetchTimingsByCoords in app.js. Aladhan's
// response also includes data.meta.timezone — the IANA zone it resolved for
// the requested city/coordinates — which is what lets this function support
// any user's real location instead of assuming a fixed timezone.
async function fetchTimings(location, dateKey){
  const url = location.mode === 'coords'
    ? 'https://api.aladhan.com/v1/timings/' + dateKey + '?latitude=' + location.lat + '&longitude=' + location.lon + '&method=4'
    : 'https://api.aladhan.com/v1/timingsByCity/' + dateKey + '?city=' + encodeURIComponent(location.city || 'Riyadh') + '&country=' + encodeURIComponent(location.country || 'Saudi Arabia') + '&method=4';
  const res = await fetch(url);
  const json = await res.json();
  return { timings: json.data.timings, timezone: json.data.meta && json.data.meta.timezone };
}

// Figures out "today" (yyyy-LL-dd) in the user's OWN timezone, and the day's
// timings/timezone to go with it — without ever mutating process.env.TZ
// (which would race across users being processed concurrently in one tick).
//
// The user's timezone is cached on their profile after it's first resolved,
// so this only needs Aladhan's meta.timezone (and a possible one-time
// re-fetch if the initial UTC-based date guess landed on the wrong calendar
// day for that zone) the very first time, or right after their location
// changes to a different zone. Doesn't itself write timings/timezone to the
// dailyState doc — claimDueNotifications' transaction does that, atomically
// with the send decision below.
async function resolveDayContext(userDoc, user){
  const cachedTz = user.timezone || null;
  let dateKey = (cachedTz ? DateTime.utc().setZone(cachedTz) : DateTime.utc()).toFormat('yyyy-LL-dd');
  let stateRef = userDoc.ref.collection('dailyState').doc(dateKey);
  let stateSnap = await stateRef.get();
  let dayState = stateSnap.exists ? stateSnap.data() : {};

  if (dayState.timings && dayState.timezone){
    return { dateKey, stateRef, dayState };
  }

  const fetched = await fetchTimings(user.location, dateKey);
  const timezone = fetched.timezone || cachedTz || 'UTC';
  const correctedDateKey = DateTime.utc().setZone(timezone).toFormat('yyyy-LL-dd');

  if (correctedDateKey !== dateKey){
    // Our pre-resolution guess landed on the wrong calendar day for this
    // zone (only possible the first time we ever see this user, or right
    // after a big location change) — redo under the corrected date.
    dateKey = correctedDateKey;
    stateRef = userDoc.ref.collection('dailyState').doc(dateKey);
    stateSnap = await stateRef.get();
    dayState = stateSnap.exists ? stateSnap.data() : {};
    if (!dayState.timings){
      const refetched = await fetchTimings(user.location, dateKey);
      dayState.timings = refetched.timings;
      dayState.timezone = refetched.timezone || timezone;
    }
  } else {
    dayState.timings = fetched.timings;
    dayState.timezone = timezone;
  }

  if (user.timezone !== dayState.timezone){
    await userDoc.ref.set({ timezone: dayState.timezone }, { merge: true });
  }

  return { dateKey, stateRef, dayState };
}

const BODY_BY_MODE = {
  quran: 'اضغط لفتح ورد القرآن الآن',
  dhikr: 'اضغط لفتح الأذكار الآن',
  tahlil: 'اضغط لفتح التذكير الآن'
};

// Returns true (sent), 'invalid-token' (caller should drop the token), or
// false (transient failure). `override` lets the nag loop swap in the
// "still not done" copy.
async function sendPush(token, slot, override){
  const title = (override && override.title) || slot.label;
  const body = (override && override.body) || (BODY_BY_MODE[slot.mode] || BODY_BY_MODE.dhikr);
  try{
    await admin.messaging().send({
      token,
      notification: { title, body },
      data: { slot: slot.id, mode: slot.mode, tag: slot.id },
      webpush: { headers: { Urgency: 'high' } }
    });
    return true;
  }catch(err){
    if (err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token'){
      return 'invalid-token';
    }
    console.error('FCM send failed for slot ' + slot.id, err);
    return false;
  }
}

// The actual root cause of intermittent duplicate pushes: Pub/Sub (what
// functions.pubsub.schedule() runs on) is at-least-once delivery, and
// Cloud Scheduler can itself redeliver a tick — so checkReminders can
// genuinely execute more than once for what looks like "the same 5-minute
// tick". The previous version read dailyState, decided what to send, sent
// it, and only wrote the updated state back at the very end — a classic
// read-decide-act-write race: two overlapping invocations could both read
// the pre-send state, both decide the same slot is due, and both send
// before either write landed.
//
// Fixed by making the DECISION and the STATE WRITE a single Firestore
// transaction, committed BEFORE anything is actually sent. Firestore
// retries a transaction's callback from scratch if the document it read
// changed before it could commit — so if two invocations race, the loser's
// retry re-reads the state the winner already committed and (correctly)
// finds nothing left to claim. The actual sendPush() calls happen only
// after the transaction that claimed them has successfully committed.
async function claimDueNotifications(stateRef, timings, timezone, dateKey, level){
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(stateRef);
    const dayState = snap.exists ? snap.data() : {};

    // firedSlots: the user genuinely COMPLETED this slot in-app (synced via
    // syncFiredToCloud in app.js) — the only thing that stops the nag loop.
    const firedSlots = dayState.firedSlots || {};
    // notified: every slot claimed/pushed at least once today, with when and
    // how many nag re-sends have gone out.
    const notified = dayState.notified || {};
    let queue = dayState.missedQueue || [];
    let lastSentAt = dayState.lastSentAt || 0;

    const slots = computeSlotTimes(level, timings, timezone, dateKey);
    const slotById = {};
    slots.forEach(s => { slotById[s.id] = s; });
    const now = Date.now();

    // 1) Queue any slot that's newly due, never claimed, not completed, not already queued.
    slots.forEach(s => {
      if (!firedSlots[s.id] && !notified[s.id] && s.time.getTime() <= now && queue.indexOf(s.id) === -1){
        queue.push(s.id);
      }
    });
    // Drop anything at the front the client already completed itself.
    while (queue.length && firedSlots[queue[0]]) queue.shift();

    const toSend = [];
    const isFirstSendToday = lastSentAt === 0;
    const gapElapsed = now - lastSentAt >= MISSED_QUEUE_GAP_MS;

    if (queue.length && (isFirstSendToday || gapElapsed)){
      const nextId = queue[0];
      const nextSlot = slotById[nextId];
      if (!nextSlot){
        queue.shift(); // stale id (shouldn't normally happen) — drop and move on
      } else {
        queue.shift();
        notified[nextId] = { notifiedAt: now, nagCount: 0 };
        lastSentAt = now;
        toSend.push({ slotId: nextId, isNag: false });
      }
    }

    // 2) Nag loop — claims anything notified-but-not-completed whose gap has
    // elapsed and hasn't hit NAG_MAX yet. Runs every tick alongside step 1,
    // not instead of it, so a slot's own nag cycle keeps going regardless of
    // what else is happening in the missed-slot queue.
    for (const id of Object.keys(notified)){
      if (firedSlots[id]){ delete notified[id]; continue; } // completed — stop nagging, clean up
      const rec = notified[id];
      if (!rec || rec.nagCount >= NAG_MAX) continue;
      if (now - rec.notifiedAt < NAG_INTERVAL_MS) continue;
      if (!slotById[id]) continue;
      rec.nagCount += 1;
      rec.notifiedAt = now;
      toSend.push({ slotId: id, isNag: true });
    }

    tx.set(stateRef, { timings, timezone, firedSlots, notified, missedQueue: queue, lastSentAt }, { merge: true });

    return { toSend, slotById };
  });
}

async function processUser(userDoc){
  const user = userDoc.data();
  if (!user || !user.fcmToken || !user.location) return;

  let dayContext;
  try{
    dayContext = await resolveDayContext(userDoc, user);
  }catch(err){
    console.error('Aladhan/timezone resolution failed for user ' + userDoc.id, err);
    return;
  }
  const { dateKey, stateRef, dayState } = dayContext;
  const { timings, timezone } = dayState;

  let claim;
  try{
    claim = await claimDueNotifications(stateRef, timings, timezone, dateKey, user.level);
  }catch(err){
    console.error('claim transaction failed for ' + userDoc.id, err);
    return;
  }
  if (!claim.toSend.length) return;

  for (const item of claim.toSend){
    const slot = claim.slotById[item.slotId];
    const result = item.isNag
      ? await sendPush(user.fcmToken, slot, { title: slot.label + ' ⏰', body: 'لسّا ما أتممته — اضغط لفتحه الآن' })
      : await sendPush(user.fcmToken, slot);
    if (result === 'invalid-token'){
      await userDoc.ref.set({ fcmToken: admin.firestore.FieldValue.delete() }, { merge: true });
      return;
    }
    // result === false (transient FCM error): the claim already committed,
    // so this specific send won't be retried later. Accepted trade-off —
    // closing the duplicate-notification race takes priority over retrying
    // a rare send failure.
  }
}

exports.checkReminders = functions
  .runWith({ timeoutSeconds: 300, memory: '256MB' })
  .pubsub.schedule('every 5 minutes')
  .onRun(async () => {
    const usersSnap = await db.collection('users').get();
    await Promise.all(usersSnap.docs.map(doc =>
      processUser(doc).catch(err => console.error('processUser failed for ' + doc.id, err))
    ));
    return null;
  });
