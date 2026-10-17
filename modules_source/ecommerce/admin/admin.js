/* E-COMMERCE (admin): prodotti e categorie del negozio. Doc: CLAUDE.md > punto "E-COMMERCE". Lato sito: _plugins/ecommerce.rb, _pages/negozio.md.
   PUNTI CRITICI
   1) FONTE UNICA = _data/catalogo.json ({_nota, categorie:[{id,nome,icona}], prodotti:[{id,nome,descrizione,categoria,icona,tipo(fisico|digitale),prezzo_centesimi,visibile}]}).
      La leggono /negozio/, le pagine prodotto (plugin), il Worker Cloudflare e questa vista: i nomi dei campi NON si cambiano senza cambiare tutti e quattro.
   2) L'id di un prodotto/categoria e' l'URL (/negozio/<id>/) e la chiave del carrello e degli ordini: dopo la creazione NON si cambia (campo bloccato). Solo a-z 0-9 e '-'
      (il plugin salta gli id diversi). Per "rinominare" si cambia il nome, non l'id.
   3) prezzo_centesimi = euro x 100 INTERO (Stripe lavora in centesimi). Qui si scrive in euro e si converte con toCents (virgola o punto).
   4) tipo = fisico (l'ordine chiede l'indirizzo di spedizione) oppure digitale (nessun indirizzo). Niente abbonamenti.
   5) deploy.yml NON parte per un push di soli .json: la riga "_data/catalogo.json" in .github/workflows/deploy.yml serve a questo. Se la togli, salvare qui non pubblica niente.
   6) Si rilegge SEMPRE il file prima di scrivere (sha fresco): un salvataggio da un'altra scheda non viene sovrascritto con dati vecchi (GitHub risponde 409 e si vede il messaggio).
   7) Scrittura: ser() mantiene il formato a una riga per voce e la _nota. Se nel catalogo compaiono chiavi nuove di primo livello vanno aggiunte in ser(), altrimenti si perdono.
   8) Questo file e' il pezzo ADMIN del modulo Negozio: sta in modules_source/ecommerce/admin/admin.js, l'installazione lo copia in admin/modules/ecommerce/admin.js e admin-modules.js lo carica (con il gruppo Negozio nel menu) SOLO se il modulo e' installato E attivo. Disattivato = menu nascosto, dati intatti. Il catalogo parte DEMO: se _data/catalogo.json non esiste si usa il seed _includes/modules/ecommerce/catalogo_demo.json; il bottone Ripristina demo lo riscrive da capo. */
(function (A) {
  var $ = A.$, esc = A.esc, jq = A.jq, M = function () { return A.main(); };
  var PATH = '_data/catalogo.json', SEED = '_includes/modules/ecommerce/catalogo_demo.json', ID_RE = /^[a-z0-9-]+$/, fcat = '';

  /* Se _data/catalogo.json NON esiste (modulo appena installato) il sito mostra il demo del modulo (SEED) e anche qui si parte da quello (demo:true):
     alla prima modifica il file nasce (sha vuoto = creazione) e il catalogo diventa dell'utente. Un file rovinato dà un errore con broken:true (vedi in fondo). */
  function norm(text, sha, demo) {
    var d;
    try { d = JSON.parse(String(text).replace(/^\uFEFF/, '')); } catch (e) {
      var er = new Error(demo ? 'Il catalogo demo del modulo non si legge: reinstalla il modulo Negozio da Moduli' : 'Il catalogo non si legge (file _data/catalogo.json rovinato). Puoi controllarlo su GitHub oppure ripartire dal demo.');
      er.broken = !demo; throw er;
    }
    if (!d || typeof d !== 'object') d = {};
    if (!Array.isArray(d.categorie)) d.categorie = [];
    if (!Array.isArray(d.prodotti)) d.prodotti = [];
    return { sha: sha, d: d, demo: demo };
  }
  function load() {
    return A.getFile(PATH).then(function (f) { return norm(f.text, f.sha, false); }, function (e) {
      if (e.status !== 404) throw e;
      return A.getFile(SEED).then(function (s) { return norm(s.text, '', true); }, function () { throw new Error('Catalogo demo non trovato: reinstalla il modulo Negozio da Moduli'); });
    });
  }
  /* ser: stesso aspetto del file originale (una voce per riga), con _nota in testa. Niente BOM. */
  function ser(d) {
    var line = function (x) { return '  ' + JSON.stringify(x); };
    return '{\n "_nota": ' + JSON.stringify(d._nota || '') + ',\n "categorie": [\n' + d.categorie.map(line).join(',\n') + '\n ],\n "prodotti": [\n' + d.prodotti.map(line).join(',\n') + '\n ]\n}\n';
  }
  function save(c, msg) { return A.putFile(PATH, ser(c.d), c.sha || undefined, msg); }
  function euro(cent) { return (Math.round(+cent || 0) / 100).toFixed(2).replace('.', ','); }
  function toCents(s) { var n = parseFloat(String(s).trim().replace(',', '.')); if (!isFinite(n) || n <= 0 || n > 10000) return 0; return Math.round(n * 100); }
  function per(p) { return ''; } // nessun abbonamento: niente periodo
  function byId(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }
  function fail(e) { A.toast(A.errMsg(e), true); }

  /* Nota in cima a Prodotti e Categorie: dice se si sta guardando il demo o il catalogo dell'utente, e offre Ripristina demo. */
  function note(c) {
    return c.demo
      ? '<div class="card"><b>Catalogo demo.</b> Sono prodotti di esempio: appena ne modifichi o ne aggiungi uno, il catalogo diventa tuo.</div>'
      : '<div class="card"><small>Il catalogo \u00e8 il tuo. Per tornare ai prodotti di esempio: <button class="btn sm danger" onclick="A.ecReset()">Ripristina demo</button> (cancella TUTTI i tuoi prodotti e categorie e rimette il demo).</small></div>';
  }
  /* ---------------- PRODOTTI ---------------- */
  A.views.ecom = function () {
    $('topTitle').textContent = 'Prodotti';
    return load().then(function (v) {
      var c = v.d, h = note(v) + '<h2>Prodotti</h2><div class="card"><div class="tools"><button class="btn primary" onclick="A.ecEdit(\'\')">+ Nuovo prodotto</button> ' +
        '<select id="ec_f" onchange="A.ecFilt(this.value)" style="width:auto;display:inline-block"><option value="">Tutte le categorie</option>' +
        c.categorie.map(function (k) { return '<option value="' + esc(k.id) + '"' + (fcat === k.id ? ' selected' : '') + '>' + esc((k.icona || '') + ' ' + k.nome) + '</option>'; }).join('') +
        '<option value="-"' + (fcat === '-' ? ' selected' : '') + '>Senza categoria</option></select></div><div class="list">';
      var n = 0;
      c.prodotti.forEach(function (p) {
        var k = byId(c.categorie, p.categoria);
        if (fcat === '-' ? k : (fcat && p.categoria !== fcat)) return;
        n++;
        var hid = p.visibile === false;
        h += '<div class="it"><span>' + esc(p.icona || '') + ' <b' + (hid ? ' style="opacity:.55"' : '') + '>' + esc(p.nome) + '</b><small>' + esc(k ? k.nome : 'senza categoria') + ' \u00b7 ' +
          (p.tipo === 'digitale' ? 'digitale' : 'fisico') + ' \u00b7 ' + euro(p.prezzo_centesimi) + ' \u20ac ' + esc(per(p)) + '</small>' + (hid ? '<small class="ko">nascosto</small>' : '') + '</span>' +
          '<button class="btn sm" onclick="A.ecVis(\'' + jq(p.id) + '\')">' + (hid ? 'Mostra' : 'Nascondi') + '</button>' +
          '<button class="btn sm" onclick="A.ecEdit(\'' + jq(p.id) + '\')">Modifica</button>' +
          '<button class="btn sm danger" onclick="A.ecDel(\'' + jq(p.id) + '\')">Elimina</button></div>';
      });
      if (!n) h += '<p>Nessun prodotto' + (fcat ? ' in questa categoria' : '') + '. Premi \u201c+ Nuovo prodotto\u201d.</p>';
      M().innerHTML = h + '</div><small>Nascondere un prodotto lo toglie dal negozio e dal carrello, ma resta salvato. Dopo ogni modifica il sito si aggiorna in 2-3 minuti.</small></div>';
    });
  };
  A.ecFilt = function (v) { fcat = v; A.go('ecom'); };

  A.ecVis = A.wrap(function (id) {
    return load().then(function (c) {
      var p = byId(c.d.prodotti, id); if (!p) throw new Error('Prodotto non trovato: ricarica la pagina');
      p.visibile = (p.visibile === false);
      return save(c, 'admin: e-commerce ' + (p.visibile ? 'mostra ' : 'nascondi ') + id).then(function () { A.toast(p.visibile ? 'Prodotto visibile' : 'Prodotto nascosto'); A.go('ecom'); });
    });
  });
  A.ecDel = A.wrap(function (id) {
    return load().then(function (c) {
      var p = byId(c.d.prodotti, id); if (!p) throw new Error('Prodotto non trovato: ricarica la pagina');
      if (!confirm('Eliminare \u201c' + p.nome + '\u201d? Sparisce dal negozio. Se vuoi solo toglierlo dalla vendita usa Nascondi.')) return;
      c.d.prodotti = c.d.prodotti.filter(function (x) { return x.id !== id; });
      return save(c, 'admin: e-commerce elimina ' + id).then(function () { A.toast('Eliminato'); A.go('ecom'); });
    });
  });

  A.ecEdit = function (id) {
    load().then(function (c) {
      var p = id ? byId(c.d.prodotti, id) : null; if (id && !p) throw new Error('Prodotto non trovato: ricarica la pagina');
      p = p || { tipo: 'fisico', visibile: true, icona: '\ud83d\udce6' };
      var opt = function (arr, cur) { return arr.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (x[0] === cur ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); };
      var cats = [['', 'Nessuna categoria']].concat(c.d.categorie.map(function (k) { return [k.id, (k.icona || '') + ' ' + k.nome]; }));
      $('topTitle').textContent = id ? 'Modifica prodotto' : 'Nuovo prodotto';
      M().innerHTML = '<h2>' + (id ? 'Modifica prodotto' : 'Nuovo prodotto') + '</h2><div class="card">' +
        '<label>Nome</label><input id="ec_nome" value="' + esc(p.nome || '') + '" placeholder="Es. Caff\u00e8 macinato">' +
        '<label>Indirizzo (si vede nell\u0027URL: /negozio/<i>indirizzo</i>/)</label><input id="ec_id" value="' + esc(p.id || '') + '"' + (id ? ' readonly style="background:#f0f0f1"' : ' placeholder="vuoto = lo ricavo dal nome"') + '>' +
        '<small>' + (id ? 'Non si pu\u00f2 cambiare dopo la creazione: \u00e8 la chiave del carrello e degli ordini.' : 'Solo lettere minuscole, numeri e trattini. Dopo il salvataggio non si cambia pi\u00f9.') + '</small>' +
        '<label>Descrizione breve</label><textarea id="ec_desc" style="min-height:70px;font-family:inherit">' + esc(p.descrizione || '') + '</textarea>' +
        '<label>Descrizione completa (si vede sotto la foto; ogni a capo = nuovo paragrafo)</label><textarea id="ec_full" style="min-height:140px;font-family:inherit">' + esc(p.descrizione_completa || '') + '</textarea>' +
        '<label>Foto del prodotto</label><div id="ec_img_pv">' + (p.immagine ? '<img src="' + esc(A.rawUrl(p.immagine)) + '" style="max-width:240px;max-height:150px;border-radius:4px;border:1px solid #a7aaad;display:block;margin:6px 0"><small>' + esc(p.immagine) + '</small>' : '<small>Nessuna foto: nella pagina prodotto si vede l\u0027icona</small>') + '</div><input type="hidden" id="ec_img" value="' + esc(p.immagine || '') + '"><p><button type="button" class="btn" onclick="A.imgPick(\'ec_img\')">Scegli o carica foto</button> <button type="button" class="btn danger" onclick="A.imgClr(\'ec_img\')">Rimuovi</button></p>' +
        '<div class="row"><div><label>Categoria</label><select id="ec_cat">' + opt(cats, p.categoria || '') + '</select></div>' +
        '<div><label>Icona (una emoji)</label><input id="ec_ico" value="' + esc(p.icona || '') + '" maxlength="4"></div></div>' +
        '<div class="row"><div><label>Tipo di prodotto</label><select id="ec_tipo">' + opt([['fisico', 'Fisico (si spedisce: l\u0027ordine chiede l\u0027indirizzo)'], ['digitale', 'Digitale (nessun indirizzo)']], p.tipo === 'digitale' ? 'digitale' : 'fisico') + '</select></div>' +
        '<div><label>Prezzo in euro</label><input id="ec_prezzo" value="' + (p.prezzo_centesimi ? euro(p.prezzo_centesimi) : '') + '" placeholder="Es. 29,90" inputmode="decimal"></div></div>' +
        '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="ec_vis" style="width:auto"' + (p.visibile === false ? '' : ' checked') + '> Visibile nel negozio</label>' +
        '<p><button class="btn primary" onclick="A.ecSave(\'' + jq(id || '') + '\')">Salva</button> <button class="btn" onclick="A.go(\'ecom\')">Annulla</button></p></div>';
    }).catch(fail);
  };
  A.ecSave = A.wrap(function (old) {
    var nome = $('ec_nome').value.trim(), tipo = $('ec_tipo').value, cents = toCents($('ec_prezzo').value);
    if (!nome) return A.toast('Scrivi il nome del prodotto', true);
    if (!cents) return A.toast('Prezzo non valido: scrivi un importo in euro, es. 29,90', true);
    var id = old || A.slugify($('ec_id').value.trim() || nome);
    if (!ID_RE.test(id)) return A.toast('Indirizzo non valido: solo lettere minuscole, numeri e trattini', true);
    return load().then(function (c) {
      var prev = byId(c.d.prodotti, id);
      if (old && !prev) throw new Error('Prodotto non trovato: ricarica la pagina');
      if (!old && prev) throw new Error('Esiste gi\u00e0 un prodotto con questo indirizzo (' + id + '): cambialo');
      var n = { id: id, nome: nome, descrizione: $('ec_desc').value.trim(), categoria: $('ec_cat').value, icona: $('ec_ico').value.trim(), tipo: tipo, prezzo_centesimi: cents };
      var full = $('ec_full').value.trim(); if (full) n.descrizione_completa = full;
      var im = $('ec_img').value.trim(); if (im) n.immagine = /^(https?:)?\/\//.test(im) ? im : im.replace(/^.*?(assets\/img\/)/, '$1');
      n.visibile = $('ec_vis').checked;
      if (prev) for (var k in prev) if (!(k in n) && k !== 'intervallo' && k !== 'ogni' && k !== 'descrizione_completa' && k !== 'immagine') n[k] = prev[k]; // chiavi extra scritte a mano restano
      if (prev) c.d.prodotti[c.d.prodotti.indexOf(prev)] = n; else c.d.prodotti.push(n);
      return save(c, 'admin: e-commerce ' + (prev ? 'modifica ' : 'nuovo ') + id).then(function () { A.toast('Salvato'); A.go('ecom'); });
    });
  });

  /* ---------------- CATEGORIE ---------------- */
  A.views.ecomcat = function () {
    $('topTitle').textContent = 'Categorie prodotti';
    return load().then(function (v) {
      var c = v.d, h = note(v) + '<h2>Categorie prodotti</h2><div class="card"><div class="tools"><button class="btn primary" onclick="A.ecCatEdit(\'\')">+ Nuova categoria</button></div><div class="list">';
      c.categorie.forEach(function (k, i) {
        var n = c.prodotti.filter(function (p) { return p.categoria === k.id; }).length;
        h += '<div class="it"><span>' + esc(k.icona || '') + ' <b>' + esc(k.nome) + '</b><small>' + n + (n === 1 ? ' prodotto' : ' prodotti') + '</small></span>' +
          '<button class="btn sm"' + (i ? '' : ' disabled') + ' title="Sposta su" onclick="A.ecCatMove(\'' + jq(k.id) + '\',-1)">\u25b2</button>' +
          '<button class="btn sm"' + (i < c.categorie.length - 1 ? '' : ' disabled') + ' title="Sposta gi\u00f9" onclick="A.ecCatMove(\'' + jq(k.id) + '\',1)">\u25bc</button>' +
          '<button class="btn sm" onclick="A.ecCatEdit(\'' + jq(k.id) + '\')">Modifica</button>' +
          '<button class="btn sm danger" onclick="A.ecCatDel(\'' + jq(k.id) + '\')">Elimina</button></div>';
      });
      if (!c.categorie.length) h += '<p>Nessuna categoria. Premi \u201c+ Nuova categoria\u201d.</p>';
      M().innerHTML = h + '</div><small>L\u0027ordine qui \u00e8 l\u0027ordine dei bottoni filtro nel negozio.</small></div>';
    });
  };
  A.ecCatEdit = function (id) {
    load().then(function (c) {
      var k = id ? byId(c.d.categorie, id) : null; if (id && !k) throw new Error('Categoria non trovata: ricarica la pagina');
      k = k || { icona: '\ud83d\udecd\ufe0f' };
      $('topTitle').textContent = id ? 'Modifica categoria' : 'Nuova categoria';
      M().innerHTML = '<h2>' + (id ? 'Modifica categoria' : 'Nuova categoria') + '</h2><div class="card">' +
        '<label>Nome</label><input id="ek_nome" value="' + esc(k.nome || '') + '" placeholder="Es. Casa e benessere">' +
        '<label>Icona (una emoji)</label><input id="ek_ico" value="' + esc(k.icona || '') + '" maxlength="4">' +
        '<p><button class="btn primary" onclick="A.ecCatSave(\'' + jq(id || '') + '\')">Salva</button> <button class="btn" onclick="A.go(\'ecomcat\')">Annulla</button></p></div>';
    }).catch(fail);
  };
  A.ecCatSave = A.wrap(function (old) {
    var nome = $('ek_nome').value.trim(), ico = $('ek_ico').value.trim();
    if (!nome) return A.toast('Scrivi il nome della categoria', true);
    var id = old || A.slugify(nome);
    if (!ID_RE.test(id)) return A.toast('Nome non valido: usa lettere o numeri', true);
    return load().then(function (c) {
      var prev = byId(c.d.categorie, id);
      if (old && !prev) throw new Error('Categoria non trovata: ricarica la pagina');
      if (!old && prev) throw new Error('Esiste gi\u00e0 una categoria con questo nome: scegline un altro');
      if (prev) { prev.nome = nome; prev.icona = ico; } else c.d.categorie.push({ id: id, nome: nome, icona: ico });
      return save(c, 'admin: e-commerce categoria ' + (prev ? 'modifica ' : 'nuova ') + id).then(function () { A.toast('Salvato'); A.go('ecomcat'); });
    });
  });
  A.ecCatMove = A.wrap(function (id, dir) {
    return load().then(function (c) {
      var a = c.d.categorie, i = a.indexOf(byId(a, id)), j = i + dir;
      if (i < 0 || j < 0 || j >= a.length) return;
      var t = a[i]; a[i] = a[j]; a[j] = t;
      return save(c, 'admin: e-commerce ordine categorie').then(function () { A.go('ecomcat'); });
    });
  });
  A.ecCatDel = A.wrap(function (id) {
    return load().then(function (c) {
      var k = byId(c.d.categorie, id); if (!k) throw new Error('Categoria non trovata: ricarica la pagina');
      var n = c.d.prodotti.filter(function (p) { return p.categoria === id; }).length;
      if (n) return A.toast('La categoria ha ancora ' + n + (n === 1 ? ' prodotto' : ' prodotti') + ': spostali in un\u0027altra categoria o eliminali prima', true);
      if (!confirm('Eliminare la categoria \u201c' + k.nome + '\u201d?')) return;
      c.d.categorie = c.d.categorie.filter(function (x) { return x.id !== id; });
      return save(c, 'admin: e-commerce elimina categoria ' + id).then(function () { A.toast('Eliminata'); A.go('ecomcat'); });
    });
  });

  /* ---------------- RIPRISTINA DEMO ----------------
     Riscrive _data/catalogo.json con il catalogo demo del modulo (SEED, copiato in _includes/modules/ecommerce/ dall'installazione).
     Cancella TUTTI i prodotti e le categorie dell'utente. Le foto caricate restano nella libreria immagini (non si toccano). */
  A.ecReset = A.wrap(function () {
    if (!confirm('Ripristinare il catalogo demo? Cancella TUTTI i tuoi prodotti e categorie e rimette quelli di esempio. Le foto gi\u00e0 caricate restano nella libreria immagini. Da qui non si pu\u00f2 annullare.')) return;
    return Promise.all([
      A.getFile(SEED),
      A.getFile(PATH).then(function (f) { return f.sha; }, function (e) { if (e.status === 404) return ''; throw e; })
    ]).then(function (v) {
      var seed = String(v[0].text).replace(/^\uFEFF/, '');
      try { JSON.parse(seed); } catch (e) { throw new Error('Il catalogo demo del modulo non si legge: reinstalla il modulo Negozio da Moduli'); }
      return A.putFile(PATH, seed, v[1] || undefined, 'admin: e-commerce ripristina catalogo demo').then(function () { fcat = ''; A.toast('Catalogo demo ripristinato'); A.go('ecom'); });
    });
  });

  /* Catalogo rovinato (JSON non valido): la vista non puo' aprirsi, quindi qui si offre direttamente Ripristina demo. Gli altri errori (rete, token) passano al messaggio standard di go(). */
  ['ecom', 'ecomcat'].forEach(function (n) {
    var orig = A.views[n];
    A.views[n] = function () {
      return orig().catch(function (e) {
        if (!e || !e.broken) throw e;
        M().innerHTML = '<div class="card"><b>Il catalogo non si apre.</b><p>' + esc(e.message) + '</p><p><button class="btn danger" onclick="A.ecReset()">Ripristina demo</button></p></div>';
      });
    };
  });
})(A);