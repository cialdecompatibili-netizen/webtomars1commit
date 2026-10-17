#!/usr/bin/env python3
"""genera_favicon.py - favicon rotonda e realistica da una mappa planetaria.

Usa una mappa equirettangolare (2:1, tipo "marte.webp") e la avvolge su una
sfera con luce laterale e bordo scuro. Scrive:
  - assets/img/<nome>.png   favicon PNG con sfondo trasparente (192 px)
  - favicon.ico             in root, multi-misura (16..128 px)
e imposta `icon: <nome>.png` in _config.yml (tema al-folio e simili).

Perche' serve: Google non mostra bene le favicon emoji (`icon: 🏠`), vuole un
file vero, di lato multiplo di 48 px. Il tema al-folio legge `site.icon` e, se
non e' un'emoji, genera <link rel="shortcut icon" href="/assets/img/<icon>">.

USO (da qualsiasi cartella, passando --repo, oppure dentro la repo):
  python genera_favicon.py                      # default: Marte su Syrtis Major
  python genera_favicon.py --dry-run            # non scrive nulla, solo anteprima
  python genera_favicon.py --repo C:\\...\\altrosito --sorgente assets\\img\\luna.jpg
  python genera_favicon.py --lon 0 --lat 0      # cambia il punto al centro

Requisiti: pip install pillow numpy
Documentazione: docs/claude/favicon.md
"""
import argparse
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image


def render_sfera(mappa, lato, lon0, lat0, luce):
    """Restituisce un'immagine RGBA `lato` x `lato` con la sfera ombreggiata.

    mappa : PIL.Image equirettangolare (longitudine -180..180 sull'asse x,
            latitudine 90..-90 sull'asse y, centro = longitudine 0)
    lon0, lat0 : punto della mappa da mettere al centro del disco (radianti)
    luce  : vettore (x, y, z) della luce; x>0 destra, y>0 alto, z>0 verso chi guarda
    """
    tex = np.asarray(mappa.convert("RGB")).astype(np.float32)
    h, w, _ = tex.shape

    # Coordinate di ogni pixel nel disco unitario: x a destra, y in alto
    ys, xs = np.mgrid[0:lato, 0:lato].astype(np.float32)
    x = (xs + 0.5) / lato * 2 - 1
    y = 1 - (ys + 0.5) / lato * 2
    r2 = x * x + y * y
    dentro = r2 <= 1.0                      # maschera del disco
    z = np.sqrt(np.clip(1 - r2, 0, 1))      # altezza della sfera in ogni punto

    # Proiezione ortografica inversa: da (x, y) a (latitudine, longitudine)
    rho = np.sqrt(r2)
    c = np.arcsin(np.clip(rho, 0, 1))
    sinc, cosc = np.sin(c), np.cos(c)
    with np.errstate(invalid="ignore", divide="ignore"):
        lat = np.arcsin(np.clip(
            cosc * np.sin(lat0) + np.where(rho > 0, y * sinc * np.cos(lat0) / rho, 0), -1, 1))
        lon = lon0 + np.arctan2(x * sinc, rho * np.cos(lat0) * cosc - y * np.sin(lat0) * sinc)

    # Da lat/lon alle coordinate della mappa, con interpolazione bilineare
    u = ((lon + np.pi) % (2 * np.pi)) / (2 * np.pi) * w
    v = (0.5 - lat / np.pi) * h
    u0 = np.floor(u).astype(int) % w
    v0 = np.clip(np.floor(v).astype(int), 0, h - 1)
    u1, v1 = (u0 + 1) % w, np.clip(v0 + 1, 0, h - 1)
    fu, fv = (u - np.floor(u))[..., None], (v - np.floor(v))[..., None]
    col = (tex[v0, u0] * (1 - fu) * (1 - fv) + tex[v0, u1] * fu * (1 - fv)
           + tex[v1, u0] * (1 - fu) * fv + tex[v1, u1] * fu * fv)

    # Illuminazione: Lambert con terminatore morbido + oscuramento al bordo.
    # Per un look piu' piatto/luminoso: alza 0.18 (luce di fondo) o 1.12 (gain).
    L = np.asarray(luce, dtype=np.float32)
    L /= np.linalg.norm(L)
    lam = np.clip(x * L[0] + y * L[1] + z * L[2], 0, 1)
    ombra = 0.18 + 0.95 * lam ** 0.8
    bordo = 0.55 + 0.45 * z ** 0.5
    col = np.clip(col * (ombra * bordo)[..., None] * 1.12, 0, 255)

    rgba = np.dstack([col.astype(np.uint8), (dentro * 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def aggiorna_config(config, nome_file, dry):
    """Imposta `icon: <nome_file>` in _config.yml senza toccare il resto.

    Mantiene il commento a fine riga e non converte i fine riga (git avvisa
    su LF/CRLF ma il file resta com'era). Ritorna un testo di esito."""
    if not config.exists():
        return f"{config} non trovato: imposta a mano icon: {nome_file}"
    testo = config.read_bytes().decode("utf-8")
    nuovo, n = re.subn(r"(?m)^icon:[^#\r\n]*(#.*)?$",
                       lambda m: f"icon: {nome_file} " + (m.group(1) or ""),
                       testo, count=1)
    if n == 0:
        return "riga `icon:` non trovata in _config.yml: aggiungila a mano"
    if nuovo == testo:
        return f"_config.yml gia' a posto (icon: {nome_file})"
    if not dry:
        config.write_bytes(nuovo.encode("utf-8"))
    return f"_config.yml: icon -> {nome_file}"


def main():
    p = argparse.ArgumentParser(description="Favicon rotonda da mappa equirettangolare")
    p.add_argument("--repo", default=".", help="cartella del sito (default: cartella corrente)")
    p.add_argument("--sorgente", default="assets/img/marte.webp",
                   help="mappa 2:1, relativa alla repo (default: assets/img/marte.webp)")
    p.add_argument("--lon", type=float, default=68, help="longitudine al centro, gradi (default 68 = Syrtis Major)")
    p.add_argument("--lat", type=float, default=10, help="latitudine al centro, gradi (default 10)")
    p.add_argument("--luce", default="-0.55,0.45,0.70", help="vettore luce x,y,z (default alto-sinistra)")
    p.add_argument("--dimensione", type=int, default=192, help="lato del PNG, multiplo di 48 (default 192)")
    p.add_argument("--nome", default="favicon", help="nome file senza estensione (default favicon)")
    p.add_argument("--no-config", action="store_true", help="non toccare _config.yml")
    p.add_argument("--anteprima", help="salva qui un PNG di prova (192/48/32/16 px su bianco)")
    p.add_argument("--dry-run", action="store_true", help="non scrive nella repo")
    a = p.parse_args()

    repo = Path(a.repo).resolve()
    sorgente = repo / a.sorgente
    if not sorgente.exists():
        sys.exit(f"ERRORE: sorgente non trovata: {sorgente}")
    if a.dimensione % 48:
        print("ATTENZIONE: Google preferisce un lato multiplo di 48 px")

    luce = [float(v) for v in a.luce.split(",")]
    # Si renderizza a 4x e poi si riduce: bordi del disco morbidi, niente scalini
    grande = render_sfera(Image.open(sorgente), a.dimensione * 4,
                          np.radians(a.lon), np.radians(a.lat), luce)

    png = repo / "assets" / "img" / f"{a.nome}.png"
    ico = repo / "favicon.ico"
    if not a.dry_run:
        png.parent.mkdir(parents=True, exist_ok=True)
        grande.resize((a.dimensione, a.dimensione), Image.LANCZOS).save(png, optimize=True)
        # favicon.ico in root: Google e i browser lo cercano anche senza link
        grande.resize((256, 256), Image.LANCZOS).save(
            ico, sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)])
    print(f"{'(dry-run) ' if a.dry_run else ''}scritti: {png.relative_to(repo)}, {ico.name}")

    if not a.no_config:
        print(aggiorna_config(repo / "_config.yml", f"{a.nome}.png", a.dry_run))

    if a.anteprima:
        misure = (192, 48, 32, 16)
        tela = Image.new("RGBA", (sum(misure) + 20 * (len(misure) + 1), 200), (255, 255, 255, 255))
        px = 20
        for s in misure:
            tela.alpha_composite(grande.resize((s, s), Image.LANCZOS), (px, 4))
            px += s + 20
        tela.convert("RGB").save(a.anteprima)
        print(f"anteprima: {a.anteprima}")


if __name__ == "__main__":
    main()
