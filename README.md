# Auto Dash 0.10 (versione di sviluppo)

Dashboard OBD-II in tempo reale per l'auto, pensata per il telefono. Funziona nel browser con **Web Bluetooth**
(su iPhone con [Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055)) e un adattatore **ELM327 BLE**
(testato con Vgate iCar Pro 2S, nome "IOS-Vlink"). Auto principale: Dacia Bigster Hybrid-G 150 4x4.

Sito: https://bartolomeo902.github.io/auto-dash/

## Cosa fa
- Pagine: Guida, Energia, Temperature, Motori, Dinamica, Viaggio, Storico.
- Profili auto (Bigster verificata; Kamiq, Clio V, Renegade, XC90, Atto 2 DM-i e generico da verificare), importabili in JSON.
- Profili utente con password (dati cifrati sul dispositivo), storico viaggi con filtri ed esportazione CSV/JSON.
- Simulatore integrato (pulsante **Demo**): si prova tutto senza auto.
- Per esperti: terminale ELM327/UDS (scrittura bloccata) e logging avanzato esportabile.
- Funziona offline dopo la prima apertura.

## Struttura del repository
| Percorso | Contenuto |
|---|---|
| `index.html` | tutta l'app (HTML, CSS, JS), nessuna build |
| `sw.js`, `manifest.webmanifest` | service worker e manifest |
| `assets/` | icone |
| `tests/run.js` | test automatici (jsdom) |
| `docs/` | mappatura dei segnali della Bigster, prompt di avvio |
| `AGENTS.md`, `CLAUDE.md`, `.claude/` | istruzioni per OpenCode e Claude Code |

## Provarlo in locale
```bash
npm install      # una volta sola (serve solo ai test)
npm test         # test automatici
npm run serve    # poi apri http://localhost:8000 e premi Demo
```
Web Bluetooth funziona solo su https o localhost.

## Farsi una copia (fork) e modificarla
Vedi `docs/PROMPT_FEDERICO.md`: con Claude Code basta incollare quel prompt in una cartella vuota.
Manualmente: Fork su GitHub, Settings → Pages → branch `main`, cartella `/`.

## Avvertenze
L'app **legge soltanto** dall'auto. Non usarla alla guida guardando lo schermo. Le mappature non ancora verificate sono marcate "sperimentali".

Licenza: MIT.
