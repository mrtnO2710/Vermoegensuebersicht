'use strict';
/* Kategorien, Cashflow, offene Punkte und deutsche Formatierung. */
const META = {
  classes: {
    fondsdepot: ['Fondsdepot', '#00A5E1', 'chart'], aktien: ['Aktien', '#5B8DEF', 'bars'],
    krypto: ['Kryptowährungen', '#FFB547', 'coin'], versicherung: ['Lebensversicherung', '#9B7BF0', 'shield'],
    tagesgeld: ['Tagesgeld & Bargeld', '#3DDC97', 'cash'], giro: ['Girokonto', '#30C9C9', 'card'],
    privat: ['Privat', '#F06BA8', 'person'], sonstiges: ['Sonstiges', '#8A99A8', 'dots'],
  },
  usage: { rented: 'Vermietet', selfUsed: 'Selbstgenutzt', land: 'Unbebautes Grundstück' },
  loanKinds: { mortgage: 'Immobiliendarlehen', consumer: 'Ratenkredit', other: 'Sonstiger Kredit' },
  budgetCats: {
    einkommen: ['Einkommen', '#3DDC97'], lebenshaltung: ['Lebenshaltung', '#FF8A5B'], absicherung: ['Absicherung', '#9B7BF0'],
    wohnen: ['Wohnen', '#00A5E1'], mobilitaet: ['Mobilität', '#30C9C9'], freizeit: ['Freizeit', '#96DCFA'], sonstiges: ['Sonstiges', '#8A99A8'],
  },
  intervals: { monthly: ['Monatlich', 1], quarterly: ['Vierteljährlich', 1 / 3], yearly: ['Jährlich', 1 / 12] },
  scopes: { investments: 'Kapitalanlagen', funds: 'Fondsdepots', netWorth: 'Nettovermögen' },
  natures: { fix: ['Fixkosten', '#00A5E1'], var: ['Variable Kosten', '#FF8A5B'], spar: ['Sparen & Vermögensaufbau', '#3DDC97'] },
};

E.descriptor = (e) => {
  const u = META.usage[e.usage];
  return e.kind && !u.toLowerCase().includes(e.kind.toLowerCase()) ? `${e.kind} · ${u}` : u;
};

/* Cashflow: manuelle Posten + automatische Posten aus Anlagen, Immobilien und Krediten */
E.cashflow = (st) => {
  const inc = [], exp = [];
  st.budget.filter((b) => b.active).forEach((b) => {
    const [cat, color] = META.budgetCats[b.category] || META.budgetCats.sonstiges;
    const [intLabel, f] = META.intervals[b.interval] || META.intervals.monthly;
    (b.kind === 'income' ? inc : exp).push({
      title: b.title, sub: b.interval === 'monthly' ? cat : `${cat} · ${intLabel.toLowerCase()} umgelegt`,
      amount: (b.kind === 'expense' && b.amountMax > b.amount ? b.amountMax : b.amount) * f, color, auto: false,
      ref: { type: 'budget', id: b.id }, flag: !!b.question || b.amount === 0,
    });
  });
  st.estates.filter((e) => e.rent > 0).forEach((e) =>
    inc.push({ title: `Miete ${e.name}`, sub: 'aus Immobilie', amount: e.rent, color: '#96DCFA', auto: true }));
  const savers = st.assets.filter((a) => a.active && a.monthly > 0);
  const saving = savers.reduce((s, a) => s + a.monthly, 0);
  if (saving > 0) exp.push({ title: 'Sparpläne & Beiträge', sub: `aus ${savers.length} Anlagen`, amount: saving, color: '#00A5E1', auto: true });
  st.estates.filter((e) => e.costs > 0).forEach((e) =>
    exp.push({ title: `Kosten ${e.name}`, sub: 'aus Immobilie', amount: e.costs, color: '#96DCFA', auto: true }));
  st.loans.filter((l) => l.payment > 0 && (l.balance === 0 || E.loanNow(l) > 0)).forEach((l) => {
    const est = st.estates.find((e) => e.id === l.estateId);
    exp.push({ title: `Rate ${l.name}`, sub: est ? `Darlehen · ${est.name}` : META.loanKinds[l.kind], amount: l.payment, color: '#FF6B5A', auto: true });
  });
  exp.sort((a, b) => b.amount - a.amount);
  const incomeTotal = inc.reduce((s, l) => s + l.amount, 0), expenseTotal = exp.reduce((s, l) => s + l.amount, 0);
  return { inc, exp, incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal };
};

/* Offene Punkte: fehlende Angaben + eingetragene offene Fragen */
E.openPoints = (st) => {
  const pts = [];
  const add = (group, type, o, title, context, missing, question) => {
    if (missing.length || question) pts.push({ group, ref: { type, id: o.id }, title, context, missing, question });
  };
  st.assets.filter((a) => a.active).forEach((a) =>
    add('Anlagen', 'asset', a, a.name, META.classes[a.cls][0], a.value === 0 && !a.question ? ['Wert'] : [], a.question));
  st.estates.forEach((e) => {
    const m = [];
    if (e.purchasePrice === 0 && e.marketValue === 0) m.push('Wert');
    if (e.usage === 'rented') {
      if (e.rent === 0) m.push('Mieteinnahmen');
      if (e.depEnabled && !(e.manualDep > 0)) {
        if (!e.purchaseDate) m.push('Kaufdatum (AfA)');
        if (e.purchasePrice === 0) m.push('Kaufpreis (AfA)');
      }
    }
    if (e.marketValue === 0 && e.purchasePrice > 0) m.push('aktueller Marktwert');
    add('Immobilien', 'estate', e, e.name, META.usage[e.usage], m, e.question);
  });
  st.loans.forEach((l) => {
    const m = [];
    if (l.balance === 0) m.push('Restschuld');
    if (l.payment === 0) m.push('Monatsrate');
    if (l.rate === 0 && l.kind === 'mortgage') m.push('Zinssatz');
    const est = st.estates.find((e) => e.id === l.estateId);
    add('Darlehen & Kredite', 'loan', l, l.name, est ? est.name : META.loanKinds[l.kind], m, l.question);
  });
  st.budget.filter((b) => b.active).forEach((b) =>
    add('Budget', 'budget', b, b.title, b.kind === 'income' ? 'Einnahme' : 'Ausgabe', b.amount === 0 ? ['Betrag'] : [], b.question));
  return pts;
};

/* Deutsche Formatierung */
const F = {
  _e0: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  _e2: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
  euro: (v, dec = 2) => (dec === 0 ? F._e0 : F._e2).format(v || 0),
  signed: (v, dec = 0) => (Math.abs(v) < 0.5 ? F.euro(Math.abs(v), dec) : (v > 0 ? '+' : '−') + F.euro(Math.abs(v), dec)),
  num: (v, dec) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v),
  compact: (v) => {
    const a = Math.abs(v), s = v < 0 ? '−' : '';
    if (a >= 1e6) return s + F.num(a / 1e6, 2) + ' Mio. €';
    if (a >= 1e4) return s + F.num(a / 1e3, 0) + ' Tsd. €';
    return s + F.euro(a, 0);
  },
  pct: (v, dec = 2) => F.num(v, dec) + ' %',
  /* Spanne: „400–500 €“, sonst ein einzelner Betrag */
  range: (min, max, dec = null) => {
    const d = dec != null ? dec : (Math.abs(min % 1) < 0.004 && Math.abs(max % 1) < 0.004 ? 0 : 2);
    return max > min + 0.004 ? `${F.num(min, d)}–${F.euro(max, d)}` : F.euro(min, d);
  },
  rate: (v) => F.pct(v, Math.round(v) === v ? 0 : 1),
  date: (d) => (d ? new Date(typeof d === 'string' ? d + 'T00:00:00' : d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'),
  monthYear: (d) => new Date(d).toLocaleDateString('de-DE', { month: 'short', year: 'numeric' }),
  parse: (t) => {
    let s = String(t).replace(/\s|€|%/g, '');
    if (!s) return 0;
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  },
  editable: (v) => (v ? String(Math.round(v * 1000) / 1000).replace('.', ',') : ''),
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
};

/* ---------- Kostenkontrolle ---------- */
E.natureOf = (b) => (META.natures[b.nature] ? b.nature : 'fix');
E.budgetRange = (b) => {
  const f = (META.intervals[b.interval] || META.intervals.monthly)[1];
  const min = b.amount * f, max = (b.amountMax > b.amount ? b.amountMax : b.amount) * f;
  return { min, max, isRange: max > min + 0.004 };
};
E.costSummary = (st) => {
  const groups = { fix: [], var: [], spar: [] };
  st.budget.filter((b) => b.active && b.kind === 'expense').forEach((b) => groups[E.natureOf(b)].push(b));
  const sum = (list) => list.reduce((a, b) => {
    const r = E.budgetRange(b); return { min: a.min + r.min, max: a.max + r.max };
  }, { min: 0, max: 0 });
  const fix = sum(groups.fix), vari = sum(groups.var), spar = sum(groups.spar);
  const spend = { min: fix.min + vari.min, max: fix.max + vari.max };
  const total = { min: spend.min + spar.min, max: spend.max + spar.max };
  const income = E.cashflow(st).incomeTotal;
  return { groups, fix, vari, spar, spend, total, income,
    left: { min: income - total.max, max: income - total.min } };
};
