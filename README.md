# Auto Dash 0.10 (versione di sviluppo)

Dashboard OBD-II per Web Bluetooth (adattatore ELM327 BLE, es. Vgate iCar Pro). Si apre in Bluefy su iPhone.

- Profili auto (sensori, ECU, formule) selezionabili, importabili/esportabili in JSON.
- Profili utente con password (dati cifrati sul dispositivo con AES-GCM + PBKDF2).
- Simulatore integrato per provare tutto senza auto.
- Funziona offline dopo la prima apertura (service worker).
- Storico viaggi con filtri per intervallo ed esportazione CSV/JSON.
- Menu laterale con profilo (foto), auto, impostazioni e prestazioni del collegamento.
- Scheduler a priorità e misura automatica della velocità dell'adattatore (richieste/s e latenza in testata).
- Menu laterale a destra (indietro e swipe), terminale ELM327/UDS e logging avanzato per utenti esperti, sagome auto per profilo, TPMS sperimentale, mappature condivise online (OBDb) per Kamiq, Renegade, Atto 2.
- Batterie a icona, flussi tra motori, schema trasmissione, altitudine GPS, viaggio per carburante (km/l, euro).

Profilo validato: Dacia Bigster Hybrid-G 150 4x4. Gli altri profili usano solo sensori OBD-II standard e vanno verificati.
`
