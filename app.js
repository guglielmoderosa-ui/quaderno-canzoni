(() => {
  'use strict';

  const CHIAVE = 'quaderno-canzoni';
  const $ = (id) => document.getElementById(id);

  const el = {
    btnNuova: $('btn-nuova'),
    vistaElenco: $('vista-elenco'),
    vistaDettaglio: $('vista-dettaglio'),
    vistaForm: $('vista-form'),
    cerca: $('cerca'),
    conteggio: $('conteggio'),
    lista: $('lista-canzoni'),
    vuoto: $('vuoto'),
    btnIndietro: $('btn-indietro'),
    btnModifica: $('btn-modifica'),
    btnElimina: $('btn-elimina'),
    dTitolo: $('dettaglio-titolo'),
    dAccordi: $('dettaglio-accordi'),
    dTesto: $('dettaglio-testo'),
    formTitolo: $('form-titolo'),
    form: $('form-canzone'),
    campoId: $('campo-id'),
    campoTitolo: $('campo-titolo'),
    campoAccordi: $('campo-accordi'),
    campoTesto: $('campo-testo'),
    errore: $('form-errore'),
    btnAnnulla: $('btn-annulla'),
  };

  let canzoni = [];
  let correnteId = null; // canzone mostrata nel dettaglio
  let vistaAttiva = 'elenco';

  // ---------- Utilità ----------
  const normalizza = (s) =>
    String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const nuovoId = () => {
    try {
      if (globalThis.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    } catch (_) { /* fallback */ }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };

  const trovata = (id) => canzoni.find((c) => c.id === id);

  // ---------- Persistenza ----------
  function carica() {
    try {
      const grezzo = localStorage.getItem(CHIAVE);
      if (!grezzo) return [];
      const dati = JSON.parse(grezzo);
      if (!Array.isArray(dati)) return [];
      return dati
        .filter((c) => c && typeof c === 'object' && typeof c.id === 'string')
        .map((c) => ({
          id: c.id,
          titolo: typeof c.titolo === 'string' ? c.titolo : '',
          testo: typeof c.testo === 'string' ? c.testo : '',
          accordi: typeof c.accordi === 'string' ? c.accordi : '',
          creata: Number(c.creata) || 0,
          modificata: Number(c.modificata) || 0,
        }));
    } catch (_) {
      return [];
    }
  }

  function salva() {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(canzoni));
      return true;
    } catch (_) {
      alert('Impossibile salvare i dati nel browser (memoria piena o archiviazione non disponibile). Le modifiche potrebbero andare perse.');
      return false;
    }
  }

  // ---------- Viste ----------
  function mostra(nome) {
    vistaAttiva = nome;
    el.vistaElenco.hidden = nome !== 'elenco';
    el.vistaDettaglio.hidden = nome !== 'dettaglio';
    el.vistaForm.hidden = nome !== 'form';
    window.scrollTo(0, 0);
  }

  // ---------- Elenco ----------
  function evidenzia(contenitore, testo, query) {
    const q = normalizza(query.trim());
    if (!q) {
      contenitore.textContent = testo;
      return;
    }
    // Mappa ogni carattere del testo originale alla sua forma normalizzata,
    // così gli indici restano allineati anche con diacritici.
    let norm = '';
    const mappa = []; // indice in norm -> indice nel testo originale
    for (let i = 0; i < testo.length;) {
      const cp = testo.codePointAt(i);
      const len = cp > 0xffff ? 2 : 1;
      const n = normalizza(testo.slice(i, i + len));
      for (let k = 0; k < n.length; k++) mappa.push(i);
      norm += n;
      i += len;
    }
    mappa.push(testo.length);

    contenitore.textContent = '';
    let pos = 0;
    let idx = norm.indexOf(q);
    if (idx === -1) {
      contenitore.textContent = testo;
      return;
    }
    while (idx !== -1) {
      const inizio = mappa[idx];
      let fine = mappa[idx + q.length];
      if (fine === undefined) fine = testo.length;
      // includi eventuali diacritici combinanti residui
      while (fine < testo.length && /[̀-ͯ]/.test(testo[fine])) fine++;
      if (inizio >= pos) {
        if (inizio > pos) contenitore.appendChild(document.createTextNode(testo.slice(pos, inizio)));
        const mark = document.createElement('mark');
        mark.textContent = testo.slice(inizio, fine);
        contenitore.appendChild(mark);
        pos = fine;
      }
      idx = norm.indexOf(q, idx + q.length);
    }
    if (pos < testo.length) contenitore.appendChild(document.createTextNode(testo.slice(pos)));
  }

  function anteprima(c) {
    const riga = (c.testo || '').split(/\r?\n/).find((r) => r.trim() !== '');
    if (riga) return riga.trim().slice(0, 100) + (riga.trim().length > 100 ? '…' : '');
    return (c.accordi || '').split(/\r?\n/)[0].trim().slice(0, 100);
  }

  function renderElenco() {
    const query = el.cerca.value;
    const q = normalizza(query.trim());
    const ordinate = [...canzoni].sort((a, b) =>
      a.titolo.localeCompare(b.titolo, 'it', { sensitivity: 'base' }));
    const filtrate = q
      ? ordinate.filter((c) => normalizza(`${c.titolo}\n${c.testo}\n${c.accordi}`).includes(q))
      : ordinate;

    const frag = document.createDocumentFragment();
    for (const c of filtrate) {
      const li = document.createElement('li');
      li.className = 'canzone-item';
      const btn = document.createElement('button');
      btn.className = 'canzone-link';
      btn.type = 'button';
      btn.dataset.id = c.id;
      const t = document.createElement('span');
      t.className = 'canzone-titolo';
      evidenzia(t, c.titolo || '(senza titolo)', query);
      const a = document.createElement('span');
      a.className = 'canzone-anteprima';
      a.textContent = anteprima(c);
      btn.append(t, a);
      li.appendChild(btn);
      frag.appendChild(li);
    }
    el.lista.replaceChildren(frag);

    if (q) {
      el.conteggio.textContent = filtrate.length === 1 ? '1 risultato' : `${filtrate.length} risultati`;
    } else {
      el.conteggio.textContent = canzoni.length === 1 ? '1 canzone' : `${canzoni.length} canzoni`;
    }
    el.vuoto.hidden = canzoni.length > 0;
    if (canzoni.length === 0) el.conteggio.textContent = '';
  }

  function vaiElenco() {
    correnteId = null;
    renderElenco();
    mostra('elenco');
  }

  // ---------- Dettaglio ----------
  function vaiDettaglio(id) {
    const c = trovata(id);
    if (!c) { vaiElenco(); return; }
    correnteId = id;
    el.dTitolo.textContent = c.titolo;
    el.dAccordi.textContent = c.accordi;
    el.dTesto.textContent = c.testo;
    el.dAccordi.parentElement.hidden = !c.accordi.trim();
    el.dTesto.parentElement.hidden = !c.testo.trim();
    mostra('dettaglio');
  }

  // ---------- Form ----------
  function vaiForm(id) {
    const c = id ? trovata(id) : null;
    el.errore.hidden = true;
    el.errore.textContent = '';
    el.form.reset();
    el.campoId.value = c ? c.id : '';
    el.formTitolo.textContent = c ? 'Modifica canzone' : 'Nuova canzone';
    if (c) {
      el.campoTitolo.value = c.titolo;
      el.campoAccordi.value = c.accordi;
      el.campoTesto.value = c.testo;
    }
    mostra('form');
    el.campoTitolo.focus();
  }

  function annullaForm() {
    const id = el.campoId.value;
    if (id && trovata(id)) vaiDettaglio(id);
    else vaiElenco();
  }

  function mostraErrore(msg) {
    el.errore.textContent = msg;
    el.errore.hidden = false;
  }

  function onSubmit(e) {
    e.preventDefault();
    const titolo = el.campoTitolo.value.trim();
    if (!titolo) {
      mostraErrore('Il titolo è obbligatorio.');
      el.campoTitolo.focus();
      return;
    }
    const accordi = el.campoAccordi.value;
    const testo = el.campoTesto.value;
    const ora = Date.now();
    const id = el.campoId.value;
    const esistente = id ? trovata(id) : null;
    let salvataId;

    if (esistente) {
      Object.assign(esistente, { titolo, accordi, testo, modificata: ora });
      salvataId = esistente.id;
    } else {
      salvataId = nuovoId();
      canzoni.push({ id: salvataId, titolo, testo, accordi, creata: ora, modificata: ora });
    }

    salva(); // se fallisce, l'utente è avvisato e la modifica resta in memoria per la sessione
    el.cerca.value = '';
    vaiDettaglio(salvataId);
  }

  // ---------- Eliminazione ----------
  function elimina() {
    const c = trovata(correnteId);
    if (!c) { vaiElenco(); return; }
    if (!confirm(`Eliminare la canzone “${c.titolo}”?`)) return;
    canzoni = canzoni.filter((x) => x.id !== c.id);
    salva();
    vaiElenco();
  }

  // ---------- Eventi ----------
  el.btnNuova.addEventListener('click', () => vaiForm(null));
  el.btnIndietro.addEventListener('click', vaiElenco);
  el.btnModifica.addEventListener('click', () => { if (correnteId) vaiForm(correnteId); });
  el.btnElimina.addEventListener('click', elimina);
  el.btnAnnulla.addEventListener('click', annullaForm);
  el.form.addEventListener('submit', onSubmit);
  el.cerca.addEventListener('input', renderElenco);

  el.lista.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-id]');
    if (btn && el.lista.contains(btn)) vaiDettaglio(btn.dataset.id);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && vistaAttiva === 'form') {
      e.preventDefault();
      annullaForm();
    }
  });

  // Sincronizzazione tra schede
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== CHIAVE) return;
    canzoni = carica();
    if (vistaAttiva === 'elenco') {
      renderElenco();
    } else if (vistaAttiva === 'dettaglio') {
      if (trovata(correnteId)) vaiDettaglio(correnteId);
      else vaiElenco();
    }
    // In modalità form non si interviene per non perdere ciò che l'utente sta scrivendo.
  });

  // ---------- Avvio ----------
  canzoni = carica();
  renderElenco();
  mostra('elenco');
})();
