import {CARDS,CARDS_BY_ID,BLOCK,RULES,CANVA_SERIES_I_URL} from './cards.js';
const $=id=>document.getElementById(id);
const random=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let session=0,game=null,selected=null,logs=[],modalOpen=true,thinking=false;
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const draw=()=>({uid:uid(),id:random(CARDS).id});
const playerName=i=>'JUGADOR '+(i+1);
const card=id=>CARDS_BY_ID[id]||BLOCK;
const own=()=>game.players[game.current];
const other=()=>game.players[1-game.current];
const lc=(text)=>{logs.unshift(text);logs=logs.slice(0,9);};
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('visible'),2400);}
function newGame(mode){
 session++;selected=null;thinking=false;logs=[];modalOpen=false;
 game={mode,current:0,turns:0,score:0,finished:false,players:[0,1].map(()=>({energy:0,hand:Array.from({length:RULES.startingHand},draw),board:Array(RULES.lanes).fill(null)}))};
 lc('Empieza el duelo. La dignidad queda fuera del tablero.');
 enterTurn();closeModal();render();
}
function enterTurn(){
 const p=own();p.energy=clamp(p.energy+RULES.energyPerTurn,0,RULES.maxEnergy);
 for(const u of p.board)if(u?.id==='raul')p.energy=clamp(p.energy+1,0,RULES.maxEnergy);
 for(let i=0;i<RULES.drawPerTurn;i++)if(p.hand.length<RULES.maxHand)p.hand.push(draw());
 lc(playerName(game.current)+' recibe energía y roba una carta.');
}
function modifiedCost(info,player){
 return info.cost+(info.cost>=4&&game.players[1-player].board.some(u=>u?.id==='inspector')?1:0);
}
function eligible(info,player){
 const p=game.players[player],foe=game.players[1-player];
 if(info.type==='unit')return p.board.some(u=>u===null);
 if(info.effect==='cancer')return foe.board.some(u=>u&&!u.cancer);
 if(info.effect==='chemo')return p.board.some(u=>u&&u.cancer);
 if(info.effect==='hyper')return p.board.some(u=>u&&foe.board.some(v=>v&&v.attack>u.attack));
 if(info.effect==='pirate')return foe.hand.length>0&&p.hand.length<RULES.maxHand;
 return true;
}
function unitOf(info){
 return {uid:uid(),id:info.id,attack:info.attack,health:info.health,maxHealth:info.health,cancer:0,stun:0,shield:info.effect==='agent'?1:0,slipper:true};
}
function isShielded(player,info){
 if(!['cancer','taxoffice','pirate','sixseven'].includes(info.effect))return false;
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
   if(rival){lc('Pereira Castor se venga desde el más allá.');damage(1-boardOwner,lane,2,'venganza del castor');}
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
  if(foe.hand.length){const index=Math.floor(Math.random()*foe.hand.length);const [stolen]=foe.hand.splice(index,1);p.hand.push(stolen);lc('¡Token pirata robó una carta de la mano rival!');}break;
 }
 case 'sixseven':{
  const valid=foe.board.map((x,i)=>x?i:-1).filter(i=>i>=0);
  if(Math.random()<.5&&valid.length){const l=random(valid);lc('SIX: ¡6 de daño a una criatura aleatoria!');damage(1-player,l,6,'SIX');}
  else{p.energy=clamp(p.energy+7,0,RULES.maxEnergy);lc('SEVEN: ¡+7 de energía! SIX SEVEEEEN.');}
  break;
 }
 case 'hyper':{
  const t=p.board[lane];if(t){t.attack+=2;t.health+=2;t.maxHealth+=2;lc(card(t.id).name+' ha ascendido socialmente (+2/+2).');}break;
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
  if(target==='enemy'&&(!game.players[1-player].board[lane]||game.players[1-player].board[lane].cancer))return false;
  if(info.effect==='hyper'&&!game.players[1-player].board.some(e=>e&&e.attack>p.board[lane].attack))return false;
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
function attackStep(player){
 lc('⚔ Atacan las cartas de '+playerName(player)+'.');
 const p=game.players[player];
 for(let lane=0;lane<RULES.lanes;lane++){
  if(game.finished)break;
  const u=p.board[lane];if(!u)continue;
  if(u.stun>0){u.stun--;lc(card(u.id).name+' pierde el ataque por aturdimiento.');continue;}
  if(u.attack<=0)continue;
  const hits=u.id==='duck'?[1,1,1]:[u.attack];
  for(let hit of hits){
   if(game.finished||!p.board[lane]||p.board[lane].uid!==u.uid)break;
   const t=game.players[1-player].board[lane];
   if(t){
    let d=hit;if(u.id==='grandma'&&u.slipper){d+=2;u.slipper=false;lc('¡CHANCLAZO SUPREMO!');}
    damage(1-player,lane,d,card(u.id).name);
   }else scoreDirect(player,hit,card(u.id).name);
  }
  if(game.finished||!p.board[lane]||p.board[lane].uid!==u.uid)continue;
  if(u.id==='trancas')for(const neighbor of [lane-1,lane+1])if(neighbor>=0&&neighbor<RULES.lanes&&game.players[1-player].board[neighbor])damage(1-player,neighbor,1,'ataque en pareja');
  if(u.id==='cow')for(const neighbor of [lane-1,lane+1])if(neighbor>=0&&neighbor<RULES.lanes&&p.board[neighbor]){const x=p.board[neighbor];x.health=Math.min(x.maxHealth,x.health+1);}
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
function endTurn(){
 if(!game||game.finished||modalOpen||thinking)return;
 const player=game.current;
 if(game.turns>=RULES.openingTurnsWithoutAttack)attackStep(player);
 else lc('⏳ Fase de preparación: sin ataques todavía.');
 if(game.finished){render();return;}
 applyDiseases(player);
 if(game.finished){render();return;}
 game.turns++;game.current=1-player;selected=null;
 enterTurn();render();
 if(game.mode==='local')showHandoff();
 if(game.mode==='cpu'&&game.current===1)queueCPU();
}
function win(player){
 game.finished=true;selected=null;thinking=false;
 render();
 showModal('VICTORIA DE '+playerName(player),'ESTO DEBERÍA SER ILEGAL','La balanza ha llegado a 5 puntos de ventaja. Se exige revancha.',[
  {label:'REVANCHA',action:'rematch',primary:true},{label:'CAMBIAR MODO',action:'select-mode'}
 ]);
}
function showModal(title,kicker,text,buttons,extra=''){
 modalOpen=true;$('modal-title').innerHTML=title;$('modal-eyebrow').textContent=kicker;$('modal-text').textContent=text;$('modal-extra').innerHTML=extra;
 $('modal-buttons').innerHTML=buttons.map(b=>'<button class="btn '+(b.primary?'primary':'ghost')+'" data-modal="'+b.action+'">'+b.label+'</button>').join('');
 $('modal').classList.remove('hidden');
}
function closeModal(){modalOpen=false;$('modal').classList.add('hidden');}
function showSetup(){
 showModal('NO HAY <em>MARCHA ATRÁS.</em>','BIENVENIDO A BARBARIDADES','Elige cómo quieres probar la Serie I. Las partidas online todavía no están implementadas.',[
 {label:'1V1 LOCAL · MISMO DISPOSITIVO',action:'local',primary:true},{label:'JUGAR CONTRA LA CPU',action:'cpu'}
 ],'<p class="secondary">4 carriles · 3 energía por turno · 5 puntos para ganar · robo aleatorio.</p>');
}
function showHandoff(){
 showModal('LE TOCA AL <em>'+playerName(game.current)+'</em>','PASAD EL DISPOSITIVO','El siguiente jugador puede ver su mano cuando pulse el botón.',[
 {label:'SOY '+playerName(game.current)+' · MOSTRAR MI MANO',action:'ready',primary:true}
 ]);
}
function showRules(){
 showModal('REGLAS <em>DEL ABSURDO</em>','MANUAL NO HOMOLOGADO','Juega criaturas en tus cuatro carriles y efectos para molestar, mejorar o robar. Puedes usar tantas cartas como te deje la energía.',[
 {label:'ENTENDIDO',action:'close',primary:true}
 ],'<p class="secondary">Recibes +3 energía y 1 carta aleatoria al comenzar cada turno propio (máximo 10 de energía). La energía se guarda. Los dos primeros turnos globales no hay ataques. Después, al pulsar ACABAR TURNO, atacan solo tus criaturas: dañan a la criatura enfrente o anotan puntos si su carril está libre. La balanza termina con 5 de ventaja. Cáncer cuenta 3 finales de turno de la víctima, por lo que hay oportunidades de usar Quimio.</p>');
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
 return CANVA_SERIES_I_URL+'?page='+c.canvaPage;
}
function cardHtml(c,unit=null,variant='hand'){
 const stats=c.type==='unit'?'<div class="card-stats"><span>⚔ '+(unit?unit.attack:c.attack)+'</span><span>♥ '+(unit?unit.health:c.health)+'</span></div>':'<div class="spell-stats">EFECTO</div>';
 const active=variant==='hand'&&game&&modifiedCost(c,game.current)<=own().energy&&eligible(c,game.current);
 const badges=unit?(unit.cancer?'<span class="status cancer">🦠 '+unit.cancer+'</span>':'')+(unit.stun?'<span class="status">💫</span>':'')+(unit.shield?'<span class="status">🕵️</span>':''):'';
 return '<div class="card-piece '+c.type+' '+variant+(variant==='hand'&&!active?' inactive':'')+'" style="--art-hue:'+c.hue+'">'
   +'<div class="card-top"><span class="cost-bubble">⚡'+(variant==='hand'&&game?modifiedCost(c,game.current):c.cost)+'</span><span class="set-tag">SERIE I</span></div>'
   +'<div class="card-art"><span class="art-spot"></span><span class="card-icon">'+c.icon+'</span><span class="art-rays">✷</span></div>'
   +'<div class="card-name">'+c.name+'</div><div class="card-kind">'+c.kind+'</div>'
   +(variant==='board'?'':('<p class="card-description">'+c.text+'</p>'))
   +'<div class="card-bottom">'+stats+badges+'</div></div>';
}
function renderSlots(target,player,isOwn){
 $(target).innerHTML=game.players[player].board.map((u,i)=>{
  const c=u?card(u.id):null;
  const targetType=selected?card(selected.id).type==='unit'?'friend':card(selected.id).target||'none':'none';
  const available=selected&&(targetType===(isOwn?'friend':'enemy')||(targetType==='friendCancer'&&isOwn))&&
     (c?targetType==='enemy'&&!u.cancer||targetType==='friendCancer'&&u.cancer||targetType==='friend'&&card(selected.id).type==='spell'&&u:targetType==='friend'&&card(selected.id).type==='unit');
  return '<button class="lane '+(c?'filled':'empty')+' '+(available?'targetable':'')+'" data-side="'+(isOwn?'own':'enemy')+'" data-lane="'+i+'" aria-label="'+(c?c.name:'Carril '+(i+1)+' libre')+'">'
   +(c?cardHtml(c,u,'board'):'<div class="empty-mark"><b>＋</b><small>'+String(i+1).padStart(2,'0')+'</small></div>')
   +'</button>';
 }).join('');
}
function render(){
 if(!game)return;
 const me=own(),rival=other();
 $('own-name').textContent=playerName(game.current)+(game.mode==='cpu'&&game.current===1?' · CPU':'');
 $('enemy-name').textContent=playerName(1-game.current);
 $('own-avatar').textContent='0'+(game.current+1);$('enemy-avatar').textContent='0'+(2-game.current);
 $('own-hand-count').textContent=me.hand.length+' cartas en mano';$('enemy-hand').textContent=rival.hand.length+' cartas en mano';
 $('own-energy').textContent=me.energy;$('enemy-energy').textContent=rival.energy;
 $('hand-count').textContent='('+me.hand.length+')';
 const nextRound=Math.floor(game.turns/2)+1;
 $('round').textContent='RONDA '+nextRound+(game.turns<2?' · PREPARACIÓN':' · COMBATE');
 const ranges=Array.from({length:11},(_,i)=>i-5);
 $('scale').innerHTML=ranges.map(v=>'<span class="'+(v===0?'center ':v>0&&game.score>=v?'p1 ':v<0&&game.score<=v?'p2 ':'')+'"></span>').join('');
 $('scale-label').textContent=game.score===0?'BALANZA EQUILIBRADA':(game.score>0?'JUGADOR 1':'JUGADOR 2')+' VA GANANDO POR '+Math.abs(game.score);
 $('log').innerHTML=logs.map(x=>'<li>'+escapeHtml(x)+'</li>').join('');
 renderSlots('enemy-lanes',1-game.current,false);renderSlots('own-lanes',game.current,true);
 const cpuThinking=game.mode==='cpu'&&game.current===1;
 $('hand').innerHTML=cpuThinking?'<div class="no-cards">La CPU está pensando una atrocidad...</div>':me.hand.map(h=>'<button class="hand-card '+(selected?.uid===h.uid?'selected':'')+'" data-hand="'+h.uid+'">'+cardHtml(card(h.id),null,'hand')+'</button>').join('');
 if(!me.hand.length&&!cpuThinking)$('hand').innerHTML='<div class="no-cards">No tienes cartas en la mano. Robarás al empezar tu siguiente turno.</div>';
 $('cancel').hidden=!selected;
 $('end-turn').disabled=modalOpen||thinking||game.finished||cpuThinking;
 $('instruction').textContent=selected?'Objetivo de '+card(selected.id).name+': '+(card(selected.id).type==='unit'?'coloca en un carril libre':card(selected.id).target==='enemy'?'selecciona un enemigo':'selecciona una criatura aliada'):'Selecciona una carta para jugarla.';
 $('hint').textContent=game.turns<2?'No se ataca durante los dos primeros turnos.':'Tus criaturas atacarán al acabar tu turno.';
 const focus=selected?card(selected.id):random(CARDS); // Preview matches selected card, or random.
 $('featured-name').textContent=focus.name;
 $('featured').innerHTML=cardHtml(focus,null,'feature-card');
 $('featured-desc').textContent=focus.text;
 const link=$('canva');link.hidden=!CANVA_SERIES_I_URL;if(CANVA_SERIES_I_URL)link.href=canvaUrl(focus);
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}
function chooseHand(uidValue){
 if(!game||modalOpen||thinking||game.finished||game.mode==='cpu'&&game.current===1)return;
 if(selected?.uid===uidValue){selected=null;render();return;}
 const h=own().hand.find(x=>x.uid===uidValue);if(!h)return;
 const info=card(h.id),cost=modifiedCost(info,game.current);
 if(cost>own().energy){toast('Necesitas '+cost+' de energía.');return;}
 if(!eligible(info,game.current)){toast('No hay objetivos válidos para esta carta.');return;}
 if(info.type==='spell'&&!info.target){playCard(game.current,uidValue);return;}
 selected=h;render();
}
function chooseLane(side,lane){
 if(!selected||modalOpen||thinking||game.finished)return;
 const info=card(selected.id);
 const target=info.type==='unit'?'friend':info.target;
 if(side==='own'&&(target==='friend'||target==='friendCancer')||side==='enemy'&&target==='enemy'){
  if(!playCard(game.current,selected.uid,lane))toast('No puedes usar esa carta ahí.');
 }else toast('Selecciona un objetivo del campo correcto.');
}
document.addEventListener('click',event=>{
 const hand=event.target.closest('[data-hand]');if(hand){chooseHand(hand.dataset.hand);return;}
 const lane=event.target.closest('[data-lane]');if(lane){chooseLane(lane.dataset.side,Number(lane.dataset.lane));return;}
 const action=event.target.closest('[data-modal]');if(action){
  const a=action.dataset.modal;
  if(a==='local'||a==='cpu')newGame(a);
  if(a==='ready'||a==='close') {closeModal();render();}
  if(a==='rematch')newGame(game?.mode||'local');
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
