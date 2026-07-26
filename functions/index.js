'use strict';

// Aladhan returns each city's own local clock time (e.g. "12:30") — matching
// the process timezone to Saudi Arabia keeps Date#setHours() consistent with
// how the client (which relies on the device's own local time) interprets
// those same strings. Users outside KSA's timezone are a known limitation of
// this single-timezone-process approach; per-user timezone support would
// need a `timezone` field on the profile and a switch to a tz-aware date lib.
process.env.TZ = 'Asia/Riyadh';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { computeSlotTimes } = require('./levels');

admin.initializeApp();
const db = admin.firestore();

// Same idea as the client's missedQueue/advanceMissedQueue in app.js: don't
// fire several catch-up reminders back-to-back, space them out.
const MISSED_QUEUE_GAP_MS = 7 * 60 * 1000;

function pad2(n){ return String(n).padStart(2, '0'); }
function todayKey(d){
  d = d || new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

// Mirrors fetchTimingsByCity/fetchTimingsByCoords in app.js.
async function fetchTimings(location, dateKey){
  const url = location.mode === 'coords'
    ? 'https://api.aladhan.com/v1/timings/' + dateKey + '?latitude=' + location.lat + '&longitude=' + location.lon + '&method=4'
    : 'https://api.aladhan.com/v1/timingsByCity/' + dateKey + '?city=' + encodeURIComponent(location.city || 'Riyadh') + '&country=' + encodeURIComponent(location.country || 'Saudi Arabia') + '&method=4';
  const res = await fetch(url);
  const json = await res.json();
  return json.data.timings;
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

  const now = new Date();
  const dateKey = todayKey(now);
  const stateRef = userDoc.ref.collection('dailyState').doc(dateKey);
  const stateSnap = await stateRef.get();
  const dayState = stateSnap.exists ? stateSnap.data() : {};

  // firedSlots is a shared "this slot's reminder has been handled" map —
  // the client writes to it when the user completes a slot in-app (see
  // syncFiredToCloud in app.js), and this function writes to it once a push
  // has been sent. Whichever happens first prevents the other from repeating it.
  const firedSlots = dayState.firedSlots || {};
  let queue = dayState.missedQueue || [];
  let lastSentAt = dayState.lastSentAt || 0;
  let timings = dayState.timings || null;

  if (!timings){
    try{
      timings = await fetchTimings(user.location, dateKey);
    }catch(err){
      console.error('Aladhan fetch failed for user ' + userDoc.id, err);
      return;
    }
  }

  const slots = computeSlotTimes(user.level, timings, now);

  // Queue any slot that's newly due, not yet handled, and not already queued.
  slots.forEach(s => {
    if (!firedSlots[s.id] && s.time.getTime() <= now.getTime() && queue.indexOf(s.id) === -1){
      queue.push(s.id);
    }
  });

  if (!queue.length){
    await stateRef.set({ timings, firedSlots, missedQueue: queue, lastSentAt }, { merge: true });
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

  await stateRef.set({ timings, firedSlots, missedQueue: queue, lastSentAt }, { merge: true });
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
