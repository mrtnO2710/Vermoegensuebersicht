'use strict';
/* Ansichten: Übersicht und Anlagen */
const ctx = () => ({ st: App.st, s: E.summary(App.st), p: App.st.profile });
const CAT_ICON = { einkommen: 'brief', lebenshaltung: 'cart', absicherung: 'shield', wohnen: 'house', mobilitaet: 'card', freizeit: 'target', sonstiges: 'dots' };

V.overview = () => {
  const { st, s, p } = ctx();
  const cf = E.cashflow(st), pts = E.openPoints(st);
  const goals = st.goals.slice().sort((a, b) => a.date.localeCompare(b.date));
  const goal = goals.find((g) => E.scopeValue(s, g.scope) < g.target) || goals[0];
  const slices = Object.entries(META.classes).map(([k, [l, c]]) => ({ title: l, color: c, value: s.sumCls(k) })).filter((x) => x.value > 0);
  if (s.estateEquity > 0) slices.push({ title: 'Immobilien-Eigenkapital', color: '#96DCFA', value: s.estateEquity });
  slices.sort((a, b) => b.value - a.value);
  const tot = slices.reduce((a, x) => a + x.value, 0) || 1;
  const missingRent = st.estates.some((e) => e.usage === 'rented' && e.rent === 0);
  const tax = st.estates.reduce((a, e) => a + E.taxEffect(st, e, p.taxRate), 0);
  const reserveOK = s.liquidity >= p.reserveMinimum, giro = s.giro;
  const diff = giro ? giro.value - p.giroTarget : 0;
  const giroText = !giro || giro.value <= 0 ? `Kontostand im Girokonto eintragen (Ziel ${F.euro(p.giroTarget, 0)})`
    : Math.abs(diff) < 1 ? 'Girokonto steht auf dem Zielwert.'
    : diff > 0 ? `${F.euro(diff, 0)} aufs Tagesgeld übertragen` : `${F.euro(-diff, 0)} vom Tagesgeld holen`;

  return `<div class="stack">
    <h1>Vermögen</h1>
    <div class="topbar" style="min-height:0"><b>Hallo ${F.esc((p.name || '').split(' ')[0])}</b><span class="t3" style="font-size:12px">Stand ${F.date(new Date())}</span></div>
    ${App.isStandalone() ? '' : `<div class="card tight">${H.hint('Tipp: In Safari „Teilen“ → „Zum Home-Bildschirm“ – nur dann bleiben die Daten dauerhaft gespeichert.', true)}</div>`}
    <div class="hero">
      <div class="lbl"><span>NETTOVERMÖGEN</span>${H.brand()}</div>
      <div class="big">${F.euro(s.netWorth, 0)}</div>
      <div class="metrics">${H.m('Kapitalanlagen', F.compact(s.investments))}${H.m('Immobilien', F.compact(s.estateValue))}${H.m('Schulden', F.compact(-s.debt))}</div>
    </div>
    ${goal ? V.goalCard(goal, s) : ''}
    <div class="card">${H.hdr('Vermögensstruktur', 'Kapitalanlagen und Eigenkapital der Immobilien')}
      <div class="donut">${H.donut(slices)}<div class="legend">${slices.map((x) => `<div><i style="background:${x.color}"></i><span>${F.esc(x.title)}</span><b class="num">${F.pct(x.value / tot * 100, 0)}</b></div>`).join('')}</div></div></div>
    <div class="card">${H.hdr('Monatlicher Cashflow', 'inkl. Sparplänen und Kreditraten')}
      <div class="metrics">${H.m('Einnahmen', F.euro(cf.incomeTotal, 0), 'pos')}${H.m('Ausgaben', F.euro(cf.expenseTotal, 0), 'neg')}${H.m('Saldo', F.signed(cf.balance), cf.balance >= 0 ? 'acc' : 'warn')}</div>
      ${H.bar(cf.incomeTotal > 0 ? cf.expenseTotal / cf.incomeTotal : 1, cf.balance >= 0 ? '' : 'warn')}
      ${cf.exp.slice(0, 4).map((l) => H.kv(l.title, F.euro(l.amount, 0), { hint: l.sub })).join('')}
      ${missingRent ? `<div style="margin-top:10px">${H.hint('Mieteinnahmen der Immobilien sind noch nicht erfasst – der Saldo ist deshalb vorläufig.', true)}</div>` : ''}
    </div>
    ${st.estates.length ? `<div class="card">${H.hdr('Immobilien', `${st.estates.length} Objekte`)}
      <div class="metrics">${H.m('Wert', F.compact(s.estateValue))}${H.m('Restschuld', F.compact(s.estateDebt), 'neg')}${H.m('Eigenkapital', F.compact(s.estateEquity), 'sky')}</div>
      ${H.bar(s.estateValue > 0 ? s.estateEquity / s.estateValue : 0, 'sky')}
      ${H.kv('Steuereffekt Vermietung p. a.', F.signed(tax), { cls: tax >= 0 ? 'pos' : 'neg',
        hint: (st.estates.some((e) => e.usage === 'rented' && !E.hasTaxBasis(e)) ? 'nur Objekte mit erfasster Miete' : 'Zinsen und AfA abgezogen') + ` · Steuersatz ${F.rate(p.taxRate)}` })}</div>` : ''}
    <div class="card">${H.hdr('Regeln')}
      ${V.rule(reserveOK ? 'check' : 'shield', reserveOK ? '#3DDC97' : '#FFB547', 'Liquiditätsreserve', `${F.euro(s.liquidity, 0)} · Minimum ${F.euro(p.reserveMinimum, 0)}`)}
      <div class="sep"></div>
      ${V.rule('cal', giro && giro.value > 0 ? '#00A5E1' : '#FFB547', `Kontoausgleich am ${F.date(E.nextDate(p.giroDay))}`, giroText)}
    </div>
    <div class="card">${H.hdr('Offene Punkte', pts.length ? 'Diese Angaben fehlen noch' : 'Alles vollständig erfasst', pts.length ? String(pts.length) : null)}
      ${pts.slice(0, 4).map(V.pointRow).join('')}
      ${pts.length > 4 ? `<button class="linkbtn" data-act="open" data-view="points">Alle ${pts.length} offenen Punkte anzeigen ›</button>` : ''}
    </div>
    <div class="foot">Alle Werte sind Näherungen auf Basis deiner Eingaben und ersetzen keine Anlage- oder Steuerberatung.</div>
  </div>`;
};

V.rule = (ic, c, t, d) => `<div class="row" style="cursor:default;border:0">${H.badge(ic, c, 32)}<div class="main"><div class="ti">${F.esc(t)}</div><div class="su t2">${F.esc(d)}</div></div></div>`;

V.pointRow = (pt) => {
  const ic = { asset: 'chart', estate: 'building', loan: 'bank', budget: 'list' }[pt.ref.type];
  return `<div class="row" data-act="edit" data-type="${pt.ref.type}" data-id="${pt.ref.id}" style="align-items:flex-start">
    ${H.badge(ic, '#FFB547', 32)}
    <div class="main"><div class="ti" style="font-weight:600">${F.esc(pt.title)}${pt.context !== pt.title ? ` <span class="t3" style="font-size:11px;font-weight:400">${F.esc(pt.context)}</span>` : ''}</div>
      ${pt.missing.length ? `<div class="su warn" style="font-weight:500">Fehlt: ${F.esc(pt.missing.join(', '))}</div>` : ''}
      ${pt.question ? `<div class="su t2">${F.esc(pt.question)}</div>` : ''}</div>
    <span class="chev">›</span></div>`;
};

V.goalCard = (g, s, clickable = false) => {
  const cur = E.scopeValue(s, g.scope), fc = E.goalForecast(s, g), prog = g.target > 0 ? cur / g.target : 0;
  const reached = cur >= g.target, onTrack = fc >= g.target, req = E.goalRequired(s, g);
  const pill = reached ? H.pill('Erreicht', 'pos') : onTrack ? H.pill('Auf Kurs') : H.pill('Lücke', 'warn');
  return `<div class="card" ${clickable ? `data-act="edit" data-type="goal" data-id="${g.id}" style="cursor:pointer"` : ''}>
    <div class="hdr"><div><div style="font-size:16px;font-weight:600">${F.esc(g.title)}</div><div class="s">${META.scopes[g.scope]} · bis ${F.date(g.date)}</div></div>${pill}</div>
    <div style="display:flex;align-items:baseline;gap:6px"><span class="v" style="font-size:22px;font-weight:700">${F.euro(cur, 0)}</span><span class="t3" style="font-size:13px">von ${F.euro(g.target, 0)}</span><span style="flex:1"></span><b class="${reached ? 'pos' : 'acc'}">${F.pct(prog * 100, 0)}</b></div>
    ${H.bar(prog, reached ? 'pos' : '')}
    ${reached ? '' : H.kv('Prognose zum Zieldatum', F.euro(fc, 0), { cls: onTrack ? 'pos' : 'warn', hint: `${F.rate(s.rate)} p. a. · ${F.euro(E.scopeMonthly(s, g.scope), 0)} mtl.` })}
    ${!reached && !onTrack && req != null ? H.kv('Nötige Sparrate', F.euro(req, 0) + ' mtl.', { cls: 'warn' }) : ''}
    ${g.note ? `<div class="t3" style="font-size:12px;margin-top:6px">${F.esc(g.note)}</div>` : ''}
  </div>`;
};

V.assets = () => {
  const { st, s } = ctx();
  const known = st.assets.filter((a) => a.active && a.invested > 0);
  const inv = known.reduce((x, a) => x + a.invested, 0), gain = known.reduce((x, a) => x + a.value - a.invested, 0);
  const groups = Object.entries(META.classes).map(([k, m]) => [m, st.assets.filter((a) => a.cls === k)]).filter((g) => g[1].length);
  return `<div class="stack">
    <div class="topbar"><h1>Anlagen</h1><button class="iconbtn" data-act="edit" data-type="asset" aria-label="Anlage hinzufügen">+</button></div>
    <div class="card">${H.hdr('Kapitalanlagen gesamt', null, F.euro(s.investments, 0))}
      <div class="metrics">${H.m('Eingezahlt', F.compact(inv), '', `${known.length} Anlagen bekannt`)}${H.m('Gewinn', F.signed(gain), gain >= 0 ? 'pos' : 'neg', inv > 0 ? F.pct(gain / inv * 100, 1) : '')}${H.m('Sparraten', F.euro(s.contributions, 0), '', 'pro Monat')}</div></div>
    ${groups.map(([[label, color, ic], items]) => {
      const sorted = items.slice().sort((a, b) => (b.active - a.active) || (b.value - a.value));
      const total = items.reduce((x, a) => x + E.assetNow(a, s.rate), 0);
      return `<div class="card tight"><div class="hdr" style="align-items:center;margin-bottom:4px"><div style="display:flex;align-items:center;gap:10px">${H.badge(ic, color, 30)}<b>${label}</b></div><div class="r t2">${F.euro(total, 0)}</div></div>
        ${sorted.map((a) => V.assetRow(a, s.rate)).join('')}</div>`;
    }).join('')}
    ${H.add('Anlage hinzufügen', 'data-act="edit" data-type="asset"')}
  </div>`;
};

V.assetRow = (a, rate) => {
  const parts = [];
  if (a.monthly > 0) parts.push(F.euro(a.monthly, 0) + ' mtl.');
  if (a.returnPA) parts.push(F.pct(a.returnPA) + ' p. a.');
  if (!a.active) parts.push('inaktiv');
  if (!parts.length) parts.push('Stand ' + F.date(a.valueDate));
  const g = E.gain(a);
  return `<div class="row" data-act="open" data-view="asset" data-id="${a.id}" style="${a.active ? '' : 'opacity:.45'}">
    <div class="main"><div class="ti">${F.esc(a.name)}${a.question ? H.q() : ''}</div><div class="su">${parts.join(' · ')}</div></div>
    <div class="end"><div class="v">${F.euro(E.assetNow(a, rate), 0)}</div>${g != null ? `<div class="x ${g >= 0 ? 'pos' : 'neg'}">${F.signed(g)}</div>` : E.assetEstimated(a) ? H.pill('Schätzung') : ''}</div>
    <span class="chev">›</span></div>`;
};

V.asset = (id) => {
  const { s } = ctx(), a = App.find('asset', id);
  if (!a) { App.stack.pop(); return V[App.tab](); }
  const [label, color, ic] = META.classes[a.cls] || META.classes.sonstiges;
  const cur = E.assetNow(a, s.rate), g = E.gain(a);
  const snaps = a.snapshots.slice().sort((x, y) => x.date.localeCompare(y.date)), rev = snaps.slice().reverse();
  return `<div class="stack">
    ${H.top('', true, `<button class="linkbtn" data-act="edit" data-type="asset" data-id="${a.id}">Bearbeiten</button>`)}
    <div class="card"><div style="display:flex;gap:12px;align-items:center">${H.badge(ic, color, 40)}<div><b>${F.esc(a.name)}</b><div class="t3" style="font-size:12px">${label}${a.provider ? ' · ' + F.esc(a.provider) : ''}</div></div></div>
      <div class="v" style="font-size:32px;font-weight:700;margin:12px 0 6px">${F.euro(cur)}</div>
      ${E.assetEstimated(a) ? H.hint(`Schätzung für heute. Letzter bekannter Stand: ${F.euro(a.value)} am ${F.date(a.valueDate)}.`, true)
        : `<div class="t3" style="font-size:12px">Stand ${F.date(a.valueDate)}${a.reference ? ' · Nr. ' + F.esc(a.reference) : ''}</div>`}</div>
    <div class="card"><div class="metrics two" style="row-gap:16px">
      ${H.m('Eingezahlt', a.invested > 0 ? F.euro(a.invested, 0) : '—')}
      ${H.m('Gewinn', g != null ? F.signed(g) : '—', g != null && g < 0 ? 'neg' : 'pos', g != null ? F.pct(g / a.invested * 100, 1) : '')}
      ${H.m('Rendite p. a.', a.returnPA ? F.pct(a.returnPA) : '—', '', a.returnPA ? 'laut Bericht' : '')}
      ${H.m('Sparrate', a.monthly > 0 ? F.euro(a.monthly, 0) + ' mtl.' : '—')}</div></div>
    <div class="card">${H.hdr('Verlauf', `${snaps.length} Stichtage`)}
      ${snaps.length >= 2 ? H.line([{ color: '#00A5E1', points: snaps.map((x) => ({ x: E.d(x.date), y: x.value })) }], { area: true, dots: true }) : ''}
      ${rev.map((x, i) => {
        const prev = rev[i + 1];
        return `<div class="kv"><span class="k">${F.date(x.date)}</span><span style="display:flex;gap:10px;align-items:baseline">${prev ? `<span class="${x.value >= prev.value ? 'pos' : 'neg'}" style="font-size:11.5px">${F.signed(x.value - prev.value)}</span>` : ''}<b class="v">${F.euro(x.value, 0)}</b><button class="linkbtn" style="padding:0 0 0 4px;color:var(--t3)" data-act="snap-del" data-id="${a.id}" data-date="${x.date}" aria-label="Verlaufspunkt löschen">✕</button></span></div>`;
      }).join('')}
      ${H.add('Verlaufspunkt hinzufügen', `data-act="edit" data-type="snapshot" data-parent="${a.id}"`)}
    </div>
    ${H.notes(a.question, a.note)}
  </div>`;
};
