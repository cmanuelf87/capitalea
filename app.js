/* Capitalea EU — el trivial de les capitals d'Europa (versió web) */
'use strict';

const COUNTRIES = [
  ['Albània', 'Tirana'], ['Alemanya', 'Berlín'], ['Andorra', 'Andorra la Vella'], ['Armènia', 'Erevan'], ['Àustria', 'Viena'],
  ['Azerbaidjan', 'Bakú'], ['Bèlgica', 'Brussel·les'], ['Bielorússia', 'Minsk'], ['Bòsnia i Hercegovina', 'Sarajevo'], ['Bulgària', 'Sofia'],
  ['Ciutat del Vaticà', 'Ciutat del Vaticà'], ['Croàcia', 'Zagreb'], ['Dinamarca', 'Copenhaguen'], ['Eslovàquia', 'Bratislava'], ['Eslovènia', 'Ljubljana'],
  ['Espanya', 'Madrid'], ['Estònia', 'Tallinn'], ['Finlàndia', 'Hèlsinki'], ['França', 'París'], ['Geòrgia', 'Tbilisi'],
  ['Grècia', 'Atenes'], ['Hongria', 'Budapest'], ['Irlanda', 'Dublín'], ['Islàndia', 'Reykjavík'], ['Itàlia', 'Roma'],
  ['Letònia', 'Riga'], ['Liechtenstein', 'Vaduz'], ['Lituània', 'Vílnius'], ['Luxemburg', 'Luxemburg'], ['Macedònia del Nord', 'Skopje'],
  ['Malta', 'La Valletta'], ['Moldàvia', 'Chisinau'], ['Mònaco', 'Mònaco'], ['Montenegro', 'Podgorica'], ['Noruega', 'Oslo'],
  ['Països Baixos', 'Amsterdam'], ['Polònia', 'Varsòvia'], ['Portugal', 'Lisboa'], ['Regne Unit', 'Londres'], ['República Txeca', 'Praga'],
  ['Romania', 'Bucarest'], ['Rússia', 'Moscou'], ['San Marino', 'San Marino'], ['Sèrbia', 'Belgrad'], ['Suècia', 'Estocolm'],
  ['Suïssa', 'Berna'], ['Turquia', 'Ankara'], ['Ucraïna', 'Kíiv'], ['Xipre', 'Nicòsia'],
];

const RULES = { CLASSIC_QUESTIONS: 10, TIME_SECONDS: 60, LIVES: 3 };
const pointsFor = (streak) => Math.min(100 + (streak - 1) * 20, 200);

function stars(s) {
  const t = (n, a, b, c) => (n >= c ? 3 : n >= b ? 2 : n >= a ? 1 : 0);
  if (s.mode === 'classic') {
    const acc = s.answered ? s.correct / s.answered : 0;
    return acc >= 0.9 ? 3 : acc >= 0.6 ? 2 : acc >= 0.3 ? 1 : 0;
  }
  return s.mode === 'time' ? t(s.correct, 5, 10, 15) : t(s.correct, 5, 15, 30);
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function makeQuestion([country, capital]) {
  const others = shuffle([...new Set(COUNTRIES.map((c) => c[1]).filter((c) => c !== capital))]).slice(0, 3);
  return { country, capital, options: shuffle([capital, ...others]) };
}
function newQuestions(mode) {
  return shuffle(COUNTRIES).slice(0, mode === 'classic' ? RULES.CLASSIC_QUESTIONS : COUNTRIES.length).map(makeQuestion);
}

const storage = {
  get() { try { return parseInt(localStorage.getItem('capitalea-best') || '0', 10) || 0; } catch { return 0; } },
  set(v) { try { localStorage.setItem('capitalea-best', String(v)); } catch { /* sense emmagatzematge */ } },
};

let S = { screen: 'home', mode: 'classic', best: storage.get(), hideCaps: false, revealed: new Set() };
let timer = null, advance = null;

function newGame() {
  return { questions: newQuestions(S.mode), index: 0, picked: null, hidden: [], used5050: false, score: 0, streak: 0,
    bestStreak: 0, lives: RULES.LIVES, correct: 0, answered: 0, mistakes: [], lastGain: 0, timeLeft: RULES.TIME_SECONDS, newRecord: false };
}
const current = () => S.questions && S.questions[S.index];
const isLastStep = () => (S.mode === 'survival' && S.lives <= 0) || S.index + 1 >= S.questions.length;

function stopTimers() { clearInterval(timer); clearTimeout(advance); timer = advance = null; }

const actions = {
  home() { stopTimers(); S.screen = 'home'; },
  setup() { stopTimers(); S.screen = 'setup'; },
  study() { S.screen = 'study'; },
  mode(m) { S.mode = m; },
  start() {
    stopTimers();
    Object.assign(S, newGame(), { screen: 'quiz' });
    if (S.mode === 'time') {
      timer = setInterval(() => {
        if (S.screen !== 'quiz') return stopTimers();
        S.timeLeft -= 1;
        if (S.timeLeft <= 0) { S.timeLeft = 0; finish(); }
        render();
      }, 1000);
    }
  },
  answer(cap) {
    const q = current();
    if (!q || S.picked !== null || S.hidden.includes(cap)) return;
    S.picked = cap; S.answered += 1;
    if (cap === q.capital) {
      S.streak += 1; S.bestStreak = Math.max(S.bestStreak, S.streak);
      S.lastGain = pointsFor(S.streak); S.score += S.lastGain; S.correct += 1;
    } else {
      S.streak = 0; S.lastGain = 0;
      S.mistakes.push({ country: q.country, capital: q.capital, picked: cap });
      if (S.mode === 'survival') S.lives -= 1;
    }
    if (S.mode === 'time') { const idx = S.index; advance = setTimeout(() => { if (S.index === idx) { actions.next(); render(); } }, 900); }
  },
  next() {
    if (S.screen !== 'quiz' || S.picked === null) return;
    clearTimeout(advance);
    if (isLastStep()) finish(); else { S.index += 1; S.picked = null; S.hidden = []; }
  },
  fifty() {
    const q = current();
    if (!q || S.used5050 || S.picked !== null) return;
    S.used5050 = true; S.hidden = shuffle(q.options.filter((o) => o !== q.capital)).slice(0, 2);
  },
  toggleHide() { S.hideCaps = !S.hideCaps; S.revealed = new Set(); },
  reveal(i) { if (!S.hideCaps) return; const k = Number(i); S.revealed.has(k) ? S.revealed.delete(k) : S.revealed.add(k); },
};

function finish() {
  stopTimers();
  S.newRecord = S.score > S.best;
  if (S.newRecord) { S.best = S.score; storage.set(S.best); }
  S.screen = 'results';
}

/* ---------- icones (SVG en línia) ---------- */
const STAR = '<path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7L2 9.2l7.1-.6z"/>';
const ic = {
  star: (fill, stroke = 'none', size = 20) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="1.4" stroke-linejoin="round">${STAR}</svg>`,
  back: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14213D" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  close: (c = '#14213D', s = 20) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  check: '<svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  trophy: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B3A00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/></svg>',
  help: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2D4BE0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/></svg>',
  clock: (c = '#6B3A00', s = 28) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>`,
  heart: (fill = 'none', s = 28) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="${fill}" stroke="#C9343A" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`,
  flame: (s = 24) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#6B3A00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4 0 7-2.7 7-6.5 0-3.5-2.5-5.5-4-8.5-1 2-2 3-3.5 3.5C12 7 11 4 9 2c0 4-4 6.5-4 12 0 4 3 8 7 8z"/></svg>`,
  bulb: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
};
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const back = (label = 'Tornar') => `<button class="icon-btn" data-action="home" aria-label="${label}">${ic.back}</button>`;

/* ---------- pantalles ---------- */
const screens = {
  home() {
    const ring = Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      return `<span class="star" style="left:${(80 + 78 * Math.cos(a)).toFixed(1)}px;top:${(80 + 78 * Math.sin(a)).toFixed(1)}px">${ic.star('#FFC93C')}</span>`;
    }).join('');
    return `
      <section class="hero">
        <div class="ring" aria-hidden="true">${ring}<div class="core"><b>${COUNTRIES.length}</b><span>països</span></div></div>
        <h1>Capitalea EU</h1>
        <p>El trivial de les capitals d'Europa</p>
      </section>
      <div class="screen">
        <div class="record"><div class="ico">${ic.trophy}</div><div><span class="muted" style="font-size:14px">El teu rècord</span><b>${S.best} punts</b></div></div>
        <div class="spacer"></div>
        <button class="btn btn-yellow" data-action="setup">Jugar</button>
        <button class="btn btn-white" data-action="study" style="margin-top:6px">Aprendre les capitals</button>
        <p class="tagline muted">Europa, un continent, mil històries</p>
      </div>`;
  },

  setup() {
    const mode = (id, title, desc, icon, bg) => `
      <button class="mode" role="radio" aria-checked="${S.mode === id}" data-action="mode" data-arg="${id}">
        <span class="ico" style="background:${bg}">${icon}</span>
        <span><b>${title}</b><span>${desc}</span></span>
      </button>`;
    return `<div class="screen">
      <div class="header">${back()}<h2>Tria el mode</h2></div>
      <div role="radiogroup" aria-label="Mode de joc" style="display:flex;flex-direction:column;gap:16px">
        ${mode('classic', 'Clàssic', "10 preguntes a l'atzar. Ideal per començar.", ic.help, 'var(--blue-tint)')}
        ${mode('time', 'Contrarellotge', '60 segons. Quantes capitals encertes?', ic.clock(), 'var(--yellow-tint)')}
        ${mode('survival', 'Supervivència', '3 vides i els 49 països. Fins on arribaràs?', ic.heart(), '#FDE3E4')}
      </div>
      <div class="tip">${ic.flame()}<span>Encerts seguits = ratxa. Cada ratxa suma punts extra!</span></div>
      <div class="spacer"></div>
      <button class="btn btn-blue" data-action="start">Començar</button>
    </div>`;
  },

  quiz() {
    const q = current();
    const answered = S.picked !== null;
    const right = answered && S.picked === q.capital;
    const total = S.questions.length;
    let middle;
    if (S.mode === 'time') middle = `<span class="pill" style="background:var(--yellow-tint);color:var(--orange-text)">${ic.clock('#6B3A00', 20)}0:${String(S.timeLeft).padStart(2, '0')}</span>`;
    else if (S.mode === 'survival') middle = `<span role="img" aria-label="${S.lives} vides" style="display:flex;gap:4px">${[0, 1, 2].map((i) => ic.heart(i < S.lives ? '#C9343A' : '#fff', 26)).join('')}</span>`;
    else middle = `<span style="font-weight:800;font-size:17px">Pregunta ${S.index + 1} de ${total}</span>`;
    const pct = S.mode === 'time' ? (S.timeLeft / RULES.TIME_SECONDS) * 100 : ((S.index + (answered ? 1 : 0)) / total) * 100;
    const opts = q.options.map((cap, i) => {
      let cls = '';
      if (S.hidden.includes(cap)) cls = 'hidden';
      else if (answered && cap === q.capital) cls = 'correct';
      else if (answered && cap === S.picked) cls = 'wrong';
      else if (answered) cls = 'dim';
      return `<button class="opt ${cls}" data-action="answer" data-arg="${esc(cap)}" ${answered || cls === 'hidden' ? 'disabled' : ''}><span class="letter">${'ABCD'[i]}</span><span>${esc(cap)}</span></button>`;
    }).join('');
    const color = right ? 'var(--green)' : 'var(--red)';
    const panel = answered ? `
      <div class="panel" style="background:${color}" role="status">
        <div class="title">${right ? ic.check : ic.close('#fff', 30)}<span>${right ? `Correcte! +${S.lastGain}` : 'Ups! No és aquesta'}</span></div>
        <p>La capital de ${esc(q.country)} és ${esc(q.capital)}.</p>
        <button class="btn" style="color:${color}" data-action="next" id="next">${isLastStep() ? 'Veure resultats' : 'Següent'}</button>
      </div>` : '';
    return `<div class="screen">
      <div class="topbar">
        <button class="icon-btn" data-action="home" aria-label="Sortir de la partida">${ic.close()}</button>
        ${middle}
        <span class="pill" style="background:#fff;border:2px solid var(--line)">${ic.star('#FFC93C', '#C99400', 18)}${S.score}</span>
      </div>
      <div class="progress"><div style="width:${pct.toFixed(1)}%;background:${S.mode === 'time' ? 'var(--yellow)' : 'var(--blue)'}"></div></div>
      <div class="qcard">
        <span class="muted" style="font-size:17px">Quina és la capital de…</span>
        <span class="country">${esc(q.country)}</span>
        ${S.streak >= 2 ? `<span class="pill" style="background:var(--orange);color:var(--orange-text);font-size:15px;padding:4px 12px">${ic.flame(18)}Ratxa ×${S.streak}</span>` : ''}
      </div>
      <div class="options">${opts}</div>
      <button class="fifty" data-action="fifty" ${S.used5050 || answered ? 'disabled' : ''}>${ic.bulb}Comodí 50/50</button>
      ${panel}
    </div>`;
  },

  results() {
    const n = stars(S);
    const heads = ['A practicar una mica més!', 'Bon intent!', 'Molt bé!', "Ets un crack d'Europa!"];
    const list = S.mistakes.length
      ? S.mistakes.map((m) => `<div class="miss"><b>${esc(m.country)} → <span style="color:var(--green)">${esc(m.capital)}</span></b><small>Vas dir: ${esc(m.picked)}</small></div>`).join('')
      : '<span style="color:var(--green);font-weight:700">Cap error. Perfecte!</span>';
    return `<div class="screen" style="padding-top:32px">
      <div style="text-align:center"><h2 style="font-size:34px">Partida acabada!</h2><span class="muted" style="font-size:18px">${heads[n]}</span></div>
      <div class="stars" role="img" aria-label="${n} de 3 estrelles">${[0, 1, 2].map((i) => i < n ? ic.star('#FFC93C', '#C99400', 58) : ic.star('#E4E9FF', '#C5CEEF', 58)).join('')}</div>
      <div class="score"><b>${S.score}</b><span>punts</span>${S.newRecord ? '<span class="badge">Nou rècord!</span>' : ''}</div>
      <div class="stats">
        <div class="stat"><b style="color:var(--green)">${S.correct}</b><span>Encerts</span></div>
        <div class="stat"><b style="color:var(--red)">${S.answered - S.correct}</b><span>Errors</span></div>
        <div class="stat"><b style="color:#8A4B00">${S.bestStreak}</b><span>Millor ratxa</span></div>
      </div>
      <h2 style="font-size:20px">A repassar</h2>
      <div class="list">${list}</div>
      <div class="row2">
        <button class="btn btn-white" style="flex:1;height:60px" data-action="home">Inici</button>
        <button class="btn btn-yellow" style="flex:2;height:60px;font-size:22px" data-action="start">Tornar a jugar</button>
      </div>
    </div>`;
  },

  study() {
    const rows = COUNTRIES.map(([c, cap], i) => {
      const show = !S.hideCaps || S.revealed.has(i);
      return `<button class="study-row" data-action="reveal" data-arg="${i}" ${S.hideCaps ? '' : 'tabindex="-1"'}>
        <span>${esc(c)}</span>${show ? `<span class="cap">${esc(cap)}</span>` : '<span class="hidden-cap">Toca per veure-la</span>'}</button>`;
    }).join('');
    return `<div class="screen">
      <div class="header">${back()}<h2 style="font-size:28px">Aprèn les capitals</h2></div>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
        <span class="muted" style="font-size:15px">${S.hideCaps ? 'Toca un país per veure la capital' : `${COUNTRIES.length} països i les seves capitals`}</span>
        <button class="toggle" data-action="toggleHide" aria-pressed="${S.hideCaps}">${S.hideCaps ? 'Mostra-les' : 'Amaga-les'}</button>
      </div>
      <div class="list" style="gap:6px">${rows}</div>
      <button class="btn btn-blue" style="height:60px;font-size:22px" data-action="setup">Posa'm a prova</button>
    </div>`;
  },
};

const app = document.getElementById('app');
let lastScreen = null;
function render() {
  const list = app.querySelector('.list');
  const scroll = list && lastScreen === S.screen ? list.scrollTop : 0;
  app.innerHTML = screens[S.screen]();
  const newList = app.querySelector('.list');
  if (newList) newList.scrollTop = scroll;
  if (lastScreen !== S.screen) { const h = app.querySelector('h1, h2, .country'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } }
  const next = document.getElementById('next');
  if (next) next.focus({ preventScroll: true });
  lastScreen = S.screen;
}

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) { fn(el.dataset.arg); render(); }
});

render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
