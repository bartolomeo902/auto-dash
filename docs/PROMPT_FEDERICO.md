# Prompt da incollare a Claude Code (nella cartella del tuo fork)

Ciao Claude. Sono Federico. Questo e' il mio fork di Auto Dash, la dashboard OBD-II di Bartolomeo
(repo originale: https://github.com/bartolomeo902/auto-dash). Voglio lavorarci in autonomia senza toccare la sua versione.

Per prima cosa, in ordine:
1. Leggi `AGENTS.md`, `CLAUDE.md` e `docs/MAPPATURA_BIGSTER.md` e riassumimi in 10 righe come e' fatto il progetto.
2. Controlla lo stato di git: `git remote -v` deve mostrare `origin` = il mio fork e `upstream` = bartolomeo902/auto-dash.
   Se manca `upstream`, aggiungilo (`git remote add upstream https://github.com/bartolomeo902/auto-dash.git`).
3. Esegui `npm install` e `npm test` e dimmi il risultato.
4. Verifica che GitHub Pages sia attivo sul mio fork (`gh api repos/<mio-utente>/auto-dash/pages`); se non lo e', abilitalo
   dal branch `main`, cartella `/`, e dammi l'indirizzo del mio sito.
5. Avvia `npm run serve` e dimmi come aprire l'app sul computer e provarla con il pulsante Demo.

Poi aspetta le mie richieste. Per ogni modifica: lavora su un ramo (`git switch -c nome-breve`), fai commit piccoli in italiano,
lancia `npm test`, provala con la Demo, e solo dopo la mia conferma unisci a `main` e fai `git push`.
Ricorda: l'app deve solo leggere dall'auto, mai comandi di scrittura. Se non sei sicuro di un dato o di una formula, chiedimi invece di inventare.
Se serve tenere il fork aggiornato con le novita' di Bartolomeo: `git fetch upstream && git merge upstream/main`, risolvendo i conflitti
senza perdere le mie modifiche.
