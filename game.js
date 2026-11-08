import {CARDS,CARDS_BY_ID,BLOCK,RULES,CANVA_SERIES_I_URL} from './cards.js';
import {ManualPeer,isRemoteCommand} from './remote.js';
const $=id=>document.getElementById(id);
const random=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let session=0,game=null,selected=null,logs=[],modalOpen=true,thinking=false;
// UIDs already revealed on-screen. Newly visible cards animate exactly once.
let revealedCards=[new Set(),new Set()];
let peer=null,remotePending=false,lastSnapshot=0,version=0;
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const draw=()=>({uid:uid(),id:random(CARDS).id});
const playerName=i=>'JUGADOR '+(i+1);
const card=id=>CARDS_BY_ID[id]||BLOCK;
const own=()=>game.players[game.current];
const other=()=>game.players[1-game.current];
const lc=(text)=>{logs.unshift(text);logs=logs.slice(0,9);};
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2400);}
function newGame(mode){
 if(peer&&mode!=='p2p-host'){peer.close();peer=null;}
 session++;selected=null;thinking=false;logs=[];modalOpen=false;remotePending=false;lastSnapshot=0;version=0;
 revealedCards=[new Set(),new Set()];
 game={mode,current:0,turns:0,score:0,finished:false,players:[0,1].map(()=>({energy:0,hand:Array.from({length:RULES.startingHand},draw),board:Array(RULES.lanes).fill(null),freeTurn:false,focusTargetId:null}))};
 lc('Empieza el duelo. La dignidad queda fuera del tablero.');
 enterTurn();closeModal();render();
}
function enterTurn(){
 const p=own();
 p.freeTurn=false;
 p.energy=clamp(p.energy+RULES.energyPerTurn,0,RULES.maxEnergy);
 for(let i=0;i<RULES.lanes;i++){
  const u=p.board[i];
  if(!u)continue;
  if(u.id==='raul')p.energy=clamp(p.energy+1,0,RULES.maxEnergy);
  if(u.id==='perry'){
   const lost=u.maxHealth-u.health;
   u.hat=!u.hat;
   u.attack=u.hat?2:4;
   u.maxHealth=u.hat?3:2;
   u.health=Math.max(1,u.maxHealth-lost);
   u.shield=u.hat?1:0;
   lc('Perry se '+(u.hat?'pone el gorro de agente (2/3 y protección).':'quita el gorro (4/2 y sin protección).'));
   if(u.health<=0)damage(game.current,i,999,'crisis de identidad');
  }
 }
 // Each player starts with exactly 3 cards; the first turn does not grant a fourth.
 // Beginning with their second own turn, draw one independent random card.
 const draws=game.turns<RULES.openingTurnsWithoutAttack?0:RULES.drawPerTurn;
 let drawn=0;
 for(let i=0;i<draws;i++)if(p.hand.length<RULES.maxHand){p.hand.push(draw());drawn++;}
 lc(playerName(game.current)+' recibe energía'+(drawn?' y roba '+drawn+' carta'+(drawn===1?'':'s'):' (mano inicial: 3 cartas)')+'.');
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
 return true;
}
function unitOf(info){
 return {uid:uid(),id:info.id,attack:info.attack,health:info.health,maxHealth:info.health,cancer:0,stun:0,shield:info.effect==='agent'?1:0,slipper:true,hat:info.id==='perry',cheese:0};
}
function isShielded(player,info){
 if(!['cancer','taxoffice','sixseven'].includes(info.effect))return false;
 const agent=game.players[1-player].board.find(u=>u?.id==='perry'&&u.shield>0);
 if(!agent)return false;
 agent.shield=0;lc('¡Perry ha interceptado el efecto «'+info.name+'»!');return true;
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
   const rival=game.players[1-boardOwner].board[lane];
   if(rival){lc('¡Pereira Castor contraataca con sus PALETAS!');damage(1-boardOwner,lane,2,'paletazo post mortem');}
 }
}
function applyEffect(info,player,lane){
 const p=game.players[player],foe=game.players[1-player];
 if(isShielded(player,info))return;
 switch(info.effect){
 case 'cancer': {
  const t=foe.board[lane];if(t){t.cancer=3;lc('Cáncer infecta a '+card(t.id).name+': 3 turnos para Quimio.');}break;
 }
 case 'chemo': {
  const t=p.board[lane];if(t){t.cancer=0;lc('Quimio elimina Cáncer, pero debilita al paciente.');damage(player,lane,1,'Quimio');}break;
 }
 case 'taxoffice':{
  const seized=Math.min(2,foe.energy);foe.energy-=seized;p.energy=clamp(p.energy+1,0,RULES.maxEnergy);
  lc('Agencia Tributaria confisca '+seized+' ⚡ y devuelve una migaja.');break;
 }
 case 'pirate':{
  p.freeTurn=true;
  lc('¡TOKEN PIRATA! Todas las cartas que juegues durante este turno cuestan 0 ⚡.');
  break;
 }
 case 'sixseven':{
  const valid=foe.board.map((x,i)=>x?i:-1).filter(i=>i>=0);
  if(Math.random()<.5&&valid.length){const l=random(valid);lc('SIX: ¡6 de daño a una criatura aleatoria!');damage(1-player,l,6,'SIX');}
  else{p.energy=clamp(p.energy+7,0,RULES.maxEnergy);lc('SEVEN: ¡+7 de energía! SIX SEVEEEEN.');}
  break;
 }
 case 'hyper':{
  const t=foe.board[lane];
  if(t){
   p.focusTargetId=t.uid;
   lc('¡HIPERGAMIA! Todas tus criaturas apuntarán a '+card(t.id).name+' en su próximo ataque.');
  }
  break;
 }
 }
}
function playCard(player,handUid,lane=null){
 if(!game||game.finished||game.current!==player)return false;
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
  if(info.effect==='stun'){const t=game.players[1-player].board[lane];if(t){t.stun=1;lc('¡'+card(t.id).name+' queda aturdido!');}}
  if(info.effect==='block'){
    const alternatives=[lane-1,lane+1,0,1,2,3].filter(i=>i>=0&&i<RULES.lanes&&p.board[i]===null);
    if(alternatives.length)p.board[alternatives[0]]=unitOf(BLOCK);
  }
 }else applyEffect(info,player,lane);
 render();return true;
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
 if(served)lc('🧀 La vaca que ríe reparte '+served+' queso(s) curativos a sus vecinos.');
}
function attackStep(player){
 lc('⚔ Atacan ÚNICAMENTE las cartas de '+playerName(player)+'.');
 const p=game.players[player],foe=game.players[1-player];
 const focus=p.focusTargetId,focusedLane=focus?foe.board.findIndex(u=>u?.uid===focus):-1;
 p.focusTargetId=null;
 if(focus&&focusedLane>=0){
  const target=foe.board[focusedLane];
  let volley=0,attackers=0;
  for(let lane=0;lane<RULES.lanes;lane++){
   const u=p.board[lane];
   if(!u||u.attack<=0)continue;
   if(u.stun>0){u.stun--;lc(card(u.id).name+' está aturdido y no dispara.');continue;}
   volley+=u.id==='duck'?3:u.attack;
   if(u.id==='grandma'&&u.slipper){volley+=2;u.slipper=false;}
   if(u.id==='cow')giveCheese(p,lane);
   attackers++;
  }
  lc('🎯 HIPERGAMIA: '+attackers+' criaturas concentran '+volley+' de daño en '+card(target.id).name+'.');
  if(volley>0)damage(1-player,focusedLane,volley,'ataque concentrado');
  return;
 }
 if(focus)lc('El objetivo de Hipergamia desapareció antes del ataque; se ataca normalmente.');
 for(let lane=0;lane<RULES.lanes;lane++){
  if(game.finished)break;
  const u=p.board[lane];if(!u)continue;
  if(u.stun>0){u.stun--;lc(card(u.id).name+' pierde el ataque por aturdimiento.');continue;}
  if(u.attack<=0)continue;
  const hits=u.id==='duck'?[1,1,1]:[u.attack];
  for(let hit of hits){
   if(game.finished||!p.board[lane]||p.board[lane].uid!==u.uid)break;
   const t=foe.board[lane];
   if(t){
    let d=hit;
    if(u.id==='grandma'&&u.slipper){d+=2;u.slipper=false;lc('¡CHANCLAZO SUPREMO!');}
    damage(1-player,lane,d,card(u.id).name);
   }else scoreDirect(player,hit,card(u.id).name);
  }
  if(game.finished||!p.board[lane]||p.board[lane].uid!==u.uid)continue;
  if(u.id==='trancas')for(const neighbor of [lane-1,lane+1])if(neighbor>=0&&neighbor<RULES.lanes&&foe.board[neighbor])damage(1-player,neighbor,1,'ataque en pareja');
  if(u.id==='cow')giveCheese(p,lane);
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
function endTurn(fromRemote=false){
 if(!game||game.finished||modalOpen&&!fromRemote||thinking)return;
 if(game.mode==='p2p-guest'){
  if(game.current!==1||remotePending||!peer?.sendCommand({type:'end'}))return;
  remotePending=true;render();return;
 }
 if(game.mode==='p2p-host'&&game.current!==0&&!fromRemote)return;
 const player=game.current;
 if(game.turns>=RULES.openingTurnsWithoutAttack)attackStep(player);
 else lc('⏳ Fase de preparación: sin ataques todavía.');
 if(game.finished){render();return;}
 applyDiseases(player);
 if(game.finished){render();return;}
 game.turns++;game.current=1-player;selected=null;
 enterTurn();
 // Hide the next player's cards until the pass-device screen is dismissed.
 // This also prevents the initial draw animation from running behind the modal.
 if(game.mode==='local')showHandoff();
 render();
 if(game.mode==='cpu'&&game.current===1)queueCPU();
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
function showSetup(){
 if(peer){peer.close();peer=null;}remotePending=false;
 showModal('NO HAY <em>MARCHA ATRÁS.</em>','BIENVENIDO A BARBARIDADES','Elige cómo probar la Serie I: mismo dispositivo, contra la CPU o entre dos dispositivos con conexión P2P.',[
 {label:'1V1 · DOS DISPOSITIVOS (P2P)',action:'online',primary:true},
 {label:'1V1 LOCAL · MISMO DISPOSITIVO',action:'local'},
 {label:'JUGAR CONTRA LA CPU',action:'cpu'}
 ],'<p class="secondary">El modo P2P usa WebRTC sin servidor de salas: tendrás que intercambiar una oferta y una respuesta con tu amigo. Algunas redes móviles no permiten conexión directa.</p>');
}
function showOnline(){
 showModal('DOS DISPOSITIVOS <em>UN DUELO.</em>','P2P EXPERIMENTAL','Necesitáis abrir esta web en ambos dispositivos y compartir dos códigos por mensaje. El anfitrión controla el estado de la partida.',[
 {label:'CREAR SALA (JUGADOR 1)',action:'host-offer',primary:true},
 {label:'UNIRSE (JUGADOR 2)',action:'join-room'},
 {label:'VOLVER',action:'select-mode'}
 ],'<p class="secondary">P2P WebRTC cifrado. Puede exponer la dirección IP pública al amigo; no hay servidor TURN ni reconexión automática. No compartas códigos con desconocidos.</p>');
}
function peerState(status){
 if(status==='connected'){
  remotePending=false;
  if(game?.mode==='p2p-host'){closeModal();sendGuestSnapshot();render();}
  else if(game?.mode==='p2p-guest'){closeModal();render();}
  else toast('P2P conectado. Esperando partida.');
 }
 if(['failed','disconnected','error','protocol-error'].includes(status)){
  remotePending=true;
  showModal('CONEXIÓN <em>INTERRUMPIDA</em>','P2P · '+status.toUpperCase(),'No se puede continuar esta partida sin el otro jugador. Volved a crear una sala.',[{label:'VOLVER AL MENÚ',action:'select-mode',primary:true}]);
 }
}
function safeGuestSnapshot(){
 if(!game||game.mode!=='p2p-host')return null;
 return {mode:'p2p-guest',turns:game.turns,current:game.current,score:game.score,finished:game.finished,
 players:game.players.map((p,i)=>({
  energy:p.energy,board:p.board,hand:i===1?p.hand.map(h=>({...h})):Array.from({length:p.hand.length},()=>({id:null,uid:null})),
  freeTurn:p.freeTurn,focusTargetId:p.focusTargetId
 })),log:logs.slice()};
}
function sendGuestSnapshot(){
 if(game?.mode==='p2p-host'&&peer?.channel?.readyState==='open')
  peer.send({type:'snapshot',version:++version,state:safeGuestSnapshot()});
}
function remoteMessage(message){
 if(!message||typeof message!=='object')return;
 if(message.type==='snapshot'&&message.state?.mode==='p2p-guest'&&peer&&game?.mode!=='p2p-host'){
  if(!Number.isSafeInteger(message.version)||message.version<=lastSnapshot)return;
  const next=message.state;
  if(!Array.isArray(next.players)||next.players.length!==2||!Array.isArray(next.players[0].hand)||!Array.isArray(next.players[1].hand))return;
  if(next.players[0].hand.some(h=>h.id!==null||h.uid!==null))return; // No private cards of host.
  if(![0,1].includes(next.current)||next.players.some(p=>!Array.isArray(p.board)||p.board.length!==4))return;
  lastSnapshot=message.version;game=next;logs=Array.isArray(next.log)?next.log.slice(0,9):[];
  selected=null;remotePending=false;thinking=false;closeModal();render();
  if(game.finished)showModal('FIN DE PARTIDA <em>P2P</em>','RESULTADO','Ha ganado '+playerName(game.score>0?0:1)+'. Para la revancha, cread otra sala.',[{label:'VOLVER AL MENÚ',action:'select-mode',primary:true}]);
  return;
 }
 if(message.type==='command'&&game?.mode==='p2p-host'&&peer&&isRemoteCommand(message,peer.expectedSeq+1)){
  peer.expectedSeq=message.seq;
  if(game.finished||game.current!==1){sendGuestSnapshot();return;}
  const action=message.action;
  if(action.type==='play')playCard(1,action.uid,action.lane);
  if(action.type==='end')endTurn(true);
  sendGuestSnapshot(); // ACK even when move is invalid.
 }
}
async function hostOffer(){
 try{
  newGame('p2p-host');
  showModal('CREANDO <em>SALA...</em>','P2P','Recopilando candidatos de conexión. No cierres esta pantalla.',[{label:'CANCELAR',action:'select-mode'}]);
  peer=new ManualPeer({onMessage:remoteMessage,onState:peerState});
  const code=await peer.createOffer();
  showModal('OFERTA <em>PREPARADA</em>','PASO 1 / ANFITRIÓN','Copia esta oferta y envíasela a tu amigo. Cuando te devuelva su respuesta, pégala debajo.',[
   {label:'APLICAR RESPUESTA',action:'apply-answer',primary:true},{label:'CANCELAR',action:'select-mode'}
  ],'<label class="signal-label">TU OFERTA · ENVÍASELA A TU AMIGO</label><textarea class="signal-code" id="host-offer-code" readonly></textarea><button class="btn ghost signal-copy" data-copy="host-offer-code">COPIAR OFERTA</button><label class="signal-label">RESPUESTA DEL INVITADO</label><textarea class="signal-code" id="host-answer-code" placeholder="Pega aquí la respuesta..."></textarea>');
  $('host-offer-code').value=code;
 }catch(error){toast(error.message);showOnline();}
}
function joinPrompt(){
 showModal('UNIRSE <em>A LA SALA</em>','PASO 1 / INVITADO','Pide al anfitrión su oferta y pégala aquí. Después obtendrás tu respuesta.',[
  {label:'GENERAR RESPUESTA',action:'make-answer',primary:true},{label:'VOLVER',action:'online'}
 ],'<label class="signal-label">OFERTA DEL ANFITRIÓN</label><textarea class="signal-code" id="guest-offer-code" placeholder="Pega aquí la oferta que te han enviado"></textarea>');
}
async function makeAnswer(){
 try{
  const code=$('guest-offer-code')?.value?.trim();
  if(!code)throw Error('Pega primero la oferta.');
  if(peer)peer.close();
  peer=new ManualPeer({onMessage:remoteMessage,onState:peerState});
  const answer=await peer.acceptOffer(code);
  showModal('RESPUESTA <em>LISTA</em>','PASO 2 / INVITADO','Envía este código al anfitrión. Cuando lo pegue, la partida comenzará automáticamente.',[
   {label:'CANCELAR',action:'select-mode'}
  ],'<label class="signal-label">TU RESPUESTA · ENVÍALA AL ANFITRIÓN</label><textarea class="signal-code" id="guest-answer-code" readonly></textarea><button class="btn ghost signal-copy" data-copy="guest-answer-code">COPIAR RESPUESTA</button>');
  $('guest-answer-code').value=answer;
 }catch(error){toast(error.message);joinPrompt();}
}
async function applyAnswer(){
 try{
  const code=$('host-answer-code')?.value?.trim();
  if(!code)throw Error('Pega primero la respuesta del invitado.');
  await peer.acceptAnswer(code);
  showModal('CONECTANDO <em>LOS DOS</em>','P2P','Estableciendo un canal directo y cifrado. Si falla la conexión, probad en otra red.',[{label:'CANCELAR',action:'select-mode'}]);
 }catch(error){toast(error.message);}
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
 $('round').textContent='RONDA '+nextRound+(game.turns<2?' · PREPARACIÓN':' · COMBATE');
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
 $('hint').textContent=waiting?'ES EL TURNO DE TU RIVAL · ESPERA':remotePending?'ESPERANDO CONFIRMACIÓN DEL ANFITRIÓN':game.turns<2?'No se ataca durante los dos primeros turnos.':'Tus criaturas atacarán al acabar tu turno.';
 if(game.mode==='p2p-host')sendGuestSnapshot();
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
  if(!peer?.sendCommand({type:'play',uid:uidValue,lane})){toast('Conexión P2P no disponible.');return false;}
  remotePending=true;selected=null;render();return true;
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
 const copy=event.target.closest('[data-copy]');if(copy){const area=$(copy.dataset.copy);if(area){navigator.clipboard.writeText(area.value).then(()=>toast('Código copiado')).catch(()=>{area.select();document.execCommand('copy');toast('Código copiado');});}return;}
 const hand=event.target.closest('[data-hand]');if(hand){chooseHand(hand.dataset.hand);return;}
 const lane=event.target.closest('[data-lane]');if(lane){chooseLane(lane.dataset.side,Number(lane.dataset.lane));return;}
 const action=event.target.closest('[data-modal]');if(action){
  const a=action.dataset.modal;
  if(a==='local'||a==='cpu')newGame(a);
  if(a==='ready'||a==='close') {closeModal();render();}
  if(a==='online')showOnline();
  if(a==='host-offer')hostOffer();
  if(a==='join-room')joinPrompt();
  if(a==='make-answer')makeAnswer();
  if(a==='apply-answer')applyAnswer();
  if(a==='rematch')newGame(game?.mode==='p2p-host'||game?.mode==='p2p-guest'?'local':game?.mode||'local');
  if(a==='select-mode')showSetup();
  if(a==='canva'&&CANVA_SERIES_I_URL)window.open(CANVA_SERIES_I_URL,'_blank','noopener');
 }
});
$('end-turn').addEventListener('click',endTurn);
$('cancel').addEventListener('click',()=>{selected=null;render();});
$('rules').addEventListener('click',showRules);
$('collection').addEventListener('click',showCollection);
$('reset').addEventListener('click',showSetup);
showSetup();
