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
// changes to a different zone.
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
// false (transient failure — will be retried on the next tick).
async function sendPush(token, slot){
  try{
    await admin.messaging().send({
      token,
      notification: { title: slot.label, body: BODY_BY_MODE[slot.mode] || BODY_BY_MODE.dhikr },
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

  const now = new Date();

  // firedSlots is a shared "this slot's reminder has been handled" map —
  // the client writes to it when the user completes a slot in-app (see
  // syncFiredToCloud in app.js), and this function writes to it once a push
  // has been sent. Whichever happens first prevents the other from repeating it.
  const firedSlots = dayState.firedSlots || {};
  let queue = dayState.missedQueue || [];
  let lastSentAt = dayState.lastSentAt || 0;

  const slots = computeSlotTimes(user.level, timings, timezone, dateKey);

  // Queue any slot that's newly due, not yet handled, and not already queued.
  slots.forEach(s => {
    if (!firedSlots[s.id] && s.time.getTime() <= now.getTime() && queue.indexOf(s.id) === -1){
      queue.push(s.id);
    }
  });

  if (!queue.length){
    await stateRef.set({ timings, timezone, firedSlots, missedQueue: queue, lastSentAt }, { merge: true });
    return;
  }

  // Drop anything at the front the client already completed itself.
  while (queue.length && firedSlots[queue[0]]) queue.shift();

  const isFirstSendToday = lastSentAt === 0;
  const gapElapsed = now.getTime() - lastSentAt >= MISSED_QUEUE_GAP_MS;

  if (queue.length && (isFirstSendToday || gapElapsed)){
    const nextId = queue[0];
    const nextSlot = slots.find(s => s.id === nextId);
    if (!nextSlot){
      queue.shift(); // stale id (shouldn't normally happen) — drop and move on
    } else {
      const result = await sendPush(user.fcmToken, nextSlot);
      if (result === 'invalid-token'){
        await userDoc.ref.set({ fcmToken: admin.firestore.FieldValue.delete() }, { merge: true });
        return;
      }
      if (result === true){
        queue.shift();
        firedSlots[nextId] = true;
        lastSentAt = now.getTime();
      }
      // result === false (transient error): leave queue/lastSentAt untouched, retry next tick.
    }
  }

  await stateRef.set({ timings, timezone, firedSlots, missedQueue: queue, lastSentAt }, { merge: true });
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
