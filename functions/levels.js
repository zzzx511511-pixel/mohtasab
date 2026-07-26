'use strict';

// Mirrors LEVELS/SLOT_* in app.js — the two are not code-shared (separate
// deploy units), so any change to the reminder schedule must be applied by
// hand in both places.

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

function parseHM(hm, base){
  const [h, m] = hm.replace(/\s*\(.*\)/, '').split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

function computeSlotTimes(levelId, timings, base){
  base = base || new Date();
  return getLevel(levelId).slots.map(def => {
    let t;
    if (def.offsetOf){
      t = parseHM(timings[def.offsetOf], base);
      t = new Date(t.getTime() + def.offsetMin * 60000);
    } else {
      t = new Date(base);
      t.setHours(def.fixedHour, def.fixedMin, 0, 0);
    }
    return Object.assign({}, def, { time: t });
  });
}

module.exports = { LEVELS, getLevel, computeSlotTimes };
