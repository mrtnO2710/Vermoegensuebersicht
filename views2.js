'use strict';
/* Ansichten: Immobilien, Darlehen, Planung, Mehr, offene Punkte */
const estIcon = (e) => (e.usage === 'land' ? 'map' : e.usage === 'selfUsed' ? 'house' : 'building');

V.estates = () => {
  const { st, p } = ctx();
  const value = st.estates.reduce((a, e) => a + E.valuation(e), 0), debt = st.estates.reduce((a, e) => a + E.estateDebt(st, e), 0);
  const rent = st.estates.reduce((a, e) => a + e.rent * 12, 0), tax = st.estates.reduce((a, e) => a + E.taxEffect(st, e, p.taxRate), 0);
  const partial = st.estates.some((e) => e.usage === 'rented' && !E.hasTaxBasis(e)), others = st.loans.filter((l) => !l.estateId);
  return `<div class="stack">
    <div class="topbar"><h1>Immobilien</h1><button class="iconbtn" data-act="edit" data-type="estate" aria-label="Immobilie hinzufügen">+</button></div>
    <div class="card">${H.hdr('Immobilien gesamt', `${st.estates.length} Objekte`, F.euro(value - debt, 0))}
      <div class="metrics">${H.m('Wert', F.compact(value))}${H.m('Restschuld', F.compact(debt), 'neg')}${H.m('Eigenkapital', F.compact(value - debt), 'sky')}</div>
      ${H.bar(value > 0 ? (value - debt) / value : 0, 'sky')}
      <div class="metrics two">${H.m('Mieten p. a.', F.euro(rent, 0), 'pos')}${H.m('Steuereffekt p. a.', F.signed(tax), tax >= 0 ? 'pos' : 'neg', partial ? 'nur Objekte mit Miete' : `bei ${F.rate(p.taxRate)}`)}</div></div>
    ${st.estates.map((e) => {
      const d = E.estateDebt(st, e), v = E.valuation(e);
      return `<div class="card" data-act="open" data-view="estate" data-id="${e.id}" style="cursor:pointer">
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px">${H.badge(estIcon(e), '#96DCFA', 40)}
          <div style="flex:1;min-width:0"><div style="font-size:16.5px;font-weight:600">${F.esc(e.name)}${e.question ? H.q() : ''}</div><div class="t3" style="font-size:12px">${F.esc(E.descriptor(e))}</div></div><span class="chev">›</span></div>
        <div class="metrics">${H.m('Wert', F.compact(v), '', e.marketValue > 0 ? 'Marktwert' : 'Kaufpreis')}${H.m('Restschuld', F.compact(d), 'neg')}${H.m('Eigenkapital', F.compact(v - d), 'sky')}</div>
        ${H.bar(v > 0 ? Math.max(0, (v - d) / v) : 0, 'sky')}</div>`;
    }).join('')}
    ${others.length ? `<div class="card tight">${H.hdr('Weitere Kredite', 'ohne Immobilie', others.some((l) => l.balance === 0) ? 'Restschuld offen' : F.euro(others.reduce((a, l) => a + E.loanNow(l), 0), 0))}${others.map(V.loanRow).join('')}</div>` : ''}
    <div class="metrics two">${H.add('Immobilie', 'data-act="edit" data-type="estate"')}${H.add('Kredit', 'data-act="edit" data-type="loan"')}</div>
  </div>`;
};

V.loanRow = (l) => {
  const parts = [], po = E.loanPayoff(l);
  if (l.rate > 0) parts.push(F.pct(l.rate) + ' Zins');
  if (po) parts.push('schuldenfrei ' + F.monthYear(po));
  if (!parts.length) parts.push(E.hasPlan(l) ? META.loanKinds[l.kind] : 'Angaben unvollständig');
  return `<div class="row" data-act="open" data-view="loan" data-id="${l.id}">${H.badge(l.kind === 'mortgage' ? 'bank' : 'card', '#FF6B5A', 34)}
    <div class="main"><div class="ti">${F.esc(l.name)}${l.question || !E.hasPlan(l) ? H.q() : ''}</div><div class="su">${parts.join(' · ')}</div></div>
    <div class="end"><div class="v">${l.balance > 0 ? F.euro(E.loanNow(l), 0) : '—'}</div>${l.payment > 0 ? `<div class="x t3">${F.euro(l.payment, 0)} mtl.</div>` : ''}</div><span class="chev">›</span></div>`;
};

V.estate = (id) => {
  const { st, p } = ctx(), e = App.find('estate', id);
  if (!e) { App.stack.pop(); return V[App.tab](); }
  const loans = E.estateLoans(st, e), debt = E.estateDebt(st, e), v = E.valuation(e), eq = v - debt;
  const eff = E.taxEffect(st, e, p.taxRate), cf = E.estateCashflow(st, e), cfTax = cf + eff / 12;
  const dep = E.isDep(e)
    ? H.kv('Bemessungsgrundlage', F.euro(E.depBase(e), 0), { hint: `Kaufpreis + Nebenkosten ohne ${F.rate(e.landShare)} Grundstück` })
      + H.kv('AfA-Satz', F.rate(e.depRate))
      + H.kv('AfA pro Jahr', F.euro(E.annualDep(e), 0), { em: true, hint: e.manualDep > 0 ? 'manuell vorgegeben' : 'automatisch berechnet' })
      + H.kv('Bisher abgeschrieben', F.euro(E.accumDep(e), 0), { hint: e.purchaseDate ? `seit ${F.date(e.purchaseDate)}` : 'Kaufdatum fehlt' })
      + H.kv('Restbuchwert', F.euro(e.purchasePrice + e.purchaseCosts - E.accumDep(e), 0))
    : '<div class="t2" style="font-size:12.5px">AfA wird nur bei vermieteten Gebäuden angesetzt. Nutzung und AfA lassen sich unter „Bearbeiten“ ändern.</div>';
  const tax = e.usage === 'rented'
    ? H.kv('Mieteinnahmen', F.euro(e.rent * 12, 0), { cls: 'pos' }) + H.kv('− Bewirtschaftungskosten', F.euro(e.costs * 12, 0))
      + H.kv('− Schuldzinsen', F.euro(E.annualInterest(st, e), 0), { hint: e.manualInterest > 0 ? 'manuell vorgegeben' : 'aus Darlehen, nächste 12 Monate' })
      + H.kv('− Abschreibung (AfA)', F.euro(E.annualDep(e), 0)) + '<div class="sep"></div>'
      + H.kv('Steuerliches Ergebnis', F.signed(E.taxable(st, e)), { em: true })
      + (E.hasTaxBasis(e)
        ? H.kv(eff >= 0 ? 'Steuerersparnis' : 'Steuerlast', F.euro(Math.abs(eff), 0), { cls: eff >= 0 ? 'pos' : 'neg', hint: `bei Steuersatz ${F.rate(p.taxRate)} (Annahme)` })
        : `<div style="margin-top:8px">${H.hint('Mieteinnahmen fehlen – der Steuereffekt wird berechnet, sobald die Miete erfasst ist.')}</div>`)
    : '<div class="t2" style="font-size:12.5px">Bei selbstgenutzten Objekten und unbebauten Grundstücken werden Zinsen und AfA hier nicht angesetzt.</div>';
  return `<div class="stack">
    ${H.top(e.name, true, `<button class="linkbtn" data-act="edit" data-type="estate" data-id="${e.id}">Bearbeiten</button>`)}
    <div class="card">${H.hdr('Kauf & Wert', [E.descriptor(e), e.location].filter(Boolean).join(' · '))}
      ${H.kv('Kaufpreis', e.purchasePrice > 0 ? F.euro(e.purchasePrice, 0) : '—')}${H.kv('Kaufnebenkosten', e.purchaseCosts > 0 ? F.euro(e.purchaseCosts, 0) : '—')}
      ${H.kv('Kaufdatum', F.date(e.purchaseDate))}
      ${H.kv('Aktueller Wert', F.euro(v, 0), { hint: e.marketValue > 0 ? 'Markt- / Gutachtenwert' : 'Kaufpreis angesetzt – Marktwert fehlt' })}
      <div class="sep"></div>
      ${H.kv('Restschuld heute', F.euro(debt, 0), { cls: 'neg', hint: 'aus den Darlehen fortgeschrieben' })}
      ${H.kv('Eigenkapital', F.euro(eq, 0), { cls: 'sky', em: true, hint: `Quote ${F.pct(v > 0 ? Math.max(0, eq / v * 100) : 0, 0)}` })}</div>
    <div class="card">${H.hdr('Abschreibung (AfA)', E.isDep(e) ? 'Gebäudeanteil, linear' : 'Für diese Nutzung keine AfA')}${dep}</div>
    <div class="card tight">${H.hdr('Darlehen', null, F.euro(debt, 0))}
      ${loans.length ? loans.map(V.loanRow).join('') : '<div class="t3" style="font-size:12.5px;padding:6px 0">Keine Darlehen zugeordnet.</div>'}
      ${H.add('Darlehen hinzufügen', `data-act="edit" data-type="loan" data-estate="${e.id}"`)}</div>
    <div class="card">${H.hdr('Steuerliche Betrachtung', 'Einkünfte aus Vermietung, pro Jahr')}${tax}</div>
    <div class="card">${H.hdr('Cashflow', 'pro Monat')}
      ${H.kv('Kaltmiete', F.euro(e.rent, 0), { cls: 'pos' })}${H.kv('− Kosten', F.euro(e.costs, 0))}${H.kv('− Kreditraten', F.euro(E.loanPayments(st, e), 0))}<div class="sep"></div>
      ${H.kv('vor Steuern', F.signed(cf), { cls: cf >= 0 ? 'pos' : 'neg', em: true })}${e.usage === 'rented' ? H.kv('nach Steuern', F.signed(cfTax), { cls: cfTax >= 0 ? 'pos' : 'neg' }) : ''}</div>
    ${H.notes(e.question, e.note)}
  </div>`;
};

V.loan = (id) => {
  const { st } = ctx(), l = App.find('loan', id);
  if (!l) { App.stack.pop(); return V[App.tab](); }
  const est = st.estates.find((e) => e.id === l.estateId), sched = E.loanSchedule(l), now = E.loanNow(l), po = E.loanPayoff(l);
  const pts = [{ x: E.today(), y: now }].concat(sched.filter((x, i) => (i + 1) % 12 === 0 || i === sched.length - 1).map((x) => ({ x: x.date, y: x.balance })));
  const warn = !E.hasPlan(l) ? 'Trage Restschuld, Monatsrate und Zinssatz ein – dann schreibt die App die Restschuld automatisch fort und berechnet Zins- und Tilgungsanteil.'
    : !E.coversInterest(l) ? 'Die Rate deckt die Zinsen nicht – die Restschuld sinkt so nicht.' : '';
  return `<div class="stack">
    ${H.top(l.name, true, `<button class="linkbtn" data-act="edit" data-type="loan" data-id="${l.id}">Bearbeiten</button>`)}
    <div class="card"><div style="display:flex;gap:12px;align-items:center">${H.badge(l.kind === 'mortgage' ? 'bank' : 'card', '#FF6B5A', 40)}<div><b>${META.loanKinds[l.kind]}</b><div class="t3" style="font-size:12px">${est ? 'Immobilie ' + F.esc(est.name) : (l.lender ? F.esc(l.lender) : 'ohne Immobilie')}</div></div></div>
      <div class="v ${l.balance > 0 ? '' : 'warn'}" style="font-size:30px;font-weight:700;margin:12px 0 4px">${l.balance > 0 ? F.euro(now) : 'Restschuld fehlt'}</div>
      ${l.balance > 0 ? `<div class="t3" style="font-size:12px">Restschuld heute · bekannt: ${F.euro(l.balance, 0)} am ${F.date(l.balanceDate)}</div>` : ''}</div>
    ${warn ? `<div class="card">${H.hint(warn)}</div>` : ''}
    <div class="card">${H.hdr('Konditionen')}
      ${H.kv('Kreditgeber', l.lender ? F.esc(l.lender) : '—')}${H.kv('Sollzins p. a.', l.rate > 0 ? F.pct(l.rate, 3) : '—')}${H.kv('Monatsrate', l.payment > 0 ? F.euro(l.payment) : '—')}
      ${H.kv('Sondertilgung p. a.', l.special > 0 ? F.euro(l.special, 0) : '—')}${H.kv('Zinsbindung bis', F.date(l.fixedUntil))}${H.kv('Ursprungsbetrag', l.original > 0 ? F.euro(l.original, 0) : '—')}</div>
    ${sched.length ? `<div class="card">${H.hdr('Tilgungsverlauf', 'automatisch aus Rate, Zins und Sondertilgung')}
      ${H.line([{ color: '#FF6B5A', points: pts }], { area: true, height: 150 })}
      ${H.kv('Zinsen nächste 12 Monate', F.euro(E.loanInterest12(l), 0), { cls: 'neg' })}${H.kv('Tilgung nächste 12 Monate', F.euro(E.loanPrincipal12(l), 0), { cls: 'pos' })}
      ${l.fixedUntil && E.d(l.fixedUntil) > E.today() ? H.kv('Restschuld Ende Zinsbindung', F.euro(E.loanBalanceAt(l, E.d(l.fixedUntil)), 0)) : ''}
      ${H.kv('Schuldenfrei voraussichtlich', po ? F.monthYear(po) : 'nicht absehbar', { em: true })}</div>` : ''}
    ${H.notes(l.question, l.note)}
  </div>`;
};

/* ---------- Planung ---------- */
V.planning = () => {
  const { st, s } = ctx();
  const seg = `<div class="seg">${[['cashflow', 'Cashflow'], ['goals', 'Ziele'], ['forecast', 'Prognose']].map(([k, l]) => `<button class="${App.area === k ? 'on' : ''}" data-act="area" data-area="${k}">${l}</button>`).join('')}</div>`;
  let body;
  if (App.area === 'cashflow') {
    const cf = E.cashflow(st);
    body = `<div class="card">${H.hdr('Monatsbilanz')}<div class="metrics">${H.m('Einnahmen', F.euro(cf.incomeTotal, 0), 'pos')}${H.m('Ausgaben', F.euro(cf.expenseTotal, 0), 'neg')}${H.m('Saldo', F.signed(cf.balance), cf.balance >= 0 ? 'acc' : 'warn')}</div>
      <div style="margin-top:12px">${H.hint('Posten mit „auto“ stammen aus Anlagen, Immobilien und Krediten und ändern sich dort automatisch mit.', true)}</div></div>
      ${V.cfCard('Einnahmen', cf.inc, cf.incomeTotal, 'income')}${V.cfCard('Ausgaben', cf.exp, cf.expenseTotal, 'expense')}`;
  } else if (App.area === 'goals') {
    body = st.goals.slice().sort((a, b) => a.date.localeCompare(b.date)).map((g) => V.goalCard(g, s, true)).join('') + H.add('Ziel hinzufügen', 'data-act="edit" data-type="goal"');
  } else {
    const monthly = App.fc.monthly ?? s.contributions;
    body = `<div class="card">${H.hdr('Annahmen', 'Kapitalanlagen ohne Immobilien')}
      ${H.kv('Startwert heute', F.euro(s.investments, 0))}
      <div class="fbox" style="margin:10px 0;background:rgba(255,255,255,.05)"><div class="f"><label for="fcMonthly">Sparrate mtl.</label><input id="fcMonthly" type="text" inputmode="decimal" value="${F.editable(monthly)}"><span class="suf">€</span></div></div>
      ${App.fc.monthly != null && Math.abs(App.fc.monthly - s.contributions) > 0.5 ? `<button class="linkbtn" data-act="fc-reset">↺ Ist-Sparrate übernehmen (${F.euro(s.contributions, 0)})</button>` : ''}
      <div class="kv"><span class="k">Zeitraum</span><b id="fcYearsLbl">${App.fc.years} Jahre</b></div>
      <input id="fcYears" type="range" min="3" max="30" step="1" value="${App.fc.years}"></div>
      <div id="fcResults">${V.forecastResults()}</div>`;
  }
  return `<div class="stack"><h1>Planung</h1>${seg}${body}</div>`;
};

V.cfCard = (title, lines, total, kind) => `<div class="card tight">${H.hdr(title, null, F.euro(total, 0))}
  ${lines.map((l) => {
    const item = l.ref ? App.find('budget', l.ref.id) : null;
    const ic = item ? CAT_ICON[item.category] : l.title.startsWith('Miete') ? 'building' : l.title.startsWith('Sparpl') ? 'chart' : l.title.startsWith('Kosten') ? 'tool' : 'bank';
    return `<div class="row" ${l.ref ? `data-act="edit" data-type="budget" data-id="${l.ref.id}"` : 'style="cursor:default"'}>${H.badge(ic, l.color, 32)}
      <div class="main"><div class="ti">${F.esc(l.title)}${l.flag ? H.q() : ''}</div><div class="su">${F.esc(l.sub)}</div></div>
      <div class="end"><div class="v">${F.euro(l.amount, 0)}</div></div>${l.auto ? H.pill('auto') : '<span class="chev">›</span>'}</div>`;
  }).join('')}
  ${H.add(kind === 'income' ? 'Einnahme hinzufügen' : 'Ausgabe hinzufügen', `data-act="edit" data-type="budget" data-kind="${kind}"`)}</div>`;

V.forecastResults = () => {
  const { st, s } = ctx();
  const monthly = App.fc.monthly ?? s.contributions, years = App.fc.years, base = s.rate;
  const sc = [[Math.max(0, base - 2), '#96DCFA'], [base, '#00A5E1'], [base + 2, '#3DDC97']];
  const goal = st.goals.find((g) => g.scope === 'investments');
  const val = (r, m) => E.fv(s.investments, monthly, r, m);
  const series = sc.map(([r, c]) => ({ color: c, points: Array.from({ length: years + 1 }, (_, y) => ({ x: E.addMonths(E.today(), y * 12), y: val(r, y * 12) })) }));
  const forty = E.d(`${st.profile.birthYear + 40}-01-01`), m40 = E.months(E.today(), forty);
  return `<div class="stack">
    <div class="card">${H.hdr('Entwicklung', 'drei Rendite-Szenarien')}${H.line(series, { height: 210, goal: goal ? goal.target : null })}
      <div style="display:flex;gap:14px;font-size:12px;margin-top:8px">${sc.map(([r, c]) => `<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${c};margin-right:5px"></i>${F.rate(r)}</span>`).join('')}</div></div>
    <div class="card">${H.hdr('Hochrechnung', `Sparrate ${F.euro(monthly, 0)} mtl.`)}
      <div class="gridt"><b>Jahre</b>${sc.map(([r, c]) => `<b style="color:${c}">${F.rate(r)}</b>`).join('')}
        ${[5, 10, 15, 20].map((y) => `<span>${y}</span>${sc.map(([r]) => `<b class="v">${F.compact(val(r, y * 12))}</b>`).join('')}`).join('')}</div></div>
    ${forty > E.today() ? `<div class="card">${H.hdr('Mit 40', `am ${F.date(forty)} · in ${m40} Monaten`)}${sc.map(([r]) => H.kv('Szenario ' + F.rate(r), F.euro(val(r, m40), 0))).join('')}${goal ? '<div class="sep"></div>' + H.kv('Ziel', F.euro(goal.target, 0), { cls: 'warn', hint: goal.title }) : ''}</div>` : ''}
    <div class="foot">Prognosen sind Rechenbeispiele mit konstanter Rendite und ersetzen keine Anlageberatung.</div></div>`;
};
App.renderForecast = () => {
  const el = document.getElementById('fcResults'); if (el) el.innerHTML = V.forecastResults();
  const lbl = document.getElementById('fcYearsLbl'); if (lbl) lbl.textContent = `${App.fc.years} Jahre`;
};

/* ---------- Mehr & offene Punkte ---------- */
V.more = () => {
  const { st, p } = ctx(), pts = E.openPoints(st);
  const initials = (p.name || '?').split(' ').slice(0, 2).map((w) => w[0] || '').join('');
  return `<div class="stack"><h1>Mehr</h1>
    <div class="card" data-act="edit" data-type="profile" style="cursor:pointer;display:flex;gap:14px;align-items:center">
      <div style="width:50px;height:50px;border-radius:50%;background:linear-gradient(135deg,#003781,#0072B8);display:grid;place-items:center;font-weight:700;flex:none">${F.esc(initials)}</div>
      <div style="flex:1"><div style="font-size:17px;font-weight:600">${F.esc(p.name || 'Profil')}</div><div class="t3" style="font-size:12px">${new Date().getFullYear() - p.birthYear} Jahre · Jahrgang ${p.birthYear}</div></div><span class="chev">›</span></div>
    <div class="card">${H.hdr('Annahmen & Regeln')}
      ${H.kv('Rendite-Annahme', F.rate(p.expectedReturn) + ' p. a.', { hint: 'für Fortschreibung, Ziele und Prognose' })}${H.kv('Grenzsteuersatz', F.rate(p.taxRate), { hint: 'für Zinsen und AfA bei Vermietung' })}
      ${H.kv('Tagesgeld-Minimum', F.euro(p.reserveMinimum, 0))}${H.kv('Kontoausgleich', `am ${p.giroDay}. auf ${F.euro(p.giroTarget, 0)}`)}
      <button class="linkbtn" style="width:100%;margin-top:6px" data-act="edit" data-type="profile">Anpassen</button></div>
    <div class="card" data-act="open" data-view="points" style="cursor:pointer;display:flex;gap:12px;align-items:center">${H.badge('list', pts.length ? '#FFB547' : '#3DDC97', 38)}
      <div style="flex:1"><b>Offene Punkte</b><div class="t3" style="font-size:12px">${pts.length ? pts.length + ' Angaben fehlen noch' : 'Alles vollständig erfasst'}</div></div><span class="chev">›</span></div>
    <div class="card">${H.hdr('Daten & Sicherung', 'Alles liegt nur auf diesem Gerät')}
      <div class="stack" style="gap:10px"><button class="btn" data-act="export">Sicherung exportieren</button>
        <button class="btn ghost" data-act="import">Sicherung / Startdaten importieren</button>
        <button class="danger" data-act="wipe">Alle Daten auf diesem Gerät löschen</button></div>
      <div class="help">Exportiere regelmäßig eine Sicherung, z. B. in „Dateien“ oder per AirDrop. Werden die Safari-Websitedaten gelöscht oder geht das iPhone verloren, lässt sich damit alles wiederherstellen.</div></div>
    <div class="card">${H.brand('#96DCFA')}<div style="font-size:17px;font-weight:600;margin-top:8px">Vermögen</div>
      <div class="t2" style="font-size:12.5px;line-height:1.45;margin-top:6px">Die App speichert nichts im Internet. Alle Eingaben bleiben auf diesem Gerät. Sie ersetzt keine Anlage- oder Steuerberatung.</div>
      <div class="t3" style="font-size:11.5px;margin-top:6px">Version 1.0 (Web)</div></div>
  </div>`;
};

V.points = () => {
  const pts = E.openPoints(App.st);
  return `<div class="stack">${H.top('Offene Punkte')}
    <div class="card">${H.hint('Tippe auf einen Punkt, um die fehlenden Angaben einzutragen. Sind alle Felder ausgefüllt und die offene Frage gelöscht, verschwindet der Punkt automatisch.', true)}</div>
    ${!pts.length ? `<div class="card">${H.hint('Alles vollständig erfasst.', true)}</div>` : ''}
    ${['Anlagen', 'Immobilien', 'Darlehen & Kredite', 'Budget'].map((g) => {
      const items = pts.filter((x) => x.group === g);
      return items.length ? `<div class="card tight">${H.hdr(g, null, String(items.length))}${items.map(V.pointRow).join('')}</div>` : '';
    }).join('')}
  </div>`;
};
