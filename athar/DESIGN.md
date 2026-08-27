# أَثَر — Athar
### UI/UX Design & Product Blueprint

An Arabic-language edutainment app teaching نحو، الآجرومية، ألفية ابن مالك، and Arabic literature through branching historical storytelling. This document is the full design specification; a working, navigable prototype implementing it lives in this same folder (`index.html`, `style.css`, `app.js` — open `index.html` in a browser, no build step required).

---

## 0. Design Theme — "Cyber-Heritage"

| Token | Value | Use |
|---|---|---|
| `--bg` | `#070a10` (near-black slate) | app background |
| `--panel` / `--panel-2` | `#101826` / `#141f30` | cards, panels |
| `--gold` | `#ffcd4b` (neon gold) | primary accent — rewards, unlocked state, emphasis |
| `--turquoise` | `#2fe8d0` | secondary accent — interactive/active elements, glossary |
| `--violet` | `#a56bff` | tertiary accent — **reserved exclusively** for Balaagha Duels and rare gamified moments |
| `--danger` | `#ff6b6b` | incorrect-answer feedback (kept separate from violet on purpose) |

Typography: **Tajawal** for body/UI text, **Cairo** (bold geometric) for display/headers, **Amiri / Amiri Quran** for manuscript and Qur'anic text specifically (the one deliberate serif exception, since classical text benefits from a scribal register — everything else stays geometric-modern).

Explicitly avoided throughout: sepia/parchment tones, wood grain, desert clichés, ornate calligraphic borders. Character "portraits" in the prototype are stylized geometric placeholders (glowing gradient medallions) standing in for commissioned 3D character renders — the visual language (glow, geometry, dark ground) is what a production art pass would build on.

---

## 1. Screen-by-Screen UI Layout

### 1.1 الخريطة الزمنية التفاعلية — Time Continuum Map

**Purpose:** entry hub; spatial metaphor for progression through history.

- **Background:** fixed starfield (layered radial-gradient dots + faint gold/turquoise/violet nebula glows at fixed points), pure near-black base — reads as deep space, not paper.
- **Spiral path:** a single SVG bezier path connecting three node positions, animated dashed stroke (`stroke-dasharray` + offset animation) flowing gold→turquoise→dim-grey along its length, implying a "time continuum" the player travels down.
- **World nodes** (absolutely positioned over the SVG, in a loose descending spiral arrangement):
  1. **عالم ابن كثير — واحة النواة** (unlocked): gold-bordered orb, animated pulse-glow, palm/oasis glyph. Always the starting point.
  2. **عالم ابن الأثير — قلعة الملاحم** (locked): dim slate orb, turquoise-tinted inner glow, small lock badge, castle glyph.
  3. **عالم ابن خلدون — أكاديمية العمران** (locked): same locked treatment, institute/column glyph.
- Tapping any node opens a **bottom sheet** ("chapters sheet"): slide-up panel listing that world's chapters as cards (title + learning-goal tag + a "ابدأ" button) if unlocked, or a locked-state explainer plus a shortcut to try a **Balaagha Duel** while waiting, if locked — turns dead-end taps into a gamified moment instead of a blank wall.
- A single caption line beneath the map orients the player ("اختر عالمًا مضيئًا لتبدأ رحلتك عبر الأثر").

### 1.2 مسرح السرد والتحدي — Story & Interaction Canvas

The core loop screen, fixed three-zone vertical stack (no scrolling between zones on mobile — each zone is sized to fit):

**Top — character panel**
- A glowing geometric portrait medallion (gold ring for mentor figures like ابن كثير, turquoise ring for rival/duel figures like سيبويه).
- Name + role line.
- **Register toggle**, a pill switch inline under the name: `نص فصيح متقدم للناطقين` ⇄ `نص مبسط لغير الناطقين`. This is global to the current scene — switching it instantly re-renders all narration and feedback text in the app in the selected register, without resetting exercise progress.

**Middle — المخطوطة التفاعلية (the interactive manuscript)**
- A framed panel (corner-bracket motif, not an ornate border) holding the passage in Amiri serif, oversized and justified for legibility.
- **Glowing keywords** (turquoise, text-shadow glow) are tap targets: tapping opens a floating popover anchored to the word with (a) plain-language meaning, (b) its grammatical rule/role. Where relevant this is where a Qur'anic/hadith شاهد would be surfaced inline for a keyword (the prototype demonstrates the meaning+rule pattern on three glossary words: `اخْتَلَطَتِ`, `بَطْشِهِ`, `تَفَرَّقَ`).
- **Blanks** render as dashed gold placeholders (`．．．`) inline in the sentence; once answered they lock in as solid gold-filled tokens showing the chosen word. A wrong pick flashes red and auto-reverts to empty (shake animation) rather than staying wrong on the page.
- On full completion the entire panel border/glow shifts to solid gold with an ambient inner glow — the "manuscript restored" payoff moment.
- **Non-native visual cue:** when the simplified register is active, a small floating tag (turquoise) hovers above each unanswered blank naming the question the blank answers in plain terms (`مَن بَنى؟` / `مَن خافَ؟`) — a visual scaffold toward identifying the فاعل without stating the grammar term.

**Bottom — decision panel**
- Never renders as a quiz list. Two card families:
  - **Narration/branch choices** — full-width elegant cards with a leading glyph, used for story branching (e.g. "لأبدأ الترميم فورًا" vs. "وما الإعراب الذي تقصده يا شيخ؟").
  - **Option cards** (used for i'raab choices) — a row of 3 equal-width cards, Amiri-serif answer text plus a small caption naming the case/harakah (`رفع — ضمة ظاهرة`, etc.), so native speakers get the term and non-native speakers get a decodable label either way.
- Feedback (success/fail note, in the active register) appears as a narration box directly above the options, spoken in-character by the mentor rather than as generic UI copy ("صحيح!" / "خطأ.").
- On chapter completion, the reward — a **شاهد card** — flips in (3D `rotateY` flip-in) with the verse in Amiri Quran, its source, and a one-line grammatical note tying it back to the exercise, plus `أضف إلى الخزانة` / `متابعة ← الخريطة` actions.

### 1.3 خزانة التراث — Treasury & Codex

Two tabs:
- **الألفية والقواعد**: a 2-column grid of card-shelf items ("codex cards"). Unlocked items show a gold spine accent, title, and category (`الآجرومية` / `ألفية ابن مالك`); locked items render as dimmed cards with a lock glyph only — visibly present but withheld, to signal there's more to earn. Tapping an unlocked card (future iteration) would flip it to show the full rule text and, where relevant, the matching بيت from the Alfiyah.
- **سجل الشواهد**: a list grouped by grammatical/rhetorical topic (`باب الفاعل`, etc. — headers appear only once a topic has ≥1 collected شاهد). Each entry shows the verse/hadith/poetry line, its source, and its one-line grammatical note. Before anything is collected, an empty-state note points the player back to the relevant chapter.

### Persistent chrome
- **Header:** brand mark, a `⚔️` duel shortcut (violet, always reachable — duels are meant to be a snackable side-loop, not gated behind the map), and the **عداد الفصاحة** (Eloquence gauge) — a live numeric rating with a turquoise pulse dot, updated on every graded action across the app.
- **Bottom nav:** three tabs — الخريطة / المسرح / الخزانة — gold highlight on the active tab.
- **الراوي FAB:** a floating turquoise orb (bottom corner, gentle idle float animation) opening a slide-up companion panel for scripted Fus'ha conversational practice.

---

## 2. User Journeys

### 2.1 Native-speaker journey (فصيح متقدم)

1. **Onboarding:** lands on الخريطة, sees عالم ابن كثير already lit gold. No forced tutorial modal — the pulsing node itself is the affordance.
2. Taps the node → chapters sheet → taps `ابدأ` on "الفصل الأول: أنقاض بابل".
3. **Opening scene:** register toggle already defaults to `فصيح متقدم`. Reads ابن كثير's classical framing of the task in full iʿrāb-aware prose. Two choices: dive straight in, or ask "ما الإعراب؟" for a one-line refresher — a native speaker likely skips this, going straight to the manuscript.
4. **Manuscript stage:** reads the passage fluently, taps glossary words out of curiosity rather than necessity (e.g. checking the precise nuance of `اخْتَلَطَتِ`). For each blank, the three option cards are read as pure iʿrāb distinctions (`رفع` / `نصب` / `جر` labels) — the exercise is a genuine grammar test, not a comprehension aid. A wrong pick costs a small Eloquence deduction and produces a terse, technical correction ("الفاعل لا يُنصب ولا يُجرّ").
5. **Completion:** manuscript glows gold; ابن كثير's closing line is rhetorically dense, matching the register. The شاهد reward (البقرة: ١٢٧) is read as reinforcement/cross-reference, not new information — the value is in seeing the rule recur in scripture.
6. Adds the شاهد to الخزانة, returns to the map. Checks الخزانة tab afterward to see the rule card now unlocked, possibly also opens a Balaagha Duel from the header for an extra, harder challenge before leaving the session.

### 2.2 Non-native (B2+) learner journey (مبسط)

1. **Onboarding:** same entry, but on first opening the story screen switches (or is manually switched) to `نص مبسط لغير الناطقين`.
2. **Opening scene:** simplified framing explicitly names "الإعراب" as a concept and glosses it in plain terms before the task starts. More likely to tap "وما الإعراب الذي تقصده؟" to get the extra explanatory beat before proceeding — the branch exists specifically for this learner.
3. **Manuscript stage:** relies heavily on tapping glossary words (`اخْتَلَطَتِ`, `تَفَرَّقَ`) since vocabulary, not just grammar, is a barrier. For each blank, the **actor-cue tags** (`مَن بَنى؟` / `مَن خافَ؟`) appear automatically above the empty slot — this learner is being taught to *find the doer* first, and only then map that to "مرفوع" as a label, rather than starting from abstract case theory. A wrong pick produces a plain-language nudge ("مَن الذي قام بالبناء؟") rather than pure terminology.
4. **Completion:** the success narration explicitly restates the rule in one plain sentence before showing the شاهد, so the takeaway is stated twice (once as a rule, once as a scriptural instance) before moving on.
5. Likely to open **الراوي** afterward for conversational reinforcement — the FAB is the natural next step for a learner who wants spoken practice rather than another reading exercise. Eloquence gauge is framed to this learner more as a progress/motivation counter than a competitive metric.

Both journeys converge on the same state (chapter completed, شاهد + rule unlocked, Eloquence updated) — the register toggle changes *how* the content is delivered, never *what* is being tested, so native and non-native learners stay on the same grammar curriculum.

---

## 3. Playable Scenario — "أنقاض بابل" (fully scripted, as implemented)

**World:** عالم ابن كثير · **Learning goal:** المرفوعات والفاعل

### Scene 1 — الافتتاحية
**ابن كثير** (فصيح): "أهلاً بك أيها الناسخ الجديد. بين يديك مخطوطةٌ نادرة تحكي خبر بناء صرحٍ عظيمٍ أيّامَ تفرّق الألسنة، غير أنّ يد الوَرّاقين طالتها بالسهو، فطُمست أواخر الكَلِم وأودَت بمعاني الإسناد. مهمّتك أن تردّ لكل كلمةٍ إعرابها، فتُحيي بذلك المعنى وتُنقذ الأثر."

**ابن كثير** (مبسط): "مرحبًا بك أيها الناسخ الجديد! أمامك نصٌّ قديم يتحدّث عن بناء برجٍ عظيم، في زمنٍ تفرّق فيه الناس بلغاتٍ مختلفة. لكنّ الكتّاب القدامى أخطأوا في كتابة نهايات بعض الكلمات، وهو ما يُسمّى «الإعراب». مهمّتك: اختر النهاية الصحيحة لكل كلمة ناقصة لتُصلح النص وتُعيد له معناه."

Branch:
- **[لأبدأ الترميم فورًا]** → Scene 2 directly.
- **[وما الإعراب الذي تقصده يا شيخ؟]** → inline rule reminder ("الإعرابُ تغيّرُ أواخر الكَلِم بحسب موقعها من الجملة. والفاعل تحديدًا اسمٌ مرفوعٌ دومًا، وعلامة رفعه الضمّة الظاهرة إذا كان مفردًا أو جمع تكسير." / simplified equivalent) → continue button → Scene 2.

### Scene 2 — المخطوطة التفاعلية
Passage (with glowing glossary words `اخْتَلَطَتِ`, `بَطْشِهِ`, `تَفَرَّقَ` and two blanks):

> وَفي تِلكَ الأَيّامِ إِذِ اخْتَلَطَتِ الأَلسُنُ، بَنَى **﴿١﴾** المَصانِعَ، وَخافَ **﴿٢﴾** مِن بَطْشِهِ، حَتّى تَفَرَّقَ الجَمعُ في الأَرضِ.

**Blank ①** (فاعل بَنَى) — options: `العُمَّالُ` (✓ رفع) / `العُمَّالَ` (نصب) / `العُمَّالِ` (جر)
- ✓ correct: "صحيح! الفاعل مرفوعٌ دومًا، وعلامة رفعه هنا الضمة الظاهرة على آخره؛ لأنّ «العُمّال» جمع تكسير." *(non-native: "صحيح! هذه الكلمة هي الفاعل (مَن قام بالبناء)، ولذلك نضع في آخرها الضمة (ـُ).")*
- ✗ wrong: "تأمّل: مَن الذي قام بالبناء؟ الفاعل لا يُنصب ولا يُجرّ، بل يُرفع دائمًا." — slot flashes red, reverts, retry allowed.

**Blank ②** (فاعل خافَ) — options: `الشُّعَبُ` (✓ رفع) / `الشُّعَبَ` (نصب) / `الشُّعَبِ` (جر)
- ✓ correct: "أحسنت! «الشُّعَبُ» فاعل «خافَ»، مرفوعٌ بالضمة الظاهرة."
- ✗ wrong: "مَن الذي خاف من بطشه؟ تذكّر: الفاعل مرفوعٌ لا غير."

Non-native mode overlays `مَن بَنى؟` / `مَن خافَ؟` above each unanswered blank.

### Scene 3 — الإتمام
On both blanks correct: manuscript panel glows solid gold.

**ابن كثير** (فصيح): "أحسنتَ صنعًا يا ناسخ الأثر! أعدتَ للكلام روحه، ورددتَ الفاعل إلى رفعه بعد أن طمسه السهو. لقد استحققتَ شاهدًا من كتاب الله يوافق ما رمّمتَ."

**ابن كثير** (مبسط): "أحسنت! لقد صحّحتَ النص بنجاح. تذكّر القاعدة: الفاعل يكون دائمًا مرفوعًا. وهذه آية من القرآن الكريم فيها القاعدة نفسها."

**شاهد مكافأة:**
> ﴿ وَإِذْ يَرْفَعُ إِبْرَاهِيمُ الْقَوَاعِدَ مِنَ الْبَيْتِ وَإِسْمَاعِيلُ رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ ﴾ — سورة البقرة: ١٢٧
> **ملاحظة نحوية:** الفاعل «إبراهيمُ» مرفوعٌ بالضمة الظاهرة، و«إسماعيلُ» معطوفٌ عليه مرفوعٌ مثله — تمامًا كما رمّمتَ في المخطوطة.

Reward: +15 Eloquence per correct blank, +25 on chapter completion. `أضف إلى الخزانة` unlocks both the شاهد (under `باب الفاعل`) and the matching Ajrumiyyah rule card in الألفية والقواعد.

---

## 4. Gamification Mechanics — implementation notes

- **Manuscript Restoration** — the core loop above; generalizes to any chapter as `{sentenceParts, blanks, glossary}` data, no engine changes needed per new passage.
- **Balaagha Duels (مبارزات بلاغية)** — reachable anytime via the header `⚔️` icon or from a locked world's sheet (turns a dead-end tap into content). Timed (14s, draining turquoise→violet bar), single flawed line of poetry, 3 corrected full-line options. Win: +40 Eloquence, violet result state (the one place violet is used for a full UI moment, per the palette rule). Loss/timeout: −15 Eloquence, muted red state.
- **Eloquence Rating (عداد الفصاحة)** — a single persistent number (`localStorage`), starts at 1000, adjusted by every graded action app-wide (manuscript blanks ±15/−5, duel ±40/−15, chapter completion +25). Always visible in the header.
- **الراوي (AI Language Companion)** — floating companion panel; the prototype ships one scripted branching exchange to demonstrate the interaction pattern (prompt → learner picks a reply → in-character response → explicit note that this is a stub for a future open-ended voice/conversational model). Intentionally labeled as a preview rather than faked as fully conversational.

---

## 5. What the prototype is / isn't

**Is:** a fully navigable, stateful, single-file (HTML/CSS/JS, no build step, no dependencies) implementation of all three required screens, the complete Babel scenario end-to-end (both registers, both blanks, success/fail branches, reward, treasury unlock), one Balaagha Duel, and the الراوي stub — with state persisted in `localStorage` so progress survives a reload.

**Isn't:** connected to a real backend, a real AI model for الراوي, or commissioned 3D character art — those are the natural next steps once the direction here is validated, and the visual system (color, glow, geometry, motion) is built so that swapping in real character renders or a real conversational backend is a drop-in, not a redesign.
