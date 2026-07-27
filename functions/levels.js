'use strict';

// Mirrors LEVELS/SLOT_* in app.js — the two are not code-shared (separate
// deploy units), so any change to the reminder schedule must be applied by
// hand in both places.

const { DateTime } = require('luxon');

const SLOT_FAJR    = { id:'fajr',    mode:'quran',  label:'تذكير الفجر',      offsetOf:'Fajr',    offsetMin:15  };
const SLOT_DUHA    = { id:'duha',    mode:'dhikr',  label:'تذكير الضحى',      offsetOf:'Sunrise', offsetMin:90  };
const SLOT_DHUHR   = { id:'dhuhr',   mode:'dhikr',  label:'تذكير قبل الظهر',  offsetOf:'Dhuhr',   offsetMin:-30 };
const SLOT_ASR     = { id:'asr',     mode:'dhikr',  label:'تذكير بعد العصر',  offsetOf:'Asr',     offsetMin:20  };
const SLOT_MAGHRIB = { id:'maghrib', mode:'quran',  label:'تذكير المغرب',     offsetOf:'Maghrib', offsetMin:20  };
const SLOT_ISHA    = { id:'isha',    mode:'dhikr',  label:'تذكير قبل العشاء', offsetOf:'Isha',    offsetMin:-30 };
const SLOT_NIGHT   = { id:'night',   mode:'tahlil', label:'تذكير آخر الليل',  offsetOf:null, fixedHour:23, fixedMin:0 };

const LEVELS = {
  light:  { id:'light',  slots:[ SLOT_FAJR, SLOT_DHUHR, SLOT_NIGHT ] },
  medium: { id:'medium', slots:[ SLOT_FAJR, SLOT_DHUHR, SLOT_ASR, SLOT_ISHA, SLOT_NIGHT ] },
  full:   { id:'full',   slots:[ SLOT_FAJR, SLOT_DUHA, SLOT_DHUHR, SLOT_ASR, SLOT_MAGHRIB, SLOT_ISHA, SLOT_NIGHT ] }
};

function getLevel(levelId){ return LEVELS[levelId] || LEVELS.medium; }

function parseHM(hm){
  const cleaned = hm.replace(/\s*\(.*\)/, '');
  const [h, m] = cleaned.split(':').map(Number);
  return { h, m };
}

// dateKey is 'yyyy-LL-dd' — the calendar date, in `timezone`, that `timings`
// was fetched for. Building each slot as an explicit zoned DateTime (instead
// of mutating the process's local TZ) keeps this correct and concurrency-safe
// across users in different timezones being processed in the same tick.
function computeSlotTimes(levelId, timings, timezone, dateKey){
  const [year, month, day] = dateKey.split('-').map(Number);
  return getLevel(levelId).slots.map(def => {
    let dt;
    if (def.offsetOf){
      const { h, m } = parseHM(timings[def.offsetOf]);
      dt = DateTime.fromObject({ year, month, day, hour: h, minute: m }, { zone: timezone });
      dt = dt.plus({ minutes: def.offsetMin });
    } else {
      dt = DateTime.fromObject({ year, month, day, hour: def.fixedHour, minute: def.fixedMin }, { zone: timezone });
    }
    return Object.assign({}, def, { time: dt.toJSDate() });
  });
}

module.exports = { LEVELS, getLevel, computeSlotTimes };
