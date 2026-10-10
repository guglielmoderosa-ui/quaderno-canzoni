(() => {
  'use strict';

  const CHIAVE = 'quaderno-canzoni';
  const $ = (id) => document.getElementById(id);

  const el = {
    btnNuova: $('btn-nuova'),
    btnEsporta: $('btn-esporta'),
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
    btnAccordiMeno: $('btn-accordi-meno'),
    btnAccordiPiu: $('btn-accordi-piu'),
    btnTonoMeno: $('btn-tono-meno'),
    btnTonoPiu: $('btn-tono-piu'),
    tonoValore: $('tono-valore'),
    btnTonoOriginale: $('btn-tono-originale'),
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
    fermaScorrimento();
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
    el.btnEsporta.disabled = canzoni.length === 0;
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
    caricaTono(id);
    renderAccordi(c.accordi);
    el.dTesto.textContent = c.testo;
    el.dAccordi.parentElement.hidden = !c.accordi.trim();
    el.dTesto.parentElement.hidden = !c.testo.trim();
    mostra('dettaglio');
    adattaAccordi();
  }

  // ---------- Tonalità ----------
  // La trasposizione è solo visiva: il testo salvato non viene mai modificato.
  const CHIAVE_TONO = 'quaderno-canzoni-tono';
  const TONO_MAX = 6;

  // Radici italiane in qualsiasi maiuscola/minuscola o inglesi A–G, con alterazione facoltativa.
  const T_RADICE = '((?:[Dd][Oo]|[Rr][Ee]|[Mm][Ii]|[Ff][Aa]|[Ss][Oo][Ll]|[Ll][Aa]|[Ss][Ii]|[A-G]))([#b♯♭]?)';
  const T_QUALITA = /^(?:maj|min|dim|aug|sus|add|m|M|°|ø|\+|-|\d{1,2}|[#b♯♭]\d{1,2}|\([^()\s]*\))*$/;
  const T_PREFISSO = /^[(|:]*/;
  const T_SUFFISSO = /[)|:]*$/;
  const T_BASSO = new RegExp(`^${T_RADICE}([^A-Za-z]*)$`);
  const T_ACCORDO = new RegExp(`^${T_RADICE}(.*)$`);

  const T_SEMITONI = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11, c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  const T_DIESIS = ['DO', 'DO#', 'RE', 'RE#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'LA#', 'SI'];
  const T_BEMOLLE = ['DO', 'REb', 'RE', 'MIb', 'MI', 'FA', 'SOLb', 'SOL', 'LAb', 'LA', 'SIb', 'SI'];
  // Note naturali spostate su un tasto nero: grafia comune DO# MIb FA# LAb SIb, in ogni direzione.
  const T_COMUNE = ['DO', 'DO#', 'RE', 'MIb', 'MI', 'FA', 'FA#', 'SOL', 'LAb', 'LA', 'SIb', 'SI'];
  const T_ANGLO = { DO: 'C', RE: 'D', MI: 'E', FA: 'F', SOL: 'G', LA: 'A', SI: 'B' };

  // Sposta una radice ("Sol", "Bb", "FA#", ...) di n semitoni mantenendo notazione, maiuscole e stile dell'alterazione.
  function trasponiNota(nome, alt, n) {
    const italiana = nome.length > 1;
    const base = T_SEMITONI[nome.toLowerCase()];
    const delta = alt === '#' || alt === '♯' ? 1 : alt === 'b' || alt === '♭' ? -1 : 0;
    const pc = (((base + delta + n) % 12) + 12) % 12;
    const tabella = delta > 0 ? T_DIESIS : delta < 0 ? T_BEMOLLE : T_COMUNE;
    const m = /^([A-Z]+)([#b])?$/.exec(tabella[pc]);
    const r = m[1];
    let acc = '';
    if (m[2]) acc = m[2] === '#' ? (alt === '♯' ? '♯' : '#') : (alt === '♭' ? '♭' : 'b');
    if (!italiana) return T_ANGLO[r] + acc;
    if (nome === nome.toUpperCase()) return r + acc;
    const tit = r[0] + r.slice(1).toLowerCase();
    return (nome[0] === nome[0].toUpperCase() ? tit : tit.toLowerCase()) + acc;
  }

  // Trasporta una parola; se non è un accordo la restituisce identica.
  function trasponiAccordo(parola, n) {
    const pre = T_PREFISSO.exec(parola)[0];
    const resto = parola.slice(pre.length);
    const chiusure = T_SUFFISSO.exec(resto)[0].length;
    // Si prova dal suffisso più corto: "C7(b9)" resta intero, "(C)" perde la parentesi finale.
    for (let k = 0; k <= chiusure; k++) {
      const corpo = resto.slice(0, resto.length - k);
      const m = T_ACCORDO.exec(corpo);
      if (!m) continue;
      let qual = m[3];
      let basso = '';
      const sl = qual.lastIndexOf('/');
      if (sl >= 0) {
        const mb = T_BASSO.exec(qual.slice(sl + 1));
        if (!mb) continue;
        basso = '/' + trasponiNota(mb[1], mb[2], n) + mb[3];
        qual = qual.slice(0, sl);
      }
      if (!T_QUALITA.test(qual)) continue;
      return pre + trasponiNota(m[1], m[2], n) + qual + basso + resto.slice(corpo.length);
    }
    return parola;
  }

  // Ogni accordo torna alla colonna originale (sillaba sotto cui sta); se uno cresce e arriva
  // a toccare il successivo, questo scivola subito dopo con un solo spazio.
  function trasponiRiga(riga, n) {
    let out = '';
    const re = /\S+/g;
    let m;
    while ((m = re.exec(riga))) {
      if (out && out.length >= m.index) out += ' ';
      out = out.padEnd(m.index, ' ') + trasponiAccordo(m[0], n);
    }
    return out;
  }

  let tono = 0;

  function leggiTonoSalvati() {
    try {
      const o = JSON.parse(localStorage.getItem(CHIAVE_TONO));
      if (o && typeof o === 'object' && !Array.isArray(o)) return o;
    } catch (_) { /* localStorage non disponibile o JSON non valido */ }
    return {};
  }

  function salvaTono(id, valore) {
    const o = leggiTonoSalvati();
    if (valore) o[id] = valore; else delete o[id];
    try {
      localStorage.setItem(CHIAVE_TONO, JSON.stringify(o));
    } catch (_) { /* quota piena o storage bloccato: il tono resta solo in memoria */ }
  }

  function aggiornaTonoUI() {
    el.tonoValore.textContent = tono > 0 ? '+' + tono : tono < 0 ? '−' + (-tono) : '0';
    el.btnTonoMeno.disabled = tono <= -TONO_MAX;
    el.btnTonoPiu.disabled = tono >= TONO_MAX;
    el.btnTonoOriginale.disabled = tono === 0;
  }

  // Applica alla canzone aperta il tono memorizzato (0 se assente o non valido).
  function caricaTono(id) {
    const v = Number(leggiTonoSalvati()[id]);
    tono = Number.isInteger(v) ? Math.max(-TONO_MAX, Math.min(TONO_MAX, v)) : 0;
    aggiornaTonoUI();
  }

  function impostaTono(valore) {
    const c = trovata(correnteId);
    if (!c) return;
    tono = Math.max(-TONO_MAX, Math.min(TONO_MAX, valore));
    salvaTono(c.id, tono);
    aggiornaTonoUI();
    renderAccordi(c.accordi);
    adattaAccordi();
  }

  el.btnTonoMeno.addEventListener('click', () => impostaTono(tono - 1));
  el.btnTonoPiu.addEventListener('click', () => impostaTono(tono + 1));
  el.btnTonoOriginale.addEventListener('click', () => impostaTono(0));

  // ---------- Impaginazione accordi ----------
  const CHIAVE_SCALA = 'quaderno-canzoni-scala-accordi';
  const BASE_ACCORDI = 16;   // px: dimensione massima di partenza
  const MIN_ACCORDI = 7;     // px: sotto questa soglia si scorre in orizzontale
  const SCALA_MIN = 0.5;
  const SCALA_MAX = 2;
  const SCALA_PASSO = 0.1;

  // Parola in qualunque combinazione di maiuscole/minuscole ("sol" -> "[Ss][Oo][Ll]"), senza il flag /i
  // che farebbe passare anche le note anglosassoni minuscole ("a", "e") delle parole comuni.
  const ogniCaso = (p) => p.replace(/[a-z]/gi, (c) => `[${c.toUpperCase()}${c.toLowerCase()}]`);
  const RADICE = `(?:${['sol', 'do', 're', 'mi', 'fa', 'la', 'si'].map(ogniCaso).join('|')}|[A-G])[#b♯♭]?`;
  const QUALITA = `(?:${['maj', 'min', 'dim', 'aug', 'sus', 'add', 'm'].map(ogniCaso).join('|')}|°|ø|\\+|-|\\d{1,2}|[#b♯♭]\\d{1,2}|\\([^()\\s]*\\))*`;
  const RE_ACCORDO = new RegExp(`^${RADICE}${QUALITA}(?:/${RADICE})?$`);
  const RE_SEPARATORE = /^(?:[|/\-:%.]+|\(?x\d+\)?|\d+x)$/i;

  // Una riga è "solo accordi" se ogni parola è un accordo o un separatore (e c'è almeno un accordo).
  function eRigaAccordi(riga) {
    const parole = riga.split(/\s+/).filter(Boolean);
    let accordi = 0;
    for (const p of parole) {
      if (RE_SEPARATORE.test(p)) continue;
      let t = p.replace(/^[|:]+|[|:]+$/g, '');
      // Parentesi attorno all'accordo, anche se aperte e chiuse su parole diverse: "(C G)".
      if (t.startsWith('(') && !t.includes(')')) t = t.slice(1);
      else if (t.endsWith(')') && !t.includes('(')) t = t.slice(0, -1);
      else if (t.startsWith('(') && t.endsWith(')')) t = t.slice(1, -1);
      if (!RE_ACCORDO.test(t)) return false;
      accordi++;
    }
    return accordi > 0;
  }

  let scalaAccordi = 1;
  let ultimaLarghezzaAccordi = -1;

  function caricaScala() {
    try {
      const v = parseFloat(localStorage.getItem(CHIAVE_SCALA));
      if (Number.isFinite(v)) return Math.min(SCALA_MAX, Math.max(SCALA_MIN, v));
    } catch (_) { /* localStorage non disponibile */ }
    return 1;
  }

  function salvaScala() {
    try {
      localStorage.setItem(CHIAVE_SCALA, String(scalaAccordi));
    } catch (_) { /* quota piena o storage bloccato: la scala resta solo in memoria */ }
  }

  // Un <span> per riga, separati da "\n" reali: lo spazio bianco resta identico all'originale.
  function renderAccordi(testo) {
    const frag = document.createDocumentFragment();
    testo.split(/\r?\n/).forEach((riga, i) => {
      if (i > 0) frag.appendChild(document.createTextNode('\n'));
      const s = document.createElement('span');
      const soloAccordi = eRigaAccordi(riga);
      s.className = soloAccordi ? 'riga-accordi' : 'riga-testo';
      s.textContent = soloAccordi && tono ? trasponiRiga(riga, tono) : riga;
      frag.appendChild(s);
    });
    el.dAccordi.replaceChildren(frag);
  }

  // Larghezza naturale (senza a capo) della riga più larga, misurata sugli span reali.
  function larghezzaMassima(pre) {
    let max = 0;
    for (const s of pre.children) max = Math.max(max, s.getBoundingClientRect().width);
    return max;
  }

  function adattaAccordi() {
    const pre = el.dAccordi;
    if (pre.clientWidth === 0) return; // blocco nascosto: niente da misurare
    const cs = getComputedStyle(pre);
    const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    // Un po' di margine: Safari iOS arrotonda le larghezze in modo diverso da Chrome.
    const disponibile = Math.floor(pre.clientWidth - pad) * 0.985 - 1;
    pre.style.fontSize = BASE_ACCORDI + 'px';
    let px = BASE_ACCORDI;
    const necessaria = larghezzaMassima(pre);
    if (necessaria > disponibile && necessaria > 0) {
      px = Math.max(MIN_ACCORDI, Math.floor(BASE_ACCORDI * disponibile / necessaria * 10) / 10);
      // Il testo non scala in modo perfettamente lineare: si rifinisce finché entra.
      for (let n = 0; n < 12 && px > MIN_ACCORDI; n++) {
        pre.style.fontSize = px + 'px';
        if (larghezzaMassima(pre) <= disponibile) break;
        px = Math.max(MIN_ACCORDI, Math.floor(px * 97) / 100);
      }
    }
    pre.style.fontSize = (px * scalaAccordi).toFixed(2) + 'px';
    ultimaLarghezzaAccordi = pre.clientWidth;
    el.btnAccordiMeno.disabled = scalaAccordi <= SCALA_MIN + 1e-6;
    el.btnAccordiPiu.disabled = scalaAccordi >= SCALA_MAX - 1e-6;
  }

  function cambiaScala(delta) {
    const nuova = Math.round((scalaAccordi + delta) * 100) / 100;
    scalaAccordi = Math.min(SCALA_MAX, Math.max(SCALA_MIN, nuova));
    salvaScala();
    adattaAccordi();
  }

  el.btnAccordiMeno.addEventListener('click', () => cambiaScala(-SCALA_PASSO));
  el.btnAccordiPiu.addEventListener('click', () => cambiaScala(SCALA_PASSO));

  let rafAccordi = 0;
  const ridimensiona = () => {
    cancelAnimationFrame(rafAccordi);
    rafAccordi = requestAnimationFrame(() => { if (vistaAttiva === 'dettaglio') adattaAccordi(); });
  };
  // Su iOS "orientationchange" arriva prima che le dimensioni siano aggiornate: si rimisura più volte.
  const dopoRotazione = () => {
    ridimensiona();
    [150, 400, 800].forEach((ms) => setTimeout(ridimensiona, ms));
  };
  window.addEventListener('resize', ridimensiona);
  window.addEventListener('orientationchange', dopoRotazione);
  window.addEventListener('pageshow', ridimensiona);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', ridimensiona);
  if (document.fonts) {
    if (document.fonts.ready) document.fonts.ready.then(ridimensiona);
    if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', ridimensiona);
  }
  if (window.ResizeObserver) {
    const osservatore = new ResizeObserver(() => {
      if (el.dAccordi.clientWidth !== ultimaLarghezzaAccordi) ridimensiona();
    });
    osservatore.observe(el.dAccordi);
    osservatore.observe(el.vistaDettaglio);
  }
  scalaAccordi = caricaScala();

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
    salvaTono(c.id, 0);
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

  // ---------- Esporta ----------
  // Esporta tutte le canzoni (con il tono scelto) in un file JSON.
  function dataLocale() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  function costruisciEsportazione() {
    const toni = leggiTonoSalvati();
    return {
      app: 'quaderno-canzoni',
      versione: 1,
      esportato: new Date().toISOString(),
      canzoni: canzoni.map((c) => {
        const v = Number(toni[c.id]);
        return {
          titolo: c.titolo,
          accordi: c.accordi,
          testo: c.testo,
          tono: Number.isInteger(v) ? v : 0,
          creata: c.creata,
          modificata: c.modificata,
        };
      }),
    };
  }

  function scaricaFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function esporta() {
    if (canzoni.length === 0) return;
    const json = JSON.stringify(costruisciEsportazione(), null, 2);
    const file = new File([json], `quaderno-canzoni-${dataLocale()}.json`, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Quaderno Canzoni' });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return; // annullato dall'utente
        // altro errore: ripiega sul download
      }
    }
    scaricaFile(file);
  }

  el.btnEsporta.addEventListener('click', esporta);

  // ---------- Auto-scroll ----------
  const CHIAVE_VEL = 'quaderno-canzoni-velocita';
  const VEL_MIN = 1;
  const VEL_MAX = 10;
  const VEL_PX_S = [0, 8, 14, 22, 32, 44, 58, 76, 98, 124, 155]; // px/s per livello (indice = livello)
  const barraScorr = $('barra-scorrimento');
  const btnScorri = $('btn-scorri');
  const btnVelMeno = $('btn-vel-meno');
  const btnVelPiu = $('btn-vel-piu');
  const velIndicatore = $('vel-indicatore');

  let velocita = caricaVelocita();
  let scorrendo = false;
  let rafId = 0;
  let ultimoT = 0;
  let accumulo = 0; // frazione di pixel non ancora applicata
  let wakeLock = null;

  function caricaVelocita() {
    try {
      const v = parseInt(localStorage.getItem(CHIAVE_VEL), 10);
      if (v >= VEL_MIN && v <= VEL_MAX) return v;
    } catch (_) { /* usa il default */ }
    return 3;
  }

  function aggiornaControlliScorr() {
    velIndicatore.textContent = `Velocità ${velocita}`;
    btnVelMeno.disabled = velocita <= VEL_MIN;
    btnVelPiu.disabled = velocita >= VEL_MAX;
    btnScorri.textContent = scorrendo ? '❚❚' : '▶';
    btnScorri.setAttribute('aria-label', scorrendo ? 'Ferma scorrimento' : 'Avvia scorrimento');
  }

  function cambiaVelocita(delta) {
    velocita = Math.min(VEL_MAX, Math.max(VEL_MIN, velocita + delta));
    try { localStorage.setItem(CHIAVE_VEL, String(velocita)); } catch (_) { /* ignora */ }
    aggiornaControlliScorr();
  }

  const infondoPagina = () =>
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1;

  function passoScorrimento(t) {
    if (!scorrendo) return;
    const dt = Math.min((t - ultimoT) / 1000, 0.1); // limita i salti dopo pause del thread
    ultimoT = t;
    accumulo += VEL_PX_S[velocita] * dt;
    const px = Math.floor(accumulo);
    if (px >= 1) {
      accumulo -= px;
      window.scrollBy(0, px);
    }
    if (infondoPagina()) { fermaScorrimento(); return; }
    rafId = requestAnimationFrame(passoScorrimento);
  }

  async function richiediWakeLock() {
    try {
      if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    } catch (_) { wakeLock = null; }
    if (!scorrendo) rilasciaWakeLock(); // fermato mentre la richiesta era in corso
  }

  function rilasciaWakeLock() {
    const w = wakeLock;
    wakeLock = null;
    if (w) w.release().catch(() => {});
  }

  function avviaScorrimento() {
    if (scorrendo) return;
    if (infondoPagina()) window.scrollTo(0, 0);
    scorrendo = true;
    accumulo = 0;
    ultimoT = performance.now();
    aggiornaControlliScorr();
    richiediWakeLock();
    rafId = requestAnimationFrame(passoScorrimento);
  }

  function fermaScorrimento() {
    if (!scorrendo) return;
    scorrendo = false;
    cancelAnimationFrame(rafId);
    rilasciaWakeLock();
    aggiornaControlliScorr();
  }

  // Un tocco/rotella/tasto di scorrimento fuori dalla barra interrompe lo scorrimento.
  function fermaSeFuoriBarra(e) {
    if (scorrendo && !barraScorr.contains(e.target)) fermaScorrimento();
  }
  const CHIAVI_SCORRIMENTO = new Set([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End']);

  btnScorri.addEventListener('click', () => (scorrendo ? fermaScorrimento() : avviaScorrimento()));
  btnVelMeno.addEventListener('click', () => cambiaVelocita(-1));
  btnVelPiu.addEventListener('click', () => cambiaVelocita(1));
  document.addEventListener('touchstart', fermaSeFuoriBarra, { passive: true });
  document.addEventListener('pointerdown', fermaSeFuoriBarra, { passive: true });
  document.addEventListener('wheel', fermaSeFuoriBarra, { passive: true });
  document.addEventListener('keydown', (e) => {
    if (CHIAVI_SCORRIMENTO.has(e.key)) fermaSeFuoriBarra(e);
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.hidden) fermaScorrimento(); });
  aggiornaControlliScorr();

  // ---------- Avvio ----------
  canzoni = carica();
  renderElenco();
  mostra('elenco');
})();
