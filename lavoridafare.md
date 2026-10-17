# Lavori da fare (webtomars)

Ultimo aggiornamento: 09/10/2026. Letto da Claude a inizio sessione, insieme a CLAUDE.md. Quando un punto è finito si spunta o si toglie.

## Dove siamo rimasti

Sito: https://webtomars.it/ (repo cialdecompatibili-netizen/webtomars, cartella C:\Users\mirco\Desktop\crazywebstabile). Ultimo commit al 09/10: 8b166ab. Tutto pushato, working tree pulito.

Già fatto:
- Repo creato come clone di crazyweb4test_new_compatta, Pages attivo, CLAUDE.md aggiornato con i dati del progetto.
- Card bianche stile Italfuni (senza icona) su home, servizi e progetti.
- Progetti: in home resta Villa Tre Colli (sito WordPress, SEO, branding, https://www.villatrecolli.com/). Florbook resta nel portfolio, deciso di lasciarlo così.
- Pulizia demo: post, progetti, news, pagine, libri e corsi demo spostati in `_cestino/` (ripristinabili).
- Blog: 3 articoli riscritti dopo lettura fonti (SEO per e-commerce, costo di un sito aziendale, Google Ads o SEO).
- Servizi riscritti e allungati per la SEO (circa 3,3-3,9 KB contro 900 byte di prima), in 2 gruppi da 9 totali: consulenza-seo, google-ads, meta-ads, seo-per-ecommerce, seo-per-aziende (commit 8cead62); linkedin-ads, tiktok-ads, ppc-per-ecommerce, social-ads-per-ecommerce (commit 8b166ab).
- CLAUDE.md ha la sezione "Cose che funzionano": Claude la aggiorna da solo e fa commit e push del solo CLAUDE.md.

## Da fare, in ordine

1. **Riscrivere i servizi rimasti: 46 con testo breve (fatti il 15/10: sviluppo-ecommerce, siti-web-aziendali-e-portali, sviluppo-su-misura, cms-custom, agenti-ai-per-aziende, geo, audit-seo-del-sito, geo-audit-e-strategy; titoli SEO con " - " e non "|"; uno alla volta, con ricerca su fonti ufficiali prima di scrivere) e quasi identico** (contenuto debole per Google). Procedere a ondate, un commit e push per gruppo:
   - SEO e GEO: completato (prossimo gruppo, pagine di Tready e Secret Key già scaricate in claudetemp\fonti)
   - AI e automazione: 15
   - Sviluppo web: 12
   - Strategia e consulenza: 9
   - Social e contenuti: 8
   - Design e brand: 3
   - Software e applicazioni: 2
   - Settori verticali: 2
   Per ogni servizio: leggere le pagine dei competitor, scrivere con parole proprie, struttura diversa da servizio a servizio (a chi è rivolto, cosa facciamo, come lavoriamo, domande frequenti), nessuna cifra inventata, link ai Contatti, accenti corretti (niente apostrofi al posto delle lettere accentate). Aggiornare anche descrizione e SEO con `campo`.
2. Verificare online che la build sia passata e che home, servizi, progetti e blog si vedano bene (finora mai aperto il sito dopo i push).
3. Valutare se scrivere altri articoli del blog (sempre dopo aver letto le fonti).
4. Fonti competitor: Secret Key, Tready, Noviia. Se un URL non si legge, scaricarlo con PowerShell (Invoke-WebRequest con user-agent da browser), oppure farsi incollare il sorgente dall'utente.

## Come si lavora (promemoria)

- Servizi: `python -m automazioni servizi testo <slug> --testo-file file.md` e `campo` per descrizione e SEO; usare `--dry-run` prima. Esiste lo script `applica_servizi.py <modulo>` usato negli ultimi gruppi (cercarlo in claudetemp se non è nella repo).
- Non toccare `_layouts/`, `_includes/`, `_sass/`.
- Prima di modificare creare il branch `checkpoint-AAAA-MM-GG`.
- Scrivere i file in binario, senza BOM e con gli a-capo intatti (come chiede CLAUDE.md).
- I repo di partenza (crazyweb4test, crazyweb4test_new_compatta, box-ecommerce) non vanno toccati.


## Servizi per creator (15/10)
Nuova sezione 'Creator e YouTube' in _data/servizi_gruppi.yml, 6 servizi creati e online: miniature-youtube, montaggio-video-per-creator, identita-visiva-per-creator, shorts-e-clip-per-creator, gestione-e-seo-canale-youtube, sito-per-creator. Da fare: valutare altri (copioni/script, podcast per creator, merchandising, sponsorizzazioni).

Aggiornamento 15/10 sera: SEO e GEO completato (seo-ai-driven, ai-search, amazon-seo, link-building-e-digital-pr, local-seo-google-my-business, seo-copywriting). Creator e YouTube ora 14 servizi (aggiunti canale-completo-per-creator, audit-e-piano-contenuti-youtube, script-e-struttura-video, sottotitoli-e-doppiaggio-in-altre-lingue, riutilizzo-contenuti-per-creator, newsletter-per-creator, automazioni-per-creator, media-kit-e-pagina-sponsor). Listino interno: claudetemp\listino-creator.md. Prossimo gruppo: AI e automazione (15).
