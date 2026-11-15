# Auto Dash: istruzioni per gli agenti (opencode, Claude Code, ecc.)

Rispondi sempre in italiano. Il progetto e' una dashboard OBD-II che gira nel browser (Web Bluetooth,
usata in Bluefy su iPhone) con un adattatore ELM327 BLE. Auto principale: Dacia Bigster Hybrid-G 150 4x4.
Versione attuale: 0.10 (non stabile). Sito: https://bartolomeo902.github.io/auto-dash/ (il fork ha un indirizzo proprio).

## Struttura
- `index.html`: TUTTO il codice (HTML, CSS, JS), nessuna build, nessuna libreria esterna.
- `assets/`: icone. `sw.js`: service worker (rete prima, cache dopo; cambia il nome `const C=` per forzare l'aggiornamento).
- `tests/run.js`: suite jsdom (450 controlli). Si lancia con `npm install` (una volta) e `npm test`.
- `docs/MAPPATURA_BIGSTER.md`: segnali decodificati sulla Bigster, con DID, formule e stato di verifica.
- `.claude/commands/`: comandi rapidi per Claude Code (`/prova`, `/nuovo-profilo`, `/nuovo-sensore`).

## Mappa di index.html (cerca questi nomi)
`PROFILES` (profili auto: `ecus`, `sensors`, `alerts`, `drv`, `tank`...) · `STD` e `std()` (PID standard) ·
`ELM` (Bluetooth, parse ISO-TP, `setEcu`, cambio protocollo) · `Perf`/`Sched`/`readSensor` (scheduler a priorita') ·
`Live`/`Hist` (valori correnti e storico) · `Trip` (integrali del viaggio) · `Sim` (simulatore, oggetto `ch`) ·
`W` (widget: ognuno restituisce `{root,need,always,update}`) · `PAGE_DEF` (pagine) · `USES` (sensori che una
pagina rende prioritari) · `Auth`/`Store` (utenti cifrati, storico viaggi) · `Rec`/`Term` (logging avanzato, terminale) ·
`Nav`/`openSheet`/`openDrawer` (menu laterale e sottomenu) · `CARS`/`carGeom`/`carBodySVG` (sagome auto) ·
`engFlows`/`flowSVG`/`dtSVG` (schemi Motori e Dinamica).

## Come si aggiunge un sensore
1. Nel profilo: `{id:"x",ecu:"ECM",cmd:"22AABB",every:3,f:"(d[0]*256+d[1])/10",unit:"°C",label:"..."}`
   (`f` e' un'espressione JS con `d` = byte dei dati, `sg16(hi,lo)` per i 16 bit con segno; `every` = quanto spesso).
   Per un sensore ancora da verificare aggiungi `exp:true` (usa `X({...})`): si puo' spegnere dalle impostazioni.
2. Usalo in un widget con `V("x")` e inseriscilo in `need`; metti un valore finto nel `Sim` (oggetto `ch`).
3. Aggiungi un test in `tests/run.js` e lancia `npm test`.
## Come si aggiunge un'auto
Nuovo oggetto in `PROFILES` + una riga in `CARS` (L, W, wb, of in metri, `style`, `drv`: fwd|shaft|emotor).
Usa PID standard OBD-II e marca `verified:false` finche' non e' provata sull'auto.

## Regole
- L'app deve solo LEGGERE dall'auto. Mai servizi di scrittura/controllo UDS (10, 11, 14, 27, 28, 2E, 2F, 31, 34-37, 85):
  il terminale li blocca e non vanno aggiunti ai sensori.
- Valori non disponibili: mostra `n/d` in piccolo (`NDH`), non togliere spazio alle schede.
- Colori: benzina verde + pompa, GPL blu + fiamma, elettrico giallo + saetta; batterie con verde >=60, giallo >=30, arancio >=15, rosso.
- Tutto l'UI e i testi in italiano. Un solo file: non spezzare `index.html` senza chiederlo.
- Mai password, chiavi o dati personali nel repo.
- L'adattatore accetta un solo collegamento alla volta (Bluefy OR altre app).
- Prima di chiudere un lavoro: `npm test` senza errori e prova a mano con il pulsante Demo
  (`npm run serve`, poi http://localhost:8000). Web Bluetooth funziona solo su https o localhost.
- Commit piccoli, messaggi in italiano. Non fare `git push --force`.
