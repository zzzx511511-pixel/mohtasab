(function(){
  "use strict";

  /* ================= Utilities ================= */
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  function toArabicNum(n){ return String(n).split('').map(d => arabicDigits[Number(d)] ?? d).join(''); }
  function pad2(n){ return String(n).padStart(2,'0'); }
  function todayKey(d){ d = d || new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }
  function safeGet(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function safeSet(key,val){ try{ localStorage.setItem(key,val); return true; }catch(e){ return false; } }

  function showToast(msg){
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove('show'), 2800);
  }

  function showBanner(title, text){
    el.bannerText.innerHTML = '<b>'+title+'</b>'+text;
    el.banner.classList.add('show');
    clearTimeout(showBanner._t);
    showBanner._t = setTimeout(() => el.banner.classList.remove('show'), 9000);
  }

  /* ================= Elements ================= */
  const el = {
    juzRow: document.getElementById('juzRow'),
    progressCaption: document.getElementById('progressCaption'),
    metaSession: document.getElementById('metaSession'),
    metaPct: document.getElementById('metaPct'),
    khatmahBadge: document.getElementById('khatmahBadge'),
    cityBadge: document.getElementById('cityBadge'),
    cityLabel: document.getElementById('cityLabel'),
    nextSlot: document.getElementById('nextSlot'),
    slotList: document.getElementById('slotList'),
    dataStatus: document.getElementById('dataStatus'),
    heroTitle: document.getElementById('heroTitle'),
    overlay: document.getElementById('overlay'),
    overlayBadge: document.getElementById('overlayBadge'),
    overlayHeading: document.getElementById('overlayHeading'),
    niyyahCustom: document.getElementById('niyyahCustom'),
    lockNote: document.getElementById('lockNote'),
    verseCard: document.getElementById('verseCard'),
    dhikrCard: document.getElementById('dhikrCard'),
    surahLabel: document.getElementById('surahLabel'),
    ayahRangeLabel: document.getElementById('ayahRangeLabel'),
    bismillahLine: document.getElementById('bismillahLine'),
    ayahList: document.getElementById('ayahList'),
    dhikrText: document.getElementById('dhikrText'),
    dhikrMeaning: document.getElementById('dhikrMeaning'),
    countRing: document.getElementById('countRing'),
    countNum: document.getElementById('countNum'),
    targetCount: document.getElementById('targetCount'),
    evidenceList: document.getElementById('evidenceList'),
    btnComplete: document.getElementById('btnComplete'),
    completeHint: document.getElementById('completeHint'),
    toast: document.getElementById('toast'),
    banner: document.getElementById('banner'),
    bannerText: document.getElementById('bannerText'),
    bannerClose: document.getElementById('bannerClose'),
    modalBackdrop: document.getElementById('modalBackdrop'),
    cityInput: document.getElementById('cityInput'),
    countryInput: document.getElementById('countryInput'),
    modalSave: document.getElementById('modalSave'),
    modalCancel: document.getElementById('modalCancel'),
    levelBadge: document.getElementById('levelBadge'),
    levelLabel: document.getElementById('levelLabel'),
    levelModalBackdrop: document.getElementById('levelModalBackdrop'),
    levelOptions: document.getElementById('levelOptions'),
    levelModalCancel: document.getElementById('levelModalCancel')
  };

  el.bannerClose.addEventListener('click', () => el.banner.classList.remove('show'));

  /* ================= Fixed content: dhikr (spec-compliant caps) ================= */
  // Every evidence line was checked against the primary hadith/tafsir
  // encyclopedias (dorar.net, sunnah.com, hadeethenc.com) before being
  // added — exact wording, narrator, and book/number. Nothing here is
  // paraphrased scholarly opinion without a citable reference.

  // General rotation — cap of 3 repetitions each, per spec section 5.
  const dhikrs = [
    {
      text:"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
      meaning:"كلمتان خفيفتان على اللسان، ثقيلتان في الميزان",
      target:3,
      evidence:[
        "«كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سبحان الله وبحمده، سبحان الله العظيم» — متفق عليه: رواه البخاري (٦٤٠٦) ومسلم (٢٦٩٤) عن أبي هريرة رضي الله عنه."
      ],
      sources:['bukhari','muslim']
    },
    {
      text:"أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ",
      meaning:"الاستغفار من أسباب الرزق وتفريج الهم وسعة الصدر",
      target:3,
      evidence:[
        "«والله إني لأستغفر الله وأتوب إليه في اليوم أكثر من سبعين مرة» — رواه البخاري (٦٣٠٧) عن أبي هريرة رضي الله عنه."
      ],
      sources:['bukhari']
    },
    {
      text:"اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ",
      meaning:"من صلّى عليّ صلاة واحدة صلّى الله عليه بها عشرًا",
      target:3,
      evidence:[
        "«من صلّى عليّ صلاة واحدة صلّى الله عليه بها عشرًا» — رواه مسلم (٤٠٨) عن أبي هريرة رضي الله عنه."
      ],
      sources:['muslim']
    },
    {
      text:"لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ",
      meaning:"كلمة هي كنز من كنوز الجنة",
      target:3,
      evidence:[
        "«ألا أدلّك على كلمة هي كنز من كنوز الجنة: لا حول ولا قوة إلا بالله» — متفق عليه: رواه البخاري (٦٣٨٤) ومسلم (٢٧٠٤) عن أبي موسى الأشعري رضي الله عنه."
      ],
      sources:['bukhari','muslim']
    },
    {
      text:"لَا إِلَٰهَ إِلَّا اللَّهُ",
      meaning:"أفضل الذكر على الإطلاق",
      target:3,
      evidence:[
        "«أفضل الذكر: لا إله إلا الله، وأفضل الدعاء: الحمد لله» — حديث حسن: رواه الترمذي (٣٣٨٣) وابن ماجه (٣٨٠٠)، وحسّنه الألباني، عن جابر بن عبدالله رضي الله عنه."
      ],
      sources:['tirmidhi','ibnmajah']
    },
    {
      text:"اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ",
      meaning:"سيّد الاستغفار — من قالها موقنًا بها فمات من يومه دخل الجنة",
      target:1,
      evidence:[
        "«سيد الاستغفار أن تقول: اللهم أنت ربي...» إلى آخره — «من قالها من النهار موقنًا بها فمات من يومه قبل أن يمسي فهو من أهل الجنة» — رواه البخاري (٦٣٠٦) عن شداد بن أوس رضي الله عنه."
      ],
      sources:['bukhari']
    }
  ];

  // Dedicated late-night tahlil — its repeat count is the one thing that
  // scales with the chosen level (1 / 2 / 3); everything else about it (text,
  // evidence) stays fixed. See LEVELS below for the per-level target.
  const tahlilSpecial = {
    text:"لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    meaning:"تُقال بتنبيه آخر الليل، مع تذكير بالوتر ونية النوم",
    evidence:[
      "«من قال: لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، في يوم مائة مرة، كانت له عدل عشر رقاب» — متفق عليه: رواه البخاري (٣٢٩٣) ومسلم (٢٦٩١) عن أبي هريرة رضي الله عنه.",
      "«يا أهل القرآن، أوتروا؛ فإن الله وتر يحب الوتر» — رواه أبو داود (١٤١٦) والترمذي (٤٥٣) عن علي بن أبي طالب رضي الله عنه، وصححه الألباني."
    ],
    sources:['bukhari','muslim','abudawud','tirmidhi']
  };

  const quranEvidence = [
    "«خيركم من تعلّم القرآن وعلّمه» — رواه البخاري (٥٠٢٧) عن عثمان بن عفان رضي الله عنه.",
    "«من قرأ حرفًا من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» — رواه الترمذي (٢٩١٠) عن عبدالله بن مسعود رضي الله عنه، وصححه الألباني."
  ];

  const niyyahLines = [
    "استحضر نيّتك الآن: «اللهم اجعل القرآن ربيع قلبي، ونور صدري، وجلاء حزني، وذهاب همّي» — من حديث الكرب، رواه أحمد في مسنده والترمذي (٣٤٣٦) عن عبدالله بن مسعود رضي الله عنه، وصححه الألباني.",
    "احتسب هذه اللحظة عند الله: «إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى» — متفق عليه: رواه البخاري (١) ومسلم (١٩٠٧) عن عمر بن الخطاب رضي الله عنه."
  ];

  // Light knowledge notifications shown between the major reminders — six
  // categories, rotated (not random) so consecutive notifications don't
  // repeat a type. Every entry checked against dorar.net / hadeethenc.com
  // for exact wording, narrator, and book/number before inclusion.
  const knowledgeSnippets = [
    {icon:'💡', title:'حديث نبوي', text:'«الطُّهُورُ شَطْرُ الْإِيمَانِ» — رواه مسلم (٢٢٣) عن أبي مالك الأشعري رضي الله عنه.'},
    {icon:'🤲', title:'دعاء مأثور', text:'سيد الاستغفار: «اللهم أنت ربي لا إله إلا أنت، خلقتني وأنا عبدك، وأنا على عهدك ووعدك ما استطعت، أعوذ بك من شر ما صنعت، أبوء لك بنعمتك عليّ، وأبوء بذنبي فاغفر لي، فإنه لا يغفر الذنوب إلا أنت» — رواه البخاري (٦٣٠٦) عن شداد بن أوس رضي الله عنه.'},
    {icon:'📖', title:'تفسير ميسّر', text:'قال تعالى: «وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا» [سورة الطلاق: ٢] — وعد إلهي بالفرج لمن التزم التقوى في أموره كلها.'},
    {icon:'🦷', title:'سنّة مهجورة', text:'السواك — كان النبي ﷺ يحافظ عليه عند كل صلاة: «لولا أن أشقّ على أمتي لأمرتهم بالسواك مع كل صلاة» — متفق عليه: رواه البخاري (٨٨٧) ومسلم (٢٥٢) عن أبي هريرة رضي الله عنه.'},
    {icon:'🕌', title:'من أثر السلف', text:'قال شيخ الإسلام ابن تيمية رحمه الله: «القلب لا يصلح ولا يفلح ولا يسكن ولا يطمئن إلا بعبادة ربه وحبه والإنابة إليه» — مجموع الفتاوى (١٠/١٩٤).'},
    {icon:'📜', title:'من سيرته ﷺ', text:'كان غلام يهودي يخدم النبي ﷺ فمرض، فزاره ﷺ وقعد عند رأسه وقال له: «أسلم»، فنظر الغلام إلى أبيه، فقال له: أطع أبا القاسم، فأسلم — فخرج النبي ﷺ وهو يقول: «الحمد لله الذي أنقذه من النار» — رواه البخاري (١٣٥٦) عن أنس بن مالك رضي الله عنه.'},
    {icon:'💡', title:'حديث نبوي', text:'«مَن سلك طريقًا يلتمس فيه علمًا سهّل الله له به طريقًا إلى الجنة» — رواه مسلم (٢٦٩٩) عن أبي هريرة رضي الله عنه.'},
    {icon:'📜', title:'من أثر الصحابة', text:'قاتل المائة نفس: رجل قتل تسعة وتسعين إنسانًا ثم أراد التوبة، فدُلّ على أرض صالحة يهاجر إليها، فأدركه الموت في الطريق، فقاسته ملائكة الرحمة والعذاب فوجدوه أقرب للأرض الصالحة بشبر فغفر الله له — متفق عليه: رواه البخاري (٣٤٧٠) ومسلم (٢٧٦٦) عن أبي سعيد الخدري رضي الله عنه.'}
  ];

  function nextSnippetIndex(){
    const key = 'mohtasab_snippet_idx';
    const cur = Number(safeGet(key) || 0);
    const next = (cur + 1) % knowledgeSnippets.length;
    safeSet(key, next);
    return cur % knowledgeSnippets.length;
  }

  // Reusable niyyah/note strings so the three levels stay wordfor-word
  // consistent on shared slots (fajr, dhuhr, asr, isha, night).
  const NOTE = {
    morning: 'لا تنسَ أذكار الصباح، واحتسب نيتك وسعيك في بداية يومك ليكون كله عبادة.',
    lunch: 'احتسب نيّة طعام الغداء تقوّيًا على طاعة الله وكسبًا للرزق — لتنال أجر العبادة أثناء أكلك.',
    evening: 'دخل وقت المساء، لا تنسَ الاستئناس بأذكار المساء المأثورة.',
    dinner: 'احتسب نيّة طعام العشاء عبادة لله تبتغي بها الأجر والتقوّي.',
    night: 'تذكير بصلاة الوتر، واحتسب نية النوم والراحة لله لتُكتب نومتك عبادة طوال الليل.',
    duha: 'استحضر نية أن يكون سعيك وعملك اليوم عبادة لله.',
    secondQuran: 'جرعتك الثانية من القرآن اليوم — استمرارية على كتاب الله.'
  };

  const SLOT_FAJR   = { id:'fajr',   mode:'quran', label:'تذكير الفجر',     icon:'📖', offsetOf:'Fajr',    offsetMin:15,  niyyah: NOTE.morning };
  const SLOT_DUHA    = { id:'duha',   mode:'dhikr', label:'تذكير الضحى',     icon:'📿', offsetOf:'Sunrise', offsetMin:90,  niyyah: NOTE.duha };
  const SLOT_DHUHR   = { id:'dhuhr',  mode:'dhikr', label:'تذكير قبل الظهر', icon:'📿', offsetOf:'Dhuhr',   offsetMin:-30, niyyah: NOTE.lunch };
  const SLOT_ASR     = { id:'asr',    mode:'dhikr', label:'تذكير بعد العصر', icon:'📿', offsetOf:'Asr',     offsetMin:20,  niyyah: NOTE.evening };
  const SLOT_MAGHRIB = { id:'maghrib',mode:'quran', label:'تذكير المغرب',    icon:'📖', offsetOf:'Maghrib', offsetMin:20,  niyyah: NOTE.secondQuran };
  const SLOT_ISHA    = { id:'isha',   mode:'dhikr', label:'تذكير قبل العشاء',icon:'📿', offsetOf:'Isha',    offsetMin:-30, niyyah: NOTE.dinner };
  const SLOT_NIGHT   = { id:'night',  mode:'tahlil',label:'تذكير آخر الليل', icon:'🌙', offsetOf:null,      fixedHour:23, fixedMin:0, niyyah: NOTE.night };

  // The three intensity levels. Tasbih/istighfar/salawat stay fixed at 3 reps
  // everywhere (per the hadith wording) — only the tahlil target, the Quran
  // word-budget per session, and the number/spread of daily reminders scale.
  const LEVELS = {
    light: {
      id:'light', label:'خفيفة', desc:'٣ تنبيهات يوميًا — ٢٠ كلمة قرآن، تهليل×١',
      count:3, quranWords:20, tahlilTarget:1,
      slots:[ SLOT_FAJR, SLOT_DHUHR, SLOT_NIGHT ]
    },
    medium: {
      id:'medium', label:'متوسطة', desc:'٥ تنبيهات يوميًا — ٣٠ كلمة قرآن، تهليل×٢',
      count:5, quranWords:30, tahlilTarget:2,
      slots:[ SLOT_FAJR, SLOT_DHUHR, SLOT_ASR, SLOT_ISHA, SLOT_NIGHT ]
    },
    full: {
      id:'full', label:'كاملة', desc:'٧ تنبيهات يوميًا — ٥٠ كلمة قرآن، تهليل×٣',
      count:7, quranWords:50, tahlilTarget:3,
      slots:[ SLOT_FAJR, SLOT_DUHA, SLOT_DHUHR, SLOT_ASR, SLOT_MAGHRIB, SLOT_ISHA, SLOT_NIGHT ]
    }
  };
  function getLevel(){ return LEVELS[state.level] || LEVELS.medium; }

  /* ================= State ================= */
  function loadPos(){
    const raw = safeGet('mohtasab_pos');
    if (raw){
      const [s,a] = raw.split(',').map(Number);
      if (Number.isInteger(s) && Number.isInteger(a)) return { s, a };
    }
    return { s: 1, a: 0 }; // surah index 1 = Al-Baqarah (index 0 = Al-Fatiha, skipped)
  }

  const state = {
    pos: loadPos(),
    khatmahCount: Number(safeGet('mohtasab_khatmah') || 0),
    dhikrIndex: Number(safeGet('mohtasab_dhikr_idx') || 0),
    level: safeGet('mohtasab_level') || 'medium',
    tapCount: 0,
    activeMode: 'quran',
    activeSlot: null,
    quranReady: false,
    lastFocusedEl: null
  };

  function persistCore(){
    safeSet('mohtasab_pos', state.pos.s + ',' + state.pos.a);
    safeSet('mohtasab_khatmah', state.khatmahCount);
    safeSet('mohtasab_dhikr_idx', state.dhikrIndex);
    safeSet('mohtasab_level', state.level);
  }

  /* ================= Quran loading (Al Quran Cloud API) ================= */
  const QURAN_CACHE_KEY = 'mohtasab_quran_v1';
  let cachedSurahs = null;   // raw surahs (index 0 = Al-Fatiha, kept but never read from)
  let totalAyat = 0;         // total ayat from Al-Baqarah through An-Nas, for the % readout
  let currentChunk = null;   // the next reading chunk at state.pos, recomputed on load/level-change/advance

  // An ayah this long on its own (word count, not char count — Uthmani script
  // is fully vocalized so raw characters overstate length) already breaks the
  // level's "light" word budget, so it gets its own dedicated session instead
  // of being bundled with others. This naturally isolates Ayat al-Kursi, Ayat
  // ad-Dayn (the longest ayah in the Quran), Ayat an-Nur, etc. without
  // hardcoding a list of surah/ayah numbers — and it adapts per level since
  // the budget itself (20/30/50 words) changes.
  function wordCount(text){ return text.trim().split(/\s+/).length; }

  function makeSession(surah, chunk, nextPos){
    const range = chunk.length === 1
      ? String(chunk[0].numberInSurah)
      : chunk[0].numberInSurah + ' - ' + chunk[chunk.length - 1].numberInSurah;
    return {
      surah: surah.name,
      surahNumber: surah.number,
      range,
      juz: chunk[0].juz || 1,
      ayat: chunk.map(a => ({ n: a.numberInSurah, t: a.text })),
      bismillah: !!(surah.hasBismillah && chunk[0].numberInSurah === 1),
      nextPos
    };
  }

  // Computes the next reading chunk starting at `pos`, sized to `wordBudget`.
  // Returns null only if the Quran data isn't loaded yet.
  function computeChunkAt(pos, wordBudget){
    if (!cachedSurahs) return null;
    const surah = cachedSurahs[pos.s];
    const ayat = surah.ayahs;
    let a = pos.a;
    const chunk = [];

    if (wordCount(ayat[a].text) > wordBudget){
      chunk.push(ayat[a]); a++;
    } else {
      let total = 0;
      while (a < ayat.length){
        const w = wordCount(ayat[a].text);
        if (w > wordBudget) break;
        if (chunk.length > 0 && total + w > wordBudget) break;
        chunk.push(ayat[a]); total += w; a++;
      }
    }

    let nextPos;
    if (a >= ayat.length){
      nextPos = (pos.s + 1 < cachedSurahs.length) ? { s: pos.s + 1, a: 0 } : { s: 1, a: 0, wrapped: true };
    } else {
      nextPos = { s: pos.s, a };
    }
    return makeSession(surah, chunk, nextPos);
  }

  function refreshCurrentChunk(){
    currentChunk = computeChunkAt(state.pos, getLevel().quranWords);
  }

  // Advances the reading pointer past the currently-displayed chunk. Returns
  // true if this completed a full khatmah (wrapped back to Al-Baqarah).
  function advanceReadingPosition(){
    if (!currentChunk) return false;
    const next = currentChunk.nextPos;
    const wrapped = !!next.wrapped;
    state.pos = { s: next.s, a: next.a };
    if (wrapped) state.khatmahCount++;
    persistCore();
    refreshCurrentChunk();
    return wrapped;
  }

  function computeProgressPercent(){
    if (!cachedSurahs || !totalAyat) return 0;
    let read = 0;
    for (let s = 1; s < state.pos.s; s++) read += cachedSurahs[s].ayahs.length;
    read += state.pos.a;
    return Math.min(100, Math.round((read / totalAyat) * 100));
  }

  // The alquran.cloud "quran-uthmani" edition embeds the Basmalah inside the
  // TEXT of ayah 1 of every surah except At-Tawbah (surah 9) — because the
  // Basmalah is printed before each surah in the mushaf but is only a
  // numbered ayah in Al-Fatiha. Left as-is, this glues "بسم الله الرحمن
  // الرحيم" onto ayah 1's own text under a single ayah-number circle, which
  // misrepresents where the ayah actually starts.
  //
  // A plain exact-string prefix match is too brittle: the same Basmalah can
  // be encoded with slightly different diacritic marks, or with the wasla
  // alef (ٱ) instead of a plain alef (ا), in different places in the same
  // dataset. So we compare a DIACRITIC-STRIPPED, ALEF-NORMALIZED version of
  // both strings (never touching the actual stored text) purely to detect
  // the match, then cut the ORIGINAL text at the corresponding point — so
  // what's left keeps its original, exact Uthmani spelling untouched. If the
  // normalized comparison doesn't match, nothing is changed — we never
  // guess or truncate by word count, only strip on a confirmed match.
  const ARABIC_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D4-\u08E1\u08E3-\u08FF]/;
  function normalizeArabicChar(ch){ return ('أإآٱ'.includes(ch)) ? 'ا' : ch; }
  function normalizeWithMap(str){
    let normalized = '';
    const map = []; // map[i] = original-string index right after the i-th normalized char
    for (let i = 0; i < str.length; i++){
      const ch = str[i];
      if (ARABIC_DIACRITICS.test(ch)) continue;
      normalized += normalizeArabicChar(ch);
      map.push(i + 1);
    }
    return { normalized, map };
  }

  function stripEmbeddedBismillah(surahs){
    const fatihaAyah1 = surahs[0] && surahs[0].ayahs[0] && surahs[0].ayahs[0].text;
    if (!fatihaAyah1) return;
    const basmalahNorm = normalizeWithMap(fatihaAyah1).normalized;

    for (let s = 1; s < surahs.length; s++){
      const surah = surahs[s];
      if (surah.number === 9) continue; // At-Tawbah has no Basmalah
      const first = surah.ayahs[0];
      if (!first) continue;
      const { normalized, map } = normalizeWithMap(first.text);
      if (normalized.startsWith(basmalahNorm)){
        let cut = map[basmalahNorm.length - 1];
        // Also skip any diacritics/whitespace immediately trailing the
        // matched letters (e.g. a kasra under the final Basmalah letter)
        // before treating the remainder as the ayah's own text.
        while (cut < first.text.length && (ARABIC_DIACRITICS.test(first.text[cut]) || /\s/.test(first.text[cut]))) cut++;
        first.text = first.text.slice(cut);
        surah.hasBismillah = true;
      }
    }
  }

  function setSurahs(surahs){
    stripEmbeddedBismillah(surahs);
    cachedSurahs = surahs;
    totalAyat = 0;
    for (let s = 1; s < surahs.length; s++) totalAyat += surahs[s].ayahs.length;
    // Guard against a stale saved position from before a khatmah-length change.
    if (!surahs[state.pos.s] || state.pos.a >= surahs[state.pos.s].ayahs.length){
      state.pos = { s: 1, a: 0 };
    }
    refreshCurrentChunk();
    state.quranReady = true;
  }

  function fetchQuran(){
    const cached = safeGet(QURAN_CACHE_KEY);
    if (cached){
      try{
        setSurahs(JSON.parse(cached));
        el.dataStatus.textContent = 'المصحف محمّل محليًا (يعمل بلا اتصال).';
        renderDashboard();
      }catch(e){ /* fall through to network */ }
    }
    if (!navigator.onLine && cached) return;

    fetch('https://api.alquran.cloud/v1/quran/quran-uthmani')
      .then(r => r.json())
      .then(json => {
        const surahs = json.data.surahs.map(s => ({
          number: s.number,
          name: s.name,
          ayahs: s.ayahs.map(a => ({ numberInSurah: a.numberInSurah, text: a.text, juz: a.juz }))
        }));
        safeSet(QURAN_CACHE_KEY, JSON.stringify(surahs));
        setSurahs(surahs);
        el.dataStatus.textContent = 'المصحف محمّل من المصدر الموثّق (Al Quran Cloud — المصحف العثماني) ومُخزَّن محليًا للعمل بلا اتصال.';
        renderDashboard();
      })
      .catch(() => {
        if (!state.quranReady){
          el.progressCaption.textContent = 'تعذّر تحميل المصحف — يحتاج التطبيق اتصالًا بالإنترنت أول مرة فقط.';
          el.dataStatus.textContent = 'لم يتم الاتصال بمصدر القرآن بعد. تحقق من الإنترنت وأعد المحاولة.';
        }
      });
  }

  /* ================= Prayer times (Aladhan API) ================= */
  // mode:'manual' = user explicitly pinned a city (respected as-is, never
  //                   overridden automatically — e.g. planning ahead for a trip).
  // mode:'auto'   = default. Re-requests a FRESH GPS fix every time timings are
  //                   resolved (not a stored lat/lon), so moving cities — even
  //                   mid-day — is picked up automatically on next open.
  const LOC_KEY = 'mohtasab_location';
  function getLocationPref(){
    try{ return JSON.parse(safeGet(LOC_KEY) || 'null'); }catch(e){ return null; }
  }
  function setLocationPref(loc){ safeSet(LOC_KEY, JSON.stringify(loc)); }

  // Last GPS fix kept only as an offline/failure fallback — never treated as current.
  const LAST_FIX_KEY = 'mohtasab_last_fix';

  function fetchTimingsByCoords(lat, lon){
    const url = 'https://api.aladhan.com/v1/timings/'+todayKey()+'?latitude='+lat+'&longitude='+lon+'&method=4';
    return fetch(url).then(r => r.json()).then(j => j.data.timings);
  }
  function fetchTimingsByCity(city, country){
    const url = 'https://api.aladhan.com/v1/timingsByCity/'+todayKey()+'?city='+encodeURIComponent(city)+'&country='+encodeURIComponent(country)+'&method=4';
    return fetch(url).then(r => r.json()).then(j => j.data.timings);
  }

  // Arabic display names for common Saudi cities — Aladhan needs the English
  // spelling to resolve the request, but the badge must always read in Arabic.
  const CITY_AR_NAMES = {
    'riyadh': 'الرياض', 'jeddah': 'جدة', 'jiddah': 'جدة',
    'mecca': 'مكة المكرمة', 'makkah': 'مكة المكرمة',
    'medina': 'المدينة المنورة', 'madinah': 'المدينة المنورة',
    'dammam': 'الدمام', 'khobar': 'الخبر', 'al khobar': 'الخبر',
    'dhahran': 'الظهران', 'taif': 'الطائف', 'tabuk': 'تبوك', 'abha': 'أبها',
    'khamis mushait': 'خميس مشيط', 'jubail': 'الجبيل', 'najran': 'نجران',
    'jazan': 'جازان', 'jizan': 'جازان', 'hail': 'حائل', 'qassim': 'القصيم',
    'buraidah': 'بريدة', 'yanbu': 'ينبع', 'al ahsa': 'الأحساء',
    'hofuf': 'الهفوف', 'sakaka': 'سكاكا', 'arar': 'عرعر', 'baha': 'الباحة'
  };
  function cityDisplayName(city){
    if (!city) return 'الرياض';
    return CITY_AR_NAMES[city.trim().toLowerCase()] || city;
  }

  // Rounded to ~11km — coarse enough to be a stable cache key, fine enough to
  // tell Riyadh from Qassim apart so a real move busts the day's cache.
  function coordKey(lat, lon){ return lat.toFixed(1)+','+lon.toFixed(1); }

  function getFreshPosition(){
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation){ reject(new Error('no-geo')); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => reject(err),
        { timeout: 8000, maximumAge: 0 } // maximumAge:0 forces a live fix, not a cached OS one
      );
    });
  }

  function resolveLocationAndTimings(){
    const pref = getLocationPref();

    if (pref && pref.mode === 'manual'){
      const cacheKey = 'mohtasab_timings_'+todayKey()+'_manual_'+pref.city;
      const cached = safeGet(cacheKey);
      if (cached){ try{ return Promise.resolve(JSON.parse(cached)); }catch(e){} }
      el.cityLabel.textContent = cityDisplayName(pref.city);
      return fetchTimingsByCity(pref.city, pref.country)
        .then(t => { safeSet(cacheKey, JSON.stringify(t)); return t; });
    }

    // auto mode: always ask the device for a live position first.
    return getFreshPosition()
      .then(loc => {
        safeSet(LAST_FIX_KEY, JSON.stringify(loc)); // fallback for next failure only
        el.cityLabel.textContent = 'موقعك الحالي';
        const cacheKey = 'mohtasab_timings_'+todayKey()+'_'+coordKey(loc.lat, loc.lon);
        const cached = safeGet(cacheKey);
        if (cached){ try{ return Promise.resolve(JSON.parse(cached)); }catch(e){} }
        return fetchTimingsByCoords(loc.lat, loc.lon)
          .then(t => { safeSet(cacheKey, JSON.stringify(t)); return t; });
      })
      .catch(() => {
        // Live GPS failed this time (denied, no signal, offline) — try the
        // last known fix before giving up to Riyadh, but keep mode:'auto' so
        // we try live GPS again on the next open instead of freezing on Riyadh.
        let lastFix = null;
        try{ lastFix = JSON.parse(safeGet(LAST_FIX_KEY) || 'null'); }catch(e){}
        if (lastFix){
          el.cityLabel.textContent = 'آخر موقع معروف';
          return fetchTimingsByCoords(lastFix.lat, lastFix.lon);
        }
        el.cityLabel.textContent = 'الرياض (تقديري)';
        return fetchTimingsByCity('Riyadh', 'Saudi Arabia');
      });
  }

  /* ================= Scheduling engine ================= */
  // Slot times are computed off whichever level's slot list is active
  // (see LEVELS above) — 3, 5, or 7 reminders, each tied to a real prayer time.

  function parseHM(hm, base){
    const [h,m] = hm.replace(/\s*\(.*\)/,'').split(':').map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  function computeSlotTimes(timings){
    const base = new Date();
    return getLevel().slots.map(def => {
      let t;
      if (def.offsetOf){
        t = parseHM(timings[def.offsetOf], base);
        t = new Date(t.getTime() + def.offsetMin*60000);
      } else {
        t = new Date(base);
        t.setHours(def.fixedHour, def.fixedMin, 0, 0);
      }
      return Object.assign({}, def, { time: t });
    });
  }

  function firedKey(slotId){ return 'mohtasab_fired_'+todayKey()+'_'+slotId; }
  function isFired(slotId){ return safeGet(firedKey(slotId)) === '1'; }
  function markFired(slotId){ safeSet(firedKey(slotId), '1'); }

  let slotsToday = [];
  const timers = [];

  // Missed-while-closed slots trickle out one at a time instead of firing
  // in a pile — see missedQueue/advanceMissedQueue below.
  const MISSED_QUEUE_GAP_MS = 7 * 60 * 1000;
  let missedQueue = [];
  let missedQueueTimer = null;

  function clearTimers(){
    timers.forEach(t => clearTimeout(t)); timers.length = 0;
    if (missedQueueTimer){ clearTimeout(missedQueueTimer); missedQueueTimer = null; }
    missedQueue = [];
  }

  function scheduleToday(timings){
    slotsToday = computeSlotTimes(timings);
    clearTimers();
    const now = new Date();

    const missed = [];
    slotsToday.forEach(slot => {
      if (isFired(slot.id)) return;
      const delay = slot.time.getTime() - now.getTime();
      if (delay <= 0){
        missed.push(slot);
      } else {
        timers.push(setTimeout(() => triggerSlot(slot), delay));
      }
    });

    if (missed.length){
      // Several reminders piling up while the app was closed shouldn't all
      // fire back-to-back — show the oldest (earliest scheduled) now, and
      // queue the rest to appear one at a time on completion, or after a
      // minimum spacing if the current one is left hanging.
      missed.sort((a, b) => a.time - b.time);
      timers.push(setTimeout(() => triggerSlot(missed[0]), 400));
      missedQueue = missed.slice(1);
      if (missedQueue.length) missedQueueTimer = setTimeout(advanceMissedQueue, MISSED_QUEUE_GAP_MS);
    }

    // Two light knowledge notifications, spaced between the major slots.
    scheduleLightNotifications(slotsToday);
    renderSlotList();
    renderNextSlot();
    applyPendingSlotAction();
  }

  function advanceMissedQueue(){
    if (missedQueueTimer){ clearTimeout(missedQueueTimer); missedQueueTimer = null; }
    if (!missedQueue.length) return;
    if (el.overlay.classList.contains('show')){
      // Still busy with the current reminder — check back after the gap
      // instead of stacking the next one on top of it.
      missedQueueTimer = setTimeout(advanceMissedQueue, MISSED_QUEUE_GAP_MS);
      return;
    }
    const next = missedQueue.shift();
    if (isFired(next.id)){ advanceMissedQueue(); return; }
    timers.push(setTimeout(() => triggerSlot(next), 400));
    if (missedQueue.length) missedQueueTimer = setTimeout(advanceMissedQueue, MISSED_QUEUE_GAP_MS);
  }

  function triggerSlot(slot){
    if (isFired(slot.id)) return;
    if (document.visibilityState === 'visible'){
      openOverlayForSlot(slot);
    } else {
      notifyBackground(slot.label, 'اضغط لفتح ' + (slot.mode === 'quran' ? 'ورد القرآن' : 'الأذكار') + ' الآن', slot.id, true, slot.mode);
      nagRepeat(slot, 1);
    }
  }

  // A single background notification is easy to miss. Since a real forced
  // full-screen lock isn't possible from a website, the closest free
  // approximation is to re-notify (with sound/vibration) a few times if the
  // person hasn't acted yet — capped so it isn't annoying.
  const NAG_INTERVAL_MS = 10 * 60 * 1000;
  const NAG_MAX = 3;
  function nagRepeat(slot, attempt){
    if (attempt > NAG_MAX) return;
    timers.push(setTimeout(() => {
      if (isFired(slot.id)) return;
      if (document.visibilityState === 'visible'){ openOverlayForSlot(slot); return; }
      notifyBackground(slot.label + ' ⏰', 'لسّا ما أتممته — اضغط لفتحه الآن', slot.id, true, slot.mode);
      nagRepeat(slot, attempt + 1);
    }, NAG_INTERVAL_MS));
  }

  function notifyBackground(title, body, tag, major, mode){
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      if (reg.active){
        reg.active.postMessage({ type:'SHOW_NOTIFICATION', title, body, tag, slot: tag, major, mode });
      }
    });
  }

  function scheduleLightNotifications(slots){
    // One midpoint per "every other gap" between major slots — this happens
    // to yield exactly 1 light notification for the 3-slot level, 2 for the
    // 5-slot level, and 3 for the 7-slot level, spread evenly across the day.
    const mids = [];
    for (let i = 1; i < slots.length - 1; i += 2){
      mids.push(new Date((slots[i].time.getTime() + slots[i+1].time.getTime()) / 2));
    }

    mids.forEach((t, idx) => {
      const key = 'mohtasab_light_'+todayKey()+'_'+idx;
      if (safeGet(key) === '1') return;
      const delay = t.getTime() - Date.now();
      const fire = () => {
        if (safeGet(key) === '1') return;
        if (document.visibilityState === 'visible' && el.overlay.classList.contains('show')){
          // A major reminder overlay is up — never stack the light banner
          // on top of it. Leave the key unset and try again shortly.
          timers.push(setTimeout(fire, 30000));
          return;
        }
        safeSet(key,'1');
        const snip = knowledgeSnippets[nextSnippetIndex()];
        if (document.visibilityState === 'visible'){
          showBanner(snip.icon+' '+snip.title+' — ', snip.text);
        } else {
          notifyBackground(snip.icon+' '+snip.title, snip.text, 'light-'+idx, false);
        }
      };
      if (delay <= 0) timers.push(setTimeout(fire, 600));
      else timers.push(setTimeout(fire, delay));
    });
  }

  // Badging API — puts a number on the home-screen app icon itself while a
  // reminder is due and un-completed, so even an ignored/missed notification
  // still shows up next time the person glances at their phone. Free, native,
  // supported on Chrome/Edge/Android; silently no-ops where unsupported.
  function updateBadge(){
    if (!('setAppBadge' in navigator)) return;
    const now = new Date();
    const pending = slotsToday.filter(s => !isFired(s.id) && s.time <= now).length;
    try{
      if (pending > 0) navigator.setAppBadge(pending).catch(() => {});
      else navigator.clearAppBadge().catch(() => {});
    }catch(e){}
  }

  function renderSlotList(){
    el.slotList.innerHTML = '';
    updateBadge();
    const now = new Date();
    slotsToday.forEach(slot => {
      const row = document.createElement('div');
      const done = isFired(slot.id);
      const due = !done && slot.time <= now;
      row.className = 'slot-item' + (done ? ' done' : '') + (due ? ' due' : '');
      const hh = slot.time.getHours(), mm = slot.time.getMinutes();
      const timeStr = toArabicNum(pad2(hh)) + ':' + toArabicNum(pad2(mm));
      row.innerHTML = '<span class="lbl"><span class="st"></span>'+slot.icon+' '+slot.label+'</span><b>'+timeStr+(done?' ✓':'')+'</b>';
      el.slotList.appendChild(row);
    });
  }

  function renderNextSlot(){
    const now = new Date();
    const upcoming = slotsToday.filter(s => !isFired(s.id) && s.time > now).sort((a,b)=>a.time-b.time)[0];
    if (upcoming){
      const hh = pad2(upcoming.time.getHours()), mm = pad2(upcoming.time.getMinutes());
      el.nextSlot.textContent = '⏳ التنبيه القادم: ' + upcoming.label + ' — الساعة ' + toArabicNum(hh)+':'+toArabicNum(mm);
    } else {
      const dueNow = slotsToday.filter(s => !isFired(s.id) && s.time <= now)[0];
      el.nextSlot.textContent = dueNow ? '🔔 حان وقت: ' + dueNow.label : '✅ أتممت كل تنبيهات اليوم — بارك الله فيك';
    }
  }

  /* ================= Dashboard rendering ================= */
  function renderDashboard(){
    if (!state.quranReady || !currentChunk) return;
    const cur = currentChunk;

    // Hero title stays fixed and generic (set in HTML) — no per-level word count.

    // 30 beads representing the 30 Juz' of the Quran.
    el.juzRow.innerHTML = '';
    for (let j = 1; j <= 30; j++){
      const b = document.createElement('div');
      const cls = j < cur.juz ? ' filled' : (j === cur.juz ? ' current' : '');
      b.className = 'bead' + cls;
      b.title = 'الجزء ' + toArabicNum(j);
      el.juzRow.appendChild(b);
    }

    el.metaSession.textContent = cur.surah + ' (' + toArabicNum(cur.range) + ')';
    const pct = computeProgressPercent();
    el.metaPct.textContent = toArabicNum(pct) + '٪';
    el.progressCaption.textContent = 'الجزء ' + toArabicNum(cur.juz) + ' من ٣٠ — الختمة رقم ' + toArabicNum(state.khatmahCount+1) + ' — الدرجة: ' + getLevel().label;
    el.khatmahBadge.textContent = '📖 الختمة رقم ' + toArabicNum(state.khatmahCount + 1);

    persistCore();
  }

  /* ================= Overlay: focus trap ================= */
  function getFocusable(){
    return Array.from(el.overlay.querySelectorAll('button, [tabindex]:not([tabindex="-1"])'))
      .filter(n => n.offsetParent !== null);
  }
  function trapFocus(e){
    if (e.key !== 'Tab') return;
    const f = getFocusable();
    if (!f.length) return;
    const first = f[0], last = f[f.length-1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }

  /* ================= Overlay: Quran mode ================= */
  function openQuranOverlay(manual, niyyahText, slotId){
    if (!state.quranReady || !currentChunk){ showToast('لسّا المصحف يتحمّل، جرّب بعد لحظة 🌱'); return; }
    state.activeMode = 'quran';
    state.activeSlot = manual ? null : (slotId || null);
    const s = currentChunk;

    el.overlayBadge.textContent = '📖 تذكير القرآن — رحلة الختمة';
    el.overlayHeading.textContent = niyyahLines[Math.floor(Math.random()*niyyahLines.length)];
    if (niyyahText){ el.niyyahCustom.style.display = ''; el.niyyahCustom.textContent = niyyahText; }
    else { el.niyyahCustom.style.display = 'none'; }
    el.lockNote.textContent = manual ? '⏸ توقّف لحظة — هذا التذكير لا يُغلق إلا بإتمام العبادة' : '⏸ حان موعد تذكيرك — لا يُغلق إلا بإتمام العبادة';

    el.verseCard.style.display = '';
    el.dhikrCard.style.display = 'none';

    el.surahLabel.textContent = s.surah;
    el.bismillahLine.style.display = s.bismillah ? '' : 'none';
    const rangeParts = s.range.split(' - ');
    el.ayahRangeLabel.textContent = rangeParts.length === 2
      ? toArabicNum(rangeParts[0]) + ' - ' + toArabicNum(rangeParts[1])
      : toArabicNum(rangeParts[0]);
    el.ayahList.innerHTML = s.ayat.map(a => '<div>'+a.t+' <span class="num">'+toArabicNum(a.n)+'</span></div>').join('');

    el.evidenceList.innerHTML = quranEvidence.map(t => '<li>'+t+'</li>').join('');

    el.btnComplete.disabled = false;
    el.completeHint.textContent = 'اقرأ الآيات كاملة، ثم اضغط الزر لإغلاق التذكير';

    showOverlay();
  }

  // Resolves which dhikr text/target is active right now — the single source
  // of truth used by both the overlay render and the tap handler, so they
  // can never disagree (e.g. after a mid-session level change).
  function currentDhikrDef(){
    if (state.activeMode === 'tahlil'){
      return Object.assign({}, tahlilSpecial, { target: getLevel().tahlilTarget });
    }
    return dhikrs[state.dhikrIndex % dhikrs.length];
  }

  /* ================= Overlay: Dhikr / Tahlil mode ================= */
  function openDhikrOverlay(manual, slotId, isTahlil, niyyahText){
    state.activeMode = isTahlil ? 'tahlil' : 'dhikr';
    state.activeSlot = manual ? null : slotId;
    state.tapCount = 0;
    const d = currentDhikrDef();

    el.overlayBadge.textContent = isTahlil ? '🌙 تذكير آخر الليل — الوتر والنوم' : '📿 تذكير الأذكار — أقل من دقيقة';
    el.overlayHeading.textContent = 'استحضر نيّتك: اجعل هذا الذكر خالصًا لوجه الله، لا مجرد عادة على اللسان';
    if (niyyahText){ el.niyyahCustom.style.display = ''; el.niyyahCustom.textContent = niyyahText; }
    else { el.niyyahCustom.style.display = 'none'; }
    el.lockNote.textContent = manual ? '⏸ توقّف لحظة — هذا التذكير لا يُغلق إلا بإتمام العبادة' : '⏸ حان موعد تذكيرك — لا يُغلق إلا بإتمام العبادة';

    el.verseCard.style.display = 'none';
    el.dhikrCard.style.display = '';

    el.dhikrText.textContent = d.text;
    el.dhikrMeaning.textContent = d.meaning;
    el.targetCount.textContent = toArabicNum(d.target);
    updateRing(d.target);

    el.evidenceList.innerHTML = d.evidence.map(t => '<li>'+t+'</li>').join('');

    el.btnComplete.disabled = true;
    el.completeHint.textContent = 'اضغط على الذكر ' + toArabicNum(d.target) + ' مرة لتفعيل زر الإتمام';

    showOverlay();
  }

  function updateRing(target){
    const pct = Math.min(100, Math.round((state.tapCount / target) * 100));
    el.countRing.style.setProperty('--pct', pct);
    el.countNum.textContent = toArabicNum(state.tapCount);
  }

  function tapDhikr(){
    if (state.activeMode !== 'dhikr' && state.activeMode !== 'tahlil') return;
    const d = currentDhikrDef();
    if (state.tapCount < d.target){
      state.tapCount++;
      updateRing(d.target);
      if ('vibrate' in navigator){ try{ navigator.vibrate(12); }catch(e){} }
    }
    if (state.tapCount >= d.target){
      el.btnComplete.disabled = false;
      el.completeHint.textContent = 'أحسنت! يمكنك الآن إتمام العبادة';
    }
  }
  el.dhikrCard.addEventListener('click', tapDhikr);
  el.dhikrCard.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter'){ e.preventDefault(); tapDhikr(); }
  });

  /* ================= Overlay show/hide ================= */
  function showOverlay(){
    state.lastFocusedEl = document.activeElement;
    el.overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', trapFocus);
    el.btnComplete.focus();
  }
  function hideOverlay(){
    el.overlay.classList.remove('show');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', trapFocus);
    if (state.lastFocusedEl && state.lastFocusedEl.focus) state.lastFocusedEl.focus();
    advanceMissedQueue();
  }

  el.btnComplete.addEventListener('click', function(){
    if (el.btnComplete.disabled) return;

    if (state.activeMode === 'quran'){
      const wrapped = advanceReadingPosition();
      if (wrapped){
        showToast('🎉 ما شاء الله! أتممت ختمة جديدة — الختمة رقم ' + toArabicNum(state.khatmahCount + 1) + ' بدأت الآن');
      } else {
        showToast('✅ تقبّل الله — انتقلت إلى الجلسة التالية من رحلتك مع القرآن');
      }
      renderDashboard();
    } else if (state.activeMode === 'dhikr'){
      state.dhikrIndex++;
      persistCore();
      showToast('✅ تقبّل الله ذكرك، جعله الله في ميزان حسناتك');
    } else {
      showToast('🌙 تقبّل الله، أوتر ونم على ذكر الله');
    }

    if (state.activeSlot){
      markFired(state.activeSlot);
      renderSlotList();
      renderNextSlot();
    }

    hideOverlay();
  });

  /* Intentionally: no backdrop-click-to-close, no Escape handler, no X button —
     the overlay can only be dismissed via the completion button, per spec. */

  function openOverlayForSlot(slot){
    if (slot.mode === 'quran') openQuranOverlay(false, slot.niyyah, slot.id);
    else if (slot.mode === 'tahlil') openDhikrOverlay(false, slot.id, true, slot.niyyah);
    else openDhikrOverlay(false, slot.id, false, slot.niyyah);
  }

  /* ================= Dashboard button wiring ================= */
  document.getElementById('btnSimulateQuran').addEventListener('click', () => openQuranOverlay(true));
  document.getElementById('btnQuranCard').addEventListener('click', () => openQuranOverlay(true));
  document.getElementById('btnSimulateDhikr').addEventListener('click', () => openDhikrOverlay(true, null, false, null));
  document.getElementById('btnDhikrCard').addEventListener('click', () => openDhikrOverlay(true, null, false, null));

  /* ================= Settings modal (manual city override) ================= */
  el.cityBadge.addEventListener('click', () => {
    const pref = getLocationPref();
    if (pref && pref.mode === 'manual'){ el.cityInput.value = pref.city; el.countryInput.value = pref.country; }
    el.modalBackdrop.classList.add('show');
    el.cityInput.focus();
  });
  el.modalCancel.addEventListener('click', () => el.modalBackdrop.classList.remove('show'));
  el.modalBackdrop.addEventListener('click', (e) => { if (e.target === el.modalBackdrop) el.modalBackdrop.classList.remove('show'); });
  el.modalSave.addEventListener('click', () => {
    const city = el.cityInput.value.trim() || 'Riyadh';
    const country = el.countryInput.value.trim() || 'Saudi Arabia';
    setLocationPref({ mode:'manual', city, country });
    el.cityLabel.textContent = cityDisplayName(city);
    el.modalBackdrop.classList.remove('show');
    // Cache keys are now scoped per-city, so the new manual city just gets
    // its own fresh entry — nothing stale to clean up here.
    initSchedule();
    showToast('✅ تم تحديث موقعك ومواعيد اليوم');
  });

  /* ================= Settings modal (commitment level) ================= */
  el.levelLabel.textContent = getLevel().label;

  function renderLevelOptions(){
    el.levelOptions.innerHTML = '';
    Object.values(LEVELS).forEach(lv => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-option' + (lv.id === state.level ? ' active' : '');
      btn.innerHTML = '<span class="lv-title">'+lv.label+(lv.id===state.level?' ✓':'')+'</span><span class="lv-desc">'+lv.desc+'</span>';
      btn.addEventListener('click', () => selectLevel(lv.id));
      el.levelOptions.appendChild(btn);
    });
  }

  function selectLevel(levelId){
    if (state.level === levelId){ el.levelModalBackdrop.classList.remove('show'); return; }
    state.level = levelId;
    persistCore();
    el.levelLabel.textContent = getLevel().label;
    el.levelModalBackdrop.classList.remove('show');
    if (state.quranReady) refreshCurrentChunk();
    renderDashboard();
    // Slot list/ids change with the level — recompute today's schedule under
    // the new list (reuses today's already-cached prayer timings if present).
    initSchedule();
    showToast('✅ تم التحويل لدرجة «' + getLevel().label + '»');
  }

  el.levelBadge.addEventListener('click', () => { renderLevelOptions(); el.levelModalBackdrop.classList.add('show'); });
  el.levelModalCancel.addEventListener('click', () => el.levelModalBackdrop.classList.remove('show'));
  el.levelModalBackdrop.addEventListener('click', (e) => { if (e.target === el.levelModalBackdrop) el.levelModalBackdrop.classList.remove('show'); });

  /* ================= Init ================= */
  function initSchedule(){
    el.nextSlot.textContent = '⏳ يحسب مواعيد التنبيهات…';
    resolveLocationAndTimings().then(timings => {
      scheduleToday(timings);
    }).catch(() => {
      el.nextSlot.textContent = 'تعذّر حساب مواعيد الصلاة — تحقق من الاتصال أو اضبط المدينة يدويًا 📍';
    });
  }

  // Recompute at local midnight so a new day's slots/timings kick in.
  function scheduleMidnightRefresh(){
    const now = new Date();
    const next = new Date(now); next.setHours(24,0,5,0);
    setTimeout(() => { initSchedule(); scheduleMidnightRefresh(); }, next.getTime()-now.getTime());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') renderSlotList(), renderNextSlot();
  });

  // Marks a Quran slot done directly (no overlay) — used by the notification's
  // "قرأتها" action. Only offered for Quran because, same as the in-app
  // button, nothing there was gated behind a tap-counter to begin with;
  // dhikr/tahlil never get this shortcut since their counter must be honored.
  function autoCompleteQuranSlot(slotId){
    const slot = slotsToday.find(s => s.id === slotId);
    if (!slot || slot.mode !== 'quran' || isFired(slot.id)) return;
    if (!state.quranReady || !currentChunk){ showToast('لسّا المصحف يتحمّل، افتح التطبيق لإتمامها 🌱'); return; }
    const wrapped = advanceReadingPosition();
    if (wrapped){
      showToast('🎉 ما شاء الله! أتممت ختمة جديدة رقم ' + toArabicNum(state.khatmahCount + 1));
    } else {
      showToast('✅ تقبّل الله — انتقلت للجلسة التالية من رحلتك مع القرآن');
    }
    renderDashboard();
    markFired(slot.id);
    renderSlotList();
    renderNextSlot();
  }

  // Handle ?slot=..&autocomplete=1 when the SW had to open a brand-new window
  // (no existing tab was open) after a notification-action tap.
  const urlParams = new URLSearchParams(location.search);
  const pendingSlotAction = urlParams.get('slot')
    ? { slot: urlParams.get('slot'), autocomplete: urlParams.get('autocomplete') === '1' }
    : null;
  if (pendingSlotAction) history.replaceState(null, '', location.pathname);

  function applyPendingSlotAction(){
    if (!pendingSlotAction) return;
    const slot = slotsToday.find(s => s.id === pendingSlotAction.slot);
    if (!slot || isFired(slot.id)) return;
    if (pendingSlotAction.autocomplete) autoCompleteQuranSlot(slot.id);
    else openOverlayForSlot(slot);
  }

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js?v=8').catch(() => {});
    navigator.serviceWorker.addEventListener('message', (e) => {
      const data = e.data || {};
      if (data.type === 'OPEN_SLOT'){
        const slot = slotsToday.find(s => s.id === data.slot);
        if (slot && !isFired(slot.id)) openOverlayForSlot(slot);
      } else if (data.type === 'AUTO_COMPLETE_SLOT'){
        autoCompleteQuranSlot(data.slot);
      }
    });
  }
  if ('Notification' in window && Notification.permission === 'default'){
    // Ask once, quietly, without blocking initial render.
    setTimeout(() => { try{ Notification.requestPermission(); }catch(e){} }, 3000);
  }

  fetchQuran();
  initSchedule();
  scheduleMidnightRefresh();
})();
