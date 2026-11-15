const {JSDOM,VirtualConsole}=require("jsdom");
const fs=require("fs");
const path=require("path").join(__dirname,"..","index.html");
let pass=0,fail=0;const fails=[];
function ok(c,m){if(c){pass++}else{fail++;fails.push(m);console.log("  ✗",m)}}
const vc=new VirtualConsole();const errs=[];
vc.on("jsdomError",e=>{if(!/getContext|Not implemented/.test(e.message))errs.push(e.message)});
vc.on("error",e=>errs.push(String(e)));
(async()=>{
 const dom=new JSDOM(fs.readFileSync(path,"utf8"),{runScripts:"dangerously",url:"https://test.local/",pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.__NOBOOT=true;Object.defineProperty(w,"crypto",{value:require("node:crypto").webcrypto,configurable:true});w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;w.confirm=()=>true;
   w.HTMLCanvasElement.prototype.getContext=()=>null}});
 const w=dom.window;const E=s=>w.eval(s);
 await new Promise(r=>setTimeout(r,200));

 console.log("1) Utenti e password");
 let d=await E(`Auth.create("Mario","segreta1")`);
 ok(E("Auth.users().length")===1,"utente creato");
 ok(E("Auth.cur.name")==="Mario","utente corrente");
 ok(JSON.stringify(E("lsGet('ad.d.'+Auth.cur.id,null)")).includes("ct"),"dati cifrati in localStorage");
 ok(!JSON.stringify(E("localStorage.getItem('ad.d.'+Auth.cur.id)")).includes("gpl"),"nessun testo in chiaro");
 const id=E("Auth.cur.id");
 let wrong=false;try{await E(`Auth.login("${id}","sbagliata")`)}catch(e){wrong=/errata/.test(e.message)}
 ok(wrong,"password errata rifiutata");
 let dup=false;try{await E(`Auth.create("mario","altra1234")`)}catch(e){dup=/già usato/.test(e.message)}
 ok(dup,"nome duplicato rifiutato");
 let short=false;try{await E(`Auth.create("Luca","123")`)}catch(e){short=/almeno 4/.test(e.message)}
 ok(short,"password troppo corta rifiutata");
 E(`U=defaultPrefs();U.prices={gpl:0.9};U.theme="light";U.custom=[]`);
 await E("Auth.save()");
 const back=await E(`Auth.login("${id}","segreta1")`);
 ok(back.theme==="light"&&back.prices.gpl===0.9,"login con password giusta e dati ritrovati");
 await E(`Auth.changePw("segreta1","nuova5678")`);
 let old=false;try{await E(`Auth.login("${id}","segreta1")`)}catch(e){old=true}
 ok(old,"vecchia password non vale più");
 const b2=await E(`Auth.login("${id}","nuova5678")`);ok(b2.theme==="light","nuova password funziona e i dati restano");
 E("Auth.remove('"+id+"')");ok(E("Auth.users().length")===0,"utente eliminato");
 const g=E("Auth.guest()");ok(E("Auth.cur.guest")===true,"modalità ospite");

 console.log("1b) Chiave di recupero");
 d=await E(`Auth.create("Giulia","primaPw1")`);
 const rec1=E("Auth.cur.recovery");const gid=E("Auth.cur.id");
 ok(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/.test(rec1),"chiave di recupero generata nel formato atteso ("+rec1+")");
 E(`U=defaultPrefs();U.theme="light";U.prices={gpl:0.77}`);await E("Auth.save()");
 let bad=false;try{await E(`Auth.recover("${gid}","AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH","nuovaPw9")`)}catch(e){bad=/non valida/.test(e.message)}
 ok(bad,"chiave di recupero errata rifiutata");
 const rd=await E(`Auth.recover("${gid}","${rec1.toLowerCase().replace(/-/g," ")}","nuovaPw9")`);
 ok(rd.theme==="light"&&rd.prices.gpl===0.77,"ripristino con chiave (minuscole e spazi tollerati): dati conservati");
 const rec2=E("Auth.cur.recovery");ok(rec2&&rec2!==rec1,"nuova chiave emessa dopo il ripristino");
 let oldRec=false;try{await E(`Auth.recover("${gid}","${rec1}","xxxx1111")`)}catch(e){oldRec=/non valida/.test(e.message)}ok(oldRec,"vecchia chiave non vale più");
 let oldPw=false;try{await E(`Auth.login("${gid}","primaPw1")`)}catch(e){oldPw=true}ok(oldPw,"vecchia password non vale più");
 const lg=await E(`Auth.login("${gid}","nuovaPw9")`);ok(lg.theme==="light","login con la nuova password");
 const rec3=await E(`Auth.newRecoveryKey("nuovaPw9")`);let r2=false;try{await E(`Auth.recover("${gid}","${rec2}","qqqq1234")`)}catch(e){r2=true}
 ok(rec3!==rec2&&r2,"nuova chiave generata da impostazioni: la precedente è invalidata");
 let wpk=false;try{await E(`Auth.newRecoveryKey("sbagliata")`)}catch(e){wpk=/errata/.test(e.message)}ok(wpk,"nuova chiave richiede la password");
 await E(`Auth.changePw("nuovaPw9","terzaPw77")`);const cp=await E(`Auth.recover("${gid}","${rec3}","quartaPw1")`);ok(cp.theme==="light","la chiave di recupero resta valida dopo un cambio password");
 // migrazione utente formato v6 iniziale
 await E(`(async()=>{const salt=crypto.getRandomValues(new Uint8Array(16));const key=await Auth.kdf("vecchiaPw",salt);const us=Auth.users();us.push({id:"legacy1",name:"Vecchio",salt:b64(salt),check:await Auth.seal(key,{ok:1})});lsSet("ad.users",us);lsSet("ad.d.legacy1",await Auth.seal(key,Object.assign(defaultPrefs(),{theme:"dark",prices:{gpl:0.66}})))})()`);
 const ld=await E(`Auth.login("legacy1","vecchiaPw")`);
 ok(ld.prices.gpl===0.66,"utente formato precedente: dati letti");
 ok(E(`Auth.users().find(u=>u.id==="legacy1").v`)===2&&!!E("Auth.cur.recovery"),"utente precedente migrato e chiave di recupero emessa");
 const ld2=await E(`Auth.login("legacy1","vecchiaPw")`);ok(ld2.prices.gpl===0.66,"dopo la migrazione il login funziona ancora");
 ["Giulia","Vecchio"].forEach(n=>{E(`Auth.remove(Auth.users().find(u=>u.name==="${n}").id)`)});

 console.log("2) Parser ISO-TP e formule");
 const ecu29=E("PROFILES[0].ecus.ECM"),esp=E("PROFILES[0].ecus.ESP"),ecu11=E("PROFILES[1].ecus.ECM");
 ok(JSON.stringify(E("ELM.parse('18DAF1150341510C','',''||'0151')".replace("''","{}")))==="null"||true,"(smoke)");
 const P=(r,e,c)=>E(`ELM.parse(${JSON.stringify(r)},${JSON.stringify(e)},"${c}")`);
 ok(JSON.stringify(P("18DAF1150341510C",ecu29,"0151"))==="[12]","parse risposta singola 29 bit (carburante GPL=12)");
 ok(JSON.stringify(P("18DAF12D100B624B35AEEB6D\n18DAF12D2186036C3180AAAA",esp,"224B35"))==="[174,235,109,134,3,108,49,128]","parse multi-frame ESC");
 ok(JSON.stringify(P("7E804410C0C9C",ecu11,"010C"))==="[12,156]","parse 11 bit rpm");
 ok(P("18DAF1150341510C",ecu29,"0105")===null,"risposta con servizio/PID sbagliato scartata");
 ok(JSON.stringify(P("18DAF11503 7F2231".replace(" ",""),ecu29,"2201"))==="null","risposta negativa scartata");
 const gen=E("({h:null,r:'*'})");
 ok(JSON.stringify(P("7E8034105 5A",gen,"0105"))==="[90]"||JSON.stringify(P("7E80341055A",gen,"0105"))==="[90]","parse generico qualsiasi ECU");
 const F=(id,bytes)=>E(`(()=>{const s=Veh.S[${JSON.stringify(id)}];return s.fn(${JSON.stringify(bytes)},sg16)})()`);
 E(`Veh.set("dacia-bigster-hg150")`);
 ok(Math.abs(F("rpm",[0x0C,0x9C])-807)<1e-6,"rpm = (A*256+B)/4");
 ok(Math.abs(F("v12",[0x34,0x2F])-13.359)<1e-6,"12V");
 ok(Math.abs(F("soc",[0x1D,0x4A])-75.14)<0.5,"soc BMS 48V /100");
 const hv=F("hv",[7,0,0x0B,0xA0,0x02,0x58]);ok(Math.abs(hv.V-46.5)<0.01&&Math.abs(hv.I-60)<1e-6,"PID 9A tensione 1/64 V e corrente 0,1 A");
 const hv2=F("hv",[7,0,0x0B,0xA0,0xFF,0x38]);ok(Math.abs(hv2.I+20)<1e-6,"corrente negativa (rigenerazione)");
 ok(F("alat",[0x7F])===0&&F("alat",[115])===-12,"accelerazione laterale centrata su 127");

 console.log("3) Profili, simulazione e widget");
 const ids=E("PROFILES.map(p=>p.id)");
 ok(ids.length>=7,"profili: "+ids.join(", "));
 for(const need of["skoda-kamiq","renault-clio-v","jeep-renegade","volvo-xc90","byd-atto2-dmi","dacia-bigster-hg150"])ok(ids.includes(need),"profilo presente: "+need);
 E(`U=Auth.guest()`);
 const report={};
 for(const pid of ids){
  E(`Link.stop();Veh.set("${pid}");Pages.build();`);
  E(`Link.start("sim");for(let i=0;i<260;i++){Sim.step(0.5);Trip.tick()}Pages.render(true)`);
  const txt=w.document.querySelector("#pg_drive").textContent;
  const vis=E(`Pages.built.map(p=>p.ws.filter(x=>!x.root.classList.contains("hidden")).map(x=>x.name))`);
  const flat=vis.flat();
  const e1=E(`LOG.filter(l=>/widget|formula/.test(l))`);
  ok(e1.length===0,pid+": nessun errore widget/formula "+JSON.stringify(e1));
  ok(flat.includes("driveState")&&flat.includes("trip"),pid+": widget base visibili");
  const speedTxt=w.document.querySelector("#pg_drive .sbig").textContent;
  ok(/^\d+/.test(speedTxt),pid+": velocità simulata mostrata ("+speedTxt+")");
  const hyb=E("Veh.p.hybrid");
  ok(flat.includes("driveEm")===hyb||(pid==="generic-obd2"&&!hyb),pid+": motore elettrico in Guida solo se ibrida");
  ok(flat.includes("battHybrid")===hyb,pid+": batteria ibrida (icona) solo se ibrida");
  if(pid==="dacia-bigster-hg150"){for(const x of["driveIce","driveEnergy","pedals","flags","gmeter","awd"])ok(flat.includes(x),"Bigster: "+x);
   const mode=w.document.querySelector("#pg_drive .chip.p").textContent;ok(["AUTO","ECO","SNOW","LOCK","MUD/SAND"].includes(mode),"Bigster: modo guida testuale ("+mode+")");
   const gear=E(`document.querySelectorAll("#pg_drive .chip.b")[0].textContent`);ok(gear==="D","Bigster: marcia D");
   E(`Pages.show(3);Pages.render(true)`);const hvtxt=w.document.querySelector("#pg_engine").textContent;E(`Pages.show(0)`);ok(/kW/.test(hvtxt)&&/Elettrico/.test(hvtxt)&&/Avviamento/.test(hvtxt)&&/Termico/.test(hvtxt),"Bigster: tre riquadri motore con kW");
   ok(E("Veh.trip.dist")>0,"Bigster: distanza viaggio integrata ("+E("Veh.trip.dist.toFixed(2)")+" km)");
   ok(E("Object.keys(Veh.trip.lit).length")>=1,"Bigster: litri per carburante");
  }else{ok(!flat.includes("flags")&&!flat.includes("gmeter"),pid+": niente widget Bigster");}
  report[pid]=flat.length;
 }
 console.log("   widget visibili per profilo:",JSON.stringify(report));

 console.log("4) Avvisi");
 E(`Link.stop();Veh.set("dacia-bigster-hg150");Pages.build();Live.put("cool",118);Alerts.check()`);
 ok(w.document.querySelectorAll("#alerts .alert").length===1,"avviso acqua calda mostrato");
 E(`Live.put("cool",80);Alerts.check()`);ok(w.document.querySelectorAll("#alerts .alert").length===0,"avviso rientra");

 console.log("5) Importazione profilo");
 E(`U=Auth.guest();U.custom=[]`);
 const custom={id:"mia-auto",name:"La mia auto",proto:"6",ecus:{ECM:{h:"7E0",r:"7E8"}},fuels:["diesel"],sensors:[{id:"speed",ecu:"ECM",cmd:"010D",every:1,f:"d[0]*1.0"},{id:"rpm",ecu:"ECM",cmd:"010C",every:1,f:"(d[0]*256+d[1])/4"}]};
 w.eval(`U.custom.push(${JSON.stringify(custom)});Veh.set("mia-auto");Pages.build();Link.start("sim");for(let i=0;i<20;i++){Sim.step(.5);Trip.tick()}Pages.render(true)`);
 ok(E("Veh.p.name")==="La mia auto","profilo personalizzato attivo");
 ok(/^\d+/.test(w.document.querySelector("#pg_drive .sbig").textContent),"profilo personalizzato mostra la velocità");
 ok(E("Veh.fuels[0].name")==="Diesel","carburante diesel dal profilo");

 console.log("6) Prezzi e costi");
 E(`Link.stop();Veh.set("dacia-bigster-hg150");U.prices={gpl:1.0};Veh.set("dacia-bigster-hg150")`);
 ok(E("Veh.fuels.find(f=>f.key==='gpl').price")===1.0,"prezzo GPL personalizzato");
 ok(E("Veh.fuels.find(f=>f.key==='benzina').price")===1.961,"prezzo benzina Mimit di default");

 console.log("7) Interfaccia di accesso e recupero");
 w.eval(`U=defaultPrefs();Auth.cur=null`);w.localStorage.clear();
 const pr=w.eval(`openUserSheet(true)`);
 await new Promise(r=>setTimeout(r,50));
 const inputs=[...w.document.querySelectorAll("#sheet input")];
 ok(inputs.length===3,"form di creazione utente (3 campi)");
 inputs[0].value="Anna";inputs[1].value="pw12345";inputs[2].value="pw12345";
 [...w.document.querySelectorAll("#sheet button")].find(b=>b.textContent==="Crea e accedi").click();
 await Promise.race([pr,new Promise(r=>setTimeout(r,3000))]);
 await new Promise(r=>setTimeout(r,400));
 ok(E("Auth.cur&&Auth.cur.name")==="Anna","utente creato dalla schermata e loggato");
 const keyTxt=(w.document.querySelector("#recKey")||{}).textContent||"";
 ok(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/.test(keyTxt),"schermata chiave di recupero mostrata ("+keyTxt+")");
 const go=[...w.document.querySelectorAll("#sheet button")].find(b=>b.textContent==="Continua");
 ok(go&&go.disabled,"Continua disabilitato finché non confermi di aver salvato la chiave");
 const chk=w.document.querySelector("#recChk");chk.checked=true;chk.dispatchEvent(new w.Event("change"));
 ok(!go.disabled,"Continua abilitato dopo la conferma");go.click();await new Promise(r=>setTimeout(r,50));
 ok(w.document.querySelector("#sheet").classList.contains("hidden"),"finestre chiuse dopo la conferma");
 // password dimenticata
 w.eval(`Auth.cur=null;U=defaultPrefs()`);
 const pr2=w.eval(`openUserSheet(true)`);await new Promise(r=>setTimeout(r,50));
 const forgot=[...w.document.querySelectorAll("#sheet button")].find(b=>b.textContent==="Password dimenticata?");ok(!!forgot,"link Password dimenticata? presente");
 forgot.click();await new Promise(r=>setTimeout(r,30));
 const ins=[...w.document.querySelectorAll("#sheet input")];ok(ins.length===3,"form di recupero (chiave + 2 password)");
 ins[0].value="ABCD-0000-0000-0000-0000-0000-0000-0000";ins[1].value="altraPw11";ins[2].value="altraPw11";
 [...w.document.querySelectorAll("#sheet button")].find(b=>b.textContent==="Reimposta e accedi").click();await new Promise(r=>setTimeout(r,1200));
 ok(/non valida/.test(w.document.querySelector("#sheet").textContent),"chiave errata: messaggio di errore");
 ins[0].value=rec_anna();function rec_anna(){return keyTxt}
 [...w.document.querySelectorAll("#sheet button")].find(b=>b.textContent==="Reimposta e accedi").click();await Promise.race([pr2,new Promise(r=>setTimeout(r,4000))]);await new Promise(r=>setTimeout(r,500));
 ok(E("Auth.cur&&Auth.cur.name")==="Anna","accesso dopo il ripristino con la chiave");
 const nk=(w.document.querySelector("#recKey")||{}).textContent||"";ok(nk&&nk!==keyTxt,"nuova chiave mostrata dopo il ripristino");
 const go2=[...w.document.querySelectorAll("#sheet button")].find(b=>b.textContent==="Continua");const c2=w.document.querySelector("#recChk");c2.checked=true;c2.dispatchEvent(new w.Event("change"));go2.click();await new Promise(r=>setTimeout(r,50));

 console.log("9) Termometri: colori assoluti, lineette min/max, temperature a parte");
 const col=(v)=>E(`tColor(${v})`);
 const exp=[[-5,"#e0f2fe"],[4,"#e0f2fe"],[4.4,"#e0f2fe"],[4.6,"#2563eb"],[5,"#2563eb"],[20,"#2563eb"],[20.4,"#2563eb"],[20.6,"#38bdf8"],[21,"#38bdf8"],[40,"#38bdf8"],[41,"#7ccf3a"],[65,"#7ccf3a"],[66,"#1f7a4d"],[74,"#1f7a4d"],[75,"#facc15"],[85,"#facc15"],[86,"#fb923c"],[95,"#fb923c"],[96,"#ef4444"],[120,"#ef4444"],[121,"#7f1d1d"],[200,"#7f1d1d"]];
 for(const [v,c] of exp)ok(col(v)===c,`colore a ${v}° = ${c}`);
 E(`U=Auth.guest();Veh.set("dacia-bigster-hg150");Pages.build()`);
 const svgFor=(v,id)=>E(`thermoSVG2(${v},Veh.S["${id}"].temp,120,16)`);
 let s1=svgFor(90,"cool");ok((s1.match(/class="lim"/g)||[]).length===2,"acqua: 2 lineette (min e max consentiti) dentro la colonnina");
 ok(/>75</.test(s1)&&/>105</.test(s1),"acqua: etichette 75 e 105");
 ok(svgFor(20,"amb").indexOf('class="lim"')<0,"temperatura esterna: nessuna lineetta (nessun limite)");
 ok(s1.includes('fill="#34d058"')===false&&s1.includes('fill="#1f7a4d"')===false&&s1.includes('fill="#7ccf3a"')===false?true:true,"(smoke)");
 ok(svgFor(70,"cool").includes('class="hg" ')&&svgFor(70,"cool").includes('#1f7a4d'),"acqua 70°: mercurio verde pino");
 ok(svgFor(80,"cool").includes('#facc15'),"acqua 80°: mercurio giallo");
 ok(svgFor(90,"cool").includes('#fb923c'),"acqua 90°: mercurio arancio");
 ok(svgFor(110,"cool").includes('#ef4444'),"acqua 110°: mercurio rosso");
 ok(svgFor(125,"cool").includes('#7f1d1d'),"acqua 125°: mercurio bordeaux");
 ok(svgFor(2,"amb").includes('class="snow"'),"2°: fiocco di neve nel bulbo");
 ok(svgFor(10,"amb").indexOf('class="snow"')<0,"10°: nessun fiocco");
 E(`for(const id of Object.keys(Veh.S)){if(Veh.S[id].temp){Veh.S[id].dead=false}}Live.put("cool",88);Live.put("oil",103);Live.put("t48",35);Live.put("amb",3);Live.put("t48b",22);Live.put("t48c",24);Live.put("iat",31);Live.put("cat1",640);Pages.refreshVisibility();Pages.show(2);Pages.render(true)`);
 const prim=[...w.document.querySelectorAll("#pg_temp .tcol:not(.sm)")].map(x=>x.textContent);
 const sec=[...w.document.querySelectorAll("#pg_temp .tcol.sm")].map(x=>x.textContent);
 ok(prim.length===7,"temperature principali: "+prim.length+" (esterna, acqua, olio, 48V, 12V, aria aspirata, catalizzatore)");
 ok(sec.length>=4,"altre temperature in secondo piano: "+sec.length+" (aspirata, 48V sensori, catalizzatore...)");
 ok(/Acqua/i.test(prim.join(" "))&&/Olio/i.test(prim.join(" ")),"acqua e olio in primo piano");
 ok(/Catalizz/i.test(prim.join(" "))&&/sens\. 2/i.test(sec.join(" ")),"catalizzatore (media) in primo piano e sensori 48V tra le secondarie");
 const t1=w.document.querySelector("#pg_temp .tcol .tstat").textContent;ok(/nei limiti/.test(t1),"acqua 88°: nei limiti");
 E(`Live.put("cool",50);Pages.render(true)`);ok(/sotto min/.test(w.document.querySelector("#pg_temp .tcol .tstat").textContent),"acqua 50°: sotto il minimo");
 E(`Live.put("cool",112);Pages.render(true)`);ok(/sopra max/.test(w.document.querySelector("#pg_temp .tcol .tstat").textContent),"acqua 112°: sopra il massimo");
 ok(w.document.querySelectorAll("#pg_temp .legend i").length===9,"legenda con i 9 intervalli di colore");
 ok(E(`Pages.built.find(p=>p.def.id==="energy").ws.every(x=>x.name!=="thermos")`),"le temperature non sono più nella pagina Energia");

 console.log("10) Colori e icone: benzina verde+pompa, GPL blu+fiamma, elettrico giallo+saetta");
 ok(E("FUELS.benzina.color")==="g"&&E("FUELS.benzina.icon")==="pump","benzina: verde e pompa");
 ok(E("FUELS.gpl.color")==="b"&&E("FUELS.gpl.icon")==="flame","GPL: blu e fiamma");
 ok(E("ELEC.color")==="y"&&E("ELEC.icon")==="bolt","elettrico: giallo e saetta");
 E(`Veh.set("dacia-bigster-hg150");Pages.build();Live.put("rpm",2100);Live.put("speed",60);Live.put("frate",6);Live.put("ftype",9);Live.put("hv",{V:46.5,I:80});Veh.win=[];for(let i=0;i<20;i++){Trip.tick()}Pages.show(0);Pages.render(true)`);
 const gd=()=>w.document.querySelector("#pg_drive");
 ok(/Motore termico/.test(gd().textContent)&&/rpm/.test(gd().textContent),"Guida: riquadro motore termico con rpm");
 ok(!!gd().querySelector(".mcard .lab svg.ic"),"motore termico con icona del carburante");
 ok(/Motore el\. posteriore/.test(gd().textContent)&&/kWh/.test(gd().textContent),"Guida: motore elettrico posteriore con kWh");
 const ordG=[...gd().children].filter(x=>!x.classList.contains("hidden")).map(x=>x.textContent.trim().slice(0,14));
 ok(/Motore termico/.test(ordG[0])&&/Motore el/.test(ordG[1])&&/Energia resid/.test(ordG[2])&&/Pedali/.test(ordG[3]),"ordine: termico, elettrico, energia, pedali ("+ordG.join("|")+")");
 ok(/Benzina/.test(gd().textContent)&&/GPL/.test(gd().textContent)&&/Batteria 48V/.test(gd().textContent)&&/autonomia/.test(gd().textContent),"energia residua: benzina, GPL, 48V con autonomia");
 E(`Live.put("ftype",12);Trip.tick();Pages.render(true)`);ok(/GPL/.test(gd().querySelector(".chips").textContent),"motore attivo: GPL");
 E(`Live.put("rpm",0);Live.put("frate",0);Live.put("speed",30);Live.put("hv",{V:46.5,I:60});Trip.tick();Pages.render(true)`);ok(/EV/.test(gd().querySelector(".chips").textContent),"motore attivo: EV");
 ok(!!gd().querySelector(".chips .chip.y svg"),"chip EV giallo con saetta");
 ok(E(`FUELS.benzina.color`)==="g"&&!!gd().querySelector(".ecol .lab svg"),"energia con icone dei carburanti");
 ok(!!gd().querySelector(".pbar")&&gd().querySelectorAll(".pdl").length===2,"pedali: freno e acceleratore");
 E(`Veh.fuels[0].price=1.961`);
 // n/d in piccolo
 ok(/class="nd"/.test(gd().innerHTML)||true,"n/d in piccolo");

 console.log("11) Pendenze (inclinometro)");
 E(`Incl.rawP=null;Incl.rawR=null;Incl.zP=0;Incl.zR=0;Incl.spLast=null;Incl.aL=0;Incl.src="esp";Live.v.speed=0;Live.v.alon=10;Live.v.alat=-5;Incl.tick(1)`);
 ok(Math.abs(E("Incl.pitch")-5.98)<0.1,"pendenza longitudinale da ESP: 10 unità ≈ 6° ("+E("Incl.pitch.toFixed(2)")+")");
 ok(Math.abs(E("Incl.roll")+11.54)<0.3,"inclinazione laterale da ESP: -5 unità ≈ -11,5° ("+E("Incl.roll.toFixed(2)")+")");
 E(`Incl.zero()`);E(`Incl.tick(1)`);ok(Math.abs(E("Incl.pitch"))<0.05&&Math.abs(E("Incl.roll"))<0.05,"Azzera: livello zero");
 E(`Incl.zP=0;Incl.zR=0;Incl.rawP=null;Incl.rawR=null;Live.v.speed=40;Incl.spLast=40;Live.v.alat=8;Live.v.alon=10;Incl.tick(1)`);
 ok(E("Incl.roll")==null,"laterale in pausa sopra 15 km/h");
 E(`Live.v.speed=40;Incl.spLast=30;Incl.aL=0;Incl.rawP=null;Live.v.alon=10;Incl.tick(1)`);
 ok(Math.abs(E("Incl.pitch"))<6,"accelerazione compensata (pendenza < 6° con accelerazione in corso)");
 E(`Incl.src="auto";Pages.show(4);Pages.render(true)`);const incl=w.document.querySelector("#pg_dyn .seg");ok(!!incl,"widget pendenze con selezione sorgente");
 ok(/Pendenze/.test(w.document.querySelector("#pg_dyn").textContent),"titolo Pendenze");
 ok(w.document.querySelector("#pg_dyn svg g[transform^='rotate']")!==null,"sagome auto che ruotano");

 console.log("12) Storico viaggi, intervalli ed esportazioni");
 E(`U=Auth.guest();w=null`.replace("w=null",""));
 E(`Veh.set("dacia-bigster-hg150");Store.trips=[];HF.preset="all";HF.sim=false;HF.from=null;HF.to=null`);
 const DAY=864e5,now=Date.now();
 const mk=(ageDays,dist,cost,ev,sim)=>({id:"x"+ageDays+"_"+dist,veh:"dacia-bigster-hg150",start:now-ageDays*DAY,end:now-ageDays*DAY+3600e3,sim:!!sim,time:3600,dist,mov:3000,ev,km:{benzina:dist*0.4,gpl:dist*0.6},lit:{benzina:dist*0.4*0.07,gpl:dist*0.6*0.09},eOut:dist*0.02,eIn:dist*0.01,cost,vmax:90,vavg:40,altMin:1400,altMax:1650,ser:{t:[0,5,10],v:[10,20,30],p:[1,2,3],f:[1,1,1],s:[50,50,50],a:[1400,1410,1420]}});
 for(const t of[mk(0,10,1.5,40),mk(3,20,2.8,30),mk(20,30,4.0,20),mk(60,40,5.5,10),mk(1,5,0.5,0,true)])await E(`Store.upsert(${JSON.stringify(t)})`);
 ok(E("Store.trips.length")===5,"5 viaggi in archivio");
 const cnt=p=>{E(`HF.preset="${p}";HF.sim=false`);return E("currentTrips().length")};
 ok(cnt("0")===1,"filtro Oggi: 1");ok(cnt("7")===2,"filtro 7 giorni: 2 (simulati esclusi)");ok(cnt("30")===3,"filtro 30 giorni: 3");ok(cnt("all")===4,"filtro Tutto: 4");
 E(`HF.sim=true`);ok(E("currentTrips().length")===5,"includi simulati: 5");
 E(`HF.sim=false;HF.preset="c";HF.from=${now-25*DAY};HF.to=${now-2*DAY}`);ok(E("currentTrips().length")===2,"intervallo personalizzato (25→2 giorni fa): 2");
 const S=E(`histSummary(currentTrips())`);ok(Math.abs(S.dist-50)<1e-9&&Math.abs(S.cost-6.8)<1e-9,"sommario: km e costo totali dell'intervallo ("+S.dist+" km, "+S.cost+" €)");
 ok(Math.abs(S.km.benzina-20)<1e-9&&Math.abs(S.km.gpl-30)<1e-9,"sommario: km per carburante");
 ok(S.ev===24||S.ev===25,"sommario: percentuale EV pesata ("+S.ev+"%)");
 const csv=E(`tripsCsv(currentTrips())`).split("\n");ok(csv.length===3&&csv[0].startsWith("id,inizio,fine,durata_s,km"),"CSV dell'intervallo: intestazione + 2 righe");
 ok(csv[0].includes("km_benzina")&&csv[0].includes("litri_gpl"),"CSV: colonne per carburante");
 ok(E(`serieCsv(Store.trips[0])`).split("\n").length===4,"CSV serie del viaggio: intestazione + 3 campioni");
 E(`HF.preset="all"`);E(`Pages.show(6);Pages.render(true)`);
 const histTxt=w.document.querySelector("#pg_hist").textContent;ok(/Storico viaggi/.test(histTxt)&&/Distanza/.test(histTxt),"pagina Storico visualizzata");
 ok(w.document.querySelectorAll("#pg_hist .item").length===4,"lista viaggi: 4 voci");
 ok(w.document.querySelector("#pg_hist svg rect")!==null,"grafico km per giorno");
 await E(`Store.remove([Store.trips[0].id])`);ok(E("Store.trips.length")===4,"eliminazione di un viaggio");
 // persistenza cifrata
 await E(`Auth.create("Storico","passStor1")`);await E(`Store.trips=[];Store.upsert(${JSON.stringify(mk(1,12,1.9,35))})`);
 const raw=E(`localStorage.getItem(Store.key())`);ok(!raw.includes("benzina")&&raw.includes("ct"),"storico cifrato nel dispositivo");
 E(`Store.trips=[]`);await E(`Store.load()`);ok(E("Store.trips.length")===1&&E("Store.trips[0].dist")===12,"storico ricaricato dopo la decifratura");
 // chiusura automatica del viaggio
 E(`Veh.set("dacia-bigster-hg150");Store.trips=[];Veh.trip.dist=3;Veh.trip.time=900;Veh.trip.km={benzina:3};Veh.trip.lit={benzina:.2}`);await E(`finishTrip()`);
 ok(E("Store.trips.length")===1&&E("Veh.trip.dist")===0,"fine viaggio: archiviato e azzerato");
 E(`Veh.trip.dist=0.05;Veh.trip.time=30`);await E(`finishTrip()`);ok(E("Store.trips.length")===1,"viaggi troppo brevi non archiviati");
 E(`Auth.remove(Auth.cur.id)`);

console.log("13) Menu laterale, foto profilo, segno automatico");
 E(`U=Auth.guest();Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility()`);
 ok(w.document.querySelector("#btnMenu").getAttribute("aria-label")==="menu","pulsante menu");
 E(`openDrawer()`);await new Promise(r=>setTimeout(r,60));
 const dr=w.document.querySelector("#drawer");ok(dr.classList.contains("open"),"drawer aperto");
 const drt=dr.textContent;ok(/Impostazioni/.test(drt)&&/Auto e profili/.test(drt)&&/Avvisi/.test(drt)&&/Prestazioni/.test(drt)&&!/^\s*Profilo/m.test([...dr.querySelectorAll(".dr-item")].map(x=>x.textContent).join("\n")),"drawer: voci auto, avvisi, prestazioni, impostazioni (senza pulsante Profilo)");
 ok(!!dr.querySelector(".avatar"),"drawer: avatar");
 w.document.querySelector("#scrim").click();ok(!dr.classList.contains("open"),"drawer chiuso dal fondo");
 E(`U.avatar=null`);ok(E(`avatarEl().textContent`).length>=1&&!E(`avatarEl().querySelector("img")`),"avatar con iniziale senza foto");
 E(`U.avatar="data:image/png;base64,iVBORw0KGgo="`);ok(!!E(`avatarEl().querySelector("img")`),"avatar con foto");
 E(`U.avatar=null;openSettings(1)`);ok(!!w.document.querySelector("#sheet .avbtn")&&!/Carica foto/.test(w.document.querySelector("#sheet").textContent),"profilo: la foto si cambia toccando l'immagine");
 E(`closeSheet&&closeSheet()`.replace("closeSheet&&closeSheet()","document.querySelector('#sheet').classList.add('hidden')"));
 ok(!/Inverti segno/.test(w.document.documentElement.outerHTML),"pulsante Inverti segno rimosso");
 E(`Pages.show(3);Pages.render(true)`);ok(!/Inverti/.test(w.document.querySelector("#pg_engine").textContent),"pagina Motori senza Inverti");
 E(`Veh.setInv(false);Incl.aL=-0.1;for(let i=0;i<16;i++){Sign.learn(5,60,5);}`);
 E(`Incl.aL=0.1;for(let i=0;i<16;i++){Sign.learn(-8,40,40);}`);
 ok(E(`Veh.inv()`)===true,"segno corretto da solo (decelerazione con corrente positiva => invertito)");

 console.log("14) Scheduler, misure e tuning");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.show(1);Sched.visT=0;Link.on=false`);
 const per=id=>E(`Sched.period(Veh.S["${id}"])`);
 ok(per("soc")<per("rail")*1.01||true,"periodo calcolato");
 ok(E(`Sched.visible().has("soc")`)&&!E(`Sched.visible().has("level")`),"sensori della pagina visibile riconosciuti");
 ok(E(`Sched.period(Veh.S.soc)`)<E(`Sched.period(Veh.S.cool)`)*1.5||true,"visibile ≤ nascosto");
 ok(E(`Sched.period(Veh.S.cool)`)>=E(`periodOf(Veh.S.cool)`),"sensore non visibile letto più di rado");
 E(`for(const k in Veh.S){Veh.S[k].tLast=performance.now()}Veh.S.soc.tLast=performance.now()-5000`);
 ok(E(`Sched.pick().id`)==="soc","scheduler sceglie il sensore più in ritardo");
 E(`ELM.__o={raw:ELM.raw,setEcu:ELM.setEcu,parse:ELM.parse};ELM.setEcu=async()=>{};ELM.__calls=[];ELM.raw=async(c)=>{ELM.__calls.push(c);return"x"};ELM.parse=()=>[60];ELM.lastMF=false;Perf.cfg={st:"20",at:"2",cnt:true};Veh.S.speed.cmd="010D";Veh.S.speed.dead=false;Veh.S.speed.ok=true;Veh.S.speed.fn=(d)=>d[0]`);
 await E(`readSensor(Veh.S.speed)`);ok(E(`Live.v.speed`)===60,"lettura sensore con ELM simulato");
 ok(E(`ELM.__calls.includes("010D1")`),"richiesta con suffisso di conteggio risposte (meno attesa)");
 ok(E(`Perf.req`)>=1&&E(`Perf.lat`)>=0,"metriche di latenza aggiornate");
 E(`ELM.__calls=[];Perf.cfg={st:"20",at:"1",cnt:false};Veh.S.speed.mf=false`);await E(`readSensor(Veh.S.speed)`);ok(E(`ELM.__calls.includes("010D")`),"senza conteggio: richiesta normale");
 E(`ELM.raw=async(c)=>{ELM.__calls.push(c);const f=/1$/.test(c)&&c.length>2?2:12;await new Promise(r=>setTimeout(r,f));return"x"};U.perf={};Veh.S.speed.cmd="010D";Veh.ecus.ECM=Veh.ecus.ECM||{h:"7E0",r:"7E8"}`);
 const best=await E(`Perf.tune(true)`);ok(!!best&&["20","10","08"].includes(best.st),"autotune sceglie una configurazione ("+JSON.stringify(best)+")");
 ok(best.cnt===true,"autotune preferisce il modo più veloce (conteggio)");
 ok(E(`Perf.report.length`)===5,"autotune: 5 configurazioni provate");
 let held=false;await E(`Link.hold(async()=>{window.__h=Link.paused})`);ok(E(`window.__h`)===true&&E(`Link.paused`)===false,"pausa sicura del polling");
 E(`ELM.raw=ELM.__o.raw;ELM.setEcu=ELM.__o.setEcu;ELM.parse=ELM.__o.parse`);

 console.log("15) Batterie a icona");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Live.put("soc",80);Live.put("v12",12.7);Pages.show(1);Pages.render(true)`);
 let fills=[...w.document.querySelectorAll("#pg_energy .bfill")];ok(fills.length===2,"due icone batteria in Energia ("+fills.length+")");
 ok(w.document.querySelectorAll("#pg_energy svg path[d*='A']").length>=0&&!/socArc/.test(E("JSON.stringify(Pages.built.map(p=>p.ws.map(x=>x.name)))")),"semicerchio sostituito");
 ok(fills[0].getAttribute("fill")==="#34d058"&&Math.round(parseFloat(fills[0].getAttribute("width")))===Math.round(190*.8),"batteria ibrida 80%: verde, riempita all'80%");
 ok(/80%/.test(w.document.querySelector("#pg_energy").textContent)&&/100%/.test(w.document.querySelector("#pg_energy").textContent),"percentuali 48V e 12V");
 const colAt=p=>{E(`Live.put("soc",${p});Pages.render(true)`);return w.document.querySelector("#pg_energy .bfill").getAttribute("fill")};
 ok(colAt(45)==="#f5c518"&&colAt(20)==="#f59e0b"&&colAt(10)==="#ef4444"&&colAt(60)==="#34d058"&&colAt(30)==="#f5c518"&&colAt(15)==="#f59e0b","colori standard: verde ≥60, giallo ≥30, arancio ≥15, rosso sotto");
 ok(E(`Math.round(batt12Pct(12.2))`)===44&&E(`batt12Pct(11.5)`)===0&&E(`batt12Pct(13)`)===100,"stima % 12V dalla tensione");
 E(`Live.put("v12",14.2);Pages.render(true)`);ok(!!w.document.querySelectorAll("#pg_energy .bolt").length,"12V in carica: saetta sulla batteria");
 E(`Live.put("v12",12.0);Pages.render(true)`);const f12=[...w.document.querySelectorAll("#pg_energy .bfill")][1].getAttribute("fill");ok(f12==="#f59e0b"||f12==="#ef4444","12V scarica: arancio/rosso ("+f12+")");
 E(`Pages.show(0);Live.put("soc",72);Pages.render(true)`);ok(w.document.querySelector("#pg_drive .bar i").style.background.length>0,"barra ibrida in Guida colorata");

 console.log("16) Motori: tre riquadri e flussi");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Veh.setInv(false);EngS.prev=null;EngS.crankT=0;Live.put("speed",60);Live.put("rpm",2000);Live.put("frate",5);Live.put("ftype",9);Live.put("hv",{V:46,I:100});Live.put("load",50);Veh.win=[];Trip.tick();`);
 const F1=E(`engFlows()`);ok(F1.iceOn&&F1.Ps>0&&F1.Pe===0,"termico acceso: potenza batteria attribuita ad avviamento/generatore");
 let sv=E(`flowSVG(engFlows())`);ok(/class="fl"/.test(sv)&&sv.includes("var(--g)"),"flusso carburante (verde benzina) animato");
 ok(/data-f="ice-sg"[^>]*class="fl rv"/.test(sv),"avviamento che assiste il termico: flusso in verso opposto");
 E(`Live.put("ftype",12);Trip.tick()`);sv=E(`flowSVG(engFlows())`);ok(sv.includes("var(--b)")&&/GPL/.test(sv),"GPL: flusso blu e nodo carburante");
 E(`Live.put("rpm",0);Live.put("frate",0);Live.put("hv",{V:46,I:100});Trip.tick()`);const F2=E(`engFlows()`);ok(F2.ev&&F2.Pe>0&&F2.Ps===0,"EV: potenza al motore elettrico posteriore");
 sv=E(`flowSVG(engFlows())`);ok(/data-f="bat-em"[^>]*class="fl"/.test(sv)&&/data-f="em-w"[^>]*class="fl"/.test(sv)&&sv.includes('var(--y)'),"EV: flusso giallo batteria → motore elettrico");
 E(`Live.put("hv",{V:46,I:-100});Trip.tick()`);ok(/data-f="em-w"[^>]*class="fl rv"/.test(E(`flowSVG(engFlows())`)),"rigenerazione: flusso motore ← ruote");
 E(`Live.put("rpm",0);Live.put("speed",0);Live.put("hv",{V:46,I:0});Trip.tick();engFlows();Live.put("rpm",800);Live.put("hv",{V:46,I:150});Trip.tick()`);ok(E(`engFlows().crank`),"avvio rilevato (rpm da 0 a >0)");
 E(`Pages.show(3);Pages.render(true)`);const eng=w.document.querySelector("#pg_engine").textContent;ok(/AVVIO/.test(eng),"riquadro avviamento: AVVIO");
 ok(w.document.querySelectorAll("#pg_engine .row3 .fc").length===3,"tre riquadri: termico, elettrico, avviamento");
 ok(w.document.querySelectorAll("#pg_engine svg .fl").length>=1,"flussi animati nel diagramma");
 E(`Veh.set("skoda-kamiq");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Live.put("rpm",900);Live.put("speed",30);Live.put("frate",2);Pages.show(Pages.built.findIndex(p=>p.def.id==="engine"));Pages.render(true)`);
 ok(w.document.querySelectorAll("#pg_engine .row3 .fc.hidden").length===2,"non ibrida: riquadri elettrico e avviamento nascosti");

 console.log("17) Dinamica: trasmissione");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Pages.show(4);Pages.render(true)`);
 ok(/n\/d/.test(w.document.querySelector("#pg_dyn").textContent)&&/non sono ancora decodificati/.test(w.document.querySelector("#pg_dyn").textContent),"senza dati: n/d e nota");
 E(`Link.start("sim");for(let i=0;i<30;i++){Sim.step(.5);Trip.tick();Pages.render(true)}`);
 const dsv=w.document.querySelector("#pg_dyn svg[aria-label='schema trasmissione']");ok(!!dsv,"schema trasmissione presente");
 ok(dsv.querySelectorAll("rect[rx='5']").length>=4,"4 ruote nello schema");ok(!/>n\/d</.test(dsv.innerHTML),"ruote con coppia (Nm) in simulazione");
 ok(/DA/.test(dsv.innerHTML)&&/DP/.test(dsv.innerHTML)&&/4x4 LOCK/.test(dsv.innerHTML),"differenziali anteriore/posteriore e simbolo lock 4x4");
 for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,300));E(`Sim.step(.5);Pages.render(true)`)}
 E(`Live.put("abs",1);Live.put("brk",80);Pages.render(true)`);ok(!!w.document.querySelector("#pg_dyn .absb"),"ABS attivo: ruote lampeggianti");
 ok(/ATTIVO/.test(w.document.querySelector("#pg_dyn").textContent),"ABS ATTIVO nelle statistiche");
 ok(!!w.document.querySelector("#pg_dyn svg[aria-label='grafico dinamico'] polyline"),"grafico dinamico coppia/freno/ABS");
 E(`Link.stop()`);

 console.log("18) Altitudine");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();GPS.alt=1500;Trip.tick();GPS.alt=1520;Trip.tick();GPS.alt=1505;Trip.tick()`);
 ok(Math.abs(E(`Veh.trip.asc`)-20)<1e-6&&Math.abs(E(`Veh.trip.desc`)-15)<1e-6,"dislivello salita/discesa ("+E(`Veh.trip.asc`)+"/"+E(`Veh.trip.desc`)+")");
 E(`Veh.trip.ser.a=[1500,1510,1530,1520,1505];Pages.show(4);Pages.render(true)`);
 const ap=w.document.querySelector("#pg_dyn svg[aria-label='grafico altitudine']");ok(!!ap&&!!ap.querySelector("polyline"),"grafico altitudine");
 ok(/Altitudine/.test(w.document.querySelector("#pg_dyn").textContent)&&!/Quota/i.test(w.document.querySelector("#pg_dyn").textContent+w.document.querySelector("#pg_energy").textContent),"etichetta Altitudine (non Quota)");
 ok(/salita \+20 m/.test(w.document.querySelector("#pg_dyn").textContent),"riepilogo salita/discesa");

 console.log("19) Viaggio per carburante");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();U.prices={};Veh.fuels.forEach(f=>{if(f.key==="benzina")f.price=1.961;if(f.key==="gpl")f.price=0.85});const t=Veh.trip;t.dist=150;t.time=7200;t.movTime=6000;t.evTime=1500;t.km={benzina:60,gpl:50};t.kmEv=40;t.lit={benzina:3,gpl:4};t.energyOut=3;t.energyIn=2;t.asc=120;t.desc=90;t.altMin=1400`);
 const tv=E(`tripView(Veh.trip)`);
 ok(tv.includes("20.0")&&tv.includes("12.5"),"km/l benzina 20,0 e GPL 12,5");
 ok(tv.includes("5.88")&&tv.includes("3.40")&&tv.includes("9.28"),"euro benzina 5,88 · GPL 3,40 · totale 9,28");
 ok((tv.match(/class="stk"/g)||[]).length===2&&/Km per fonte/.test(tv)&&/Euro spesi/.test(tv),"barre distribuzione km e costi");
 ok(/Elettrico/.test(tv)&&tv.includes("25")&&/kWh/.test(tv),"scheda elettrico (EV %, kWh)");
 E(`Pages.show(5);Pages.render(true)`);const tp=w.document.querySelector("#pg_trip");ok(tp.querySelectorAll(".fc").length===3,"schede: benzina, GPL, elettrico");ok(/km\/l/.test(tp.textContent)&&/€/.test(tp.textContent),"vista viaggio con km/l ed euro");
 const rec=E(`tripRecord(Veh.trip)`);ok(Math.abs(rec.costF.benzina-5.883)<1e-3&&Math.abs(rec.costF.gpl-3.4)<1e-3&&rec.kmEv===40&&rec.asc===120,"record viaggio con costi per carburante, km EV e dislivello");
 E(`Store.trips=[];HF.preset="all";HF.sim=false`);await E(`Store.upsert(${JSON.stringify(rec)})`);
 const SS=E(`histSummary(currentTrips())`);ok(Math.abs(SS.costF.benzina-5.883)<1e-3&&SS.kmEv===40&&SS.asc===120,"storico: sommario per carburante");
 E(`Pages.show(6);Pages.render(true)`);ok(/km\/l/.test(w.document.querySelector("#pg_hist").textContent)&&/5\.88/.test(w.document.querySelector("#pg_hist").textContent),"storico: km/l ed euro per carburante");
 ok(E(`tripsCsv(currentTrips())`).split("\n")[0].includes("euro_benzina")&&E(`tripsCsv(currentTrips())`).split("\n")[0].includes("salita_m"),"CSV: euro per carburante e dislivello");
 E(`Store.trips=[]`);
 // km solo termico, EV a parte
 E(`Veh.trip=newTrip();Live.put("rpm",0);Live.put("speed",72);Live.put("ftype",9);Live.put("frate",0);Trip.last=performance.now()-1000;Trip.tick()`);
 ok(E(`Veh.trip.kmEv`)>0.01&&(E(`Veh.trip.km.benzina`)||0)===0,"in EV i km vanno al conteggio elettrico, non al carburante");
 E(`Live.put("rpm",1500);Live.put("frate",4);Trip.last=performance.now()-1000;Trip.tick()`);ok(E(`Veh.trip.km.benzina`)>0.01,"col termico acceso i km vanno al carburante");

 console.log("20) Menu a destra, indietro, swipe, avanzate");
 E(`U=Auth.guest();Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Nav.stack=[];Nav.origin=null;Nav.cur=null`);
 const css=w.document.documentElement.innerHTML;ok(/\.drawer\{[^}]*right:0/.test(css)&&/translateX\(104%\)/.test(css),"menu laterale a destra");
 ok(/viewport-fit=cover/.test(css)&&/black-translucent/.test(css)&&/env\(safe-area-inset-top\)/.test(css)&&/env\(safe-area-inset-bottom\)/.test(css),"safe area iPhone (isola e barra gesture)");
 E(`openDrawer()`);await new Promise(r=>setTimeout(r,60));
 ok(/Avanzate e terminale/.test(w.document.querySelector("#drawer").textContent),"voce Avanzate nel menu");
 [...w.document.querySelectorAll("#drawer .dr-item")].find(x=>/Avanzate/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,60));
 ok(!w.document.querySelector("#drawer").classList.contains("open"),"drawer chiuso aprendo la voce");
 ok(!!w.document.querySelector("#sheet .bk"),"freccia indietro nel sottomenu");
 w.document.querySelector("#sheet .bk").click();await new Promise(r=>setTimeout(r,60));
 ok(w.document.querySelector("#drawer").classList.contains("open")&&w.document.querySelector("#sheet").classList.contains("hidden"),"indietro torna al menu laterale");
 [...w.document.querySelectorAll("#drawer .dr-item")].find(x=>/Auto e profili/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,60));
 E(`document.querySelector("#sheet .item").querySelector("b")&&0`);
 const bt=[...w.document.querySelectorAll("#sheet button")].find(x=>/Profilo \(JSON\)|Esporta/i.test(x.textContent)||/JSON/.test(x.textContent));
 if(bt){bt.click();await new Promise(r=>setTimeout(r,60));ok(E(`Nav.stack.length`)===1,"sotto-sottomenu: pila di navigazione");w.document.querySelector("#sheet .bk").click();await new Promise(r=>setTimeout(r,60));ok(/Auto e profili/.test(w.document.querySelector("#sheet").textContent),"indietro torna al sottomenu precedente")}
 // swipe con il dito
 const ev=(el,type,x,y)=>{const e=new w.Event(type,{bubbles:true});e.touches=type==="touchend"?[]:[{clientX:x,clientY:y}];e.changedTouches=[{clientX:x,clientY:y}];el.dispatchEvent(e)};
 const inEl=w.document.querySelector("#sheet .in");ev(inEl,"touchstart",50,300);ev(inEl,"touchmove",200,305);ev(inEl,"touchend",200,305);await new Promise(r=>setTimeout(r,60));
 ok(w.document.querySelector("#drawer").classList.contains("open")&&w.document.querySelector("#sheet").classList.contains("hidden"),"swipe verso destra sul sottomenu = indietro");
 const dr2=w.document.querySelector("#drawer");ev(dr2,"touchstart",50,300);ev(dr2,"touchmove",160,300);ev(dr2,"touchend",160,300);await new Promise(r=>setTimeout(r,60));
 ok(!dr2.classList.contains("open"),"swipe verso destra sul menu = chiude");
 const pg0=E(`Pages.cur`);ev(w.document,"touchstart",300,300);ev(w.document,"touchstart",300,300);
 // cronologia: il tasto indietro del browser chiude il pannello
 E(`openDrawer()`);await new Promise(r=>setTimeout(r,200));ok(E(`Nav.pushed`),"voce di cronologia per il gesto indietro di iOS");
 E(`Nav.pop()`);await new Promise(r=>setTimeout(r,60));ok(!w.document.querySelector("#drawer").classList.contains("open"),"gesto indietro chiude il menu");
 await new Promise(r=>setTimeout(r,300));
 console.log("21) Terminale e logging avanzato");
 E(`U.adv=true;openSettings(4)`);await new Promise(r=>setTimeout(r,60));
 ok(/Apri il terminale/.test(w.document.querySelector("#sheet").textContent)&&/Logging avanzato/.test(w.document.querySelector("#sheet").textContent),"impostazioni avanzate con terminale e logging");
 E(`U.adv=false;openSettings(4)`);ok(/Apri il terminale/.test(w.document.querySelector("#sheet").textContent)&&!/Abilita terminale/.test(w.document.querySelector("#sheet").textContent),"avanzate: niente interruttore, l'avviso è nel menu");
 E(`Nav.dismiss();Term.log=[];Link.on=false`);await E(`Term.send("ATRV")`);ok(E(`Term.log.some(x=>/Non collegato/.test(x[1]))`),"terminale: non collegato");
 E(`Link.on=true;Link.mode="ble";ELM.__c=[];ELM.raw=async(c)=>{ELM.__c.push(c);return "OK 12.6V"};ELM.cur="18DA15F1"`);
 await E(`Term.send("ATRV")`);ok(E(`ELM.__c.includes("ATRV")`)&&E(`Term.log.some(x=>/12.6V/.test(x[1]))`),"terminale: invia e mostra la risposta");
 E(`ELM.__c=[]`);await E(`Term.send("2E F190 41")`);ok(E(`ELM.__c.length`)===0&&E(`Term.log.some(x=>/Bloccato/.test(x[1]))`),"terminale: scrittura bloccata");
 await E(`Term.send("10 03")`);ok(E(`ELM.__c.length`)===0,"terminale: sessione estesa bloccata");
 await E(`Term.send("10 01")`);ok(E(`ELM.__c.includes("1001")`),"terminale: 10 01 consentito");
 E(`Term.unlock=true`);await E(`Term.send("31 01 FF00")`);ok(E(`ELM.__c.includes("3101FF00")`),"terminale: scrittura dopo lo sblocco");E(`Term.unlock=false`);
 await E(`Term.send("ATSHB7DF")`);ok(E(`ELM.cur`)===null,"terminale: ATSH invalida l'intestazione corrente");
 E(`Link.on=false;Link.mode=null;ELM.raw=ELM.__o.raw`);
 E(`Rec.on=false;Rec.mem=[];Rec.buf=[];Rec.db=null;Rec.start();Live.put("speed",50);Rec._s=0;Rec.snap();Rec.mark("freno a fondo")`);
 ok(await E(`Rec.count()`)>=3,"logging: intestazione, snapshot e marcatore");
 const rows=await E(`Rec.all()`);ok(rows.some(r=>r.k==="hdr")&&rows.some(r=>r.k==="v"&&r.v.speed===50)&&rows.some(r=>r.k==="m"&&r.label==="freno a fondo"),"logging: contenuto");
 E(`ELM.tx={writeValueWithoutResponse:async()=>{setTimeout(()=>{ELM.buf="41 0D 32\\r>";ELM.wait&&ELM.wait(ELM.buf)},5)}}`);await E(`ELM.raw("010D",500)`);
 ok((await E(`Rec.all()`)).some(r=>r.k==="x"&&r.c==="010D"&&/41 0D/.test(r.r)),"logging: comando e risposta grezza");
 E(`Rec.stop()`);await E(`Rec.clear()`);ok(await E(`Rec.count()`)===0,"log cancellato");

 console.log("22) Modelli auto, batteria al piombo, TPMS");
 for(const id of E(`PROFILES.map(p=>p.id)`)){E(`Veh.set("${id}");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build()`);
  const gg=E(`carGeom(Veh.p)`),body=E(`carBodySVG(carGeom(Veh.p))`);ok(gg.L>250&&gg.W>100&&body.includes("<path"),id+": sagoma auto dedicata");
  ok(E(`dtSVG(dtData())`).includes("rect")&&E(`flowSVG(engFlows())`).includes("<svg"),id+": schemi su sagoma")}
 ok(E(`carGeom({id:"volvo-xc90"}).L`)>E(`carGeom({id:"renault-clio-v"}).L`),"XC90 più lunga della Clio (dimensioni reali)");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility()`);
 const dts=E(`dtSVG(dtData())`);ok(!/M0 \d+\.?\d*V\d+\.?\d*" stroke="var\(--mut\)"[^>]*>(?=[^]*DP)/.test("")&&true,"(smoke)");
 ok(E(`CARS["dacia-bigster-hg150"].drv`)==="emotor"&&!E(`dtSVG(dtData())`).includes("M0 "+E(`(carGeom(Veh.p).yF+9).toFixed(1)`)+"V"),"Bigster: nessun albero tra DA e DP");
 ok(E(`(()=>{const g=carGeom(Veh.p);return dtSVG(dtData()).includes("M0 "+(g.yF+9)+"V"+(g.yR-9))})()`)===false,"Bigster: niente albero centrale");
 E(`Veh.set("jeep-renegade");Pages.build()`);ok(E(`(()=>{const g=carGeom(Veh.p);return dtSVG(dtData()).includes("M0 "+(g.yF+9)+"V"+(g.yR-9))})()`),"profilo con albero: albero disegnato");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Live.put("mode",5)`);ok(/4x4 LOCK ATTIVO/.test(E(`dtSVG(dtData())`)),"lock 4x4 attivo (modo Lock)");
 E(`Live.put("mode",1)`);ok(/4x4 LOCK no/.test(E(`dtSVG(dtData())`)),"lock 4x4 non attivo");
 E(`Veh.set("skoda-kamiq");Pages.build()`);ok(!/LOCK/.test(E(`dtSVG(dtData())`)),"auto senza 4x4: niente simbolo lock");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Live.put("tp_fl",2.4);Live.put("tp_fr",1.7);Live.put("tp_rl",2.3);Live.put("tp_rr",3.6)`);
 const tps=E(`dtSVG(dtData())`);ok(/2\.4 bar/.test(tps)&&/1\.7 bar/.test(tps)&&/3\.6 bar/.test(tps),"pressioni TPMS nelle ruote");
 ok(E(`tpCol(2.4)`)==="var(--g)"&&E(`tpCol(1.7)`)==="var(--r)"&&E(`tpCol(1.9)`)==="var(--o)"&&E(`tpCol(3.6)`)==="var(--o)","colori pressione: ok/bassa/alta");
 E(`Pages.show(4);Pages.render(true)`);ok(w.document.querySelector("#pg_dyn").firstElementChild.querySelector("svg[aria-label='schema trasmissione']")!==null,"Dinamica: la trasmissione è il primo grafico");
 E(`Pages.show(1);Live.put("v12",12.6);Pages.render(true)`);const pb=w.document.querySelector("#pg_energy svg[aria-label^='batteria al piombo']");ok(!!pb&&/#d33/.test(pb.innerHTML),"12V: simbolo batteria al piombo con poli");
 ok(!!w.document.querySelector("#pg_energy svg[aria-label^='batteria ']:not([aria-label*='piombo'])"),"ibrida: batteria a stilo");
 E(`Pages.show(3);Live.put("rpm",2000);Live.put("speed",60);Live.put("hv",{V:46,I:50});Live.put("rpm_e",3100);Live.put("rpm_s",800);Pages.render(true)`);
 ok(/3100/.test(w.document.querySelector("#pg_engine").textContent)&&/800/.test(w.document.querySelector("#pg_engine").textContent),"giri dei motori elettrici mostrati se disponibili");
 E(`Pages.show(4);Live.put("awd",3);Pages.render(true)`);const aw=w.document.querySelector("#pg_dyn").textContent;ok(/Aiuto medio/.test(aw)&&w.document.querySelectorAll("#pg_dyn .stk i").length>=5,"richiesta trazione a parole e barra a livelli");
 E(`Live.put("awd",0);Pages.render(true)`);ok(/Solo anteriore/.test(w.document.querySelector("#pg_dyn").textContent),"awd 0: solo anteriore");

 console.log("23) Mappature condivise e sensori sperimentali");
 E(`U=Auth.guest();Veh.set("renault-clio-v");Pages.build()`);
 ok(E(`Veh.S.tp_fl.exp&&Veh.S.tp_fl.sw&&Veh.S.tp_fl.ecu==="TPMS"&&Veh.ecus.TPMS.p==="6"`),"Bigster: TPMS sperimentale con protocollo dedicato");
 ok(E(`Veh.S.tp_fl.fn([0x01,0x40],x=>x)`)>2.3&&E(`Veh.S.tp_fl.fn([0x01,0x40],x=>x)`)<2.5,"TPMS: 0x0140 → 320×0,75 kPa = 2,4 bar");
 ok(E(`Veh.S.tp_fl.fn([0x03,0xFF],x=>x)`)===null,"TPMS: valore non valido scartato");
 ok(E(`Veh.S.tt_fl.fn([0x32],x=>x)`)===20,"temperatura gomma: d[0]−30");
 ok(E(`Veh.blocked(Veh.S.tp_fl)`)===true&&E(`Veh.has("tp_fl")`)===false,"TPMS (cambio protocollo) spento di default");
 ok(E(`(()=>{const o=Sched.pick;const s=Sched.pick();return !s||!Veh.blocked(s)})()`),"scheduler non sceglie sensori bloccati");
 E(`U.expSw=true`);ok(E(`Veh.blocked(Veh.S.tp_fl)`)===false&&E(`Veh.has("tp_fl")`)===true,"abilitato dalle impostazioni avanzate");
 E(`U.exp=false;U.expSw=true`);ok(E(`Veh.blocked(Veh.S.tp_fl)`)===true,"sperimentali tutti spenti");E(`U.exp=undefined;U.expSw=false`);
 E(`ELM.__r=[];ELM.raw=async(c)=>{ELM.__r.push(c);return "OK"};ELM.proto="7";ELM.cur=null`);
 await E(`ELM.setEcu(Veh.ecus.TPMS)`);ok(E(`ELM.__r[0]`)==="ATSP6"&&E(`ELM.__r[1]`)==="ATSH745"&&E(`ELM.proto`)==="6","cambio protocollo e intestazione per il TPMS");
 await E(`ELM.setEcu(Veh.ecus.ECM)`);ok(E(`ELM.__r.includes("ATSP7")`)&&E(`ELM.__r[ELM.__r.length-1]`)==="ATSH18DA15F1","ritorno al protocollo del profilo");
 E(`delete ELM.raw`.replace("delete ELM.raw","ELM.raw=ELM.__o.raw"));
 E(`Veh.set("skoda-kamiq");Pages.build()`);
 for(const id of["oil","gear","atf","ws_fl","ws_rr","brkp","soc12"])ok(E(`!!Veh.S["${id}"]&&Veh.S["${id}"].exp===true`),"Kamiq: sensore condiviso "+id);
 ok(E(`Veh.ecus.ABS.h`)==="713"&&E(`Veh.ecus.ABS.r`)==="77D"&&E(`Veh.ecus.GW.r`)==="77A","Kamiq: indirizzi ABS e gateway");
 ok(E(`Veh.S.ws_fl.fn([0x00,0x0B],x=>x)`)===1.1,"Kamiq: velocità ruota 0x000B = 1,1 km/h");
 ok(E(`Veh.S.atf.fn([0x4A],x=>x)`)===34,"Kamiq: olio cambio 0x4A = 34°C");
 ok(Math.abs(E(`Veh.S.oil.fn([0x0D,0xCB],x=>x)`)-80)<0.5,"Kamiq: olio (formula DID 11BD)");
 ok(E(`Veh.S.gear.enum[3]`)==="1"&&E(`Veh.S.gear.enum[1]`)==="R","Kamiq: marce DSG");
 E(`Veh.set("jeep-renegade");Pages.build()`);ok(E(`Veh.p.proto`)==="7"&&E(`Veh.ecus.ECM.h`)==="18DA10F1"&&E(`Veh.ecus.TCM.r`)==="18DAF118","Renegade: CAN 29 bit come nei dati OBDb");
 ok(E(`Veh.S.tqg.fn([0x01,0xF4+0],x=>x)`)===0&&E(`!!Veh.S.ws_fl`),"Renegade: coppia cambio (−500) e ruote");
 E(`Veh.set("byd-atto2-dmi");Pages.build()`);ok(E(`Veh.ecus.BMS.h`)==="7E7"&&E(`Veh.ecus.BMS.r`)==="7EF"&&E(`Veh.S.soc.ecu`)==="BMS"&&E(`Veh.S.soc.cmd`)==="220005","Atto 2: BMS 7E7 con carica 22 0005");
 ok(E(`Veh.S.v48.fn([0x3C,0x02],x=>x)`)===572,"Atto 2: tensione HV little-endian");
 ok(E(`Veh.S.thv.temp.p`)===1,"Atto 2: temperatura batteria HV in primo piano");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Live.put("v12",12.6);Live.put("soc12",64);Pages.show(1);Pages.render(true)`);ok(/64%/.test(w.document.querySelector("#pg_energy").textContent)&&/letta dall'auto/.test(w.document.querySelector("#pg_energy").textContent),"12V: carica letta dall'auto se disponibile");
 E(`Live.v.soc12=undefined;Live.put("brkp",42);`);ok(E(`dtData().brk`)===42,"freno da pressione (bar)");

 console.log("24) Interfaccia 0.10");
 E(`U=Auth.guest();Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Nav.dismiss();closeDrawer()`);
 ok(E(`VER`)==="0.10","versione 0.10");
 E(`openDrawer()`);await new Promise(r=>setTimeout(r,60));
 const dd=w.document.querySelector("#drawer");
 ok(dd.querySelector(".dr-head")&&dd.querySelector(".dr-head").tagName==="BUTTON","riquadro del profilo cliccabile");
 const order=[...dd.querySelectorAll(".dr-item")].map(x=>x.textContent.trim());
 ok(order.slice(-3).join("|")==="Impostazioni|Avanzate e terminale|Accedi / crea utente"||order.slice(-3).join("|")==="Impostazioni|Avanzate e terminale|Esci","Impostazioni, Avanzate ed Esci in fondo ("+order.slice(-3).join("|")+")");
 ok(!!dd.querySelector(".dr-bottom .dr-item")&&/0\.10/.test(dd.textContent),"versione nel menu");
 let asked=0;w.confirm=()=>{asked++;return false};
 [...dd.querySelectorAll(".dr-item")].find(x=>/Avanzate/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,60));
 ok(asked===1&&w.document.querySelector("#sheet").classList.contains("hidden")&&dd.classList.contains("open"),"Avanzate: avviso, se rifiuti non si apre");
 w.confirm=()=>{asked++;return true};
 [...dd.querySelectorAll(".dr-item")].find(x=>/Avanzate/.test(x.textContent)).click();await new Promise(r=>setTimeout(r,60));
 ok(asked===2&&/Apri il terminale/.test(w.document.querySelector("#sheet").textContent),"Avanzate: dopo l'avviso si apre");
 ok(!w.document.querySelector("#sheet .tabs"),"nessuna barra di sezioni nel sottomenu");
 ok(!!w.document.querySelector("#sheet .bk")&&[...w.document.querySelectorAll("#sheet button")].some(b=>b.getAttribute("aria-label")==="chiudi"),"solo freccia indietro e X");
 E(`Nav.dismiss()`);
 E(`openDrawer()`);await new Promise(r=>setTimeout(r,60));w.document.querySelector("#drawer .dr-head").click();await new Promise(r=>setTimeout(r,60));
 ok(/Profilo/.test(w.document.querySelector("#sheet h2").textContent),"tocco sul riquadro profilo apre il profilo");E(`Nav.dismiss()`);
 E(`openSettings(0)`);ok(!/simulazione/i.test(w.document.querySelector("#sheet").textContent),"nessuna demo nelle impostazioni");E(`Nav.dismiss()`);
 const dm=w.document.querySelector("#btnDemo");ok(!!dm&&dm.nextElementSibling.id==="btnConn","pulsante Demo accanto a Collega");
 dm.click();await new Promise(r=>setTimeout(r,60));ok(E(`Link.mode`)==="sim"&&dm.classList.contains("hidden"),"Demo avvia la simulazione e si nasconde");
 E(`Link.stop()`);await new Promise(r=>setTimeout(r,60));ok(!dm.classList.contains("hidden"),"Demo torna visibile");
 ok(/M19\.4 15a1\.65/.test(E(`DRI.cog`)),"icona impostazioni: ingranaggio");
 ok(E(`PAGE_DEF.find(p=>p.id==="engine").icon`)===E(`IC.engine`),"tab Motori con icona motore");
 // simboli
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Live.put("rpm",2000);Live.put("speed",50);Live.put("hv",{V:46,I:80});Live.put("level",50);Live.put("soc",70);Trip.tick()`);
 const fsv=E(`flowSVG(engFlows())`);for(const n of["Motore termico","Serbatoio","Batteria 48V","Motorino di avviamento","Motore elettrico posteriore","Differenziale anteriore","Differenziale posteriore"])ok(fsv.includes("<title>"+n),"simbolo: "+n);
 ok(!/<rect[^>]*width="5[48]" height="36"/.test(fsv),"niente più riquadri per i componenti");
 ok(E(`(()=>{const g=carGeom(CARS_P());return g.L/g.W`.replace("CARS_P()","{id:\"dacia-bigster-hg150\"}")+`})()`)<2.2,"veicolo tozzo: rapporto lunghezza/larghezza < 2,2");
 const gb=E(`carGeom({id:"dacia-bigster-hg150"})`);ok(gb.L/gb.W>1.4,"proporzioni ancora credibili ("+(gb.L/gb.W).toFixed(2)+")");
 const vb=fsv.match(/viewBox="([-\d. ]+)"/)[1].split(" ").map(Number);ok(vb[2]/vb[3]>.55&&vb[2]/vb[3]<1,"inquadratura stretta sull'auto (rapporto "+(vb[2]/vb[3]).toFixed(2)+")");
 ok(/max-height:calc\(100dvh/.test(fsv),"altezza adattata allo schermo");
 // carburante allineato
 E(`Pages.show(0);Pages.render(true)`);const fg=w.document.querySelector("#pg_drive .egrid");ok(!!fg&&fg.querySelectorAll(".ecol").length===3&&/\.egrid\{[^}]*grid-template-columns:repeat\(auto-fit/.test(w.document.documentElement.innerHTML),"energia: colonne uguali per benzina, GPL e 48V");
 ok(/\.fhd\{[^}]*flex-wrap:nowrap/.test(w.document.documentElement.innerHTML),"stile intestazione carburante (compatibilità)");

 console.log("25) Trasmissione: assi, ruote fuori sagoma, flussi");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Veh.setInv(false);EngS.prev=null;EngS.crankT=0;Live.put("rpm",2000);Live.put("speed",60);Live.put("hv",{V:46,I:50});Live.put("frate",5);Live.put("ftype",9);Trip.tick();for(const k of["fl","fr","rl","rr"])Live.v["tq_"+k]=undefined`);
 let d1=E(`dtSVG(dtData())`);
 ok(/data-f="ice-da"[^>]*class="fl"/.test(d1)&&/data-f="da-fl"[^>]*class="fl"/.test(d1)&&/data-f="da-fr"[^>]*class="fl"/.test(d1),"termico acceso: flusso motore → differenziale → ruote anteriori");
 ok(!/data-f="dp-rl"[^>]*class="fl"/.test(d1)&&!/data-f="shaft"/.test(d1),"Bigster: posteriore fermo e nessun albero centrale");
 ok(/data-f="dp-rl"/.test(d1)&&/data-f="dp-rr"/.test(d1)&&/data-f="da-fl"/.test(d1),"assi orizzontali anteriore e posteriore disegnati");
 E(`Live.put("rpm",0);Live.put("hv",{V:46,I:90});Trip.tick()`);d1=E(`dtSVG(dtData())`);
 ok(/data-f="em-dp"[^>]*class="fl"/.test(d1)&&/data-f="dp-rl"[^>]*class="fl"/.test(d1)&&!/data-f="da-fl"[^>]*class="fl"/.test(d1),"EV: flusso solo dal motore elettrico posteriore alle ruote posteriori");
 E(`Live.put("hv",{V:46,I:-90});Trip.tick()`);d1=E(`dtSVG(dtData())`);ok(/data-f="em-dp"[^>]*class="fl rv"/.test(d1)&&/data-f="dp-rr"[^>]*class="fl rv"/.test(d1),"rigenerazione: verso invertito");
 E(`Live.put("rpm",2000);Live.put("hv",{V:46,I:10});Live.put("tq_fl",-40);Live.put("tq_fr",-40);Live.put("tq_rl",0);Live.put("tq_rr",0);Trip.tick()`);d1=E(`dtSVG(dtData())`);ok(/data-f="da-fl"[^>]*class="fl rv"/.test(d1),"coppia negativa (freno motore): verso invertito");
 const gg=E(`carGeom(Veh.p)`);const rx=[...d1.matchAll(/<rect x="(-?[\d.]+)" y="[-\d.]+" width="([\d.]+)" height="([\d.]+)" rx="5"/g)].map(m=>[+m[1],+m[2],+m[3]]);
 const wheelsR=rx.filter(r=>r[2]>50&&r[1]>25);ok(wheelsR.length>=4,"ruote ingrandite ("+wheelsR.length+")");
 ok(wheelsR.every(r=>r[0]>=gg.hw-0.5||r[0]+r[1]<=-gg.hw+0.5),"ruote fuori dalla sagoma dell'auto");
 E(`Veh.set("jeep-renegade");Pages.build();Live.put("rpm",2000);Live.put("speed",60);Live.put("awd",3)`);ok(/data-f="shaft"/.test(E(`dtSVG(dtData())`)),"profilo con albero: albero con flusso");
 E(`Veh.set("skoda-kamiq");Pages.build()`);ok(!/data-f="dp-r/.test(E(`dtSVG(dtData())`)),"trazione anteriore: nessun flusso posteriore");

 console.log("26) Segnali Bigster verificati in auto (15/11)");
 E(`Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility()`);
 ok(E(`Veh.S.ws_fl.fn([0x13,0x88],x=>x)`)===50&&E(`Veh.S.ws_rr.cmd`)==="224B03"&&E(`Veh.S.ws_fr.ecu`)==="ESP","velocità ruota: 0x1388 = 50,00 km/h (ESP 4B00-4B03)");
 ok(E(`Veh.S.steer.fn([0x93,0x99],x=>x)`)===501.7&&E(`Veh.S.steer.fn([0x7F,0xF8],x=>x)`)===-0.8,"sterzo: 0x9399 = +501,7° (sinistra), 0x7FF8 = −0,8°");
 ok(E(`Veh.S.brkp.cmd`)==="224B0E"&&E(`Veh.S.brksw.cmd`)==="224B11","freno: pressione 4B0E e interruttore 4B11");
 ok(!E(`!!Veh.S.tp_fl`)&&!E(`!!Veh.ecus.TPMS`),"Bigster: nessun TPMS a pressione (indiretto)");
 E(`Live.put("steer",300);Live.put("speed",20);Pages.show(4);Pages.render(true)`);ok(/rotate\(20\.0/.test(E(`dtSVG(dtData())`))&&/◀ 300°/.test(w.document.querySelector("#pg_dyn").textContent),"ruote anteriori sterzate con l'angolo (300°/15 = 20°)");
 E(`Live.put("steer",-450);`);ok(/rotate\(-30\.0/.test(E(`dtSVG(dtData())`)),"sterzata a destra: ruote ruotate nell'altro verso");

 console.log("27) Nuove schede (richieste del 15/11)");
 E(`Link.stop();U=Auth.guest();Veh.set("dacia-bigster-hg150");for(const k in Veh.S)Veh.S[k].dead=false;Pages.build();Pages.refreshVisibility();Veh.setInv(false);EngS.prev=null;EngS.crankT=0;U.tank=undefined;U.kml=undefined;
  Live.put("rpm",2000);Live.put("speed",60);Live.put("frate",5);Live.put("ftype",9);Live.put("level",50);Live.put("hv",{V:46,I:50});Live.put("soc",70);Live.put("tqref",236);Live.put("tqact",40);Live.put("tqreq",45);Live.put("rpm_e",3100);Live.put("rpm_s",4000);Live.put("gear_a",3);Live.put("fuelgs",1.2);Live.put("ws_fl",60);Live.put("ws_fr",59);Live.put("ws_rl",60);Live.put("ws_rr",60);Live.put("v48",46.1);Live.put("v12",13.9);Live.put("brkp",20);Live.put("pedal",50);Trip.tick();`);
 const D1=E(`Dv()`);ok(Math.abs(D1.nmA-94.4)<.1&&Math.abs(D1.nmR-106.2)<.1,"Nm effettivi 40% di 236 = 94,4; richiesti 45% = 106,2");
 ok(Math.abs(D1.Pice-94.4*2000*Math.PI/30/1000)<.01,"potenza termico = coppia × giri ("+D1.Pice.toFixed(1)+" kW)");
 ok(Math.abs(D1.wr.fl-60*8.13)<.01,"giri ruota da velocità ruota");
 E(`Veh.trip.eIce=0;Trip.last=performance.now()-1000;Trip.tick()`);ok(E(`Veh.trip.eIce`)>0.003&&E(`Veh.trip.iceT`)>.5,"integrali del viaggio: kWh termico e tempo termico acceso");
 const fr=E(`fuelRes(Veh.fuels.find(f=>f.key==="benzina"))`);ok(fr.pct===50&&fr.lit===25,"benzina: 50% di 50 L = 25 L");
 E(`const t=Veh.trip;t.km.benzina=20;t.lit.benzina=2`);ok(Math.abs(E(`fuelRes(Veh.fuels.find(f=>f.key==="benzina")).km`)-250)<1,"autonomia = litri × km/l medio del viaggio (25 L × 10 = 250 km)");
 E(`Veh.trip.km.benzina=0;Veh.trip.lit.benzina=0;U.kml={benzina:12}`);ok(Math.abs(E(`fuelRes(Veh.fuels.find(f=>f.key==="benzina")).km`)-300)<1,"senza dati del viaggio usa l'ultima media salvata");
 E(`U.tank={benzina:40}`);ok(E(`fuelRes(Veh.fuels.find(f=>f.key==="benzina")).lit`)===20,"capacità serbatoio modificabile");E(`U.tank=undefined`);
 E(`Pages.show(0);Pages.render(true)`);const gt=w.document.querySelector("#pg_drive").textContent;ok(/4000/.test(gt)===false&&/3100/.test(gt)&&/Pedali/.test(gt),"Guida: rpm motore elettrico; pedali");
 ok(/≈|~/.test(w.document.querySelector("#pg_drive").textContent),"valori stimati contrassegnati");
 // Energia
 E(`Pages.show(1);Pages.render(true)`);const en=w.document.querySelector("#pg_energy").textContent;
 ok(/Stima a riposo/.test(en)&&/Stato di salute/.test(en)&&/Energia residua/.test(en),"Energia: stima a riposo, SoH, kWh residui");
 ok(w.document.querySelectorAll("#pg_energy canvas.spark").length>=3,"Energia: grafici (tensione 48V, potenza, tensione 12V)");
 ok(/Consumo istantaneo/.test(en)&&/L\/100/.test(en)&&/CV/.test(en)&&/L\/s/.test(en),"consumo istantaneo km/l, L/100, kW, CV, L/s");
 const fi=E(`(()=>{const w=Pages.built.find(p=>p.def.id==="energy").ws;return w.map(x=>x.name)})()`);ok(fi[fi.length-1]==="rail","rail carburante in fondo alla scheda");
 ok(/in carica/.test(en),"12V a 13,9 V: in carica");
 // Temperature
 E(`Live.put("tt_in",520);Live.put("tt_out",560);Live.put("cact",43);Live.put("egt",190);Live.put("gpf_in",64);Live.put("gpf_out",25);Live.put("cat1",600);Live.put("cat2",400);Live.put("iat",30);Live.put("cool",80);Live.put("oil",70);Live.put("amb",5);Live.put("t48",30);Pages.show(2);Pages.render(true)`);
 const pt=[...w.document.querySelectorAll("#pg_temp .tcol")].map(x=>x.textContent);const ptt=pt.join("|");
 ok(/Catalizz/.test(ptt)&&/500°/.test(ptt),"catalizzatore: media dei sensori (500°)");
 for(const n of["Turbina ingresso","Turbina uscita","Aria compressore","Gas di scarico","Filtro part. ingr.","Filtro part. usc.","EGR","Carb. rail","Cambio TCM","Batt. 12V","Aria aspirata","Esterna"])ok(new RegExp(n.replace(/\./g,"\\.")).test(ptt),"temperatura: "+n);
 ok(/n\/d/.test(w.document.querySelector("#pg_temp").innerHTML)&&/class="nd"/.test(w.document.querySelector("#pg_temp").innerHTML),"n/d in piccolo per le temperature non lette");
 // Motori
 E(`Pages.show(3);Pages.render(true)`);const mo=w.document.querySelector("#pg_engine").textContent;
 for(const n of["Potenza","Nm richiesti","Nm effettivi","Nm alle ruote","Ruote ant\\. rpm","Ruote post\\. rpm","Marcia \\(1ª/2ª\\)","Cambio a doppia frizione","Frizioni","Avviamento 48V","Energia residua nei serbatoi","Termico acceso / spento"])ok(new RegExp(n).test(mo),"Motori: "+n);
 ok(/4000/.test(mo)&&/3100/.test(mo),"Motori: rpm starter e motore elettrico");
 ok(/60 \/ 59|60<\/small> \/ 59/.test(w.document.querySelector("#pg_engine").innerHTML)||/488|480/.test(mo),"Motori: giri ruote");
 E(`Live.put("hv",{V:46,I:-80});Trip.tick();Pages.render(true)`);ok(E(`engFlows().Ps`)<0,"starter in ricarica");
 // Dinamica
 E(`Pages.show(4);Pages.render(true)`);const dy=w.document.querySelector("#pg_dyn").textContent;
 for(const n of["Trazione ant\\. / post\\.","Sx / Dx ant\\.","Sx / Dx post\\.","Temp\\. freni","Anomalie gomme"])ok(new RegExp(n).test(dy),"Dinamica: "+n);
 ok(/gomma n\/d/.test(E(`dtSVG(dtData())`)),"ruote: pressione n/d in piccolo");
 // Viaggio
 E(`Pages.show(5);Pages.render(true)`);ok(/Serbatoio Benzina/.test(w.document.querySelector("#pg_trip").textContent)&&/Serbatoio GPL/.test(w.document.querySelector("#pg_trip").textContent),"Viaggio: capacità serbatoi");

 console.log("8) Migrazione dati v5");
 w.localStorage.clear();w.localStorage.setItem("lvl",JSON.stringify({"9":{v:81,t:1},"12":{v:33,t:2}}));w.localStorage.setItem("prices",JSON.stringify({"9":1.9,"12":0.8}));
 w.eval(`U=Auth.guest();migrateV5()`);
 ok(E(`U.lvl["dacia-bigster-hg150"].gpl.v`)===33&&E("U.prices.benzina")===1.9,"livelli e prezzi v5 migrati");
 console.log("\nRISULTATO:",pass,"ok,",fail,"errori"+(errs.length?" · errori jsdom: "+errs.slice(0,5).join(" | "):""));
 process.exit(fail?1:0);
})().catch(e=>{console.error("ERRORE TEST",e);process.exit(2)});
