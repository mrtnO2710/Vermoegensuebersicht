'use strict';
/* Grundgerüst: lokaler Speicher, Navigation, Bausteine, Diagramme, Import/Export.
   Alle Daten liegen ausschließlich im Speicher dieses Geräts (localStorage). */
const KEY = 'vermoegen.v1';
const V = {};
const App = { st: null, tab: 'overview', stack: [], area: 'cashflow', fc: { monthly: null, years: 15 } };
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

const DEF = {
  asset: { name: '', cls: 'fondsdepot', provider: '', reference: '', value: 0, valueDate: null, invested: 0, monthly: 0, returnPA: 0,
    autoProject: true, projectionRate: 0, question: '', note: '', active: true, snapshots: [] },
  estate: { name: '', kind: '', usage: 'rented', location: '', purchasePrice: 0, purchaseCosts: 0, purchaseDate: null, marketValue: 0,
    landShare: 20, depRate: 2, depEnabled: true, manualDep: 0, manualInterest: 0, rent: 0, costs: 0, question: '', note: '' },
  loan: { name: '', lender: '', kind: 'consumer', estateId: null, balance: 0, balanceDate: null, rate: 0, payment: 0, special: 0,
    fixedUntil: null, original: 0, question: '', note: '' },
  budget: { title: '', kind: 'expense', category: 'lebenshaltung', amount: 0, interval: 'monthly', active: true, question: '', note: '' },
  goal: { title: '', target: 0, date: null, scope: 'investments', note: '' },
  profile: { name: '', birthYear: 1985, expectedReturn: 5, taxRate: 30, reserveMinimum: 10000, giroTarget: 3000, giroDay: 1 },
};
const COLL = { asset: 'assets', estate: 'estates', loan: 'loans', budget: 'budget', goal: 'goals' };

App.empty = () => ({ version: 1, profile: { ...DEF.profile }, assets: [], estates: [], loans: [], budget: [], goals: [] });
App.normalize = (d) => {
  const st = App.empty();
  st.profile = { ...DEF.profile, ...(d.profile || {}) };
  for (const [type, coll] of Object.entries(COLL)) {
    st[coll] = (Array.isArray(d[coll]) ? d[coll] : []).map((x) => ({ ...DEF[type], ...x, id: x.id || uid() }));
  }
  st.assets.forEach((a) => { a.snapshots = Array.isArray(a.snapshots) ? a.snapshots : []; if (!a.valueDate) a.valueDate = E.iso(new Date()); });
  st.loans.forEach((l) => { if (!l.balanceDate) l.balanceDate = E.iso(new Date()); });
  return st;
};
App.load = () => { try { const raw = localStorage.getItem(KEY); App.st = raw ? App.normalize(JSON.parse(raw)) : null; } catch (e) { App.st = null; } };
App.save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(App.st)); } catch (e) { App.toast('Speichern fehlgeschlagen'); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
};
App.find = (type, id) => (App.st[COLL[type]] || []).find((x) => x.id === id);
App.isStandalone = () => window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
App.toast = (msg) => {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => t.remove(), 2400);
};

/* ---------- Symbole ---------- */
const ICON = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  chart: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  dots: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  bars: '<path d="M5 20V11M11 20V5M17 20v-7M3 20h18"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M9.5 8h4a2 2 0 010 4h-4 4.5a2 2 0 010 4H9.5V8M11 6v2M11 16v2"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
  house: '<path d="M3 11l9-7 9 7M5 10v10h14V10"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11L21 7H6"/>',
  brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/>',
  check: '<path d="M5 12l4 4 10-10"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  tool: '<path d="M14 7a4 4 0 105 5l-9 9-3-3 9-9"/>',
};
const icon = (n, c) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c || 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ICON.dots}</svg>`;

/* ---------- Bausteine ---------- */
const H = {
  badge: (ic, c, size = 36) => `<div class="badge" style="background:${c}29;width:${size}px;height:${size}px">${icon(ic, c)}</div>`,
  hdr: (t, s, r) => `<div class="hdr"><div><div class="t">${F.esc(t)}</div>${s ? `<div class="s">${F.esc(s)}</div>` : ''}</div>${r != null ? `<div class="r">${r}</div>` : ''}</div>`,
  kv: (k, v, o = {}) => `<div class="kv${o.em ? ' em' : ''}"><span class="k">${F.esc(k)}${o.hint ? `<span class="h">${F.esc(o.hint)}</span>` : ''}</span><span class="v ${o.cls || ''}">${v}</span></div>`,
  m: (l, v, cls = '', x = '') => `<div class="m"><div class="l">${F.esc(l)}</div><div class="v ${cls}">${v}</div>${x ? `<div class="x">${F.esc(x)}</div>` : ''}</div>`,
  bar: (p, cls = '') => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, (p || 0) * 100))}%"></i></div>`,
  hint: (text, info = false) => `<div class="hint${info ? ' info' : ''}"><span class="ic">${info ? 'i' : '?'}</span><span>${F.esc(text)}</span></div>`,
  pill: (t, cls = '') => `<span class="pill ${cls}">${F.esc(t)}</span>`,
  q: () => '<span class="q">?</span>',
  add: (label, attrs) => `<button class="add" ${attrs}>＋ ${F.esc(label)}</button>`,
  brand: (c = '#fff') => `<span class="brand"><i style="height:9px;opacity:.55;background:${c}"></i><i style="height:14px;opacity:.55;background:${c}"></i><i style="height:19px;background:${c}"></i></span>`,
  notes: (question, note) => (!question && !note ? '' : `<div class="card">${question ? H.hdr('Offene Frage') + H.hint(question) : ''}${question && note ? '<div class="sep" style="margin:12px 0"></div>' : ''}${note ? H.hdr('Notiz') + `<div class="t2" style="font-size:13px;line-height:1.45">${F.esc(note)}</div>` : ''}</div>`),
  top: (title, back = true, edit = '') => `<div class="topbar">${back ? '<button class="back" data-act="back">‹ Zurück</button>' : '<span></span>'}${edit}</div>${title ? `<h1 style="font-size:24px">${F.esc(title)}</h1>` : ''}`,
  donut: (slices) => {
    const total = slices.reduce((s, x) => s + x.value, 0) || 1, r = 46, C = 2 * Math.PI * r, gap = slices.length > 1 ? 1.5 : 0;
    let off = 0;
    const arcs = slices.map((s) => {
      const len = s.value / total * C;
      const el = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${s.color}" stroke-width="16" stroke-dasharray="${Math.max(0, len - gap)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 60 60)"/>`;
      off += len; return el;
    }).join('');
    return `<svg viewBox="0 0 120 120" width="124" height="124" style="flex:none">${arcs}</svg>`;
  },
  /* Liniendiagramm: series = [{color, points:[{x:Date, y}]}] */
  line: (series, o = {}) => {
    const W = 320, Ht = o.height || 170, L = 46, R = 8, T = 10, B = 20;
    const all = series.flatMap((s) => s.points);
    if (all.length < 2) return '';
    const xs = all.map((p) => +p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
    const nice = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
    const y1 = nice(Math.max(...all.map((p) => p.y), o.goal || 0, 1));
    const X = (v) => L + (v - x0) / (x1 - x0 || 1) * (W - L - R), Y = (v) => T + (1 - v / y1) * (Ht - T - B);
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const v = y1 * i / 4, y = Y(v);
      g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.08)"/><text x="${L - 6}" y="${y + 3}" text-anchor="end">${F.compact(v)}</text>`;
    }
    for (let i = 0; i <= 3; i++) {
      const v = x0 + (x1 - x0) * i / 3;
      g += `<text x="${X(v)}" y="${Ht - 4}" text-anchor="${i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}">${new Date(v).getFullYear()}</text>`;
    }
    const paths = series.map((s) => {
      const pts = s.points.map((p) => `${X(+p.x).toFixed(1)},${Y(p.y).toFixed(1)}`);
      const area = o.area && series.length === 1
        ? `<path d="M${pts[0].split(',')[0]},${Y(0)} L${pts.join(' L')} L${pts[pts.length - 1].split(',')[0]},${Y(0)} Z" fill="${s.color}" opacity=".18"/>` : '';
      const dots = o.dots ? s.points.map((p) => `<circle cx="${X(+p.x)}" cy="${Y(p.y)}" r="2.6" fill="${s.color}"/>`).join('') : '';
      return `${area}<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
    }).join('');
    const goal = o.goal ? `<line x1="${L}" x2="${W - R}" y1="${Y(o.goal)}" y2="${Y(o.goal)}" stroke="#FFB547" stroke-dasharray="4 4" opacity=".8"/><text x="${L + 4}" y="${Y(o.goal) - 4}" style="fill:#FFB547;font-weight:600">Ziel ${F.compact(o.goal)}</text>` : '';
    return `<svg class="chart" viewBox="0 0 ${W} ${Ht}">${g}${paths}${goal}</svg>`;
  },
};

/* ---------- Navigation & Aktionen ---------- */
const TABS = [['overview', 'Übersicht', 'grid'], ['assets', 'Anlagen', 'chart'], ['estates', 'Immobilien', 'building'], ['planning', 'Planung', 'target'], ['more', 'Mehr', 'dots']];

App.render = () => {
  const view = document.getElementById('view'), tabs = document.getElementById('tabs');
  if (!App.st) { view.innerHTML = V.welcome(); tabs.innerHTML = ''; return; }
  const top = App.stack[App.stack.length - 1];
  try { view.innerHTML = top ? V[top.view](top.id) : V[App.tab](); }
  catch (e) { console.error(e); App.stack = []; view.innerHTML = `<div class="card">Anzeigefehler: ${F.esc(e.message)}</div>`; }
  tabs.innerHTML = TABS.map(([k, label, ic]) => `<button class="${App.tab === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${icon(ic)}${label}</button>`).join('');
};

App.actions = {
  tab: (d) => { App.tab = d.tab; App.stack = []; App.render(); window.scrollTo(0, 0); },
  open: (d) => { App.stack.push({ view: d.view, id: d.id }); App.render(); window.scrollTo(0, 0); },
  back: () => { App.stack.pop(); App.render(); },
  edit: (d) => Editors.open(d.type, d.id || null, d),
  area: (d) => { App.area = d.area; App.render(); },
  'snap-del': (d) => {
    const a = App.find('asset', d.id); if (!a || !confirm('Verlaufspunkt löschen?')) return;
    a.snapshots = a.snapshots.filter((s) => s.date !== d.date); App.save(); App.render();
  },
  'fc-reset': () => { App.fc.monthly = null; App.render(); },
  export: () => App.exportData(),
  import: () => document.getElementById('importFile').click(),
  'start-empty': () => { App.st = App.empty(); App.save(); App.render(); },
  wipe: () => {
    if (!confirm('Alle Daten auf diesem Gerät löschen? Vorher eine Sicherung exportieren!')) return;
    localStorage.removeItem(KEY); App.st = null; App.stack = []; App.tab = 'overview'; App.render();
  },
  'sheet-cancel': () => Editors.close(),
  'sheet-save': () => Editors.save(),
  'sheet-delete': () => Editors.del(),
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const fn = App.actions[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'fcMonthly') { App.fc.monthly = F.parse(ev.target.value); App.renderForecast && App.renderForecast(); }
  if (ev.target.id === 'fcYears') { App.fc.years = +ev.target.value; App.renderForecast && App.renderForecast(); }
});

/* ---------- Sicherung: Export & Import (Datei bleibt beim Nutzer) ---------- */
App.exportData = () => {
  const name = `Vermoegen-Sicherung-${E.iso(new Date())}.json`;
  const blob = new Blob([JSON.stringify(App.st, null, 2)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file], title: 'Vermögen – Sicherung' }).catch(() => {});
  } else {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
};
App.importText = (text) => {
  let data;
  try { data = JSON.parse(text); } catch (e) { alert('Die Datei ist keine gültige Vermögen-Datei.'); return; }
  if (!data || !Array.isArray(data.assets)) { alert('Die Datei enthält keine Vermögensdaten.'); return; }
  if (App.st && (App.st.assets.length || App.st.estates.length) && !confirm('Vorhandene Daten auf diesem Gerät durch die Datei ersetzen?')) return;
  App.st = App.normalize(data); App.save(); App.stack = []; App.tab = 'overview'; App.render();
  App.toast('Daten importiert');
};

V.welcome = () => `
  <div class="welcome stack">
    <div>${H.brand('#96DCFA')}</div>
    <h1>Vermögen</h1>
    <p>Dein Vermögen im Überblick – Anlagen, Immobilien, Kredite, Cashflow und Ziele.<br>
    Alle Daten bleiben ausschließlich auf diesem Gerät.</p>
    <button class="btn" data-act="import">Startdaten importieren</button>
    <button class="btn ghost" data-act="start-empty">Leer beginnen</button>
    ${App.isStandalone() ? '' : `<div class="card" style="text-align:left">${H.hint('Wichtig: Tippe in Safari auf „Teilen“ → „Zum Home-Bildschirm“. Nur dann bleiben die Daten dauerhaft auf dem iPhone gespeichert.', true)}</div>`}
  </div>`;

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('importFile').addEventListener('change', (ev) => {
    const f = ev.target.files && ev.target.files[0]; if (!f) return;
    f.text().then(App.importText); ev.target.value = '';
  });
  App.load(); App.render();
});
