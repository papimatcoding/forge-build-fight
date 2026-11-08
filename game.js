import {CARDS,CARDS_BY_ID,COMBAT_CARDS,EFFECT_CARDS,BLOCK,RULES,CANVA_SERIES_I_URL} from './cards.js';
import {RoomPeer,normalizeRoomCode,createRoomCode,isRemoteCommand} from './room.js';
const $=id=>document.getElementById(id);
const random=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let session=0,game=null,selected=null,logs=[],modalOpen=true,thinking=false;
// UIDs already revealed on-screen. Newly visible cards animate exactly once.
let revealedCards=[new Set(),new Set()];
let inspected=null,lastFxSeen=0,fxClearTimer=null;
let peer=null,remotePending=false,lastSnapshot=0,version=0;
let awaitingSeq=0,commandTimer=null,helloTimer=null;
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const drawFrom=pool=>({uid:uid(),id:random(pool).id});
const draw=()=>drawFrom(CARDS);
const openingHand=()=>[drawFrom(COMBAT_CARDS),drawFrom(COMBAT_CARDS),drawFrom(EFFECT_CARDS)].sort(()=>Math.random()-.5);
const playerName=i=>'JUGADOR '+(i+1);
const card=id=>CARDS_BY_ID[id]||BLOCK;
const own=()=>game.players[game.current];
const other=()=>game.players[1-game.current];
const lc=(text)=>{logs.unshift(text);logs=logs.slice(0,9);};
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2400);}
function newGame(mode,forcedFirst=null){
 if(peer&&mode!=='p2p-host'){peer.close();peer=null;}
 session++;selected=null;thinking=false;logs=[];modalOpen=false;remotePending=false;lastSnapshot=0;version=0;
 awaitingSeq=0;clearTimeout(commandTimer);commandTimer=null;clearTimeout(helloTimer);helloTimer=null;
 revealedCards=[new Set(),new Set()];inspected=null;lastFxSeen=0;clearTimeout(fxClearTimer);
 const first=[0,1].includes(forcedFirst)?forcedFirst:(Math.random()<.5?0:1);
 game={mode,current:first,firstPlayer:first,turns:0,score:0,finished:false,pendingDraw:false,fxEvents:[],fxSerial:0,
  players:[0,1].map(()=>({energy:0,hand:openingHand(),board:Array(RULES.lanes).fill(null),freeTurn:false,focusTargetId:null}))};
 lc('🪙 La moneda decide: empieza '+playerName(first)+'.');
 announceAbility('🪙 MONEDA AL AIRE','¡Empieza '+playerName(first)+'!','coin');
 enterTurn();closeModal();render();
 if(game.mode==='cpu'&&game.current===1)queueCPU();
}
function enterTurn(){
 const p=own();
 p.freeTurn=false;
 p.energy=clamp(p.energy+RULES.energyPerTurn,0,RULES.maxEnergy);
 for(let i=0;i<RULES.lanes;i++){
  const u=p.board[i];
  if(!u)continue;
  if(u.id==='raul'){p.energy=clamp(p.energy+1,0,RULES.maxEnergy);announceAbility('🎓 BECA MEC','Raúl concede +1 de energía','energy');}
  if(u.id==='perry'){
   const lost=u.maxHealth-u.health;
   u.hat=!u.hat;
   u.attack=u.hat?2:4;
   u.maxHealth=u.hat?3:2;
   u.health=Math.max(1,u.maxHealth-lost);
   u.shield=u.hat?1:0;
   announceAbility('🕵️ PERRY CAMBIA DE FORMA',u.hat?'Con gorro 2/3 y escudo':'Sin gorro 4/2','transform');
   if(u.health<=0)damage(game.current,i,999,'crisis de identidad');
  }
 }
 // Players choose combat or effect deck at each turn after both opening turns.
 game.pendingDraw=game.turns>=RULES.openingTurnsWithoutAttack&&p.hand.length<RULES.maxHand;
 lc(playerName(game.current)+' obtiene energía'+(game.pendingDraw?' y elige un mazo de robo.':'.'));
}
function announceAbility(title,detail,kind="ability"){
 if(!game)return;
 game.fxSerial=(game.fxSerial||0)+1;
 game.fxEvents.push({id:game.fxSerial,title,detail,kind});
 game.fxEvents=game.fxEvents.slice(-12);
 lc(title+': '+detail);
}
function chooseDraw(player,deck){
 if(!game||game.finished||game.current!==player||!game.pendingDraw||!["unit","spell"].includes(deck))return false;
 const p=game.players[player];if(p.hand.length>=RULES.maxHand)return false;
 p.hand.push(drawFrom(deck==="unit"?COMBAT_CARDS:EFFECT_CARDS));
 game.pendingDraw=false;
 announceAbility(deck==="unit"?"⚔ MAZO DE COMBATE":"✨ MAZO DE EFECTOS",
  playerName(player)+" roba "+(deck==="unit"?"una criatura.":"una carta de efecto."),"draw");
 render();
 if(game.mode==="p2p-host")sendGuestSnapshot();
 return true;
}
function bonusDraw(player,deck,count=1){
 const p=game.players[player],pool=deck==="unit"?COMBAT_CARDS:EFFECT_CARDS;
 let n=0;while(n<count&&p.hand.length<RULES.maxHand){p.hand.push(drawFrom(pool));n++;}
 return n;
}
function renderAbilityFx(){
 if(!game)return;
 const fx=game.fxEvents?.at(-1),box=$("ability-fx");
 if(!box||!fx||fx.id===lastFxSeen)return;
 lastFxSeen=fx.id;
 box.innerHTML='<div class="ability-fx-icon">'+(fx.kind==="coin"?"🪙":fx.kind==="draw"?"🃏":"✦")+"</div>"+
 '<strong>'+escapeHtml(fx.title)+'</strong><span>'+escapeHtml(fx.detail)+'</span>';
 box.classList.remove("show");void box.offsetWidth;box.classList.add("show");
 clearTimeout(fxClearTimer);fxClearTimer=setTimeout(()=>box.classList.remove("show"),2200);
}
function renderInspector(){
 const el=$("ability-inspector");if(!el)return;
 if(!inspected){el.hidden=true;return;}
 el.hidden=false;const info=card(inspected.id);
 el.innerHTML='<button type="button" class="inspect-close" data-inspect-close aria-label="Cerrar">×</button>'+
 '<strong>✦ '+escapeHtml(info.name)+'</strong><span>'+escapeHtml(info.text)+'</span>';
}
function modifiedCost(info,player){
 if(game.players[player].freeTurn)return 0;
 return info.cost+(info.cost>=4&&game.players[1-player].board.some(u=>u?.id==='inspector')?1:0);
}
function eligible(info,player){
 const p=game.players[player],foe=game.players[1-player];
 if(info.type==='unit')return p.board.some(u=>u===null);
 if(info.effect==='cancer')return foe.board.some(u=>u&&!u.cancer);
 if(info.effect==='chemo')return p.board.some(u=>u&&u.cancer);
 if(info.effect==='hyper')return p.board.some(u=>u&&u.attack>0)&&foe.board.some(v=>v);
 if(info.effect==='pirate')return !p.freeTurn;
 if(info.effect==='hex'||info.effect==='delay')return foe.board.some(u=>u);
 return true;
}
function unitOf(info){
 return {uid:uid(),id:info.id,attack:info.attack,health:info.health,maxHealth:info.health,cancer:0,stun:0,shield:info.effect==='agent'?1:0,slipper:true,hat:info.id==='perry',cheese:0,hex:0};
}
function isShielded(player,info){
 if(!['cancer','taxoffice','sixseven','hex','delay','bank'].includes(info.effect))return false;
 const agent=game.players[1-player].board.find(u=>u?.id==='perry'&&u.shield>0);
 if(!agent)return false;
 agent.shield=0;announceAbility('🕵️ ESCUDO DE PERRY','Bloquea '+info.name,'shield');return true;
}
function scoreDirect(player,value,source){
 game.score+=(player===0?1:-1)*value;
 lc(playerName(player)+' causa '+value+' a la balanza con '+source+'.');
 if(Math.abs(game.score)>=RULES.victoryLead){game.score=clamp(game.score,-RULES.victoryLead,RULES.victoryLead);win(game.score>0?0:1);}
}
function damage(boardOwner,lane,amount,reason){
 const target=game.players[boardOwner].board[lane];
 if(!target)return;
 target.health-=amount;
 if(target.health>0)return;
 game.players[boardOwner].board[lane]=null;
 lc('¡'+card(target.id).name+' ha caído!'+(reason?' ('+reason+')':''));
 if(target.id==='pereira'){
   announceAbility('🦫 PALETAZO','Pereira contraataca por 2 de daño','attack');
   const rival=game.players[1-boardOwner].board[lane];
   if(rival){lc('¡Pereira Castor contraataca con sus PALETAS!');damage(1-boardOwner,lane,2,'paletazo post mortem');}
 }
}
function applyEffect(info,player,lane){
 const p=game.players[player],foe=game.players[1-player];
 if(isShielded(player,info))return;
 switch(info.effect){
 case 'cancer': {
  const t=foe.board[lane];if(t){t.cancer=3;announceAbility('🦠 CÁNCER','Tres finales de turno para Quimio','debuff');}break;
 }
 case 'chemo': {
  const t=p.board[lane];if(t){t.cancer=0;announceAbility('💉 QUIMIO','Elimina Cáncer pero causa 1 de daño','heal');damage(player,lane,1,'Quimio');}break;
 }
 case 'taxoffice':{
  const seized=Math.min(2,foe.energy);foe.energy-=seized;p.energy=clamp(p.energy+1,0,RULES.maxEnergy);
  announceAbility('🏦 HACIENDA','Confisca '+seized+' ⚡ y devuelve 1 ⚡','energy');break;
 }
 case 'pirate':{
  p.freeTurn=true;
  announceAbility('🪙 TOKEN PIRATA','Tus cartas cuestan 0 este turno','energy');
  break;
 }
 case 'sixseven':{
  const valid=foe.board.map((x,i)=>x?i:-1).filter(i=>i>=0);
  if(Math.random()<.5&&valid.length){const l=random(valid);announceAbility('6️⃣ SIX','6 de daño aleatorio','attack');damage(1-player,l,6,'SIX');}
  else{p.energy=clamp(p.energy+7,0,RULES.maxEnergy);announceAbility('7️⃣ SEVEN','+7 energía','energy');}
  break;
 }
 case 'hyper':{
  const t=foe.board[lane];
  if(t){
   p.focusTargetId=t.uid;
   announceAbility('💍 HIPERGAMIA','Ataque concentrado en '+card(t.id).name,'attack');
  }
  break;
 }

 case 'hex':{
  const t=foe.board[lane];
  if(t){t.hex=2;announceAbility('🔮 MALA SUERTE',card(t.id).name+' pierde 2 ATQ durante 2 ataques','debuff');}
  break;
 }
 case 'delay':{
  const t=foe.board[lane];
  if(t){t.stun++;announceAbility('🚆 RENFE','Pierde el próximo ataque','debuff');}
  break;
 }
 case 'contraband':{
  const n=bonusDraw(player,'unit',2);
  announceAbility('📦 CARGAMENTO','Roba '+n+' cartas de combate','draw');
  break;
 }
 case 'ai':{
  const a=bonusDraw(player,'unit'),b=bonusDraw(player,'spell');
  announceAbility('🤖 CHATGPT','Roba '+a+' criatura y '+b+' efecto','draw');
  break;
 }
 case 'bank':{
  const n=Math.min(3,foe.energy,RULES.maxEnergy-p.energy);
  p.energy+=n;announceAbility('🎤 BRONCANO','Copia '+n+' ⚡ del rival','energy');
  break;
 }
 }
}
function playCard(player,handUid,lane=null){
 if(!game||game.finished||game.current!==player||game.pendingDraw)return false;
 const p=game.players[player],idx=p.hand.findIndex(h=>h.uid===handUid);
 if(idx<0)return false;
 const info=card(p.hand[idx].id),cost=modifiedCost(info,player);
 if(p.energy<cost){toast('No tienes suficiente energía ('+cost+' ⚡).');return false;}
 if(!eligible(info,player)){toast('Esa carta ahora no tiene un objetivo válido.');return false;}
 const target=info.type==='unit'?'friend':info.target||'none';
 if(target!=='none'){
  if(!Number.isInteger(lane)||lane<0||lane>=RULES.lanes)return false;
  if(target==='friend'&&info.type==='unit'&&p.board[lane])return false;
  if(target==='friend'&&info.type==='spell'&&!p.board[lane])return false;
  if(target==='friendCancer'&&(!p.board[lane]||!p.board[lane].cancer))return false;
  if(target==='enemy'&&(!game.players[1-player].board[lane]||(info.effect==='cancer'&&game.players[1-player].board[lane].cancer)))return false;
  if(info.effect==='hyper'&&!p.board.some(u=>u&&u.attack>0))return false;
 }
 p.energy-=cost;p.hand.splice(idx,1);selected=null;
 lc(playerName(player)+' juega «'+info.name+'» ('+cost+' ⚡).');
 if(info.type==='unit'){
  const u=unitOf(info);p.board[lane]=u;
  if(info.effect==='stun'){const t=game.players[1-player].board[lane];if(t){t.stun++;announceAbility('🪵 SAHUR','Aturde a '+card(t.id).name,'debuff');}}
  if(info.effect==='block'){
    const alternatives=[lane-1,lane+1,0,1,2,3].filter(i=>i>=0&&i<RULES.lanes&&p.board[i]===null);
    if(alternatives.length){p.board[alternatives[0]]=unitOf(BLOCK);announceAbility('⛏️ STEVE','Coloca un bloque de tierra','summon');}
  }
  if(info.effect==='cheer'){
   let n=0;
   for(const x of [lane-1,lane+1])if(x>=0&&x<RULES.lanes&&p.board[x]){
    const t=p.board[x];t.health=Math.min(t.maxHealth,t.health+1);n++;
   }
   announceAbility('🤝 CONSEJOS DE ALONSO','Cura a '+n+' aliados vecinos','heal');
  }
  if(info.effect==='hustle'){
   p.energy=clamp(p.energy+1,0,RULES.maxEnergy);
   announceAbility('✊ PUÑOS ARRIBA','+1 energía','energy');
  }
 }else applyEffect(info,player,lane);
 render();if(game.mode==='p2p-host')sendGuestSnapshot();return true;
}
function giveCheese(p,lane){
 let served=0;
 for(const neighbor of [lane-1,lane+1]){
  if(neighbor<0||neighbor>=RULES.lanes||!p.board[neighbor])continue;
  const ally=p.board[neighbor];
  ally.health=Math.min(ally.maxHealth,ally.health+1);
  ally.cheese=Math.min(9,(ally.cheese||0)+1);
  served++;
 }
 if(served)announceAbility('🧀 QUESOS','La vaca cura a '+served+' vecinos','heal');
}
function effectivePower(player,lane,u){
 const p=game.players[player],enemy=game.players[1-player];
 const neighbor=[lane-1,lane+1].some(i=>i>=0&&i<RULES.lanes&&p.board[i]);
 let power=u.attack;
 if(u.id==='agustin51'&&neighbor){power++;announceAbility('🌭 SALCHICHÓN','Agustín51 ataca con +1 daño','attack');}
 if(u.id==='perrosanchez'&&neighbor){power++;announceAbility('🐕 COALICIÓN','+1 ataque por vecino aliado','attack');}
 if(enemy.board[lane]?.id==='kirk'){power--;announceAbility('🎙️ DEBATE','Charlie Kirk reduce el ataque de enfrente','debuff');}
 if(u.hex>0){
  power-=2;u.hex--;
  announceAbility('🔮 MALA SUERTE','-2 ataque; quedan '+u.hex+' turnos','debuff');
 }
 return Math.max(0,power);
}
function extraAttacks(player,lane,u){
 const p=game.players[player],foe=game.players[1-player];
 if(u.id==='trancas'){
  let hit=0;
  for(const n of [lane-1,lane+1])if(n>=0&&n<RULES.lanes&&foe.board[n]){
   damage(1-player,n,1,'Trancas y Barrancas');hit++;
  }
  if(hit)announceAbility('🐜 TRANCAS Y BARRANCAS','Golpean a '+hit+' vecinos','attack');
 }
 if(u.id==='tralalero'&&lane<RULES.lanes-1&&foe.board[lane+1]){
  damage(1-player,lane+1,1,'zapatillas supersónicas');
  announceAbility('🦈 TRALALERO TRALALA','Zapatillazo al carril de la derecha','attack');
 }
 if(u.id==='cow')giveCheese(p,lane);
 if(u.id==='capybara'&&p.board[lane]===u){
  const healed=Math.min(u.maxHealth-u.health,1);
  u.health=Math.min(u.maxHealth,u.health+1);
  if(healed)announceAbility('🦫 PAZ ABSOLUTA','Capibara recupera 1 vida','heal');
 }
}
function attackStep(player){
 lc('⚔ Atacan ÚNICAMENTE las cartas de '+playerName(player)+'.');
 const p=game.players[player],foe=game.players[1-player];
 const focus=p.focusTargetId,focusedLane=focus?foe.board.findIndex(u=>u?.uid===focus):-1;
 p.focusTargetId=null;
 if(focus&&focusedLane>=0){
  const target=foe.board[focusedLane];let volley=0,attackers=0;
  for(let lane=0;lane<RULES.lanes;lane++){
   const u=p.board[lane];if(!u)continue;
   if(u.stun>0){u.stun--;announceAbility('💫 ATURDIDO',card(u.id).name+' pierde su ataque','debuff');continue;}
   const power=effectivePower(player,lane,u);if(power<=0)continue;
   volley+=power;
   if(u.id==='grandma'&&u.slipper){volley+=2;u.slipper=false;announceAbility('🩴 CHANCLAZO','+2 de daño de la abuela','attack');}
   attackers++;extraAttacks(player,lane,u);
  }
  announceAbility('💍 HIPERGAMIA',attackers+' criaturas concentran '+volley+' daño en '+card(target.id).name,'attack');
  if(volley>0&&foe.board[focusedLane])damage(1-player,focusedLane,volley,'ataque concentrado');
  return;
 }
 if(focus)lc('El objetivo de Hipergamia desapareció; se ataca normalmente.');
 for(let lane=0;lane<RULES.lanes;lane++){
  if(game.finished)break;
  const u=p.board[lane];if(!u)continue;
  if(u.stun>0){u.stun--;announceAbility('💫 ATURDIDO',card(u.id).name+' pierde su ataque','debuff');continue;}
  const power=effectivePower(player,lane,u);
  if(power<=0)continue;
  const hits=u.id==='duck'?Array.from({length:power},()=>1):[power];
  for(const hit of hits){
   if(game.finished||p.board[lane]!==u)break;
   if(foe.board[lane]){
    let damageAmount=hit;
    if(u.id==='grandma'&&u.slipper){
     damageAmount+=2;u.slipper=false;
     announceAbility('🩴 CHANCLAZO','+2 daño de la abuela','attack');
    }
    damage(1-player,lane,damageAmount,card(u.id).name);
   }else scoreDirect(player,hit,card(u.id).name);
  }
  if(!game.finished&&p.board[lane]===u)extraAttacks(player,lane,u);
 }
}

function applyDiseases(player){
 const p=game.players[player];
 for(let i=0;i<RULES.lanes;i++){
  const u=p.board[i];if(!u||!u.cancer)continue;
  u.cancer--;
  if(u.cancer===0){lc('Cáncer termina su cuenta atrás. RIP '+card(u.id).name+'.');damage(player,i,999,'Cáncer');}
  else lc(card(u.id).name+' tiene '+u.cancer+' turno(s) antes de morir por Cáncer.');
 }
}
function pendingRemote(){
 remotePending=true;awaitingSeq=peer?.seq||0;
 clearTimeout(commandTimer);
 const expected=awaitingSeq;
 commandTimer=setTimeout(()=>{
  if(!peer||!remotePending||awaitingSeq!==expected)return;
  remotePending=false;
  showModal('SIN RESPUESTA <em>DEL ANFITRIÓN</em>','ONLINE','Tu jugada no se ha confirmado. Para evitar una partida desincronizada, crea otra sala.',[
   {label:'VOLVER AL MENÚ',action:'select-mode',primary:true}
  ]);
 },12000);
 render();
}
function clearPending(){
 remotePending=false;awaitingSeq=0;clearTimeout(commandTimer);commandTimer=null;
}
function endTurn(fromRemote=false){
 const remote=fromRemote===true;
 if(!game||game.finished||thinking||(modalOpen&&!remote))return false;
 if(game.mode==='p2p-guest'){
  if(remote||game.current!==1||remotePending||!peer?.connected||!peer.sendCommand({type:'end'}))return false;
  pendingRemote();return true;
 }
 if(game.mode==='p2p-host'&&((remote&&game.current!==1)||(!remote&&game.current!==0)))return false;
 const player=game.current;
 if(game.turns>=RULES.openingTurnsWithoutAttack)attackStep(player);
 else lc('⏳ Fase de preparación: sin ataques todavía.');
 if(!game.finished)applyDiseases(player);
 if(game.finished){render();if(game.mode==='p2p-host')sendGuestSnapshot();return true;}
 game.turns++;game.current=1-player;selected=null;
 enterTurn();
 if(game.mode==='local')showHandoff();
 render();
 if(game.mode==='p2p-host')sendGuestSnapshot();
 if(game.mode==='cpu'&&game.current===1)queueCPU();
 return true;
}
function win(player){
 game.finished=true;selected=null;thinking=false;
 render();
 showModal('VICTORIA DE '+playerName(player),'ESTO DEBERÍA SER ILEGAL','La balanza ha llegado a 5 puntos de ventaja. Se exige revancha.',[
  ...(game.mode==='p2p-host'?[{label:'NUEVA SALA PARA REVANCHA',action:'select-mode',primary:true}]:[{label:'REVANCHA',action:'rematch',primary:true}]),{label:'CAMBIAR MODO',action:'select-mode'}
 ]);
}
function showModal(title,kicker,text,buttons,extra=''){
 modalOpen=true;$('modal-title').innerHTML=title;$('modal-eyebrow').textContent=kicker;$('modal-text').textContent=text;$('modal-extra').innerHTML=extra;
 $('modal-buttons').innerHTML=buttons.map(b=>'<button class="btn '+(b.primary?'primary':'ghost')+'" data-modal="'+b.action+'">'+b.label+'</button>').join('');
 $('modal').classList.remove('hidden');
}
function closeModal(){modalOpen=false;$('modal').classList.add('hidden');}
function stopHello(){clearTimeout(helloTimer);helloTimer=null;}
function sendHelloUntilReady(){
 if(!peer?.connected||peer.role!=='guest'||game?.mode==='p2p-guest'){stopHello();return;}
 peer.send({type:'hello',protocol:1});
 stopHello();
 helloTimer=setTimeout(sendHelloUntilReady,900);
}
function showSetup(){
 stopHello();
 if(peer){peer.close();peer=null;}clearPending();game=null;selected=null;
 showModal('NO HAY <em>MARCHA ATRÁS.</em>','BIENVENIDO A BARBARIDADES','Elige cómo jugar: con un amigo por internet, en el mismo dispositivo o contra la CPU.',[
  {label:'ONLINE · SALA CON CÓDIGO',action:'online',primary:true},
  {label:'1V1 LOCAL · MISMO DISPOSITIVO',action:'local'},
  {label:'JUGAR CONTRA LA CPU',action:'cpu'}
 ],'<p class="secondary">Online: crea una sala y comparte 6 caracteres. Sin copiar textos interminables.</p>');
}
function showOnline(){
 showModal('DOS DISPOSITIVOS <em>UN DUELO</em>','ONLINE','Crea una sala y comparte el código de seis caracteres con tu amigo. La conexión es automática.',[
  {label:'CREAR SALA',action:'host-room',primary:true},
  {label:'UNIRSE CON CÓDIGO',action:'join-prompt'},
  {label:'VOLVER',action:'select-mode'}
 ],'<p class="secondary">Usamos WebRTC con señalización pública. Algunas redes bloquean las conexiones directas sin servidor TURN.</p>');
}
function resetPeer(){
 stopHello();
 if(peer){peer.close();peer=null;}
 clearPending();game=null;selected=null;lastSnapshot=0;version=0;
 revealedCards=[new Set(),new Set()];
 peer=new RoomPeer({onMessage:remoteMessage,onState:peerState});
 return peer;
}
function hostRoom(){
 try{
  const room=resetPeer(),code=createRoomCode();
  showModal('SALA <em>CREADA</em>','JUGADOR 1 · ANFITRIÓN',
   'Comparte el código. El duelo arrancará cuando entre tu amigo.',[
   {label:'CANCELAR',action:'select-mode'}
  ],'<div class="room-code">'+code+'</div>'+
  '<button class="btn ghost room-copy" data-room-copy="'+code+'">COPIAR CÓDIGO</button>'+
  '<button class="btn ghost room-copy" data-room-link="'+code+'">COPIAR ENLACE</button>'+
  '<p class="room-help">Esperando a un segundo jugador…</p>');
  room.host(code);
 }catch(error){toast(error.message);showOnline();}
}
function joinPrompt(code=''){
 const clean=normalizeRoomCode(code)||'';
 showModal('UNIRSE <em>A LA SALA</em>','JUGADOR 2',
  'Introduce el código que aparece en el dispositivo del anfitrión.',[
  {label:'CONECTAR',action:'join-by-code',primary:true},
  {label:'VOLVER',action:'online'}
 ],'<label class="signal-label" for="join-room-code">CÓDIGO DE SALA</label>'+
  '<input id="join-room-code" class="room-code-input" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="8" placeholder="ABC234" value="'+clean+'">');
}
function joinByCode(){
 const code=normalizeRoomCode($('join-room-code')?.value);
 if(!code){toast('Introduce seis caracteres válidos.');return;}
 try{
  const room=resetPeer();
  showModal('CONECTANDO <em>SALA</em>','JUGADOR 2 · '+code,
   'Buscando al anfitrión…',[
   {label:'CANCELAR',action:'select-mode'}
  ]);
  room.join(code);
 }catch(error){toast(error.message);joinPrompt(code);}
}
function peerState(status){
 if(!peer||peer.closed)return;
 if(status==='connected'){
  clearPending();
  if(peer.role==='guest'){
   showModal('CONEXIÓN <em>ESTABLECIDA</em>','ONLINE · JUGADOR 2',
    'Esperando a que se repartan las tres cartas iniciales…',[
    {label:'CANCELAR',action:'select-mode'}
   ]);
   sendHelloUntilReady();
  }else{
   showModal('RIVAL <em>CONECTADO</em>','ONLINE · JUGADOR 1',
    'Preparando el tablero para los dos jugadores…',[
    {label:'CANCELAR',action:'select-mode'}
   ]);
   peer.send({type:'ready',protocol:1}); // Host is listening before guest sends hello.
  }
  return;
 }
 if(['room-not-found','code-in-use','network-error','protocol-error','signaling-offline','disconnected'].includes(status)){
  clearPending();
  const msg={
   'room-not-found':'No se ha encontrado esa sala. Pide un nuevo código al anfitrión.',
   'code-in-use':'Ese código ya está ocupado.',
   'network-error':'La conexión o el servidor de salas no están disponibles.',
   'protocol-error':'El otro dispositivo ha enviado datos incompatibles.',
   'signaling-offline':'No se pudo contactar con el servidor de salas.',
   'disconnected':'El otro jugador se ha desconectado; la partida queda detenida.'
  }[status];
  showModal('CONEXIÓN <em>INTERRUMPIDA</em>','ONLINE',msg,[
   {label:'VOLVER AL MENÚ',action:'select-mode',primary:true}
  ]);
 }
}
function safeGuestSnapshot(){
 if(!game||game.mode!=='p2p-host')return null;
 return {mode:'p2p-guest',turns:game.turns,current:game.current,score:game.score,finished:game.finished,
  players:game.players.map((p,i)=>({
   energy:p.energy,board:p.board,
   hand:i===1?p.hand.map(h=>({...h})):Array.from({length:p.hand.length},()=>({id:null,uid:null})),
   freeTurn:p.freeTurn,focusTargetId:p.focusTargetId
  })),log:logs.slice()};
}
function sendGuestSnapshot(){
 if(game?.mode==='p2p-host'&&peer?.connected)
  peer.send({type:'snapshot',version:++version,ackSeq:peer.expectedSeq,state:safeGuestSnapshot()});
}
function remoteMessage(message){
 if(!message||typeof message!=='object'||!peer?.connected)return;
 if(message.type==='ready'&&message.protocol===1&&peer.role==='guest'&&!game){sendHelloUntilReady();return;}
 if(message.type==='hello'&&message.protocol===1&&peer.role==='host'){
  if(!game||game.mode!=='p2p-host'){newGame('p2p-host');sendGuestSnapshot();}
  return;
 }
 if(message.type==='snapshot'&&message.state?.mode==='p2p-guest'&&peer.role==='guest'){
  if(!Number.isSafeInteger(message.version)||message.version<=lastSnapshot)return;
  const next=message.state;
  if(!Array.isArray(next.players)||next.players.length!==2||!Array.isArray(next.players[0].hand)||!Array.isArray(next.players[1].hand))return;
  if(next.players[0].hand.some(h=>h.id!==null||h.uid!==null))return;
  if(![0,1].includes(next.current)||!Number.isInteger(next.turns)||next.turns<0||
   next.players.some(p=>!Array.isArray(p.board)||p.board.length!==RULES.lanes))return;
  stopHello();lastSnapshot=message.version;game=next;logs=Array.isArray(next.log)?next.log.slice(0,9):[];
  selected=null;thinking=false;
  if(!awaitingSeq||(Number.isInteger(message.ackSeq)&&message.ackSeq>=awaitingSeq))clearPending();
  closeModal();render();
  if(game.finished)showModal('FIN DE PARTIDA <em>ONLINE</em>','RESULTADO',
   'Ha ganado '+playerName(game.score>0?0:1)+'. Para la revancha cread otra sala.',[
   {label:'VOLVER AL MENÚ',action:'select-mode',primary:true}
  ]);
  return;
 }
 if(message.type==='reject'&&peer.role==='guest'){
  if(message.seq===awaitingSeq)toast('Jugada rechazada: '+(message.reason||'prueba otra jugada'));
  return;
 }
 if(message.type==='command'&&peer.role==='host'&&game?.mode==='p2p-host'){
  if(!isRemoteCommand(message,peer.expectedSeq+1)){
   peer.send({type:'reject',seq:message.seq,reason:'mensaje inválido'});
   sendGuestSnapshot();return;
  }
  peer.expectedSeq=message.seq;
  if(game.finished||game.current!==1){
   peer.send({type:'reject',seq:message.seq,reason:'no es tu turno'});
   sendGuestSnapshot();return;
  }
  const act=message.action;
  const accepted=act.type==='play'?playCard(1,act.uid,act.lane):endTurn(true);
  if(!accepted){
   peer.send({type:'reject',seq:message.seq,reason:'carta o turno no válido'});
   sendGuestSnapshot();
  }
 }
}
function showHandoff(){
 showModal('LE TOCA AL <em>'+playerName(game.current)+'</em>','PASAD EL DISPOSITIVO','El siguiente jugador puede ver su mano cuando pulse el botón.',[
 {label:'SOY '+playerName(game.current)+' · MOSTRAR MI MANO',action:'ready',primary:true}
 ]);
}
function showRules(){
 showModal('REGLAS <em>DEL ABSURDO</em>','MANUAL NO HOMOLOGADO','Juega criaturas en tus cuatro carriles y efectos para molestar, mejorar o robar. Puedes usar tantas cartas como te deje la energía.',[
 {label:'ENTENDIDO',action:'close',primary:true}
 ],'<p class="secondary">Empiezas con 3 cartas. Desde tu segundo turno propio robas 1 carta aleatoria. Recibes +3 energía al comenzar cada turno propio (máximo 10). La energía se guarda. Los dos primeros turnos globales no hay ataques. Después, al pulsar ACABAR TURNO, atacan solo tus criaturas: dañan a la criatura enfrente o anotan puntos si su carril está libre. La balanza termina con 5 de ventaja. Cáncer cuenta 3 finales de turno de la víctima, por lo que hay oportunidades de usar Quimio.</p>');
}
function showCollection(){
 const gallery=CARDS.map(c=>'<div class="collection-unit">'+cardHtml(c,null,'collection')+'</div>').join('');
 showModal('SERIE I <em>COMPLETA</em>','16 FORMAS DE PERDER LA DIGNIDAD','Estas son todas las cartas que pueden salir. El robo es completamente aleatorio.',[
 {label:'VOLVER AL DUELO',action:'close',primary:true},...(CANVA_SERIES_I_URL?[{label:'ABRIR CANVA',action:'canva'}]:[])
 ],'<div class="collection-grid">'+gallery+'</div>');
}
function queueCPU(){
 const thisSession=session;thinking=true;
 setTimeout(()=>{
  if(thisSession!==session||!game||game.finished||game.current!==1)return;
  thinking=false;
  // Simulated opponent: prioritizes available field positions and useful spells.
  for(let attempt=0;attempt<8;attempt++){
   const p=own(),usable=p.hand.map(h=>({h,info:card(h.id)})).filter(x=>modifiedCost(x.info,1)<=p.energy&&eligible(x.info,1));
   if(!usable.length)break;
   const units=usable.filter(x=>x.info.type==='unit'&&p.board.some(v=>v===null));
   const effects=usable.filter(x=>x.info.type==='spell');
   const candidate=(units.length&&Math.random()<.75)?random(units):(effects.length?random(effects):units.length?random(units):null);
   if(!candidate)break;
   let lane=null;
   if(candidate.info.type==='unit'){
    const empty=p.board.map((u,i)=>u===null?i:-1).filter(i=>i>=0);
    const prefer=empty.filter(i=>game.players[0].board[i]!==null);
    lane=random(prefer.length?prefer:empty);
   }else if(candidate.info.target==='enemy'){
    const targets=game.players[0].board.map((u,i)=>u&&!u.cancer?i:-1).filter(i=>i>=0);
    lane=targets.length?random(targets):null;
   }else if(candidate.info.target==='friendCancer'){
    const targets=p.board.map((u,i)=>u&&u.cancer?i:-1).filter(i=>i>=0);
    lane=targets.length?random(targets):null;
   }else if(candidate.info.target==='friend'){
    const targets=p.board.map((u,i)=>u&&game.players[0].board.some(v=>v&&v.attack>u.attack)?i:-1).filter(i=>i>=0);
    lane=targets.length?random(targets):null;
   }
   if(!playCard(1,candidate.h.uid,lane))break;
   if(game.finished)return;
  }
  setTimeout(()=>{if(thisSession!==session||!game||game.finished)return;endTurn();},500);
 },600);
}
function canvaUrl(c){
 if(!CANVA_SERIES_I_URL)return '';
 return CANVA_SERIES_I_URL; // Las 16 páginas están enlazadas por card.canvaPage; Canva no ofrece URL de imagen permanente.
}
function cardHtml(c,unit=null,variant='hand'){
 const stats=c.type==='unit'?'<div class="card-stats"><span>⚔ '+(unit?unit.attack:c.attack)+'</span><span>♥ '+(unit?unit.health:c.health)+'</span></div>':'<div class="spell-stats">EFECTO</div>';
 const view=game?.mode==='p2p-host'?0:game?.mode==='p2p-guest'?1:game?.current;
 const active=variant==='hand'&&game&&game.current===view&&!remotePending&&modifiedCost(c,view)<=game.players[view].energy&&eligible(c,view);
 const badges=unit?(unit.cancer?'<span class="status cancer">🦠 '+unit.cancer+'</span>':'')+(unit.stun?'<span class="status">💫</span>':'')+(unit.shield?'<span class="status">🕵️</span>':'')+(unit.cheese?'<span class="status">🧀'+unit.cheese+'</span>':''):'';
 const artIcon=unit&&c.id==='perry'?(unit.hat?'🕵️':'🦦'):c.icon;
 return '<div class="card-piece '+c.type+' '+variant+(variant==='hand'&&!active?' inactive':'')+'" style="--art-hue:'+c.hue+'">'
   +'<div class="card-top"><span class="card-heading">'+escapeHtml(c.name)+'</span><span class="cost-bubble">⚡'+(variant==='hand'&&game?modifiedCost(c,view):c.cost)+'</span></div>'
   +'<div class="card-art"><span class="art-spot"></span><span class="card-icon">'+artIcon+'</span><span class="art-rays">✷</span>'+(c.image?'<img class="card-art-image" src="'+c.image+'" alt="'+escapeHtml(c.alt)+'" loading="lazy" onerror="this.remove()">':'')+'</div>'
   +'<div class="card-kind">'+c.kind.toUpperCase()+' · SERIE I</div>'
   +(variant==='board'?'':('<p class="card-description">'+c.text+'</p>'))
   +'<div class="card-bottom">'+stats+badges+'</div></div>';
}
function renderSlots(target,player,isOwn){
 $(target).innerHTML=game.players[player].board.map((u,i)=>{
  const c=u?card(u.id):null;
  const targetType=selected?card(selected.id).type==='unit'?'friend':card(selected.id).target||'none':'none';
  const available=selected&&(targetType===(isOwn?'friend':'enemy')||(targetType==='friendCancer'&&isOwn))&&
     (c?targetType==='enemy'&&(card(selected.id).effect!=='cancer'||!u.cancer)||targetType==='friendCancer'&&u.cancer||targetType==='friend'&&card(selected.id).type==='spell':targetType==='friend'&&card(selected.id).type==='unit');
  return '<button class="lane '+(c?'filled':'empty')+' '+(available?'targetable':'')+'" data-side="'+(isOwn?'own':'enemy')+'" data-lane="'+i+'" aria-label="'+(c?c.name:'Carril '+(i+1)+' libre')+'">'
   +(c?cardHtml(c,u,'board'):'<div class="empty-mark"><b>＋</b><small>'+String(i+1).padStart(2,'0')+'</small></div>')
   +'</button>';
 }).join('');
}
function render(){
 if(!game)return;
 const view=game.mode==='p2p-host'?0:game.mode==='p2p-guest'?1:game.current;
 const me=game.players[view],rival=game.players[1-view];
 const myTurn=game.current===view;
 $('own-name').textContent=playerName(view)+(game.mode==='cpu'&&view===1?' · CPU':'');
 $('enemy-name').textContent=playerName(1-view);
 $('own-avatar').textContent='0'+(view+1);$('enemy-avatar').textContent='0'+(2-view);
 $('own-hand-count').textContent=me.hand.length+' cartas en mano';$('enemy-hand').textContent=rival.hand.length+' cartas en mano';
 $('own-energy').textContent=me.energy;$('enemy-energy').textContent=rival.energy;
 $('hand-count').textContent='('+me.hand.length+')';
 const nextRound=Math.floor(game.turns/2)+1;
 $('round').textContent='R'+nextRound+' · J'+(game.current+1)+(game.turns<2?' · PREP.':' · COMBATE');
 const ranges=Array.from({length:11},(_,i)=>i-5);
 $('scale').innerHTML=ranges.map(v=>'<span class="'+(v===0?'center ':v>0&&game.score>=v?'p1 ':v<0&&game.score<=v?'p2 ':'')+'"></span>').join('');
 $('scale-label').textContent=game.score===0?'BALANZA EQUILIBRADA':(game.score>0?'JUGADOR 1':'JUGADOR 2')+' VA GANANDO POR '+Math.abs(game.score);
 $('log').innerHTML=logs.map(x=>'<li>'+escapeHtml(x)+'</li>').join('');
 renderSlots('enemy-lanes',1-view,false);renderSlots('own-lanes',view,true);
 const cpuThinking=game.mode==='cpu'&&game.current===1;
 const waiting=(game.mode==='p2p-host'||game.mode==='p2p-guest')&&!myTurn;
 const handCount=me.hand.length;
 const mayReveal=!modalOpen&&!cpuThinking&&!game.finished;
 const justDealt=new Set();
 if(mayReveal){
  for(const h of me.hand)if(h.uid&&!revealedCards[view].has(h.uid)){
   revealedCards[view].add(h.uid);
   justDealt.add(h.uid);
  }
 }
 $('hand').innerHTML=cpuThinking?'<div class="no-cards">La CPU está pensando una atrocidad...</div>':
 me.hand.map((h,i)=>{
  const info=card(h.id);
  const isNew=justDealt.has(h.uid);
  const progress=handCount>1?i/(handCount-1):.5;
  const offset=(progress*100).toFixed(2);
  const styles='--pos:'+offset+'%;--shift:-'+offset+'%;--stack:'+(i+1)+';--deal-delay:'+(isNew?Math.min(i*115,800):0)+'ms';
  return '<button class="hand-card '+(selected?.uid===h.uid?'selected ':'')+(isNew?'is-dealt':'')+
   '" style="'+styles+'" data-hand="'+h.uid+'" title="'+escapeHtml(info.name+': '+info.text)+
   '" aria-label="'+escapeHtml(info.name+'; '+info.text)+'">'+cardHtml(info,null,'hand')+'</button>';
 }).join('');
 if(!me.hand.length&&!cpuThinking)$('hand').innerHTML='<div class="no-cards">No tienes cartas en la mano. Robarás al empezar tu siguiente turno.</div>';
 $('cancel').hidden=!selected;
 $('end-turn').disabled=modalOpen||thinking||game.finished||cpuThinking||waiting||remotePending;
 $('instruction').textContent=selected?card(selected.id).name+': '+card(selected.id).text:'Toca una carta para ver su efecto y jugarla.';
 $('hint').textContent=remotePending?'CONFIRMANDO JUGADA…':waiting?'ES EL TURNO DEL RIVAL':game.turns<2?'PREPARACIÓN: NO HAY ATAQUES':'AL ACABAR, SOLO ATACAN TUS CARTAS';
 const focus=selected?card(selected.id):CARDS[0]; // Evita que la vista previa salte de carta cada vez que renderizamos.
 $('featured-name').textContent=focus.name;
 $('featured').innerHTML=cardHtml(focus,null,'feature-card');
 $('featured-desc').textContent=focus.text;
 const link=$('canva');link.hidden=!CANVA_SERIES_I_URL;if(CANVA_SERIES_I_URL)link.href=canvaUrl(focus);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
function chooseHand(uidValue){
 if(!game||modalOpen||thinking||game.finished||remotePending||game.mode==='cpu'&&game.current===1)return;
 if(game.mode==='p2p-host'&&game.current!==0||game.mode==='p2p-guest'&&game.current!==1)return;
 if(selected?.uid===uidValue){selected=null;render();return;}
 const activePlayer=game.mode==='p2p-guest'?1:game.current;
 const h=game.players[activePlayer].hand.find(x=>x.uid===uidValue);if(!h)return;
 const info=card(h.id),cost=modifiedCost(info,activePlayer);
 if(cost>game.players[activePlayer].energy){toast('Necesitas '+cost+' de energía.');return;}
 if(!eligible(info,activePlayer)){toast('No hay objetivos válidos para esta carta.');return;}
 if(info.type==='spell'&&!info.target){requestPlay(uidValue);return;}
 selected=h;render();
}
function requestPlay(uidValue,lane=null){
 if(game?.mode==='p2p-guest'){
  if(remotePending||!peer?.sendCommand({type:'play',uid:uidValue,lane})){toast('Sin conexión o esperando respuesta.');return false;}
  selected=null;pendingRemote();return true;
 }
 return playCard(game.current,uidValue,lane);
}
function chooseLane(side,lane){
 if(!selected||modalOpen||thinking||game.finished)return;
 const info=card(selected.id);
 const target=info.type==='unit'?'friend':info.target;
 if(side==='own'&&(target==='friend'||target==='friendCancer')||side==='enemy'&&target==='enemy'){
  if(!requestPlay(selected.uid,lane))toast('No puedes usar esa carta ahí.');
 }else toast('Selecciona un objetivo del campo correcto.');
}
document.addEventListener('click',event=>{
 const copy=event.target.closest('[data-room-copy]');if(copy){if(navigator.clipboard?.writeText)navigator.clipboard.writeText(copy.dataset.roomCopy).then(()=>toast('Código copiado')).catch(()=>toast('Anota el código mostrado.'));else toast('Anota el código mostrado.');return;}
 const link=event.target.closest('[data-room-link]');if(link){const url=location.origin+location.pathname+'?room='+encodeURIComponent(link.dataset.roomLink);if(navigator.clipboard?.writeText)navigator.clipboard.writeText(url).then(()=>toast('Enlace copiado')).catch(()=>toast('Copia el código manualmente.'));else toast('Copia el código manualmente.');return;}
 const hand=event.target.closest('[data-hand]');if(hand){chooseHand(hand.dataset.hand);return;}
 const lane=event.target.closest('[data-lane]');if(lane){chooseLane(lane.dataset.side,Number(lane.dataset.lane));return;}
 const action=event.target.closest('[data-modal]');if(action){
  const a=action.dataset.modal;
  if(a==='local'||a==='cpu')newGame(a);
  if(a==='ready'||a==='close') {closeModal();render();}
  if(a==='online')showOnline();
  if(a==='host-room')hostRoom();
  if(a==='join-prompt')joinPrompt();
  if(a==='join-by-code')joinByCode();
  if(a==='rematch')newGame(game?.mode==='p2p-host'||game?.mode==='p2p-guest'?'local':game?.mode||'local');
  if(a==='select-mode')showSetup();
  if(a==='canva'&&CANVA_SERIES_I_URL)window.open(CANVA_SERIES_I_URL,'_blank','noopener');
 }
});
$('end-turn').addEventListener('click',()=>endTurn(false));
$('cancel').addEventListener('click',()=>{selected=null;render();});
$('rules').addEventListener('click',showRules);
$('collection').addEventListener('click',showCollection);
$('reset').addEventListener('click',showSetup);
const invited=typeof location==='undefined'?null:normalizeRoomCode(new URLSearchParams(location.search).get('room'));
if(invited)joinPrompt(invited);else showSetup();
