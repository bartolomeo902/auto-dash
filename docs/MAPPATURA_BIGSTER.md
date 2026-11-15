# Mappatura segnali Dacia Bigster Hybrid-G 150 4x4

Note di lavoro del 15/11/2026 (auto ferma e in strada). Convenzioni: centraline a 29 bit `18DAxxF1`
(ELM327: `ATSP7`, `ATSH18DAxxF1`); servizio `22` + DID a 2 byte; `d[0]`, `d[1]`... = byte dopo l'eco del DID.
Stato: **verificato** = provato con correlazione/prove dal vivo; **candidato** = molto probabile ma da riconfermare.

## Sensori gia' nell'app (profilo `dacia-bigster-hg150` in index.html)
Verificati: modo guida ECM `22 0442`, marcia TCM `22 2271`, ESC/HDC/freno stazionamento ESP, BMS 48V `22 9017/9104/9025`,
velocita ruote ESP `22 4B00-4B03` (raw/100 km/h: FL FR RL RR), sterzo ESP `22 0100` ((raw-0x8000)/10 gradi, + = sinistra),
pressione freno `4B0E`, interruttore freno `4B11`, PID standard (giri, velocita, pedale, consumo, temperature, coppia 61/62/63...).
Candidati (nell'app come `rpm_s` e `rpm_e`): giri starter/generatore TCM `22 211B` (= 2,006 x giri termico),
giri motore elettrico posteriore ECU DD `22 0121` (~104 rpm per km/h).

# Mappatura Bigster - 15/11/2026 (auto ferma, in auto)
Tutte le centraline a 29 bit rispondono a `18DAxxF1`: 15 ECM, 18 TCM, 2D ESP, 55 DMCM, 92 BMS 48V, D4, DD, E5. TPMS: 11 bit `745 -> 765`, richiede ATSP6 + ATFCSH745 + ATFCSD300000 + ATFCSM1 per i multiframe.
## Confermati oggi
- **Pressione freno** `ESP 22 4B0E`: 0 a pedale rilasciato, 0x13..0x4F (19..79) con pedale premuto, segue la forza. Unita da verificare (probabile bar).
- **Interruttore freno** `ESP 22 4B11`: 1 pedale premuto, 0 rilasciato.
- Correlati ma da capire: `4B4E`/`4BB3` (8..13, ciclici al rilascio del freno).
## TPMS (745/765)
- `22 6300`: 12 byte = 6 x 16 bit (4 ruote + 2?), tutti 0x03FF = non valido a auto ferma; `22 6310`: 6 byte, 0x7F = non valido. Sensori dormienti sotto 20-30 km/h.
- **Angolo sterzo** (candidato forte) `ESP 22 0100`: 16 bit, centro ~0x7FF8; sterzando oscilla fino a 0x6CAD..0x93A5 (circa +-5400 conteggi, probabile 0,1 gradi/bit => circa +-540 gradi). Segno e scala da confermare.
- `ESP 22 4B00-4B03` (2 byte ciascuno): probabili velocita delle 4 ruote (corrispondono a quanto riportato per CLIP Renault); da verificare in movimento.
- `ESP 22 4C28` (4 byte): 0x400 -> 0 quando il motore cambia stato.
## Uscita guidata (strada, parcheggio, uscita) - risultati
- **Velocita ruote** `ESP 22 4B00 FL, 4B01 FR, 4B02 RL, 4B03 RR`: raw/100 = km/h (corr. 1,00 con la velocita OBD, raw ~ 101 x km/h). Ordine verificato con i cerchi (interno curva = piu lento). `4B04` ~ velocita di riferimento.
- **Sterzo** `ESP 22 0100`: (raw-0x8000)/10 gradi, positivo = sinistra, fondo scala ~ +-505 gradi.
- **Freno**: pressione `4B0E` (0..79), interruttore `4B11`.
- **TPMS**: indiretto (V verde sul tablet). La centralina 745 risponde solo da ferma (a 49 km/h: NO DATA) con valori non validi.
- **Centraline**: 23 rispondono (8 a 29 bit + 15 a 11 bit: 70C 713 742 743 744 745 74D 74E 752 799 7AA 7B7 7CA(sempre 7F 22 78) 7DC 7F1). Blocchi trovati col probe grossolano (22xx00/01): 70C 7, 713 3, 742 8, 743 11, 744 5, 745 19, 74D 12, 74E 7, 752 11, 799 14, 7AA 4, 7B7 0, 7DC 8, 7F1 1 (probe11.json).
## Da trovare
- Giri motore elettrico posteriore, giri starter/generatore, le due marce posteriori, coppia per ruota/asse, ABS attivo, split potenza 48V, lock 4x4 reale. Il campionamento a rotazione (870 DID) e troppo rado per correlazioni: serve registrazione mirata o probe fine.
## Calibrazione con il GPS (Sunday Afternoon Cycle.fit, 15/11/2026, sync: GPS = OBD + 1,0 s)
- Velocita OBD (010D) / GPS = 0,991 (legge 0,9% in meno). Ruote/GPS: FL 1,0055, FR 1,0052, RL 1,0010, RR 1,0017 (media rettilineo 1,0054): raw/100 = km/h confermato entro 0,5%.
- ESP longitudinale 4B07: raw = 100,6*sin(pendenza) + 90,6*(a/g) + 125,7 (R2 0,68) -> k ~96 confermato.
- ESP laterale 4B0B: raw = 28,4*(a_lat/g, sinistra +) + 127,9 (corr 0,76); prima 22,7 -> ora k=25 nell'app.
- Rapporto sterzo stimato ~19:1 dal GPS (sottostima; geometria reale ~14-15:1 da fondo scala +-505 gradi / ~35 gradi).
- Altitudine 1405-1571 m, pendenze -8,1..+6,0 gradi.
## Giro Malga Pien de Vacia (15/11 pomeriggio, 13 min, 4,8 km, 1430-1662 m) - candidati
- **Giri starter/generatore** = `TCM 18 : 211B`, 16 bit con segno, = 2,006 x giri motore termico (corr 1,000): puleggia ~2:1.
- **Giri motore elettrico posteriore** = `DD : 0121`, 16 bit con segno, proporzionale alla velocita (corr 1,000, ~104 rpm per km/h, max 5312 a ~51 km/h): riduzione fissa ~12,7:1 sulle ruote.
- Velocita alberi TCM: `18:2102/2103/2104` (~63 rpm per km/h), `18:20FC..20FF` (~15,6 per km/h).
- **Marcia**: PID standard A4 (0..4) e `18:2211` (1..4) coerenti con la velocita; `18:20F9`, `18:210F` altri stati.
- **PID standard supportati dall'ECM (77)**: tra cui 61/62/63 coppia (richiesta/effettiva %, rif. 236 Nm), 8E attrito, 9D fuel g/s, 9E flusso scarico, 75 turbo (ingresso compressore, uscita, ingresso turbina, uscita turbina), 77 aria compressore, 78 EGT, 7C GPF in/out, 6B EGR, 68 IAT, 67 coolant, 70 boost, 71 VGT, 6F pressione ingresso compressore, 6D rail, A4 marcia, 9A ibrida V/I.
## Inventario centraline (scan10, 15/11 16:2x, auto ferma accesa) - 23 ECU, 2660 DID letti da fermo
VIN UU1DJF01177701334 su tutte. Produttore/SW letto da F18A/F194/F195 (il ruolo e' una deduzione):
- 29 bit: 15 ECM Vitesco (SW C029) | 2D ESP Bosch | 55 Valeo (231B..., probabile inverter/DC-DC 48V) | 92 BMS Sunwoda "EBMS" | D4 (284Z..., BCM/gateway?) | DD "LSAT" (292A..., rilevato come motore/inverter posteriore: contiene i giri DD:0121) | E5 Valeo (290G...) | 18 TCM (non risponde agli ID F1xx)
- 11 bit: 70C (285T..) | 713 Brose (porte/sedili?) | 742 NSK EPS "RN_SWEET400" (servosterzo elettrico) | 743 Visteon (quadro strumenti) | 744 BHTC (climatizzazione) | 745 Continental "SWEET400 Renault HighLine 433MHz" (UCH/BCM: chiave 433 MHz + TPMS) | 74D (284B73394R) | 74E Valeo (SW_R580, parcheggio/ADAS?) | 799 Continental (multimedia/telematica?) | 7AA | 7DC Valeo "APSW 12.20" (camera/ADAS?) | 752 | 7B7, 7F1 poco.
- Valori da fermo in scan10.json (DID letti: 745 831, 74D 473, 799 346, 744 253, 743 199, 70C 126, 7DC 101, 74E 83, 7AA 37, 742 28, 752 36, 713 31).
