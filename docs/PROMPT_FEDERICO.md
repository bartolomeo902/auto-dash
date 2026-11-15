# Prompt per Federico (da incollare in Claude Code, partendo da una cartella vuota)

Prima volta: installa Claude Code (https://claude.com/claude-code), crea una cartella vuota per i tuoi progetti
(es. `Progetti`), aprila nel terminale, scrivi `claude` e incolla il testo qui sotto. Fa tutto lui: ti chiede solo
di approvare i comandi e di fare il login a GitHub nel browser.

---

Ciao Claude. Sono Federico. Voglio una mia copia di "Auto Dash", la dashboard OBD-II di Bartolomeo
(https://github.com/bartolomeo902/auto-dash), per modificarla in autonomia senza toccare la sua versione.
Rispondi sempre in italiano e spiegami in modo semplice cosa fai. Fai tu tutti i passaggi: io approvo i comandi
e faccio solo quello che richiede il browser. Procedi in ordine e, se un passaggio fallisce, diagnostica e correggi
prima di andare avanti.

1. Controlla il mio sistema operativo e quali strumenti ho: git, gh (GitHub CLI), node, npm, python3.
   Per quelli che mancano, proponi l'installazione col gestore giusto (macOS: Homebrew; Windows: winget; Linux: apt/dnf)
   e installali dopo la mia conferma.
2. Controlla se sono già collegato a GitHub (`gh auth status`). Se no, avvia `gh auth login --web --git-protocol https`,
   dimmi esattamente cosa fare nel browser (il codice monouso da inserire e dove) e aspetta che io finisca.
   Poi esegui `gh auth setup-git` e `gh auth status` per verificare, e dimmi il mio nome utente GitHub.
3. Fai il fork e clonalo qui: `gh repo fork bartolomeo902/auto-dash --clone --remote`, poi entra nella cartella `auto-dash`
   e verifica con `git remote -v` che `origin` sia il mio fork e `upstream` sia bartolomeo902/auto-dash.
4. Abilita GitHub Pages sul mio fork dal branch `main`, cartella `/`
   (`gh api -X POST repos/<mio-utente>/auto-dash/pages -f "source[branch]=main" -f "source[path]=/"`; se risponde che
   esiste già va bene). Poi dimmi l'indirizzo del mio sito (`https://<mio-utente>.github.io/auto-dash/`), che sarà online
   dopo circa un minuto.
5. Leggi `AGENTS.md`, `CLAUDE.md` e `docs/MAPPATURA_BIGSTER.md` e riassumimi in 10 righe come è fatto il progetto.
6. Esegui `npm install` e `npm test` e dimmi il risultato (devono passare tutti i controlli).
7. Avvia `npm run serve` e dimmi come aprire l'app sul computer (http://localhost:8000), accedere come Ospite e provarla
   con il pulsante Demo. Spiegami anche come aprire il MIO sito nel browser del telefono (Bluefy) quando sarà online.
8. Da qui in poi lavora da `auto-dash` e segui le regole di `AGENTS.md`. Per ogni mia richiesta: crea un ramo
   (`git switch -c nome-breve`), fai commit piccoli in italiano, lancia `npm test`, provala con la Demo, e solo dopo la mia
   conferma unisci a `main` e fai `git push` (il mio sito si aggiorna da solo).
   Ricorda: l'app deve solo leggere dall'auto, mai comandi di scrittura. Se non sei sicuro di un dato o di una formula,
   chiedimi invece di inventare.
9. Per tenere il fork aggiornato con le novità di Bartolomeo: `git fetch upstream && git merge upstream/main`,
   risolvendo i conflitti senza perdere le mie modifiche e rilanciando `npm test`.
   Se voglio proporgli una modifica: `gh pr create --repo bartolomeo902/auto-dash`.

Quando hai finito i passaggi 1-7 fammi un riepilogo (utente GitHub, cartella, indirizzo del mio sito, esito dei test)
e chiedimi cosa voglio modificare.
