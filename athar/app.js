(function(){
"use strict";

/* ============================================================
   أَثَر — Athar — prototype logic
   Single scripted scenario: محطة دمشق — أنقاض بابل (عالم ابن كثير)
   Learning goal: المرفوعات والفاعل
   ============================================================ */

const STORAGE_KEY = 'athar_state_v1';

function safeGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function safeSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){ /* storage unavailable — state stays in-memory only */ } }

function defaultState(){
  return {
    eloquence: 1000,
    mode: 'native', // 'native' | 'nonnative'
    worlds: { kathir:true, athir:false, khaldun:false }, // unlocked?
    chapters: { babel: { completed:false } },
    codexUnlocked: [],
    shawahidUnlocked: []
  };
}
let state = defaultState();
(function load(){
  const raw = safeGet(STORAGE_KEY);
  if(raw){ try{ state = Object.assign(defaultState(), JSON.parse(raw)); }catch(e){ /* corrupt save — fall back to defaults */ } }
})();
function saveState(){ safeSet(STORAGE_KEY, JSON.stringify(state)); }

/* ================= Content: the playable scenario ================= */
const SCENARIO = {
  world: 'kathir',
  chapterId: 'babel',
  character: { name:'ابن كثير', role:'الراوي والموجّه — عالم ابن كثير', portrait:'📜' },
  opening: {
    native: 'أهلاً بك أيها الناسخ الجديد. بين يديك مخطوطةٌ نادرة تحكي خبر بناء صرحٍ عظيمٍ أيّامَ تفرّق الألسنة، غير أنّ يد الوَرّاقين طالتها بالسهو، فطُمست أواخر الكَلِم وأودَت بمعاني الإسناد. مهمّتك أن تردّ لكل كلمةٍ إعرابها، فتُحيي بذلك المعنى وتُنقذ الأثر.',
    nonnative: 'مرحبًا بك أيها الناسخ الجديد! أمامك نصٌّ قديم يتحدّث عن بناء برجٍ عظيم، في زمنٍ تفرّق فيه الناس بلغاتٍ مختلفة. لكنّ الكتّاب القدامى أخطأوا في كتابة نهايات بعض الكلمات، وهو ما يُسمّى "الإعراب". مهمّتك: اختر النهاية الصحيحة لكل كلمة ناقصة لتُصلح النص وتُعيد له معناه.',
    choices: [
      { label:'لأبدأ الترميم فورًا', icon:'📜' },
      { label:'وما الإعراب الذي تقصده يا شيخ؟', icon:'❓', info:{
          native:'الإعرابُ تغيّرُ أواخر الكَلِم بحسب موقعها من الجملة. والفاعل تحديدًا اسمٌ مرفوعٌ دومًا، وعلامة رفعه الضمّة الظاهرة إذا كان مفردًا أو جمع تكسير.',
          nonnative:'"الإعراب" يعني الحركة (الضمة أو الفتحة أو الكسرة) في آخر الكلمة، وهي تتغيّر حسب دور الكلمة في الجملة. "الفاعل" — أي مَن قام بالفعل — يكون دائمًا "مرفوعًا"، وعلامته الأكثر شيوعًا هي الضمة (ـُ) في آخره.'
        }}
    ]
  },
  glossary: [
    { word:'اخْتَلَطَتِ', meaning:'تشابكَت الألسنُ وتباينَت بعد أن كانت واحدة (بحسب رواياتٍ تفسيرية في خبر بابل).', rule:'فعل ماضٍ مبنيّ على الفتح، والتاء تاء التأنيث الساكنة.' },
    { word:'بَطْشِهِ', meaning:'قوّته وشدّة سطوته وقهره.', rule:'اسمٌ مجرور بـ"مِن"، والهاء ضميرٌ متصل مبنيّ في محل جرّ مضاف إليه.' },
    { word:'تَفَرَّقَ', meaning:'انقسم الجمعُ وابتعد بعضُهم عن بعض.', rule:'فعل ماضٍ، وفاعله ضمير مستتر جوازًا تقديره «هو» يعود على «الجمع».' }
  ],
  sentenceParts: [
    { t:'وَفي تِلكَ الأَيّامِ إِذِ ' }, { w:'اخْتَلَطَتِ' }, { t:' الأَلسُنُ، بَنَى ' },
    { blank:0 }, { t:' المَصانِعَ، وَخافَ ' }, { blank:1 }, { t:' مِن ' },
    { w:'بَطْشِهِ' }, { t:'، حَتّى ' }, { w:'تَفَرَّقَ' }, { t:' الجَمعُ في الأَرضِ.' }
  ],
  blanks: [
    {
      correctIdx:0,
      options:[
        { text:'العُمَّالُ', tag:'رفع — ضمة ظاهرة', correct:true },
        { text:'العُمَّالَ', tag:'نصب — فتحة ظاهرة', correct:false },
        { text:'العُمَّالِ', tag:'جر — كسرة ظاهرة', correct:false }
      ],
      successNote:{ native:'صحيح! الفاعل مرفوعٌ دومًا، وعلامة رفعه هنا الضمة الظاهرة على آخره؛ لأنّ «العُمّال» جمع تكسير.', nonnative:'صحيح! هذه الكلمة هي الفاعل (مَن قام بالبناء)، ولذلك نضع في آخرها الضمة (ـُ).' },
      failNote:{ native:'تأمّل: مَن الذي قام بالبناء؟ الفاعل لا يُنصب ولا يُجرّ، بل يُرفع دائمًا.', nonnative:'حاول مجددًا: ابحث عن «مَن قام بالفعل؟» — هذه الكلمة يجب أن تُقرأ بالضمة (ـُ) في آخرها.' },
      actorCue:'مَن بَنى؟'
    },
    {
      correctIdx:0,
      options:[
        { text:'الشُّعَبُ', tag:'رفع — ضمة ظاهرة', correct:true },
        { text:'الشُّعَبَ', tag:'نصب — فتحة ظاهرة', correct:false },
        { text:'الشُّعَبِ', tag:'جر — كسرة ظاهرة', correct:false }
      ],
      successNote:{ native:'أحسنت! «الشُّعَبُ» فاعل «خافَ»، مرفوعٌ بالضمة الظاهرة.', nonnative:'ممتاز! هذه الكلمة هي فاعل «خاف» (مَن شعر بالخوف)، لذلك آخرها ضمة (ـُ).' },
      failNote:{ native:'مَن الذي خاف من بطشه؟ تذكّر: الفاعل مرفوعٌ لا غير.', nonnative:'حاول مجددًا: مَن الذي شعر بالخوف؟ ضع الضمة (ـُ) في آخر كلمته.' },
      actorCue:'مَن خافَ؟'
    }
  ],
  completion: {
    native:'أحسنتَ صنعًا يا ناسخ الأثر! أعدتَ للكلام روحه، ورددتَ الفاعل إلى رفعه بعد أن طمسه السهو. لقد استحققتَ شاهدًا من كتاب الله يوافق ما رمّمتَ.',
    nonnative:'أحسنت! لقد صحّحتَ النص بنجاح. تذكّر القاعدة: الفاعل يكون دائمًا مرفوعًا. وهذه آية من القرآن الكريم فيها القاعدة نفسها.',
    rewardPoints: 25,
    reward:{
      id:'shahid_ibrahim', topic:'الفاعل',
      verse:'وَإِذْ يَرْفَعُ إِبْرَاهِيمُ الْقَوَاعِدَ مِنَ الْبَيْتِ وَإِسْمَاعِيلُ رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ',
      source:'سورة البقرة — الآية ١٢٧',
      note:'الفاعل «إبراهيمُ» مرفوعٌ بالضمة الظاهرة، و«إسماعيلُ» معطوفٌ عليه مرفوعٌ مثله — تمامًا كما رمّمتَ في المخطوطة.'
    }
  }
};

const CODEX_RULES = [
  { id:'rule_fail', title:'بابُ الفاعل وعلامات رفعه', cat:'الآجرومية', text:'الفاعلُ اسمٌ مرفوعٌ يُذكر بعد فعلٍ تامّ مبنيّ للمعلوم، دالٌّ على مَن فعل الفعل أو اتّصف به. وعلامة رفعه الضمة الظاهرة إذا كان مفردًا أو جمع تكسير.', gate:'shahid_ibrahim' },
  { id:'rule_naib', title:'بابُ نائب الفاعل', cat:'الآجرومية', locked:true },
  { id:'rule_mubtada', title:'بابُ المبتدأ والخبر', cat:'الآجرومية', locked:true },
  { id:'alfiya_1', title:'الفاعلُ الأصلُ الذي قد قُدِّما … مُسنَدًا لفعلٍ أو الذي قد عُلِما', cat:'ألفية ابن مالك', locked:true }
];

const DUEL = {
  intro:'سيبويه أمامك، وبيتٌ من كلام العرب أصابه خللٌ إعرابيّ. صوّبه قبل نفاد الوقت!',
  line:'«إِنَّ الرِّجالِ لَيَعرِفُ فَضْلَها»',
  options:[
    { text:'إنَّ الرِّجالَ لَيَعرِفُ فَضْلَها — بنصب «الرجال» فقط', correct:false },
    { text:'إنَّ الرِّجالَ لَيَعرِفونَ فَضْلَها — بنصب اسم «إنّ»، وإثبات نون الرفع لأن الفعل من الأفعال الخمسة', correct:true },
    { text:'إنَّ الرِّجالِ لَيَعرِفونَ فَضْلَها — بإبقاء «الرجالِ» مجرورة', correct:false }
  ],
  timeLimit: 14,
  winPoints: 40,
  losePoints: 15
};

const RAOI_ROUND = {
  prompt:'أهلًا بك! لنتدرّب قليلًا على المحادثة بالفصحى. كيف تصف شعورك تجاه أول رحلة لك في «أثر»؟',
  options:[
    { text:'أشعرُ بحماسٍ كبير لاكتشاف عالم ابن كثير.', reply:'حماسٌ جميل! ستجد في واحة النواة الكثير مما يستحق الاكتشاف. أخبرني، أيّ الشخصيات التاريخية تودّ أن تقابل أولًا؟' },
    { text:'أجد بعض الصعوبة في التمييز بين الحركات الإعرابية.', reply:'لا بأس، فالتمرّس يأتي بالممارسة. ابدأ بترميم مخطوطة بابل، وستتعلّم التمييز بين المرفوع والمنصوب خطوةً بخطوة.' }
  ],
  closing:'هذا نموذجٌ أوّليّ توضيحيّ — النسخة الكاملة من «الراوي» ستتيح محادثةً صوتية غير محدودة بالفصحى.'
};

/* ================= DOM refs ================= */
const el = {
  eloquenceVal: document.getElementById('eloquenceVal'),
  screens: document.querySelectorAll('.screen'),
  navBtns: document.querySelectorAll('.nav-btn'),
  worldNodes: document.querySelectorAll('.world-node'),
  sheetBackdrop: document.getElementById('sheetBackdrop'),
  chaptersSheet: document.getElementById('chaptersSheet'),
  sheetTitle: document.getElementById('sheetTitle'),
  sheetSub: document.getElementById('sheetSub'),
  sheetChapters: document.getElementById('sheetChapters'),
  closeSheet: document.getElementById('closeSheet'),
  charPortrait: document.getElementById('charPortrait'),
  charName: document.getElementById('charName'),
  charRole: document.getElementById('charRole'),
  modeButtons: document.querySelectorAll('.mode-toggle button'),
  manuscriptPanel: document.getElementById('manuscriptPanel'),
  manuscriptText: document.getElementById('manuscriptText'),
  decisionPanel: document.getElementById('decisionPanel'),
  codexView: document.getElementById('codexView'),
  shawahidView: document.getElementById('shawahidView'),
  ttabs: document.querySelectorAll('.ttab'),
  duelModal: document.getElementById('duelModal'),
  duelTimerBar: document.getElementById('duelTimerBar'),
  duelLine: document.getElementById('duelLine'),
  duelOptions: document.getElementById('duelOptions'),
  duelResult: document.getElementById('duelResult'),
  duelClose: document.getElementById('duelClose'),
  raoiFab: document.getElementById('raoiFab'),
  raoiPanel: document.getElementById('raoiPanel'),
  raoiClose: document.getElementById('raoiClose'),
  raoiThread: document.getElementById('raoiThread'),
  toast: document.getElementById('toast')
};

function toast(msg){
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>el.toast.classList.remove('show'), 2600);
}
function updateEloquenceUI(){ el.eloquenceVal.textContent = String(state.eloquence); }

/* ================= Navigation ================= */
function switchScreen(id){
  el.screens.forEach(s=>s.classList.toggle('active', s.id===id));
  el.navBtns.forEach(b=>b.classList.toggle('active', b.dataset.screen===id));
  if(id==='screen-treasury') renderTreasury();
  if(id==='screen-map') renderMap();
  closeSheet();
  closePopover();
}
el.navBtns.forEach(b=>b.addEventListener('click', ()=>switchScreen(b.dataset.screen)));

/* ================= SCREEN 1 — Map ================= */
function renderMap(){
  el.worldNodes.forEach(node=>{
    const w = node.dataset.world;
    const unlocked = !!state.worlds[w];
    node.classList.toggle('unlocked', unlocked);
    node.classList.toggle('locked', !unlocked);
  });
}
el.worldNodes.forEach(node=>node.addEventListener('click', ()=>openSheet(node.dataset.world)));

const WORLD_META = {
  kathir:{ name:'عالم ابن كثير', place:'واحة النواة' },
  athir:{ name:'عالم ابن الأثير', place:'قلعة الملاحم' },
  khaldun:{ name:'عالم ابن خلدون', place:'أكاديمية العمران' }
};

function openSheet(worldId){
  const meta = WORLD_META[worldId];
  el.sheetTitle.textContent = meta.name + ' — ' + meta.place;
  if(state.worlds[worldId]){
    el.sheetSub.textContent = 'اختر فصلاً لتبدأ الترميم والتعلّم';
    if(worldId==='kathir'){
      const done = state.chapters.babel.completed;
      el.sheetChapters.innerHTML = `
        <div class="chapter-card">
          <div class="meta"><div class="t">الفصل الأول: أنقاض بابل ${done ? '✅' : ''}</div><div class="g">الهدف: المرفوعات والفاعل</div></div>
          <button class="chapter-go" id="goBabel">${done ? 'إعادة اللعب' : 'ابدأ'}</button>
        </div>
        <div class="chapter-card locked">
          <div class="meta"><div class="t">الفصل الثاني: قوافل الشام</div><div class="g">الهدف: المفعول به</div></div>
          <button class="chapter-go" disabled style="opacity:.4">قريبًا</button>
        </div>`;
      document.getElementById('goBabel').addEventListener('click', ()=>{ closeSheet(); startScenario(); });
    } else {
      el.sheetChapters.innerHTML = `<div class="empty-note">لا فصول متاحة بعد.</div>`;
    }
  } else {
    el.sheetSub.textContent = 'هذا العالم مقفل حاليًا — أكمل فصول عالم ابن كثير لفتحه.';
    el.sheetChapters.innerHTML = `
      <div class="chapter-card locked">
        <div class="meta"><div class="t">محتوى مقفل 🔒</div><div class="g">تابع تقدّمك في عالم ابن كثير</div></div>
      </div>
      <div class="chapter-card">
        <div class="meta"><div class="t">جرّب مبارزة بلاغية تجريبية بالانتظار</div><div class="g">أمام سيبويه</div></div>
        <button class="chapter-go" id="goDuelFromSheet">⚔️ ابدأ</button>
      </div>`;
    document.getElementById('goDuelFromSheet').addEventListener('click', ()=>{ closeSheet(); openDuel(); });
  }
  el.sheetBackdrop.classList.add('show');
  el.chaptersSheet.classList.add('show');
}
function closeSheet(){ el.sheetBackdrop.classList.remove('show'); el.chaptersSheet.classList.remove('show'); }
el.sheetBackdrop.addEventListener('click', closeSheet);
el.closeSheet.addEventListener('click', closeSheet);

/* ================= SCREEN 2 — Story & Interaction Canvas ================= */
let story = null; // transient per-play state
function startScenario(){
  story = { step:'opening', openingInfo:false, blankAnswers:[null,null], transientWrong:null, feedback:null };
  switchScreen('screen-story');
  renderCharPanel();
  renderManuscript();
  renderDecisionPanel();
}

function renderCharPanel(){
  el.charName.textContent = SCENARIO.character.name;
  el.charRole.textContent = SCENARIO.character.role;
  el.charPortrait.textContent = SCENARIO.character.portrait;
  el.modeButtons.forEach(b=>b.classList.toggle('active', b.dataset.mode===state.mode));
}
el.modeButtons.forEach(b=>b.addEventListener('click', ()=>{
  state.mode = b.dataset.mode; saveState();
  renderCharPanel();
  if(story){ renderManuscript(); renderDecisionPanel(); }
}));

function escapeHtml(s){ return s.replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function renderManuscript(){
  if(!story || story.step==='opening'){
    el.manuscriptPanel.classList.remove('solved');
    el.manuscriptText.innerHTML = `<div class="plain" style="text-align:center; color:var(--text-faint); font-family:var(--font-body);">📜 المخطوطة تنتظر يد الترميم…</div>`;
    return;
  }
  let html = '';
  SCENARIO.sentenceParts.forEach(part=>{
    if(part.t !== undefined){
      html += `<span class="plain">${escapeHtml(part.t)}</span>`;
    } else if(part.w !== undefined){
      html += `<span class="mword" data-word="${escapeHtml(part.w)}" tabindex="0">${escapeHtml(part.w)}</span>`;
    } else if(part.blank !== undefined){
      const idx = part.blank;
      const b = SCENARIO.blanks[idx];
      const ans = story.blankAnswers[idx];
      const wrongFlash = story.transientWrong && story.transientWrong.idx===idx ? story.transientWrong : null;
      const showCue = state.mode==='nonnative' && !ans;
      const cueHtml = showCue ? `<span class="actor-cue">${escapeHtml(b.actorCue)}</span>` : '';
      if(ans && ans.status==='correct'){
        html += `<span class="blank-slot correct" style="position:relative;">${escapeHtml(b.options[b.correctIdx].text)}</span>`;
      } else if(wrongFlash){
        html += `<span class="blank-slot wrong" style="position:relative;">${escapeHtml(wrongFlash.text)}${cueHtml}</span>`;
      } else {
        html += `<span class="blank-slot empty" style="position:relative;">．．．${cueHtml}</span>`;
      }
    }
  });
  el.manuscriptText.innerHTML = html;
  el.manuscriptText.querySelectorAll('.mword').forEach(node=>{
    node.addEventListener('click', (ev)=>openWordPopover(ev.currentTarget));
  });
}

let popoverEl = null;
function closePopover(){ if(popoverEl){ popoverEl.remove(); popoverEl = null; } }
function openWordPopover(node){
  closePopover();
  const g = SCENARIO.glossary.find(x=>x.word===node.dataset.word);
  if(!g) return;
  const pop = document.createElement('div');
  pop.className = 'word-popover show';
  pop.innerHTML = `
    <div class="wp-title">${escapeHtml(g.word)}</div>
    <div class="wp-row"><b>المعنى:</b> ${escapeHtml(g.meaning)}</div>
    <div class="wp-row"><b>القاعدة النحوية:</b> ${escapeHtml(g.rule)}</div>`;
  document.body.appendChild(pop);
  const r = node.getBoundingClientRect();
  const top = window.scrollY + r.bottom + 8;
  let left = window.scrollX + r.left;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - 260;
  if(left > maxLeft) left = Math.max(10, maxLeft);
  pop.style.position = 'absolute';
  pop.style.top = top + 'px';
  pop.style.left = left + 'px';
  popoverEl = pop;
  setTimeout(()=>{ document.addEventListener('click', outsidePopoverHandler); }, 0);
}
function outsidePopoverHandler(ev){
  if(popoverEl && !popoverEl.contains(ev.target) && !ev.target.classList.contains('mword')){
    closePopover();
    document.removeEventListener('click', outsidePopoverHandler);
  }
}

function activeBlankIndex(){
  for(let i=0;i<story.blankAnswers.length;i++){
    if(!story.blankAnswers[i] || story.blankAnswers[i].status!=='correct') return i;
  }
  return -1;
}

function renderDecisionPanel(){
  const dp = el.decisionPanel;
  if(story.step==='opening'){
    let html = `<div class="narration-box">${escapeHtml(SCENARIO.opening[state.mode])}</div>`;
    if(story.openingInfo){
      html += `<div class="narration-box"><b>ابن كثير:</b> ${escapeHtml(SCENARIO.opening.choices[1].info[state.mode])}</div>`;
      html += `<button class="continue-btn" id="btnContinueToManuscript">متابعة الترميم ←</button>`;
    } else {
      html += `<div class="option-row" style="flex-direction:column;">` +
        SCENARIO.opening.choices.map((c,i)=>`<button class="choice-card" data-choice="${i}"><span class="ci">${c.icon}</span>${escapeHtml(c.label)}</button>`).join('') +
        `</div>`;
    }
    dp.innerHTML = html;
    if(!story.openingInfo){
      dp.querySelectorAll('[data-choice]').forEach(b=>b.addEventListener('click', ()=>{
        const i = Number(b.dataset.choice);
        if(SCENARIO.opening.choices[i].info){ story.openingInfo = true; renderDecisionPanel(); }
        else { story.step = 'manuscript'; renderManuscript(); renderDecisionPanel(); }
      }));
    } else {
      document.getElementById('btnContinueToManuscript').addEventListener('click', ()=>{
        story.step = 'manuscript'; renderManuscript(); renderDecisionPanel();
      });
    }
    return;
  }

  if(story.step==='manuscript'){
    const idx = activeBlankIndex();
    const b = SCENARIO.blanks[idx];
    let html = '';
    if(story.feedback){
      html += `<div class="narration-box"><b>ابن كثير:</b> ${escapeHtml(story.feedback)}</div>`;
    } else {
      html += `<div class="narration-box">اختر الحركة الإعرابية الصحيحة لآخر الكلمة الناقصة رقم ${idx+1===1?'الأولى':'الثانية'}.</div>`;
    }
    html += `<div class="option-row">` +
      b.options.map((o,i)=>`<button class="option-card" data-opt="${i}">${escapeHtml(o.text)}<span class="tag">${escapeHtml(o.tag)}</span></button>`).join('') +
      `</div>`;
    dp.innerHTML = html;
    dp.querySelectorAll('[data-opt]').forEach(btn=>btn.addEventListener('click', ()=>{
      handleBlankChoice(idx, Number(btn.dataset.opt));
    }));
    return;
  }

  if(story.step==='completion'){
    const r = SCENARIO.completion.reward;
    const already = state.shawahidUnlocked.includes(r.id);
    let html = `<div class="narration-box"><b>ابن كثير:</b> ${escapeHtml(SCENARIO.completion[state.mode])}</div>`;
    html += `
      <div class="reward-card"><div class="reward-inner">
        <div class="rk-label">✨ شاهدٌ مكتسَب</div>
        <div class="rk-verse">﴿ ${r.verse} ﴾</div>
        <div class="rk-src">${escapeHtml(r.source)}</div>
        <div class="rk-note"><b>ملاحظة نحوية:</b> ${escapeHtml(r.note)}</div>
        <div class="reward-actions">
          <button class="btn-gold" id="btnAddTreasury" ${already?'disabled':''}>${already?'أُضيف إلى الخزانة ✓':'أضف إلى الخزانة'}</button>
          <button class="btn-ghost" id="btnBackToMap">متابعة ← الخريطة</button>
        </div>
      </div></div>`;
    dp.innerHTML = html;
    document.getElementById('btnAddTreasury').addEventListener('click', ()=>{
      if(!state.shawahidUnlocked.includes(r.id)) state.shawahidUnlocked.push(r.id);
      CODEX_RULES.filter(x=>x.gate===r.id).forEach(x=>{ if(!state.codexUnlocked.includes(x.id)) state.codexUnlocked.push(x.id); });
      saveState();
      toast('أُضيف الشاهد وقاعدة «الفاعل» إلى خزانة التراث');
      renderDecisionPanel();
    });
    document.getElementById('btnBackToMap').addEventListener('click', ()=>{
      switchScreen('screen-map');
    });
  }
}

function flashWrong(idx, text){
  story.transientWrong = { idx, text };
  renderManuscript();
  setTimeout(()=>{ story.transientWrong = null; renderManuscript(); }, 750);
}

function handleBlankChoice(idx, optIdx){
  const b = SCENARIO.blanks[idx];
  const opt = b.options[optIdx];
  if(opt.correct){
    story.blankAnswers[idx] = { status:'correct' };
    state.eloquence += 15; saveState(); updateEloquenceUI();
    story.feedback = b.successNote[state.mode];
    renderManuscript();
    if(activeBlankIndex() === -1){
      el.manuscriptPanel.classList.add('solved');
      el.decisionPanel.innerHTML = `<div class="narration-box"><b>ابن كثير:</b> ${escapeHtml(story.feedback)}</div>`;
      setTimeout(()=>{
        state.chapters.babel.completed = true;
        state.eloquence += SCENARIO.completion.rewardPoints;
        saveState(); updateEloquenceUI();
        story.step = 'completion';
        renderDecisionPanel();
      }, 1100);
    } else {
      renderDecisionPanel();
    }
  } else {
    state.eloquence = Math.max(0, state.eloquence - 5); saveState(); updateEloquenceUI();
    story.feedback = b.failNote[state.mode];
    flashWrong(idx, opt.text);
    renderDecisionPanel();
  }
}

/* ================= SCREEN 3 — Treasury & Codex ================= */
el.ttabs.forEach(tab=>tab.addEventListener('click', ()=>{
  el.ttabs.forEach(t=>t.classList.toggle('active', t===tab));
  const which = tab.dataset.ttab;
  el.codexView.classList.toggle('hidden', which!=='codex');
  el.shawahidView.classList.toggle('hidden', which!=='shawahid');
}));

function renderTreasury(){
  el.codexView.innerHTML = CODEX_RULES.map(r=>{
    const unlocked = r.gate ? state.codexUnlocked.includes(r.id) : !r.locked;
    if(unlocked){
      return `<div class="codex-card unlocked"><div class="codex-inner">
        <div class="spine"></div>
        <div><div class="ctitle">${escapeHtml(r.title)}</div><div class="ccat">${escapeHtml(r.cat)}</div></div>
      </div></div>`;
    }
    return `<div class="codex-card locked"><div class="codex-inner">
      <div class="lock-ic">🔒</div>
      <div class="ccat">${escapeHtml(r.cat)}</div>
    </div></div>`;
  }).join('');

  const r = SCENARIO.completion.reward;
  if(state.shawahidUnlocked.includes(r.id)){
    el.shawahidView.innerHTML = `
      <div class="shahid-group">
        <h4>◆ باب ${escapeHtml(r.topic)}</h4>
        <div class="shahid-item">
          <div class="sv">﴿ ${r.verse} ﴾</div>
          <div class="ss">${escapeHtml(r.source)}</div>
          <div class="sn">${escapeHtml(r.note)}</div>
        </div>
      </div>`;
  } else {
    el.shawahidView.innerHTML = `<div class="empty-note">لم تُجمع أي شواهد بعد — أكمل ترميم مخطوطة «أنقاض بابل» في عالم ابن كثير لتكسب أول شاهد.</div>`;
  }
}

/* ================= Balaagha Duel ================= */
let duelTimer = null, duelAnswered = false;
function openDuel(){
  duelAnswered = false;
  el.duelLine.textContent = DUEL.line;
  el.duelResult.classList.add('hidden');
  el.duelResult.className = 'duel-result hidden';
  el.duelClose.classList.add('hidden');
  el.duelOptions.innerHTML = DUEL.options.map((o,i)=>`<button class="duel-opt" data-i="${i}">${escapeHtml(o.text)}</button>`).join('');
  el.duelOptions.querySelectorAll('.duel-opt').forEach(btn=>btn.addEventListener('click', ()=>resolveDuel(Number(btn.dataset.i))));
  el.duelModal.classList.add('show');
  let elapsed = 0;
  const total = DUEL.timeLimit * 1000;
  el.duelTimerBar.style.width = '100%';
  clearInterval(duelTimer);
  duelTimer = setInterval(()=>{
    elapsed += 100;
    const pct = Math.max(0, 100 - (elapsed/total)*100);
    el.duelTimerBar.style.width = pct + '%';
    if(elapsed >= total){
      clearInterval(duelTimer);
      if(!duelAnswered) resolveDuel(-1);
    }
  }, 100);
}
function resolveDuel(chosenIdx){
  if(duelAnswered) return;
  duelAnswered = true;
  clearInterval(duelTimer);
  el.duelOptions.querySelectorAll('.duel-opt').forEach(b=>b.style.pointerEvents='none');
  const correct = chosenIdx>=0 && DUEL.options[chosenIdx].correct;
  el.duelResult.classList.remove('hidden');
  if(correct){
    state.eloquence += DUEL.winPoints;
    el.duelResult.className = 'duel-result win';
    el.duelResult.textContent = `⚔️ فُزتَ في المبارزة! +${DUEL.winPoints} فصاحة`;
  } else {
    state.eloquence = Math.max(0, state.eloquence - DUEL.losePoints);
    el.duelResult.className = 'duel-result lose';
    el.duelResult.textContent = chosenIdx===-1 ? '⏳ انتهى الوقت! حاول مجددًا في مرة قادمة.' : '✗ لم تُصب الصواب هذه المرة.';
  }
  saveState(); updateEloquenceUI();
  el.duelClose.classList.remove('hidden');
}
el.duelClose.addEventListener('click', ()=>el.duelModal.classList.remove('show'));
document.getElementById('headerDuelBtn').addEventListener('click', openDuel);

/* ================= الراوي — AI companion (stub) ================= */
let raoiUsed = false;
function renderRaoiIntro(){
  el.raoiThread.innerHTML = `<div class="raoi-msg">${escapeHtml(RAOI_ROUND.prompt)}</div>
    <div class="raoi-opts">${RAOI_ROUND.options.map((o,i)=>`<button class="raoi-opt" data-i="${i}">${escapeHtml(o.text)}</button>`).join('')}</div>`;
  el.raoiThread.querySelectorAll('.raoi-opt').forEach(btn=>btn.addEventListener('click', ()=>{
    const i = Number(btn.dataset.i);
    el.raoiThread.innerHTML = `
      <div class="raoi-msg">${escapeHtml(RAOI_ROUND.prompt)}</div>
      <div class="raoi-msg me">${escapeHtml(RAOI_ROUND.options[i].text)}</div>
      <div class="raoi-msg">${escapeHtml(RAOI_ROUND.options[i].reply)}</div>
      <div class="raoi-msg" style="color:var(--text-faint); font-size:0.7rem;">${escapeHtml(RAOI_ROUND.closing)}</div>`;
  }));
}
el.raoiFab.addEventListener('click', ()=>{
  el.raoiPanel.classList.add('show');
  if(!raoiUsed){ renderRaoiIntro(); raoiUsed = true; }
});
el.raoiClose.addEventListener('click', ()=>el.raoiPanel.classList.remove('show'));

/* ================= Init ================= */
updateEloquenceUI();
renderMap();
renderCharPanel();
})();
