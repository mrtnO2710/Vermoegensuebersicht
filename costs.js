'use strict';
/* Kostenkontrolle – Aufbau wie die monatliche Kostenübersicht:
   Fixkosten, variable Kosten und Sparen getrennt, Beträge auch als Spanne. */

V.costs = () => `<div class="stack">
  <div class="topbar"><h1>Kosten</h1><button class="iconbtn" data-act="edit" data-type="budget" data-kind="expense" aria-label="Kostenpunkt hinzufügen">+</button></div>
  ${V.costsBody()}</div>`;

V.costRow = (b) => {
  const r = E.budgetRange(b), cat = META.budgetCats[b.category] || META.budgetCats.sonstiges;
  const sub = [cat[0], b.interval !== 'monthly' ? META.intervals[b.interval][0].toLowerCase() + ' umgelegt' : ''].filter(Boolean).join(' · ');
  return `<div class="row" data-act="edit" data-type="budget" data-id="${b.id}">
    ${H.badge(CAT_ICON[b.category] || 'dots', cat[1], 32)}
    <div class="main"><div class="ti">${F.esc(b.title)}${b.question ? H.q() : ''}</div><div class="su">${F.esc(sub)}</div></div>
    <div class="end"><div class="v">${F.range(r.min, r.max)}</div>${b.interval !== 'monthly' ? `<div class="x t3">${F.euro(b.amount, 0)} ${F.esc(META.intervals[b.interval][0].toLowerCase())}</div>` : ''}</div>
    <span class="chev">›</span></div>`;
};

V.costsBody = () => {
  const st = App.st, c = E.costSummary(st);
  const hints = st.budget.filter((b) => b.active && b.kind === 'expense' && (b.note || b.question));
  const segs = [['fix', c.fix], ['var', c.vari], ['spar', c.spar]];
  const total = c.total.max || 1;
  const bar = `<div class="bar" style="display:flex;padding:0">${segs.map(([k, s]) => (s.max > 0 ? `<i style="width:${s.max / total * 100}%;background:${META.natures[k][1]};border-radius:0"></i>` : '')).join('')}</div>`;
  const legend = `<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px">${segs.map(([k, s]) => `<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${META.natures[k][1]};margin-right:5px"></i>${META.natures[k][0]} ${F.range(s.min, s.max)}</span>`).join('')}</div>`;

  const section = ([key, s]) => {
    const [label] = META.natures[key], list = c.groups[key];
    return `<div class="card tight">${H.hdr(label, `${list.length} ${list.length === 1 ? 'Posten' : 'Posten'}`, F.range(s.min, s.max))}
      ${list.length ? list.map(V.costRow).join('') : '<div class="t3" style="font-size:12.5px;padding:6px 0">Noch nichts erfasst.</div>'}
      ${H.add('Posten hinzufügen', `data-act="edit" data-type="budget" data-kind="expense" data-nature="${key}"`)}</div>`;
  };

  return `
    <div class="hero">
      <div class="lbl"><span>AUSGABEN IM MONAT</span>${H.brand()}</div>
      <div class="big" style="font-size:${c.spend.max >= 100000 ? 26 : c.spend.max >= 10000 ? 30 : 34}px">${F.range(c.spend.min, c.spend.max)}</div>
      <div class="metrics">${H.m('Fixkosten', F.range(c.fix.min, c.fix.max))}${H.m('Variabel', F.range(c.vari.min, c.vari.max))}${H.m('Sparen', F.range(c.spar.min, c.spar.max))}</div>
    </div>

    <div class="card">${H.hdr('Gesamtüberblick', 'pro Monat')}
      ${H.kv('Ausgaben ohne Sparen', F.range(c.spend.min, c.spend.max))}
      ${H.kv('Sparen & Vermögensaufbau', F.range(c.spar.min, c.spar.max), { cls: 'pos' })}
      ${H.kv('Gesamt inklusive Sparen', F.range(c.total.min, c.total.max), { em: true })}
      ${bar}${legend}
      ${c.income > 0 ? `<div class="sep"></div>${H.kv('Einnahmen', F.euro(c.income, 0), { cls: 'pos', hint: 'aus Planung → Cashflow' })}
        ${H.kv('Bleibt übrig', F.range(c.left.min, c.left.max), { cls: c.left.min >= 0 ? 'pos' : c.left.max >= 0 ? 'warn' : 'neg', em: true })}`
      : `<div class="sep"></div>${H.hint('Noch keine Einnahmen erfasst. Unter Planung → Cashflow eintragen, dann zeigt die App, was übrig bleibt.', true)}`}
    </div>

    ${segs.map(section).join('')}

    <div class="card">${H.hdr('Im Jahr', 'hochgerechnet aus den Monatswerten')}
      ${H.kv('Fixkosten', F.range(c.fix.min * 12, c.fix.max * 12, 0))}
      ${H.kv('Variable Kosten', F.range(c.vari.min * 12, c.vari.max * 12, 0))}
      ${H.kv('Sparen', F.range(c.spar.min * 12, c.spar.max * 12, 0), { cls: 'pos' })}
      ${H.kv('Gesamt', F.range(c.total.min * 12, c.total.max * 12, 0), { em: true })}</div>

    ${hints.length ? `<div class="card">${H.hdr('Hinweise', 'Notizen und offene Fragen')}
      ${hints.map((b) => `<div style="display:flex;gap:8px;padding:5px 0"><span class="t3">•</span><span style="font-size:12.5px;color:var(--t2)"><b style="color:var(--t1)">${F.esc(b.title)}:</b> ${F.esc(b.question || b.note)}</span></div>`).join('')}</div>` : ''}

    <div class="foot">Bei Spannen („400–500 €“) zeigt diese Übersicht beide Werte. Die Monatsbilanz im Cashflow rechnet vorsichtshalber mit dem oberen Wert.</div>`;
};

/* Startseite im Kostenmodus: Einkommen oben, darunter die Abzüge, unten was übrig bleibt. */
V.costoverview = () => {
  const st = App.st, c = E.costSummary(st), cf = E.cashflow(st), pts = E.openPoints(st);
  const hasIncome = c.income > 0;
  const rest = c.left, restColor = rest.min >= 0 ? 'pos' : rest.max >= 0 ? 'warn' : 'neg';
  const top = st.budget.filter((b) => b.active && b.kind === 'expense')
    .map((b) => ({ b, r: E.budgetRange(b) })).filter((x) => x.r.max > 0)
    .sort((x, y) => y.r.max - x.r.max).slice(0, 5);

  /* Balken: Anteile am Einkommen */
  const parts = hasIncome ? [['fix', c.fix.max], ['var', c.vari.max], ['spar', c.spar.max]]
    .map(([k, v]) => [META.natures[k][1], Math.max(0, v) / c.income * 100])
    .concat(rest.min > 0 ? [['rgba(255,255,255,.18)', rest.min / c.income * 100]] : []) : [];
  const bar = hasIncome ? `<div class="bar" style="display:flex;padding:0">${parts.map(([col, w]) => w > 0 ? `<i style="width:${Math.min(100, w)}%;background:${col};border-radius:0"></i>` : '').join('')}</div>` : '';

  return `<div class="stack">
    <div class="topbar"><h1>Übersicht</h1><span class="t3" style="font-size:12px">Stand ${F.date(new Date())}</span></div>

    <div class="hero">
      <div class="lbl"><span>EINKOMMEN IM MONAT</span>${H.brand()}</div>
      <div class="big" style="font-size:${hasIncome ? 38 : 26}px">${hasIncome ? F.euro(c.income, 0) : 'noch nicht erfasst'}</div>
      <div class="metrics">${H.m('Fixkosten', F.range(c.fix.min, c.fix.max, 0))}${H.m('Variabel', F.range(c.vari.min, c.vari.max, 0))}${H.m('Sparen', F.range(c.spar.min, c.spar.max, 0))}</div>
    </div>

    <div class="card">${H.hdr('Monatsrechnung', 'Einkommen abzüglich aller Posten')}
      ${H.kv('Einkommen', hasIncome ? F.euro(c.income, 0) : '—', { cls: 'pos', hint: hasIncome ? `aus ${cf.inc.length} ${cf.inc.length === 1 ? 'Posten' : 'Posten'}` : 'noch nicht eingetragen' })}
      ${H.kv('− Fixkosten', F.range(c.fix.min, c.fix.max), { hint: `${c.groups.fix.length} Posten` })}
      ${H.kv('− Variable Kosten', F.range(c.vari.min, c.vari.max), { hint: `${c.groups.var.length} Posten` })}
      ${H.kv('− Sparen & Vermögensaufbau', F.range(c.spar.min, c.spar.max), { cls: 'pos', hint: 'kein Verbrauch, sondern Rücklage' })}
      <div class="sep"></div>
      ${H.kv('Bleibt übrig', hasIncome ? F.range(rest.min, rest.max) : '—', { cls: restColor, em: true })}
      ${bar}
      ${hasIncome ? `<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12px">
          <span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${META.natures.fix[1]};margin-right:5px"></i>Fixkosten</span>
          <span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${META.natures.var[1]};margin-right:5px"></i>Variabel</span>
          <span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${META.natures.spar[1]};margin-right:5px"></i>Sparen</span>
          ${rest.min > 0 ? '<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3);margin-right:5px"></i>Rest</span>' : ''}
        </div>`
        : `${H.hint('Trage zuerst dein monatliches Einkommen ein – dann rechnet die App aus, was nach allen Kosten übrig bleibt.', true)}
           <button class="btn" style="margin-top:12px" data-act="edit" data-type="budget" data-kind="income">Einkommen eintragen</button>`}
    </div>

    ${top.length ? `<div class="card tight">${H.hdr('Größte Posten', 'pro Monat')}
      ${top.map((x) => V.costRow(x.b)).join('')}
      <button class="add" data-act="tab" data-tab="costs">Alle Kosten ansehen</button></div>` : `<div class="card">${H.hint('Noch keine Kosten erfasst. Unter „Kosten“ kannst du Fixkosten, variable Kosten und Sparen eintragen.', true)}
      <button class="btn" style="margin-top:12px" data-act="tab" data-tab="costs">Kosten erfassen</button></div>`}

    ${hasIncome ? `<div class="card">${H.hdr('Im Jahr', 'hochgerechnet')}
      ${H.kv('Einkommen', F.euro(c.income * 12, 0), { cls: 'pos' })}
      ${H.kv('− Kosten inklusive Sparen', F.range(c.total.min * 12, c.total.max * 12, 0))}
      ${H.kv('Bleibt übrig', F.range(rest.min * 12, rest.max * 12, 0), { cls: restColor, em: true })}</div>` : ''}

    ${pts.length ? `<div class="card">${H.hdr('Offene Punkte', 'Diese Angaben fehlen noch', String(pts.length))}
      ${pts.slice(0, 3).map(V.pointRow).join('')}
      ${pts.length > 3 ? `<button class="linkbtn" data-act="open" data-view="points">Alle ${pts.length} offenen Punkte anzeigen ›</button>` : ''}</div>` : ''}

    <div class="foot">Bei schwankenden Beträgen zeigt die App eine Spanne. Alle Werte bleiben nur auf diesem Gerät.</div>
  </div>`;
};
