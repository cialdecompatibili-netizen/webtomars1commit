# Favicon rotonda (`genera_favicon.py`)

Script unico, riusabile su qualsiasi sito al-folio (o simile) con `icon:` in `_config.yml`.

## Problema

Google non mostra le favicon emoji (`icon: 🏠`). Serve un file vero, con lato multiplo di 48 px.
Il tema legge `site.icon`: se non e' un'emoji genera `<link rel="shortcut icon" href="/assets/img/<icon>">`
(vedi `_includes/head.liquid` della gem `al_folio_core`, riga con `site.icon.size <= 4`).

## Comando

Da dentro la repo (serve `pip install pillow numpy`):

    python genera_favicon.py --dry-run     # prova, non scrive nulla
    python genera_favicon.py               # genera e imposta icon in _config.yml
    git add _config.yml assets/img/favicon.png favicon.ico
    git commit -m "favicon: ..." ; git push

Cosa fa: avvolge una mappa equirettangolare (2:1) su una sfera con luce laterale e bordo scuro, poi scrive
`assets/img/favicon.png` (192 px, trasparente), `favicon.ico` in root (16..128 px) e cambia solo la riga `icon:`
di `_config.yml` (commento a fine riga conservato, fine riga non convertiti).

## Opzioni utili

| Opzione | Default | Uso |
|---|---|---|
| `--repo` | cartella corrente | altro sito, es. `--repo C:\Users\mirco\Desktop\pannellisolari` |
| `--sorgente` | `assets/img/marte.webp` | mappa 2:1 relativa alla repo (la mappa deve essere nella repo) |
| `--lon` / `--lat` | 68 / 10 | punto al centro (68/10 = Syrtis Major, macchia scura di Marte) |
| `--luce` | `-0.55,0.45,0.70` | direzione luce x,y,z (alto-sinistra) |
| `--dimensione` | 192 | lato PNG, multiplo di 48 |
| `--nome` | `favicon` | nome file senza estensione |
| `--no-config` | - | non toccare `_config.yml` |
| `--anteprima` | - | salva un PNG di prova a 192/48/32/16 px |

## Replicare su un altro sito

1. Copiare `genera_favicon.py` nella repo del nuovo sito (e questo file in `docs/claude/`).
2. Mettere la mappa del pianeta in `assets/img/` (nel sito attuale: `marte.webp`, 768x384).
3. `python genera_favicon.py --dry-run --anteprima %TEMP%\prova.png` e guardare l'anteprima.
4. Rilanciare senza `--dry-run`, poi commit e push solo di `_config.yml`, `assets/img/favicon.png`, `favicon.ico`.
5. Se il sito ha `icon:` assente in `_config.yml`, lo script lo segnala: aggiungere a mano `icon: favicon.png`.

Per un soggetto diverso da un pianeta (logo, foto) il disco rotondo non serve: basta salvare un PNG 192x192 in
`assets/img/favicon.png` e impostare `icon: favicon.png`; l'`.ico` si ottiene con Pillow come nello script.

## Dopo il push

- Controllare che la build di GitHub Pages sia passata e che `/assets/img/favicon.png` risponda 200.
- Google aggiorna la favicon nei risultati in giorni o settimane: chiedere la reindicizzazione della home da Search Console.
- Se la favicon sembra troppo scura a 16 px, alzare in `render_sfera` la luce di fondo (`0.18`) o il gain (`1.12`).
