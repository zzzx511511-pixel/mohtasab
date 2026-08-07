(function(){
  "use strict";

  /* ================= Utilities ================= */
  const arabicDigits = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  function toArabicNum(n){ return String(n).split('').map(d => arabicDigits[Number(d)] ?? d).join(''); }
  function pad2(n){ return String(n).padStart(2,'0'); }
  // 12-hour display (ص/م) instead of 24-hour, in Arabic-Indic digits — used
  // everywhere a computed slot/prayer time is shown to the user.
  function formatTime12(hour24, minute){
    const period = hour24 < 12 ? 'ص' : 'م';
    const h12 = hour24 % 12 || 12;
    return toArabicNum(h12) + ':' + toArabicNum(pad2(minute)) + ' ' + period;
  }
  function formatAladhanTime12(hm){
    const cleaned = (hm || '').replace(/\s*\(.*\)/, '');
    const [h, m] = cleaned.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return cleaned;
    return formatTime12(h, m);
  }
  function todayKey(d){ d = d || new Date(); return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()); }

  // Hijri + Gregorian date badge — Intl.DateTimeFormat's built-in Islamic
  // calendar support, no external API call needed.
  let dateBadgeShownFor = null;
  function renderDateBadge(){
    if (!el.dateBadge) return;
    const key = todayKey();
    if (dateBadgeShownFor === key) return;
    dateBadgeShownFor = key;
    const now = new Date();
    try{
      const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { weekday:'long', day:'numeric', month:'long', year:'numeric', era:'short' }).format(now);
      // 'ar-SA' alone isn't reliably Gregorian — some engines default the
      // Saudi locale to the Islamic calendar too, so force it explicitly.
      const gregorian = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day:'numeric', month:'long', year:'numeric', era:'short' }).format(now);
      el.dateBadge.textContent = hijri + ' | ' + gregorian;
    }catch(e){ /* unsupported locale/calendar in this browser — leave the badge empty rather than show something wrong */ }
  }
  function safeGet(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
  function safeSet(key,val){ try{ localStorage.setItem(key,val); return true; }catch(e){ return false; } }

  function showToast(msg){
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.toast.classList.remove('show'), 2800);
  }

  // onTap runs when the banner body (not the ✕) is tapped, or null for
  // "just show the content, no navigation" — used by occasion reminders
  // (see OCCASION_REMINDERS below), which show their own text/evidence
  // directly instead of pointing elsewhere like the daily-benefit banner does.
  let bannerTapAction = null;
  function showBanner(title, text, onTap){
    el.bannerText.innerHTML = '<b>'+title+'</b>'+text;
    el.banner.classList.add('show');
    bannerTapAction = onTap || null;
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
    dateBadge: document.getElementById('dateBadge'),
    cityBadge: document.getElementById('cityBadge'),
    cityLabel: document.getElementById('cityLabel'),
    nextSlot: document.getElementById('nextSlot'),
    notifyBanner: document.getElementById('notifyBanner'),
    notifyBannerText: document.getElementById('notifyBannerText'),
    btnEnableNotifications: document.getElementById('btnEnableNotifications'),
    slotList: document.getElementById('slotList'),
    prayerTimesList: document.getElementById('prayerTimesList'),
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
    levelModalCancel: document.getElementById('levelModalCancel'),
    dailyBenefitBox: document.getElementById('dailyBenefitBox'),
    dailyBenefitBody: document.getElementById('dailyBenefitBody'),
    btnContactUs: document.getElementById('btnContactUs'),
    contactModalBackdrop: document.getElementById('contactModalBackdrop'),
    contactName: document.getElementById('contactName'),
    contactEmail: document.getElementById('contactEmail'),
    contactMessage: document.getElementById('contactMessage'),
    contactModalNote: document.getElementById('contactModalNote'),
    contactModalCancel: document.getElementById('contactModalCancel'),
    contactModalSend: document.getElementById('contactModalSend')
  };

  el.bannerClose.addEventListener('click', (e) => { e.stopPropagation(); el.banner.classList.remove('show'); });
  el.banner.addEventListener('click', () => {
    el.banner.classList.remove('show');
    if (bannerTapAction) bannerTapAction();
  });

  /* ================= Fixed content: dhikr (spec-compliant caps) ================= */
  // Every evidence line was checked against the primary hadith/tafsir
  // encyclopedias (dorar.net, sunnah.com, hadeethenc.com) before being
  // added — exact wording, narrator, and book/number. Nothing here is
  // paraphrased scholarly opinion without a citable reference.

  // Extra reference shown alongside salawat's own evidence specifically when
  // it's the Friday "قبل العصر" override (see currentDhikrDef below) — never
  // replaces the normal salawat evidence, only appended to it that one day.
  const FRIDAY_SALAWAT_EVIDENCE =
    "«إن من أفضل أيامكم يوم الجمعة، فيه خُلق آدم، وفيه قُبض، وفيه النفخة، وفيه الصعقة، فأكثروا عليّ من الصلاة فيه، فإن صلاتكم معروضة عليّ» — صحيح: رواه أبو داود (١٠٤٧) والنسائي (١٣٧٤) وابن ماجه (١٦٣٦)، وصححه الألباني.";

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
      id:'salawat',
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

  /* ================= Daily benefit pools (hadith / tafsir / athar) ================= */
  // "فائدة اليوم" (today's benefit) — one item, fixed for the whole calendar
  // day regardless of how many times the app is opened or how many light
  // notifications fire. Sat–Thu alternates hadith/tafsir from large fetched
  // pools; Friday draws from the small manual athar/companion-stories pool.

  const HADITH_CACHE_KEY = 'mohtasab_hadith_v1';
  const TAFSIR_CACHE_KEY = 'mohtasab_tafsir_v1';
  const HADITH_MAX_WORDS = 40; // keeps entries short enough to read in one glance

  let hadithPool = null; // [{ text, number }] — filled in from cache and/or network
  let tafsirPool = null; // [{ surah, surahName, ayah, text }]

  function loadCachedPool(key){
    try{ return JSON.parse(safeGet(key) || 'null'); }catch(e){ return null; }
  }

  function fetchHadithPool(){
    const cached = loadCachedPool(HADITH_CACHE_KEY);
    if (cached){ hadithPool = cached; renderDailyBenefit(); }
    if (!navigator.onLine && cached) return;

    fetch('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-bukhari.min.json')
      .then(r => r.json())
      .then(json => {
        const raw = (json && json.hadiths) || [];
        const filtered = raw
          .filter(h => h && h.text && h.text.trim().split(/\s+/).length <= HADITH_MAX_WORDS)
          .map(h => ({ text: h.text.trim(), number: h.hadithnumber }));
        if (!filtered.length) return; // malformed/empty response — keep whatever cache we had
        hadithPool = filtered;
        safeSet(HADITH_CACHE_KEY, JSON.stringify(filtered));
        renderDailyBenefit();
      })
      .catch(() => {});
  }

  function fetchTafsirPool(){
    const cached = loadCachedPool(TAFSIR_CACHE_KEY);
    if (cached){ tafsirPool = cached; renderDailyBenefit(); }
    if (!navigator.onLine && cached) return;

    fetch('https://api.alquran.cloud/v1/quran/ar.muyassar')
      .then(r => r.json())
      .then(json => {
        const surahs = (json && json.data && json.data.surahs) || [];
        const flat = [];
        surahs.forEach(s => {
          (s.ayahs || []).forEach(a => {
            flat.push({ surah: s.number, surahName: s.name, ayah: a.numberInSurah, text: a.text });
          });
        });
        if (!flat.length) return;
        tafsirPool = flat;
        safeSet(TAFSIR_CACHE_KEY, JSON.stringify(flat));
        renderDailyBenefit();
      })
      .catch(() => {});
  }

  // Manual athar/companion-stories pool — Friday only. Source: موسوعة الأخلاق
  // والسلوك، الدرر السنية (dorar.net); each entry traces to its own classical
  // reference the same way every other quote in the app does.
  //
  // ⚠️ Only the ابن تيمية entry is verified (carried over from the app's
  // previous knowledgeSnippets array). The other 8 are placeholders — see
  // chat: the real checked text + reference for each is still needed before
  // this pool is genuinely ready for Fridays.
  const atharPool = [
    {label:'من أثر السلف', text:'قال شيخ الإسلام ابن تيمية رحمه الله: «القلب لا يصلح ولا يفلح ولا يسكن ولا يطمئن إلا بعبادة ربه وحبه والإنابة إليه»', source:'مجموع الفتاوى (١٠/١٩٤)'},
    {label:'من أثر السلف', text:'⚠️ يحتاج نصًا موثّقًا من الدرر السنية عن ابن القيم رحمه الله', source:'⚠️ بانتظار المصدر الدقيق'},
    {label:'من أثر السلف', text:'⚠️ يحتاج نصًا موثّقًا من الدرر السنية عن الحسن البصري رحمه الله', source:'⚠️ بانتظار المصدر الدقيق'},
    {label:'من أثر الصحابة', text:'⚠️ يحتاج نصًا موثّقًا من الدرر السنية عن عمر بن الخطاب رضي الله عنه', source:'⚠️ بانتظار المصدر الدقيق'},
    {label:'من أثر الصحابة', text:'⚠️ يحتاج نصًا موثّقًا آخر من الدرر السنية عن عمر بن الخطاب رضي الله عنه', source:'⚠️ بانتظار المصدر الدقيق'},
    {label:'من أثر السلف', text:'⚠️ يحتاج نصًا موثّقًا من الدرر السنية عن الإمام مالك رحمه الله', source:'⚠️ بانتظار المصدر الدقيق'},
    {label:'من أثر الصحابة', text:'⚠️ يحتاج نصًا موثّقًا من الدرر السنية عن عمرو بن العاص رضي الله عنه', source:'⚠️ بانتظار المصدر الدقيق'},
    {label:'من أثر السلف', text:'⚠️ يحتاج نصًا موثّقًا من الدرر السنية عن عمر بن عبد العزيز رحمه الله', source:'⚠️ بانتظار المصدر الدقيق'},
    {label:'من أثر الصحابة', text:'⚠️ يحتاج نصًا موثّقًا من الدرر السنية عن حكيم بن حزام رضي الله عنه', source:'⚠️ بانتظار المصدر الدقيق'}
  ];

  const DAILY_BENEFIT_KEY = 'mohtasab_daily_benefit';

  function rotate(idxKey, poolLen){
    const cur = Number(safeGet(idxKey) || 0) % poolLen;
    safeSet(idxKey, (cur + 1) % poolLen);
    return cur;
  }

  // Chooses today's source + item, advancing the relevant no-repeat cursor(s)
  // — but only once we're sure we actually have a pool ready to pick from,
  // so a pool that's still loading can't corrupt the hadith/tafsir ping-pong.
  function pickDailyBenefit(){
    if (new Date().getDay() === 5){ // Friday
      const i = rotate('mohtasab_athar_idx', atharPool.length);
      return { source:'athar', item: atharPool[i] };
    }

    const preferred = Number(safeGet('mohtasab_altsource_idx') || 0) === 0 ? 'hadith' : 'tafsir';
    const pools = { hadith: hadithPool, tafsir: tafsirPool };
    const other = preferred === 'hadith' ? 'tafsir' : 'hadith';

    let source = null;
    if (pools[preferred] && pools[preferred].length) source = preferred;
    else if (pools[other] && pools[other].length) source = other;
    if (!source) return null; // neither pool loaded yet this session

    const altCur = Number(safeGet('mohtasab_altsource_idx') || 0);
    safeSet('mohtasab_altsource_idx', altCur === 0 ? 1 : 0);
    const idxKey = source === 'hadith' ? 'mohtasab_hadith_idx' : 'mohtasab_tafsir_idx';
    const i = rotate(idxKey, pools[source].length);
    return { source, item: pools[source][i] };
  }

  function getDailyBenefit(){
    const today = todayKey();
    let stored = null;
    try{ stored = JSON.parse(safeGet(DAILY_BENEFIT_KEY) || 'null'); }catch(e){}

    if (stored && stored.date === today){
      if (stored.source === 'athar') return { source:'athar', item: atharPool[stored.poolIndex] };
      if (stored.source === 'hadith' && hadithPool && hadithPool[stored.poolIndex] !== undefined){
        return { source:'hadith', item: hadithPool[stored.poolIndex] };
      }
      if (stored.source === 'tafsir' && tafsirPool && tafsirPool[stored.poolIndex] !== undefined){
        return { source:'tafsir', item: tafsirPool[stored.poolIndex] };
      }
      return null; // today's source already decided, just not loaded in this session yet
    }

    const picked = pickDailyBenefit();
    if (!picked) return null;
    const poolIndex = picked.source === 'athar' ? atharPool.indexOf(picked.item)
      : picked.source === 'hadith' ? hadithPool.indexOf(picked.item)
      : tafsirPool.indexOf(picked.item);
    safeSet(DAILY_BENEFIT_KEY, JSON.stringify({ date: today, source: picked.source, poolIndex }));
    return picked;
  }

  function renderDailyBenefit(){
    if (!el.dailyBenefitBody) return;
    const benefit = getDailyBenefit();
    if (!benefit){
      el.dailyBenefitBody.innerHTML = '<p class="sources-note">جاري تحميل قاعدة الفوائد اليومية… (يحتاج اتصالًا بالإنترنت أول مرة فقط)</p>';
      return;
    }
    const { source, item } = benefit;
    let labelLine, bodyText, sourceLine;
    if (source === 'hadith'){
      labelLine = '📕 حديث نبوي';
      bodyText = '«' + item.text + '»';
      sourceLine = 'صحيح البخاري — الحديث رقم ' + toArabicNum(item.number);
    } else if (source === 'tafsir'){
      labelLine = '📖 تفسير ميسّر';
      bodyText = item.text;
      sourceLine = 'التفسير الميسّر — مجمع الملك فهد لطباعة المصحف الشريف — ' + item.surahName + ' (' + toArabicNum(item.ayah) + ')';
    } else {
      labelLine = '🕊️ ' + (item.label || 'من أثر السلف والصحابة');
      bodyText = item.text;
      sourceLine = 'موسوعة الأخلاق والسلوك — الدرر السنية (dorar.net)' + (item.source ? ' — ' + item.source : '');
    }
    el.dailyBenefitBody.innerHTML =
      '<p class="sources-note"><b>' + labelLine + '</b></p>' +
      '<p class="benefit-text">' + bodyText + '</p>' +
      '<p class="sources-note">' + sourceLine + '</p>';
  }

  function openDailyBenefitSection(){
    if (!el.dailyBenefitBox) return;
    el.dailyBenefitBox.setAttribute('open', '');
    el.dailyBenefitBox.scrollIntoView({ behavior:'smooth', block:'start' });
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

  // Static id -> definition lookup, independent of any computed schedule.
  // Opening the reminder overlay only ever needs mode/label/niyyah/id (never
  // the computed .time), so a notification tap can open it immediately from
  // this instead of waiting on slotsToday (which needs location + Aladhan +
  // FCM init to resolve first) — see applyPendingSlotAction below.
  const ALL_SLOTS_BY_ID = {
    fajr: SLOT_FAJR, duha: SLOT_DUHA, dhuhr: SLOT_DHUHR, asr: SLOT_ASR,
    maghrib: SLOT_MAGHRIB, isha: SLOT_ISHA, night: SLOT_NIGHT
  };

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
    console.log('[مُحتسب:موقع] طلب موقع GPS حي جديد (navigator.geolocation.getCurrentPosition, maximumAge:0)…');
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation){
        console.log('[مُحتسب:موقع] navigator.geolocation غير متاح بهذا المتصفح/السياق.');
        reject(new Error('no-geo')); return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          console.log('[مُحتسب:موقع] نجح الجلب — إحداثيات جديدة:', loc, '— دقة القياس:', Math.round(pos.coords.accuracy), 'م');
          resolve(loc);
        },
        (err) => {
          console.log('[مُحتسب:موقع] فشل الجلب — كود الخطأ:', err.code, '(1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT) — رسالة:', err.message);
          reject(err);
        },
        { timeout: 8000, maximumAge: 0 } // maximumAge:0 forces a live fix, not a cached OS one
      );
    });
  }

  // Mirrors whichever location resolveLocationAndTimings() just actually
  // used, so saveUserProfile() (below) can hand the server the same
  // just-fetched fix instead of triggering its own separate GPS request.
  let lastResolvedLocation = null;

  function resolveLocationAndTimings(){
    const pref = getLocationPref();

    if (pref && pref.mode === 'manual'){
      console.log('[مُحتسب:موقع] وضع المدينة اليدوية مفعّل («' + pref.city + '») — لن يُطلب GPS إطلاقًا، ولن يتحدث تلقائيًا (بالتصميم).');
      lastResolvedLocation = { mode:'city', city: pref.city, country: pref.country };
      const cacheKey = 'mohtasab_timings_'+todayKey()+'_manual_'+pref.city;
      const cached = safeGet(cacheKey);
      if (cached){ try{ return Promise.resolve(JSON.parse(cached)); }catch(e){} }
      el.cityLabel.textContent = cityDisplayName(pref.city);
      return fetchTimingsByCity(pref.city, pref.country)
        .then(t => { safeSet(cacheKey, JSON.stringify(t)); return t; });
    }

    // auto mode: always ask the device for a live position first — this is
    // what makes travelling to a different city get picked up automatically,
    // since a stale/cached fix is never reused (maximumAge:0 in getFreshPosition).
    console.log('[مُحتسب:موقع] وضع الموقع التلقائي — بدء التحقق من الموقع الفعلي للجهاز.');
    let prevFix = null;
    try{ prevFix = JSON.parse(safeGet(LAST_FIX_KEY) || 'null'); }catch(e){}

    return getFreshPosition()
      .then(loc => {
        const moved = !prevFix || coordKey(loc.lat, loc.lon) !== coordKey(prevFix.lat, prevFix.lon);
        console.log('[مُحتسب:موقع] المحفوظ سابقًا:', prevFix, '— الجديد الآن:', loc, moved ? '⚠️ تغيّر الموقع' : '(نفس الموقع تقريبًا)');
        lastResolvedLocation = { mode:'coords', lat: loc.lat, lon: loc.lon };
        safeSet(LAST_FIX_KEY, JSON.stringify(loc)); // fallback for next failure only
        el.cityLabel.textContent = 'موقعك الحالي';
        const cacheKey = 'mohtasab_timings_'+todayKey()+'_'+coordKey(loc.lat, loc.lon);
        const cached = safeGet(cacheKey);
        if (cached){
          console.log('[مُحتسب:موقع] مواقيت هذا الموقع لهذا اليوم موجودة بالكاش المحلي — لن يُستدعى Aladhan API مرة ثانية (نفس الموقع، لا حاجة).');
          try{ return Promise.resolve(JSON.parse(cached)); }catch(e){}
        }
        console.log('[مُحتسب:موقع] استدعاء Aladhan API فعليًا بالإحداثيات الجديدة…');
        return fetchTimingsByCoords(loc.lat, loc.lon)
          .then(t => { safeSet(cacheKey, JSON.stringify(t)); return t; });
      })
      .catch((err) => {
        // Live GPS failed this time (denied, no signal, offline) — try the
        // last known fix before giving up to Riyadh, but keep mode:'auto' so
        // we try live GPS again on the next open instead of freezing on Riyadh.
        console.log('[مُحتسب:موقع] تعذّر جلب موقع حي (', err && err.message, ') — الانتقال لآخر موقع محفوظ كخطة بديلة لهذه المرة فقط.');
        let lastFix = null;
        try{ lastFix = JSON.parse(safeGet(LAST_FIX_KEY) || 'null'); }catch(e){}
        if (lastFix){
          lastResolvedLocation = { mode:'coords', lat: lastFix.lat, lon: lastFix.lon };
          el.cityLabel.textContent = 'آخر موقع معروف';
          return fetchTimingsByCoords(lastFix.lat, lastFix.lon);
        }
        lastResolvedLocation = { mode:'city', city:'Riyadh', country:'Saudi Arabia' };
        el.cityLabel.textContent = 'الرياض (تقديري)';
        return fetchTimingsByCity('Riyadh', 'Saudi Arabia');
      });
  }

  /* ================= Firebase Cloud Messaging (server-sent push) ================= */
  // Real push delivered by a scheduled Cloud Function (functions/index.js),
  // so reminders arrive even if the phone has been locked/closed for hours —
  // something no web page's own setTimeout can do. The existing local
  // scheduling (below) stays wired up as-is for the foreground overlay UI,
  // and is used for BACKGROUND notifications too, but only as a fallback if
  // FCM registration doesn't succeed (see the `fcmActive` guard in triggerSlot).
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyDY788zoCkbK5lsby6lHD54LnQ7SUm9eV0',
    authDomain: 'mohtasab.firebaseapp.com',
    projectId: 'mohtasab',
    storageBucket: 'mohtasab.appspot.com',
    // Firebase Console → ⚙️ Project settings → General → Your apps → Web app
    // → "SDK setup and configuration" — paste the two values from there.
    messagingSenderId: '351787865386',
    appId: '1:351787865386:web:912acb127d0756cff03a53'
  };
  const FCM_VAPID_KEY = 'BKxe3VIufbh06hqT9wvzmEQyNNpnpXkUmnM4PQIU8ziNnzau38Jw6E71HnnFfRQKTW_Tb1Rpe2KG_tn4hGVdlA4';

  let fcmActive = false;
  let fcmUid = null;
  let fcmToken = null;

  // Best-known location to hand the server, since it has no GPS of its own.
  // Reuses whatever resolveLocationAndTimings() (called via initSchedule())
  // just resolved — normally always set, since that runs first on every app
  // open and every daily midnight refresh. The independent fetch below is
  // only a defensive fallback for the unlikely case this gets called first.
  function computeProfileLocation(){
    if (lastResolvedLocation) return Promise.resolve(lastResolvedLocation);
    const pref = getLocationPref();
    if (pref && pref.mode === 'manual'){
      return Promise.resolve({ mode:'city', city: pref.city, country: pref.country });
    }
    return getFreshPosition()
      .then(loc => ({ mode:'coords', lat: loc.lat, lon: loc.lon }))
      .catch(() => {
        let lastFix = null;
        try{ lastFix = JSON.parse(safeGet(LAST_FIX_KEY) || 'null'); }catch(e){}
        if (lastFix) return { mode:'coords', lat: lastFix.lat, lon: lastFix.lon };
        return { mode:'city', city:'Riyadh', country:'Saudi Arabia' };
      });
  }

  function saveUserProfile(token){
    if (!fcmUid || typeof firebase === 'undefined') return Promise.resolve();
    return computeProfileLocation().then(location =>
      firebase.firestore().collection('users').doc(fcmUid).set({
        fcmToken: token,
        location,
        level: state.level,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge:true })
    ).catch(() => {});
  }

  // Re-sends the profile when the city or level changes, so the server acts
  // on current data — only meaningful once a token exists in the first place.
  function resyncProfileIfActive(){
    if (fcmActive && fcmToken) saveUserProfile(fcmToken);
  }

  // Mirrors markFired's own key in Firestore so the Cloud Function knows this
  // slot is already handled and skips sending a redundant push for it.
  function syncFiredToCloud(slotId){
    if (!fcmUid || typeof firebase === 'undefined') return;
    try{
      firebase.firestore().collection('users').doc(fcmUid)
        .collection('dailyState').doc(todayKey())
        .set({ firedSlots: { [slotId]: true } }, { merge:true })
        .catch(() => {});
    }catch(e){}
  }

  let fcmOnMessageWired = false;
  function applyFcmResult(token){
    fcmToken = token || null;
    fcmActive = !!token;
    if (fcmActive && !fcmOnMessageWired){
      fcmOnMessageWired = true;
      firebase.messaging().onMessage(payload => {
        if (el.overlay.classList.contains('show')) return; // never stack over an open reminder
        const n = payload.notification || {};
        if (n.title || n.body) showToast((n.title||'') + (n.body ? ' — ' + n.body : ''));
      });
    }
    return fcmActive;
  }

  // Registers the FCM token — call ONLY once Notification.permission is
  // already 'granted' (checked by every caller below). Safari/iOS silently
  // drops requestPermission() unless it's called directly inside a user
  // gesture handler, so nothing in here ever calls it itself.
  function activateFcm(){
    if (typeof firebase === 'undefined' || !('serviceWorker' in navigator)) return Promise.resolve(false);
    if (!firebase.messaging || !firebase.messaging.isSupported || !firebase.messaging.isSupported()) return Promise.resolve(false);

    const registration = firebase.auth().signInAnonymously()
      .then(cred => { fcmUid = cred.user.uid; return navigator.serviceWorker.ready; })
      .then(reg => firebase.messaging().getToken({ vapidKey: FCM_VAPID_KEY, serviceWorkerRegistration: reg }))
      .then(token => token ? saveUserProfile(token).then(() => token) : null)
      .catch(() => null);

    // Apply whatever the real result turns out to be whenever it actually
    // arrives — even after the timeout below has already resolved the
    // promise this function returns. Without this, a registration that's
    // just slow (not failed) would leave fcmActive stuck at false for the
    // rest of the session once the timeout "gives up" — which then makes
    // triggerSlot() ALSO fire the local fallback notification for every
    // reminder alongside the real FCM push that (unknown to the client) did
    // end up registering successfully, producing duplicate notifications.
    registration.then(applyFcmResult);

    const withTimeout = (p, ms) => Promise.race([p, new Promise(res => setTimeout(() => res(undefined), ms))]);
    return withTimeout(registration, 8000).then(token => token === undefined ? fcmActive : applyFcmResult(token));
  }

  // Reflects live Notification.permission — 'default' shows the enable
  // banner+button, 'denied' shows a quiet note (no button — browsers never
  // let you re-prompt, only the user's own device/browser settings can),
  // 'granted' (or unsupported) hides the banner entirely.
  function renderNotificationBanner(){
    if (!el.notifyBanner) return;
    const permission = ('Notification' in window) ? Notification.permission : 'unsupported';
    if (permission === 'granted' || permission === 'unsupported'){
      el.notifyBanner.style.display = 'none';
      return;
    }
    el.notifyBanner.style.display = 'flex';
    if (permission === 'denied'){
      el.notifyBanner.classList.add('denied');
      el.notifyBannerText.textContent = '🔕 الإشعارات معطّلة على هذا الجهاز — يمكنك تفعيلها لاحقًا من إعدادات المتصفح أو الجهاز.';
      el.btnEnableNotifications.style.display = 'none';
    } else {
      el.notifyBanner.classList.remove('denied');
      el.notifyBannerText.textContent = '🔔 فعّل الإشعارات عشان توصلك التذكيرات حتى لو التطبيق مقفول';
      el.btnEnableNotifications.style.display = '';
    }
  }

  el.btnEnableNotifications.addEventListener('click', () => {
    if (!('Notification' in window)) return;
    // Notification.requestPermission() called synchronously right here,
    // directly inside the click handler — no setTimeout/await before it —
    // is what makes this actually work on Safari/iOS.
    Notification.requestPermission().then(permission => {
      renderNotificationBanner();
      if (permission === 'granted') activateFcm().then(() => renderNotificationBanner());
    });
  });

  function initFirebaseMessaging(){
    // Initialize the Firebase app as soon as the SDK is present, independent
    // of notification permission — Firestore (used by the contact form) has
    // nothing to do with notifications and must keep working even for users
    // who deny them.
    if (typeof firebase !== 'undefined'){
      try{ firebase.initializeApp(FIREBASE_CONFIG); }catch(e){ /* already initialized */ }
    }
    renderNotificationBanner();

    // Only proceed automatically if permission was already granted in an
    // earlier visit — never request it here, that has to come from the
    // banner button's own click handler (a real user gesture).
    if (!('Notification' in window) || Notification.permission !== 'granted') return Promise.resolve(false);
    return activateFcm();
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

  // The 5 daily prayer times exactly as Aladhan returns them — shown in their
  // own card, separate from the offset reminder times below, so the user can
  // compare the real adhan time against the reminder and sanity-check their
  // location.
  const PRAYER_DISPLAY = [
    { key:'Fajr',    label:'الفجر' },
    { key:'Dhuhr',   label:'الظهر' },
    { key:'Asr',     label:'العصر' },
    { key:'Maghrib', label:'المغرب' },
    { key:'Isha',    label:'العشاء' }
  ];
  function renderPrayerTimesList(timings){
    if (!timings || !el.prayerTimesList) return;
    el.prayerTimesList.innerHTML = PRAYER_DISPLAY.map(p =>
      '<div class="slot-item"><b>' + p.label + '</b><span>' + formatAladhanTime12(timings[p.key]) + '</span></div>'
    ).join('');
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
  function markFired(slotId){ safeSet(firedKey(slotId), '1'); syncFiredToCloud(slotId); }

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
    renderPrayerTimesList(timings);
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
    scheduleOccasionReminders(timings);
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
    } else if (!fcmActive){
      // Backgrounded/closed catch-up — only the local fallback path's job.
      // When FCM is active the scheduled Cloud Function delivers this instead.
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
        // The notification itself never shows the actual content anymore —
        // just a fixed nudge; tapping it opens "فائدة اليوم" in the app,
        // which is where today's actual hadith/tafsir/athar is shown.
        if (document.visibilityState === 'visible'){
          showBanner('📖 اطّلع على فائدة اليوم', ' — اضغط لقراءتها', openDailyBenefitSection);
        } else {
          notifyBackground('📖 اطّلع على فائدة اليوم', 'اضغط لقراءتها', 'daily-benefit', false);
        }
      };
      if (delay <= 0) timers.push(setTimeout(fire, 600));
      else timers.push(setTimeout(fire, delay));
    });
  }

  // ================= Occasion reminders (extensible — Friday only so far) =================
  // Entirely separate from the 3/5/7 major reminders: their own timers only
  // (pushed into the same `timers` array purely so clearTimers() sweeps them
  // up too on reschedule — they never touch slotsToday/missedQueue/
  // firedSlots/notified), shown the same banner/background-notification way
  // as the light "فائدة اليوم" nudge above, and never labelled to the user
  // as anything beyond their own text+evidence — no "occasion" wording ever
  // reaches the UI. Adding a future occasion (أيام بيض، اثنين/خميس، رمضان،
  // شوال، الحج...) is just one more object below; nothing else here changes.
  const OCCASION_REMINDERS = [
    {
      id: 'friday-early',
      appliesToday: (d) => d.getDay() === 5,
      computeTime: (timings, base) => new Date(parseHM(timings.Dhuhr, base).getTime() - 60 * 60000),
      text: 'تذكير بفضل التبكير والاغتسال ليوم الجمعة.',
      evidence: '«من غسّل يوم الجمعة واغتسل، ثم بكّر وابتكر، ومشى ولم يركب، ودنا من الإمام فاستمع ولم يلغ، كان له بكل خطوة عمل سنة أجر صيامها وقيامها» — رواه أبو داود، صححه الألباني (صحيح أبي داود، رقم ٣٤٥).'
    },
    {
      id: 'friday-last-hour',
      appliesToday: (d) => d.getDay() === 5,
      computeTime: (timings, base) => new Date(parseHM(timings.Maghrib, base).getTime() - 60 * 60000),
      text: 'تذكير بتحري ساعة إجابة الدعاء.',
      evidence: '«يوم الجمعة اثنتا عشرة ساعة، لا يوجد مسلم يسأل الله فيها شيئًا إلا آتاه، فالتمسوها آخر ساعة بعد العصر» — حسن: رواه أبو داود (١٠٤٨) والنسائي (١٣٨٩).'
    }
  ];

  function scheduleOccasionReminders(timings){
    const now = new Date();
    OCCASION_REMINDERS.forEach(occ => {
      if (!occ.appliesToday(now)) return;
      const key = 'mohtasab_occasion_'+todayKey()+'_'+occ.id;
      if (safeGet(key) === '1') return;
      const t = occ.computeTime(timings, now);
      const delay = t.getTime() - now.getTime();
      if (delay <= 0) return; // that window already passed today — no catch-up spam for these

      const fire = () => {
        if (safeGet(key) === '1') return;
        if (document.visibilityState === 'visible' && el.overlay.classList.contains('show')){
          // Same courtesy as the light notifications — never stack over an
          // open major reminder, try again shortly instead.
          timers.push(setTimeout(fire, 30000));
          return;
        }
        safeSet(key, '1');
        if (document.visibilityState === 'visible'){
          showBanner(occ.text, ' ' + occ.evidence, null);
        } else {
          notifyBackground(occ.text, occ.evidence, 'occasion-'+occ.id, false);
        }
      };
      timers.push(setTimeout(fire, delay));
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
      const timeStr = formatTime12(slot.time.getHours(), slot.time.getMinutes());
      row.innerHTML = '<span class="lbl"><span class="st"></span>'+slot.icon+' '+slot.label+'</span><b>'+timeStr+(done?' ✓':'')+'</b>';
      el.slotList.appendChild(row);
    });
  }

  function renderNextSlot(){
    const now = new Date();
    const upcoming = slotsToday.filter(s => !isFired(s.id) && s.time > now).sort((a,b)=>a.time-b.time)[0];
    if (upcoming){
      el.nextSlot.textContent = '⏳ التنبيه القادم: ' + upcoming.label + ' — الساعة ' + formatTime12(upcoming.time.getHours(), upcoming.time.getMinutes());
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
    // Friday's "قبل العصر" reminder specifically (the real scheduled slot,
    // never the manual/practice trigger — that leaves activeSlot null) is
    // always salawat, never the normal rotation — per the hadith on
    // multiplying salawat on Friday. Evidence is appended to (not swapped
    // with) salawat's own normal evidence.
    if (state.activeSlot === 'asr' && new Date().getDay() === 5){
      const salawat = dhikrs.find(d => d.id === 'salawat');
      if (salawat) return Object.assign({}, salawat, { evidence: salawat.evidence.concat(FRIDAY_SALAWAT_EVIDENCE) });
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
  document.getElementById('btnQuranCard').addEventListener('click', () => openQuranOverlay(true));
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
    // its own fresh entry — nothing stale to clean up here. initSchedule()
    // itself resyncs the server-side profile once it resolves.
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
    // initSchedule() itself resyncs the server-side profile once it resolves.
    initSchedule();
    showToast('✅ تم التحويل لدرجة «' + getLevel().label + '»');
  }

  el.levelBadge.addEventListener('click', () => { renderLevelOptions(); el.levelModalBackdrop.classList.add('show'); });
  el.levelModalCancel.addEventListener('click', () => el.levelModalBackdrop.classList.remove('show'));
  el.levelModalBackdrop.addEventListener('click', (e) => { if (e.target === el.levelModalBackdrop) el.levelModalBackdrop.classList.remove('show'); });

  /* ================= Contact form (Firestore, no personal ID required) ================= */
  el.btnContactUs.addEventListener('click', () => {
    el.contactModalNote.textContent = '';
    el.contactName.value = '';
    el.contactEmail.value = '';
    el.contactMessage.value = '';
    el.contactModalBackdrop.classList.add('show');
    el.contactMessage.focus();
  });
  el.contactModalCancel.addEventListener('click', () => el.contactModalBackdrop.classList.remove('show'));
  el.contactModalBackdrop.addEventListener('click', (e) => { if (e.target === el.contactModalBackdrop) el.contactModalBackdrop.classList.remove('show'); });

  el.contactModalSend.addEventListener('click', () => {
    const message = el.contactMessage.value.trim();
    if (!message){
      el.contactModalNote.textContent = 'الرجاء كتابة رسالة قبل الإرسال.';
      el.contactMessage.focus();
      return;
    }
    if (typeof firebase === 'undefined' || !firebase.firestore){
      el.contactModalNote.textContent = 'تعذّر الاتصال بالخدمة — تحقق من الإنترنت وحاول مرة أخرى.';
      return;
    }
    el.contactModalSend.disabled = true;
    el.contactModalNote.textContent = 'جارٍ الإرسال…';
    firebase.firestore().collection('contactMessages').add({
      name: el.contactName.value.trim() || null,
      email: el.contactEmail.value.trim() || null,
      message,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
      el.contactModalBackdrop.classList.remove('show');
      showToast('✅ تم استلام رسالتك، شكرًا لتواصلك');
    }).catch(() => {
      el.contactModalNote.textContent = 'تعذّر إرسال الرسالة — حاول مرة أخرى لاحقًا.';
    }).finally(() => {
      el.contactModalSend.disabled = false;
    });
  });

  /* ================= Init ================= */
  // Used by the visibilitychange handler below to avoid re-resolving on
  // every rapid tab-switch, while still catching a genuine app resume.
  let lastScheduleAttemptAt = 0;

  function initSchedule(){
    lastScheduleAttemptAt = Date.now();
    el.nextSlot.textContent = '⏳ يحسب مواعيد التنبيهات…';
    resolveLocationAndTimings().then(timings => {
      scheduleToday(timings);
      // Keeps the server's copy of the location current too — runs every
      // time schedule is (re)computed (app open, daily midnight refresh,
      // manual city/level change), not just once at FCM registration, so
      // travelling to a different city/timezone gets picked up for the
      // background push path as well, not just the local in-app one above.
      resyncProfileIfActive();
    }).catch(() => {
      el.nextSlot.textContent = 'تعذّر حساب مواعيد الصلاة — تحقق من الاتصال أو اضبط المدينة يدويًا 📍';
    });
  }

  // Recompute at local midnight so a new day's slots/timings kick in.
  function scheduleMidnightRefresh(){
    const now = new Date();
    const next = new Date(now); next.setHours(24,0,5,0);
    setTimeout(() => { initSchedule(); renderDateBadge(); scheduleMidnightRefresh(); }, next.getTime()-now.getTime());
  }

  // Mobile PWAs are typically SUSPENDED (not truly closed/reloaded) when the
  // user switches away and back — so app.js's own top-level init code never
  // re-runs just because the user "reopened" the app from their home
  // screen, and the location would otherwise only ever refresh on a genuine
  // full page reload. Re-resolving on an actual resume (throttled so quick
  // tab-switching doesn't spam GPS requests) is what makes "opened the app
  // after landing in a new city" reliably pick up the real location.
  const VISIBILITY_RESCHEDULE_MIN_GAP_MS = 60 * 1000;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    renderSlotList();
    renderNextSlot();
    if (Date.now() - lastScheduleAttemptAt >= VISIBILITY_RESCHEDULE_MIN_GAP_MS){
      console.log('[مُحتسب:موقع] التطبيق أصبح ظاهرًا من جديد (resume) — إعادة التحقق من الموقع الفعلي والمواقيت.');
      initSchedule();
    }
  });

  // Marks a Quran slot done directly (no overlay) — used by the notification's
  // "قرأتها" action. Only offered for Quran because, same as the in-app
  // button, nothing there was gated behind a tap-counter to begin with;
  // dhikr/tahlil never get this shortcut since their counter must be honored.
  function autoCompleteQuranSlot(slotId){
    const slot = ALL_SLOTS_BY_ID[slotId];
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

  // Uses the static ALL_SLOTS_BY_ID (not slotsToday) so this can act the
  // instant the app opens from a notification tap, instead of waiting on
  // the full location+FCM+schedule chain to resolve first — that wait was
  // the actual source of the multi-second delay between tapping a
  // notification and the reminder screen appearing. `opened` guards against
  // re-opening (and resetting) an overlay the user is already interacting
  // with when this runs a second time later (scheduleToday calls it again
  // as a fallback); autoComplete doesn't need a guard since isFired() above
  // already makes a second attempt a no-op once the first one succeeds.
  function applyPendingSlotAction(){
    if (!pendingSlotAction || pendingSlotAction.opened) return;
    if (pendingSlotAction.slot === 'daily-benefit'){ pendingSlotAction.opened = true; openDailyBenefitSection(); return; }
    const slot = ALL_SLOTS_BY_ID[pendingSlotAction.slot];
    if (!slot || isFired(slot.id)) return;
    if (pendingSlotAction.autocomplete) autoCompleteQuranSlot(slot.id);
    else { pendingSlotAction.opened = true; openOverlayForSlot(slot); }
  }

  if ('serviceWorker' in navigator){
    navigator.serviceWorker.register('sw.js?v=20').catch(() => {});
    navigator.serviceWorker.addEventListener('message', (e) => {
      const data = e.data || {};
      if (data.type === 'OPEN_SLOT'){
        if (data.slot === 'daily-benefit'){ openDailyBenefitSection(); return; }
        const slot = ALL_SLOTS_BY_ID[data.slot];
        if (slot && !isFired(slot.id)) openOverlayForSlot(slot);
      } else if (data.type === 'AUTO_COMPLETE_SLOT'){
        autoCompleteQuranSlot(data.slot);
      }
    });
  }
  // initFirebaseMessaging() no longer requests permission itself (see
  // btnEnableNotifications above) — it only activates FCM if permission was
  // already granted in an earlier visit, so fcmActive is settled one way or
  // the other before scheduling starts.
  renderDateBadge();
  fetchQuran();
  // Open the reminder screen (or complete a Quran slot) right away when
  // arriving from a notification tap — see applyPendingSlotAction's own
  // comment for why this doesn't need to wait on initFirebaseMessaging()/
  // initSchedule() below, which is what used to cause a multi-second delay
  // between tapping the notification and the reminder actually appearing.
  applyPendingSlotAction();
  // Deferred a tick: these have nothing to do with what the user is trying
  // to see right now, and parsing their (large, cached) JSON on the main
  // thread competes with the time-critical work just above for no benefit.
  setTimeout(() => {
    fetchTafsirPool();
    fetchHadithPool();
    renderDailyBenefit(); // shows immediately on Fridays (athar is static); a loading note otherwise until a pool arrives
  }, 0);
  initFirebaseMessaging().then(() => {
    initSchedule();
    scheduleMidnightRefresh();
  });
})();
