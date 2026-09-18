'use strict';
/* Eingabemasken: ein generisches Formular, beschrieben durch Feldlisten je Eintragsart. */
const opts = (obj, i = 0) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, Array.isArray(v) ? v[i] : v]));
const QN = ['Offene Frage & Notiz', 'Solange eine offene Frage eingetragen ist, erscheint der Eintrag unter „Offene Punkte“.',
  [['question', 'area', 'Offene Frage'], ['note', 'area', 'Notiz']]];

const SCHEMA = {
  asset: { titles: ['Neue Anlage', 'Anlage bearbeiten'], required: 'name', sections: () => [
    ['Allgemein', null, [['name', 'text', 'Bezeichnung'], ['cls', 'select', 'Kategorie', opts(META.classes)],
      ['provider', 'text', 'Anbieter (optional)'], ['reference', 'text', 'Depot- / Vertragsnummer (optional)']]],
    ['Stand', 'Ändern sich Wert oder Stichtag, legt die App automatisch einen Verlaufspunkt an.',
      [['value', 'money', 'Wert'], ['valueDate', 'date', 'Stichtag'], ['invested', 'money', 'Eingezahlt (netto)'],
        ['monthly', 'money', 'Sparrate / Beitrag mtl.'], ['returnPA', 'pct', 'Rendite p. a. (Bericht)']]],
    ['Automatische Fortschreibung', 'Rechnet den Wert ab dem Stichtag mit Sparrate und Rendite-Annahme bis heute hoch. 0 % = Standardannahme unter „Mehr“.',
      [['autoProject', 'bool', 'Wert fortschreiben'], ['projectionRate', 'pct', 'Rendite-Annahme']]],
    QN, ['Status', null, [['active', 'bool', 'Aktiv – zählt zum Vermögen']]]] },

  estate: { titles: ['Neue Immobilie', 'Immobilie bearbeiten'], required: 'name', sections: () => [
    ['Objekt', null, [['name', 'text', 'Bezeichnung'], ['kind', 'text', 'Objektart, z. B. Mehrfamilienhaus'],
      ['usage', 'select', 'Nutzung', META.usage], ['location', 'text', 'Ort / Adresse (optional)']]],
    ['Kauf', 'Kaufpreis, Nebenkosten und Kaufdatum sind die Grundlage für die Abschreibung.',
      [['purchasePrice', 'money', 'Kaufpreis'], ['purchaseCosts', 'money', 'Kaufnebenkosten'], ['purchaseDate', 'optdate', 'Kaufdatum']]],
    ['Aktueller Wert', 'Ohne Markt- oder Gutachtenwert wird der Kaufpreis angesetzt.', [['marketValue', 'money', 'Markt- / Gutachtenwert']]],
    ['Miete & Kosten (monatlich)', null, [['rent', 'money', 'Kaltmiete'], ['costs', 'money', 'Nicht umlagefähige Kosten']]],
    ['Abschreibung (AfA)', 'Automatisch: (Kaufpreis + Nebenkosten) × Gebäudeanteil × AfA-Satz. Ein manueller Jahresbetrag ersetzt die Berechnung. Der Grundstücksanteil von 20 % ist eine Annahme – bitte prüfen.',
      [['depEnabled', 'bool', 'AfA berücksichtigen'], ['depRate', 'pct', 'AfA-Satz'], ['landShare', 'pct', 'Grundstücksanteil'], ['manualDep', 'money', 'AfA p. a. manuell']]],
    ['Schuldzinsen', 'Leer lassen, dann werden die Zinsen der nächsten 12 Monate aus den zugeordneten Darlehen berechnet.',
      [['manualInterest', 'money', 'Zinsen p. a. manuell']]], QN] },

  loan: { titles: ['Neues Darlehen', 'Darlehen bearbeiten'], required: 'name', sections: () => [
    ['Darlehen', null, [['name', 'text', 'Bezeichnung'], ['lender', 'text', 'Kreditgeber (optional)'], ['kind', 'select', 'Art', META.loanKinds],
      ['estateId', 'select', 'Immobilie', { '': 'Keine', ...Object.fromEntries(App.st.estates.map((e) => [e.id, e.name])) }]]],
    ['Restschuld', 'Bekannte Restschuld zu einem Stichtag. Mit Rate und Zinssatz schreibt die App sie automatisch bis heute fort.',
      [['balance', 'money', 'Restschuld'], ['balanceDate', 'date', 'Stichtag']]],
    ['Konditionen', 'Sondertilgungen werden jeweils im Dezember verbucht.',
      [['rate', 'pct', 'Sollzins p. a.'], ['payment', 'money', 'Monatsrate'], ['special', 'money', 'Sondertilgung p. a.'],
        ['fixedUntil', 'optdate', 'Zinsbindung bis'], ['original', 'money', 'Ursprungsbetrag (optional)']]], QN] },

  budget: { titles: ['Neuer Posten', 'Posten bearbeiten'], required: 'title', sections: () => [
    ['Posten', null, [['title', 'text', 'Bezeichnung'], ['kind', 'select', 'Art', { income: 'Einnahme', expense: 'Ausgabe' }],
      ['category', 'select', 'Kategorie', opts(META.budgetCats)]]],
    ['Betrag', 'Vierteljährliche und jährliche Beträge werden auf den Monat umgerechnet.',
      [['amount', 'money', 'Betrag'], ['interval', 'select', 'Rhythmus', opts(META.intervals)], ['active', 'bool', 'Aktiv']]], QN] },

  goal: { titles: ['Neues Ziel', 'Ziel bearbeiten'], required: 'title', sections: () => [
    ['Ziel', null, [['title', 'text', 'Bezeichnung'], ['target', 'money', 'Zielbetrag'], ['date', 'date', 'Zieldatum'],
      ['scope', 'select', 'Bezug', META.scopes]]], ['Notiz', null, [['note', 'area', 'Notiz']]]] },

  profile: { titles: ['Profil & Regeln', 'Profil & Regeln'], sections: () => [
    ['Person', 'Das Geburtsjahr wird für die Auswertung „Mit 40“ in der Prognose verwendet.',
      [['name', 'text', 'Name'], ['birthYear', 'int', 'Geburtsjahr']]],
    ['Annahmen', 'Die Rendite-Annahme gilt für Fortschreibung, Ziele und Prognose. Der Steuersatz ist eine Annahme für die Vermietungsrechnung.',
      [['expectedReturn', 'pct', 'Rendite-Annahme p. a.'], ['taxRate', 'pct', 'Grenzsteuersatz']]],
    ['Regeln', 'Tagesgeld-Minimum: Untergrenze der Liquiditätsreserve. Kontoausgleich: Zielstand des Girokontos am gewählten Tag – Überschuss aufs Tagesgeld, Fehlbetrag vom Tagesgeld.',
      [['reserveMinimum', 'money', 'Tagesgeld-Minimum'], ['giroTarget', 'money', 'Girokonto-Zielstand'], ['giroDay', 'int', 'Ausgleich am (Tag)']]]] },

  snapshot: { titles: ['Verlaufspunkt', 'Verlaufspunkt'], sections: () => [
    ['Stand', 'Ist der Punkt neuer als der bisherige Stichtag, wird er zum aktuellen Wert der Anlage.',
      [['date', 'date', 'Datum'], ['value', 'money', 'Wert'], ['note', 'text', 'Notiz (optional)']]]] },
};

const fieldHTML = ([key, type, label, o], val) => {
  const id = 'f_' + key;
  switch (type) {
    case 'text': return `<div class="f full"><input id="${id}" type="text" placeholder="${F.esc(label)}" value="${F.esc(val)}"></div>`;
    case 'area': return `<div class="f full"><textarea id="${id}" rows="2" placeholder="${F.esc(label)}">${F.esc(val)}</textarea></div>`;
    case 'money': case 'pct': case 'int':
      return `<div class="f"><label for="${id}">${F.esc(label)}</label><input id="${id}" type="text" inputmode="decimal" placeholder="0" value="${type === 'int' ? (val || '') : F.editable(val)}"><span class="suf">${type === 'pct' ? '%' : type === 'money' ? '€' : ''}</span></div>`;
    case 'date': case 'optdate':
      return `<div class="f"><label for="${id}">${F.esc(label)}${type === 'optdate' ? ' <span class="t3">(optional)</span>' : ''}</label><input id="${id}" type="date" value="${val || ''}"></div>`;
    case 'select':
      return `<div class="f"><label for="${id}">${F.esc(label)}</label><select id="${id}">${Object.entries(o).map(([k, v]) => `<option value="${F.esc(k)}"${String(k) === String(val ?? '') ? ' selected' : ''}>${F.esc(v)}</option>`).join('')}</select></div>`;
    case 'bool': return `<div class="f"><label for="${id}">${F.esc(label)}</label><input id="${id}" type="checkbox"${val ? ' checked' : ''}></div>`;
    default: return '';
  }
};

const readField = ([key, type]) => {
  const el = document.getElementById('f_' + key);
  if (!el) return undefined;
  switch (type) {
    case 'money': case 'pct': return F.parse(el.value);
    case 'int': return Math.round(F.parse(el.value));
    case 'bool': return el.checked;
    case 'date': return el.value || E.iso(new Date());
    case 'optdate': return el.value || null;
    case 'select': return el.value === '' ? null : el.value;
    default: return el.value.trim();
  }
};

const Editors = {
  ctx: null,

  open(type, id, d = {}) {
    const sc = SCHEMA[type];
    let obj, isNew = !id;
    if (type === 'profile') { obj = App.st.profile; isNew = false; }
    else if (type === 'snapshot') { obj = { date: E.iso(new Date()), value: 0, note: '' }; isNew = true; }
    else if (id) obj = App.find(type, id);
    else {
      obj = JSON.parse(JSON.stringify(DEF[type]));
      if (type === 'asset' || type === 'loan') obj[type === 'asset' ? 'valueDate' : 'balanceDate'] = E.iso(new Date());
      if (type === 'goal') obj.date = E.iso(E.addMonths(new Date(), 60));
      if (type === 'loan' && d.estate) {
        const est = App.find('estate', d.estate);
        Object.assign(obj, { estateId: d.estate, kind: 'mortgage', name: est ? `Darlehen ${est.name}` : '' });
      }
      if (type === 'budget' && d.kind) Object.assign(obj, { kind: d.kind, category: d.kind === 'income' ? 'einkommen' : 'lebenshaltung' });
    }
    if (!obj) return;
    this.ctx = { type, id, obj, isNew, parent: d.parent || null, fields: sc.sections().flatMap((s) => s[2]) };
    const body = sc.sections().map(([title, help, fields]) =>
      `<fieldset><legend>${F.esc(title)}</legend><div class="fbox">${fields.map((f) => fieldHTML(f, obj[f[0]])).join('')}</div>${help ? `<div class="help">${F.esc(help)}</div>` : ''}</fieldset>`).join('');
    const canDelete = !isNew && type !== 'profile';
    const sheet = document.getElementById('sheet');
    sheet.innerHTML = `<div class="sheet"><div class="sheet-bar"><button data-act="sheet-cancel">Abbrechen</button><b>${sc.titles[isNew ? 0 : 1]}</b><button class="save" data-act="sheet-save">Sichern</button></div>
      ${body}${canDelete ? '<button class="danger" data-act="sheet-delete">Löschen</button>' : ''}</div>`;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
  },

  close() {
    const sheet = document.getElementById('sheet');
    sheet.hidden = true; sheet.innerHTML = ''; document.body.style.overflow = ''; this.ctx = null;
  },

  save() {
    const { type, obj, isNew, fields, parent } = this.ctx, sc = SCHEMA[type];
    const vals = {};
    fields.forEach((f) => { const v = readField(f); if (v !== undefined) vals[f[0]] = v; });
    if (sc.required && !vals[sc.required]) { alert('Bitte eine Bezeichnung eingeben.'); return; }

    if (type === 'snapshot') {
      const a = App.find('asset', parent);
      if (!a || !(vals.value > 0)) { alert('Bitte einen Wert eingeben.'); return; }
      a.snapshots = a.snapshots.filter((s) => s.date !== vals.date).concat([{ date: vals.date, value: vals.value, note: vals.note }]);
      if (vals.date >= a.valueDate) { a.value = vals.value; a.valueDate = vals.date; }
    } else if (type === 'profile') {
      Object.assign(App.st.profile, vals);
      App.st.profile.giroDay = Math.min(28, Math.max(1, App.st.profile.giroDay || 20));
    } else {
      const changedValue = type === 'asset' && (isNew || obj.value !== vals.value || obj.valueDate !== vals.valueDate);
      Object.assign(obj, vals);
      if (isNew) { obj.id = uid(); App.st[COLL[type]].push(obj); }
      if (changedValue && obj.value > 0) {
        obj.snapshots = obj.snapshots.filter((s) => s.date !== obj.valueDate).concat([{ date: obj.valueDate, value: obj.value }]);
      }
    }
    App.save(); this.close(); App.render();
  },

  del() {
    const { type, obj } = this.ctx;
    if (!confirm('Diesen Eintrag dauerhaft löschen?')) return;
    App.st[COLL[type]] = App.st[COLL[type]].filter((x) => x.id !== obj.id);
    if (type === 'estate') App.st.loans.forEach((l) => { if (l.estateId === obj.id) l.estateId = null; });
    App.stack = App.stack.filter((s) => s.id !== obj.id);
    App.save(); this.close(); App.render();
  },
};
