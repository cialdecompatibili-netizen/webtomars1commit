#!/usr/bin/env python3
"""nuovo_sito.py - clona QUESTO sito in una nuova repo GitHub con un comando (e-commerce incluso).

Uso:   python nuovo_sito.py <nome-repo> [--dry-run] [--con-catalogo] [--dest CARTELLA] [--owner UTENTE]
Dati:  1) nome-repo = nome della nuova repo (e URL del sito: https://<owner>.github.io/<nome-repo>/)
       2) sorgente = la cartella di questo script (nessun nome di sito scritto qui dentro)
       3) owner = ricavato dal git origin della sorgente (o --owner)
       4) dest = <cartella padre della sorgente>/<nome-repo> (o --dest)
Cosa fa: controlli -> gh repo create -> copia -> git init/commit/push -> attende il primo deploy -> abilita Pages.
Cosa NON copia: .git, _site, node_modules, .jekyll-cache, ogni .env, CNAME (il dominio e' del sito di partenza),
  e _data/catalogo.json (il clone parte col catalogo demo del modulo; con --con-catalogo lo porta).
Il modulo e-commerce viaggia da solo: registry, modules_source/, plugin, pagine e asset sono nella copia.
Idempotente: se la cartella di destinazione esiste o la repo esiste gia' si ferma senza toccare niente.
"""
import argparse, json, re, shutil, subprocess, sys, time
from pathlib import Path

SRC = Path(__file__).resolve().parent


def run(cmd, cwd=None, check=True):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        sys.exit(f"ERRORE: {' '.join(cmd)}\n{r.stdout}{r.stderr}")
    return r


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("nome")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--con-catalogo", action="store_true")
    ap.add_argument("--dest")
    ap.add_argument("--owner")
    a = ap.parse_args()

    if not re.fullmatch(r"[A-Za-z0-9._-]+", a.nome):
        sys.exit("Nome repo non valido (solo lettere, numeri, . _ -)")
    dest = Path(a.dest) if a.dest else SRC.parent / a.nome
    origin = run(["git", "remote", "get-url", "origin"], cwd=SRC).stdout.strip()
    m = re.search(r"github\.com[:/]([^/]+)/", origin)
    owner = a.owner or (m.group(1) if m else sys.exit("Owner non ricavabile: usa --owner"))
    repo = f"{owner}/{a.nome}"

    # --- controlli (prima di scrivere qualsiasi cosa)
    if dest.exists():
        sys.exit(f"Esiste gia' {dest}: non sovrascrivo. Guarda 'git log' e 'git remote -v' li' e continua da li'.")
    if run(["git", "status", "--porcelain"], cwd=SRC).stdout.strip():
        sys.exit("La sorgente ha modifiche non committate: fai commit e push prima di clonare.")
    if run(["gh", "repo", "view", repo], check=False).returncode == 0:
        sys.exit(f"La repo {repo} esiste gia' su GitHub.")
    print(f"Sorgente: {SRC}\nNuova:    {repo}\nCartella: {dest}\nCatalogo: {'copiato' if a.con_catalogo else 'demo (non copiato)'}")
    if a.dry_run:
        print("DRY-RUN: nessuna modifica fatta."); return

    # --- repo vuota + copia
    run(["gh", "repo", "create", repo, "--public"])
    skip = {".git", "_site", "node_modules", ".jekyll-cache", "CNAME", ".env"}

    def ignora(d, nomi):
        out = {n for n in nomi if n in skip}
        if not a.con_catalogo and Path(d) == SRC / "_data":
            out |= {n for n in nomi if n == "catalogo.json"}
        return out

    shutil.copytree(SRC, dest, ignore=ignora)

    # --- git init, commit, push
    run(["git", "init", "-b", "main"], cwd=dest)
    run(["git", "add", "-A"], cwd=dest)
    run(["git", "commit", "-m", f"Nuovo sito da {SRC.name}"], cwd=dest)
    run(["git", "remote", "add", "origin", f"https://github.com/{repo}.git"], cwd=dest)
    run(["git", "push", "-u", "origin", "main"], cwd=dest, check=False)  # exit 1 possibile e normale: si verifica sotto
    if run(["git", "ls-remote", "--heads", "origin", "main"], cwd=dest).stdout.strip() == "":
        sys.exit("Push non riuscito: controlla 'git push' dentro " + str(dest))

    # --- primo deploy -> Pages
    print("Attendo il primo 'Deploy site' (max 10 minuti)...")
    ok = False
    for _ in range(60):
        time.sleep(10)
        r = run(["gh", "run", "list", "--repo", repo, "--limit", "1", "--json", "status,conclusion"], check=False)
        try:
            ultimo = json.loads(r.stdout)[0]
        except (ValueError, IndexError):
            continue
        if ultimo["status"] == "completed":
            ok = ultimo["conclusion"] == "success"
            break
    if not ok:
        sys.exit(f"Deploy non riuscito o ancora in corso: guarda https://github.com/{repo}/actions (Pages NON abilitato).")
    run(["gh", "api", "-X", "POST", f"repos/{repo}/pages", "-f", "source[branch]=gh-pages", "-f", "source[path]=/"], check=False)
    print(f"FATTO. Online tra circa 1 minuto: https://{owner}.github.io/{a.nome}/")
    print(f"Admin: /{a.nome}/admin/ (token GitHub da incollare). E-commerce: admin > Moduli, gia' installato.")
    print("A mano resta solo il blocco 'Questo progetto' di CLAUDE.md (nome, repo, URL, cartella).")


if __name__ == "__main__":
    main()
