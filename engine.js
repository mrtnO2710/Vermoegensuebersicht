'use strict';
/* Rechenlogik – 1:1 aus der iPhone-App übernommen (Engine.swift). Keine Daten verlassen das Gerät. */
const E = {};

/* ---------- Datum ---------- */
E.today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
E.d = (iso) => (iso ? new Date(iso + 'T00:00:00') : null);
E.iso = (date) => { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
E.months = (from, to) => {
  const a = new Date(from), b = new Date(to);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m--;
  return Math.max(0, m);
};
E.addMonths = (date, n) => {
  const d = new Date(date), day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
};
E.nextDate = (day) => {
  const t = E.today(), c = new Date(t.getFullYear(), t.getMonth(), Math.min(Math.max(day, 1), 28));
  return t <= c ? c : E.addMonths(c, 1);
};

/* ---------- Zinseszins ---------- */
E.fv = (present, monthly, rate, months) => {
  if (months <= 0) return present;
  const r = rate / 100 / 12;
  if (r === 0) return present + monthly * months;
  const g = Math.pow(1 + r, months);
  return present * g + monthly * (g - 1) / r;
};

/* ---------- Darlehen ---------- */
E.simulate = (balance, start, rate, payment, special, months) => {
  const steps = []; if (months <= 0 || balance <= 0) return steps;
  const r = rate / 100 / 12; let b = balance;
  for (let i = 1; i <= months; i++) {
    const date = E.addMonths(start, i), interest = b * r;
    let principal = Math.min(b, Math.max(0, payment - interest)); b -= principal;
    if (special > 0 && date.getMonth() === 11 && b > 0) { const x = Math.min(b, special); b -= x; principal += x; }
    steps.push({ date, balance: b, interest, principal });
    if (b <= 0.005) break;
  }
  return steps;
};
E.hasPlan = (l) => l.payment > 0 && l.balance > 0;
E.loanBalanceAt = (l, date) => {
  if (!E.hasPlan(l)) return l.balance;
  const m = E.months(E.d(l.balanceDate), date); if (m <= 0) return l.balance;
  const s = E.simulate(l.balance, E.d(l.balanceDate), l.rate, l.payment, l.special, m);
  return s.length ? s[s.length - 1].balance : l.balance;
};
E.loanNow = (l) => E.loanBalanceAt(l, E.today());
E.loanSchedule = (l) => {
  if (!E.hasPlan(l)) return [];
  const t = E.today(); t.setDate(1);
  return E.simulate(E.loanNow(l), t, l.rate, l.payment, l.special, 720);
};
E.loanPayoff = (l) => { const s = E.loanSchedule(l), last = s[s.length - 1]; return last && last.balance <= 0.005 ? last.date : null; };
E.loanInterest12 = (l) => E.hasPlan(l) ? E.loanSchedule(l).slice(0, 12).reduce((a, s) => a + s.interest, 0) : E.loanNow(l) * l.rate / 100;
E.loanPrincipal12 = (l) => E.loanSchedule(l).slice(0, 12).reduce((a, s) => a + s.principal, 0);
E.coversInterest = (l) => l.payment > E.loanNow(l) * l.rate / 1200;

/* ---------- Anlagen ---------- */
E.assetEstimated = (a) => a.active && a.autoProject && E.months(E.d(a.valueDate), E.today()) > 0;
E.assetNow = (a, rate) => {
  if (!a.active) return 0;
  if (!E.assetEstimated(a)) return a.value;
  return E.fv(a.value, a.monthly, a.projectionRate > 0 ? a.projectionRate : rate, E.months(E.d(a.valueDate), E.today()));
};
E.gain = (a) => (a.invested > 0 ? a.value - a.invested : null);

/* ---------- Immobilien: Wert, AfA, Zinsen, Steuer, Cashflow ---------- */
E.estateLoans = (st, e) => st.loans.filter((l) => l.estateId === e.id);
E.valuation = (e) => (e.marketValue > 0 ? e.marketValue : e.purchasePrice);
E.estateDebt = (st, e) => E.estateLoans(st, e).reduce((a, l) => a + E.loanNow(l), 0);
E.depBase = (e) => (e.purchasePrice + e.purchaseCosts) * (1 - e.landShare / 100);
E.isDep = (e) => e.usage === 'rented' && e.depEnabled;
E.annualDep = (e) => (!E.isDep(e) ? 0 : e.manualDep > 0 ? e.manualDep : E.depBase(e) * e.depRate / 100);
E.accumDep = (e) => {
  if (!E.isDep(e) || !e.purchaseDate) return 0;
  const total = E.annualDep(e) * E.months(E.d(e.purchaseDate), E.today()) / 12, base = E.depBase(e);
  return base > 0 ? Math.min(base, total) : total;
};
E.annualInterest = (st, e) => (e.manualInterest > 0 ? e.manualInterest : E.estateLoans(st, e).reduce((a, l) => a + E.loanInterest12(l), 0));
E.loanPayments = (st, e) => E.estateLoans(st, e).reduce((a, l) => a + l.payment, 0);
E.taxable = (st, e) => (e.usage !== 'rented' ? 0 : e.rent * 12 - e.costs * 12 - E.annualInterest(st, e) - E.annualDep(e));
E.hasTaxBasis = (e) => e.usage === 'rented' && e.rent > 0;
E.taxEffect = (st, e, rate) => (E.hasTaxBasis(e) ? -E.taxable(st, e) * rate / 100 : 0);
E.estateCashflow = (st, e) => e.rent - e.costs - E.loanPayments(st, e);

/* ---------- Gesamtvermögen ---------- */
E.summary = (st) => {
  const rate = st.profile.expectedReturn, act = st.assets.filter((a) => a.active);
  const sumCls = (c) => act.filter((a) => a.cls === c).reduce((s, a) => s + E.assetNow(a, rate), 0);
  const investments = act.reduce((s, a) => s + E.assetNow(a, rate), 0);
  const estateValue = st.estates.reduce((s, e) => s + E.valuation(e), 0);
  const estateDebt = st.loans.filter((l) => l.estateId).reduce((s, l) => s + E.loanNow(l), 0);
  const debt = st.loans.reduce((s, l) => s + E.loanNow(l), 0);
  const contributions = act.reduce((s, a) => s + a.monthly, 0);
  const fundContributions = act.filter((a) => a.cls === 'fondsdepot').reduce((s, a) => s + a.monthly, 0);
  return {
    rate, investments, estateValue, estateDebt, debt, contributions, fundContributions, sumCls,
    funds: sumCls('fondsdepot'), liquidity: sumCls('tagesgeld'),
    giro: act.find((a) => a.cls === 'giro') || null,
    estateEquity: estateValue - estateDebt, netWorth: investments + estateValue - debt,
    debtAt: (date) => st.loans.reduce((s, l) => s + E.loanBalanceAt(l, date), 0),
  };
};
E.scopeValue = (s, scope) => (scope === 'funds' ? s.funds : scope === 'netWorth' ? s.netWorth : s.investments);
E.scopeMonthly = (s, scope) => (scope === 'funds' ? s.fundContributions : s.contributions);

/* ---------- Ziele ---------- */
E.goalForecast = (s, g) => {
  const m = E.months(E.today(), E.d(g.date));
  if (g.scope === 'netWorth') return E.fv(s.investments, s.contributions, s.rate, m) + s.estateValue - s.debtAt(E.d(g.date));
  return E.fv(E.scopeValue(s, g.scope), E.scopeMonthly(s, g.scope), s.rate, m);
};
E.goalRequired = (s, g) => {
  if (g.scope === 'netWorth') return null;
  const m = E.months(E.today(), E.d(g.date)); if (m <= 0) return null;
  const r = s.rate / 100 / 12, gr = Math.pow(1 + r, m), gap = g.target - E.scopeValue(s, g.scope) * gr;
  if (gap <= 0) return 0;
  return r === 0 ? gap / m : gap * r / (gr - 1);
};
