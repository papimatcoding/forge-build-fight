(() => {
'use strict';
const SAVE_KEY = 'fbf-alpha-01';
const RARITIES = [
  { id:'common', label:'COMÚN', color:'#a5b2c0', weight:60, mult:1 },
  { id:'rare', label:'RARO', color:'#63c7ff', weight:25, mult:1.22 },
  { id:'epic', label:'ÉPICO', color:'#c58cff', weight:11, mult:1.52 },
  { id:'legendary', label:'LEGENDARIO', color:'#ffc16e', weight:3.5, mult:1.94 },
  { id:'mythic', label:'MÍTICO', color:'#ff6e95', weight:.5, mult:2.38 }
];
const SLOTS = [
  { id:'chassis', label:'CHASIS', icon:'⬡', desc:'Estructura y alcance' },
  { id:'weapon', label:'ARMA', icon:'⚔', desc:'Daño y tipo de ataque' },
  { id:'drive', label:'MECANISMO', icon:'⚙', desc:'Cadencia y precisión' },
  { id:'core', label:'NÚCLEO', icon:'✦', desc:'Efecto especial' }
];
const PARTS = {
  chassis:[
    {id:'bastion',name:'Bastión',icon:'⬡',damage:8,range:135,desc:'Equilibrado'},
    {id:'scout',name:'Ligero',icon:'◇',damage:3,range:175,desc:'Mayor alcance'},
    {id:'fortress',name:'Fortaleza',icon:'▣',damage:15,range:108,desc:'Mayor potencia'}
  ],
  weapon:[
    {id:'bolt',name:'Cañón de pernos',icon:'➤',damage:22,kind:'bolt',desc:'Impacto directo'},
    {id:'flame',name:'Lanzabrasas',icon:'♨',damage:17,kind:'fire',desc:'Daño persistente'},
    {id:'arc',name:'Bobina Tesla',icon:'ϟ',damage:19,kind:'arc',desc:'Descarga en cadena'}
  ],
  drive:[
    {id:'steady',name:'Engranaje firme',icon:'⚙',rate:1.1,range:0,desc:'Cadencia equilibrada'},
    {id:'overclock',name:'Sobremarcha',icon:'✱',rate:1.85,range:-22,desc:'Más rápido, menos alcance'},
    {id:'scope',name:'Enfoque largo',icon:'◎',rate:.8,range:58,desc:'Mayor distancia de tiro'}
  ],
  core:[
    {id:'spark',name:'Cristal ígneo',icon:'✦',bonus:7,effect:'burn',desc:'Aplica quemadura'},
    {id:'frost',name:'Núcleo glacial',icon:'❄',bonus:3,effect:'slow',desc:'Ralentiza enemigos'},
    {id:'storm',name:'Núcleo de tormenta',icon:'ϟ',bonus:5,effect:'chain',desc:'Salto a un segundo enemigo'}
  ]
};
const LEVELS=[
  {name:'Primer contacto',subtitle:'Exploradores',count:9,hp:47,speed:44,reward:40,pulls:3,baseHp:20},
  {name:'La marcha',subtitle:'Enemigos veloces',count:13,hp:62,speed:51,reward:65,pulls:3,baseHp:20},
  {name:'Acero enemigo',subtitle:'Unidades blindadas',count:16,hp:91,speed:43,reward:95,pulls:4,baseHp:20},
  {name:'Cerco imparable',subtitle:'Oleada mixta',count:22,hp:102,speed:57,reward:140,pulls:5,baseHp:20},
  {name:'El coloso',subtitle:'Jefe de campaña',count:18,hp:130,speed:51,reward:210,pulls:6,baseHp:20}
];
const POINTS=[[-40,128],[181,128],[181,345],[395,345],[395,195],[661,195],[661,425],[1000,425]];
const PADS=[[95,252],[281,234],[277,442],[509,300],[518,90],[755,296],[791,487],[847,312],[99,40],[516,467]];
const pathSegments=[];let pathLength=0;
for(let i=1;i<POINTS.length;i++){let [x1,y1]=POINTS[i-1],[x2,y2]=POINTS[i];let len=Math.hypot(x2-x1,y2-y1);pathSegments.push({x1,y1,x2,y2,len,start:pathLength});pathLength+=len;}
const get=(id)=>document.getElementById(id);
const nameFor=(slot,id)=>PARTS[slot].find(x=>x.id===id);
const rarityFor=(id)=>RARITIES.find(x=>x.id===id);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const uuid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-3);
const newPiece=(slot,id,rarity)=>({uid:uuid(),slot,id,rarity});
const initialState=()=>({
  gold:80,pulls:6,forgeLevel:1,unlocked:1,selectedLevel:1,
  pieces:[newPiece('chassis','bastion','common'),newPiece('weapon','bolt','common'),newPiece('drive','steady','common'),newPiece('core','spark','common')],
  towers:[],completed:[],lastDrop:null
});
function hydrate(){
  const fresh=initialState();
  try{
    let data=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(!data||!Array.isArray(data.pieces)||!Array.isArray(data.towers))return fresh;
    let s={...fresh,...data};
    s.pieces=s.pieces.filter(p=>p&&PARTS[p.slot]&&nameFor(p.slot,p.id)&&rarityFor(p.rarity));
    s.towers=s.towers.filter(t=>t&&t.id&&t.parts&&SLOTS.every(k=>t.parts[k.id]&&nameFor(k.id,t.parts[k.id].id)));
    s.gold=Math.max(0,Number(s.gold)||0);s.pulls=Math.max(0,Number(s.pulls)||0);
    s.forgeLevel=clamp(Number(s.forgeLevel)||1,1,8);
    s.unlocked=clamp(Number(s.unlocked)||1,1,LEVELS.length);
    s.selectedLevel=clamp(Number(s.selectedLevel)||1,1,s.unlocked);
    s.completed=Array.isArray(s.completed)?s.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=LEVELS.length):[];
    s.towers.forEach(t=>{if(!Number.isInteger(t.pad)||t.pad<0||t.pad>=PADS.length)t.pad=null;});
    return s;
  }catch{return fresh;}
}
let state=hydrate(),selected={chassis:null,weapon:null,drive:null,core:null},active='forge',selectedTower=null;
let battle={running:false,enemies:[],spawned:0,spawnTimer:0,clock:0,hp:20,shots:[],fx:[]};
let toastTimer=null;
function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{}}
function notify(txt){const el=get('toast');el.textContent=txt;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2600);}
function weights(){
  let l=state.forgeLevel-1;return [60-3*l,25+1.1*l,11+1.1*l,3.5+.65*l,.5+.15*l];
}
function makeRoll(){
  let roll=Math.random()*100,p=0,index=0;
  for(let i=0;i<RARITIES.length;i++){p+=weights()[i];if(roll<p){index=i;break;}}
  const slot=SLOTS[Math.floor(Math.random()*SLOTS.length)].id;
  const pool=PARTS[slot],item=pool[Math.floor(Math.random()*pool.length)];
  return newPiece(slot,item.id,RARITIES[index].id);
}
function maybeDefaults(){
  for(const slot of SLOTS){if(!state.pieces.some(p=>p.uid===selected[slot.id]))selected[slot.id]=state.pieces.find(p=>p.slot===slot.id)?.uid||null;}
  if(!state.towers.some(t=>t.id===selectedTower))selectedTower=state.towers[0]?.id||null;
}
function chosenParts(){
  return Object.fromEntries(SLOTS.map(slot=>[slot.id,state.pieces.find(p=>p.uid===selected[slot.id])||null]));
}
function stats(parts){
  const p={};for(const slot of SLOTS){if(!parts[slot.id])return null;p[slot.id]=nameFor(slot.id,parts[slot.id].id);}
  const m=slot=>rarityFor(parts[slot].rarity)?.mult||1;
  const damage=Math.round((p.chassis.damage*m('chassis')+p.weapon.damage*m('weapon')+p.core.bonus*m('core'))*10)/10;
  const rate=Math.round((p.drive.rate*(1+(m('drive')-1)*.3))*100)/100;
  const range=Math.round(p.chassis.range+p.drive.range+((m('chassis')-1)*23));
  return {damage,rate,range,kind:p.weapon.kind,effect:p.core.effect,dps:Math.round(damage*rate)};
}
function render(){
  maybeDefaults();
  get('coins').textContent=state.gold;get('pulls').textContent=state.pulls;get('pulls-large').textContent=state.pulls;
  get('forge-grade').textContent='NIVEL '+String(state.forgeLevel).padStart(2,'0');
  get('upgrade-progress').style.width=(state.forgeLevel/8*100)+'%';
  const price=60*state.forgeLevel;
  get('upgrade-btn').textContent=state.forgeLevel>=8?'FORJA AL NIVEL MÁXIMO':'MEJORAR · '+price+' ORO';
  get('upgrade-btn').disabled=state.forgeLevel>=8||state.gold<price||battle.running;
  get('forge-btn').disabled=state.pulls<1||battle.running;
  get('rarity-list').innerHTML=RARITIES.map((r,i)=>'<div class="rarity-row" style="--rarity:'+r.color+'"><b style="color:'+r.color+'">'+r.label+'</b><div class="rarity-track"><i style="width:'+weights()[i]+'%"></i></div><small>'+weights()[i].toFixed(2).replace(/\.00$/,'')+'%</small></div>').join('');
  get('stash-total').textContent=state.pieces.length+' PIEZAS';
  get('stash-summary').innerHTML=SLOTS.map(s=>'<div class="stash-item"><b>'+state.pieces.filter(p=>p.slot===s.id).length+'</b><small>'+s.label+'</small></div>').join('');
  const drop=state.lastDrop;
  get('forge-result').innerHTML=drop?'<div class="result-piece" style="--rarity:'+rarityFor(drop.rarity).color+'"><span class="piece-gem">'+nameFor(drop.slot,drop.id).icon+'</span><div class="piece-info"><strong>'+nameFor(drop.slot,drop.id).name+'</strong><small>'+rarityFor(drop.rarity).label+' · '+SLOTS.find(s=>s.id===drop.slot).label+'</small></div></div>':'<span class="muted">La próxima pieza podría cambiar tu estrategia.</span>';
  get('part-slots').innerHTML=SLOTS.map(slot=>{
    const items=state.pieces.filter(p=>p.slot===slot.id),unique=new Map();
    items.forEach(p=>{if(!unique.has(p.id+'_'+p.rarity))unique.set(p.id+'_'+p.rarity,[]);unique.get(p.id+'_'+p.rarity).push(p);});
    const choices=[...unique.values()].map(group=>{const p=group.find(x=>x.uid===selected[slot.id])||group[0],r=rarityFor(p.rarity),def=nameFor(slot.id,p.id);return '<button class="part-option '+(p.uid===selected[slot.id]?'selected':'')+'" data-part="'+p.uid+'" style="--rarity:'+r.color+'"><span class="part-icon">'+def.icon+'</span><span class="part-name">'+def.name+' '+(group.length>1?'×'+group.length:'')+'</span><span class="part-rarity" style="color:'+r.color+'">'+r.label+'</span></button>';}).join('');
    return '<div class="part-slot"><div class="slot-title">'+slot.icon+' '+slot.label+' <small>'+slot.desc+'</small></div><div class="part-choices">'+(choices||'<span class="empty">Sin piezas. Consíguelas en la forja.</span>')+'</div></div>';
  }).join('');
  const build=chosenParts(),st=stats(build);
  get('tower-stats').innerHTML=(st?[['DAÑO',st.damage],['DISPAROS/S',st.rate],['ALCANCE',st.range]]:[['DAÑO','—'],['DISPAROS/S','—'],['ALCANCE','—']]).map(([n,v])=>'<div><small>'+n+'</small><b>'+v+'</b></div>').join('');
  get('assemble-btn').disabled=!st||battle.running;
  get('tower-count').textContent=state.towers.length+' TORRETAS';
  get('hangar').innerHTML=state.towers.length?state.towers.map(t=>towerCard(t,false)).join(''):'<p class="empty">Todavía no has ensamblado ninguna torreta.</p>';
  get('loadout').innerHTML=state.towers.length?state.towers.map(t=>towerCard(t,true)).join(''):'<p class="empty">Ve al taller y construye tu primera torreta.</p>';
  get('mission-list').innerHTML=LEVELS.map((l,i)=>{let n=i+1,locked=n>state.unlocked;return '<button class="mission '+(locked?'locked':'')+' '+(state.selectedLevel===n?'selected':'')+'" data-level="'+n+'" '+(locked||battle.running?'disabled':'')+'><span class="num">'+String(n).padStart(2,'0')+'</span><span><b>'+l.name+'</b><small>'+l.subtitle+'</small></span><span class="star">'+(state.completed.includes(n)?'★':locked?'⌑':'→')+'</span></button>';}).join('');
  get('level-label').textContent='NIVEL '+String(state.selectedLevel).padStart(2,'0')+' — '+LEVELS[state.selectedLevel-1].name.toUpperCase();
  get('base-health').textContent='NÚCLEO '+battle.hp+'/'+LEVELS[state.selectedLevel-1].baseHp;
  get('arena-status').textContent=battle.running?'OLEADA EN CURSO':'PREPARACIÓN';
  get('enemy-count').textContent=(battle.running?battle.enemies.length:'0')+' ENEMIGOS';
  get('tower-placed').textContent=state.towers.filter(t=>t.pad!==null).length+' TORRETAS COLOCADAS';
  get('start-btn').disabled=battle.running||!state.towers.some(t=>t.pad!==null);
  get('start-btn').textContent=battle.running?'DEFENDIENDO...':'INICIAR OLEADA →';
  document.querySelectorAll('[data-nav]').forEach(x=>{if(x.classList.contains('nav-button'))x.classList.toggle('active',x.dataset.nav===active);});
}
function towerCard(t,selectable){
  const s=stats(t.parts),placed=t.pad!==null,sel=selectedTower===t.id;
  return '<div class="'+(selectable?'loadout-item '+(sel?'selected ':'')+(placed?'placed':''):'hangar-item')+'" '+(selectable?'data-tower="'+t.id+'" role="button" tabindex="0"':'')+'><span class="hangar-icon">⚙</span><span class="hangar-copy"><b>'+t.name+'</b><small>'+s.dps+' DPS · '+s.range+' RANGO'+(placed?' · COLOCADA':'')+'</small></span>'+(selectable?(placed?'✓':'◎'):'<button class="small-btn" data-disassemble="'+t.id+'" '+(battle.running?'disabled':'')+'>DESMONTAR</button>')+'</div>';
}
function forge(){
  if(state.pulls<1||battle.running)return;
  state.pulls--;const p=makeRoll();state.pieces.unshift(p);state.lastDrop=p;
  save();render();notify('Nueva pieza: '+nameFor(p.slot,p.id).name+' · '+rarityFor(p.rarity).label);
}
function upgrade(){
  let cost=60*state.forgeLevel;if(state.forgeLevel>=8||state.gold<cost||battle.running)return;
  state.gold-=cost;state.forgeLevel++;save();render();notify('¡Forja mejorada al nivel '+state.forgeLevel+'!');
}
function assemble(){
  if(battle.running)return;const parts=chosenParts(),s=stats(parts);if(!s)return notify('Necesitas una pieza de cada tipo.');
  let highest=RARITIES.reduce((a,r,i)=>Object.values(parts).some(p=>p.rarity===r.id)?i>a?i:a:a,0);
  const title= nameFor('weapon',parts.weapon.id).name+' '+(state.towers.length+1);
  state.towers.push({id:uuid(),name:title,parts:structuredClone(parts),pad:null});
  const used=new Set(Object.values(parts).map(p=>p.uid));state.pieces=state.pieces.filter(p=>!used.has(p.uid));
  SLOTS.forEach(slot=>selected[slot.id]=null);selectedTower=state.towers[state.towers.length-1].id;
  save();render();notify('Torreta ensamblada · '+RARITIES[highest].label);
}
function disassemble(id){
  if(battle.running)return;const t=state.towers.find(t=>t.id===id);if(!t)return;
  state.pieces.push(...Object.values(t.parts));state.towers=state.towers.filter(t=>t.id!==id);
  if(selectedTower===id)selectedTower=null;save();render();notify('Torreta desmontada: piezas recuperadas.');
}
function setView(v){
  if(!['forge','build','fight'].includes(v))return;
  active=v;document.querySelectorAll('.view').forEach(el=>el.classList.toggle('active',el.id===v));
  render();if(v==='fight')draw();
}
function setLevel(n){
  if(battle.running||n<1||n>state.unlocked)return;
  state.selectedLevel=n;resetBattle();save();render();draw();
}
function resetBattle(){
  battle={running:false,enemies:[],spawned:0,spawnTimer:0,clock:0,hp:LEVELS[state.selectedLevel-1].baseHp,shots:[],fx:[]};
  get('battle-message').textContent='Selecciona una torreta y toca un pedestal para colocarla.';
}
const canvas=get('arena'),ctx=canvas.getContext('2d');
function pathAt(d){
  const dist=clamp(d,0,pathLength);
  for(let s of pathSegments)if(dist<=s.start+s.len){let t=(dist-s.start)/s.len;return [s.x1+(s.x2-s.x1)*t,s.y1+(s.y2-s.y1)*t];}
  return POINTS[POINTS.length-1];
}
function onArenaClick(event){
  if(battle.running)return;
  const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;
  const pad=PADS.findIndex(p=>Math.hypot(p[0]-x,p[1]-y)<29);
  if(pad<0)return;
  const occupying=state.towers.find(t=>t.pad===pad);
  if(occupying){occupying.pad=null;selectedTower=occupying.id;notify('Torreta retirada del pedestal.');}
  else{const tower=state.towers.find(t=>t.id===selectedTower);if(!tower)return notify('Selecciona una torreta del hangar.');
    tower.pad=pad;notify('Torreta colocada.');}
  save();render();draw();
}
function start(){
  if(battle.running||!state.towers.some(t=>t.pad!==null))return notify('Coloca al menos una torreta.');
  resetBattle();battle.running=true;state.towers.forEach(t=>t.cooldown=0);get('battle-message').textContent='Defiende el núcleo. Las torretas disparan automáticamente.';render();
}
function spawn(){
  const lvl=LEVELS[state.selectedLevel-1],n=battle.spawned++,boss=state.selectedLevel===5&&n===lvl.count-1;
  const fast=!boss&&(n%5===3||state.selectedLevel===2&&n%3===1);
  const armored=!boss&&state.selectedLevel>=3&&n%4===0;
  const hp=boss?560:lvl.hp*(armored?1.85:fast?.8:1);
  battle.enemies.push({id:uuid(),dist:0,hp,max:hp,speed:boss?25:lvl.speed*(fast?1.38:armored?.72:1),boss,fast,armored,burn:0,slow:0,poison:0,radius:boss?22:armored?15:fast?10:12});
}
function finish(victory){
  battle.running=false;
  if(victory){
    const n=state.selectedLevel,lvl=LEVELS[n-1],first=!state.completed.includes(n);
    if(first){state.completed.push(n);state.gold+=lvl.reward;state.pulls+=lvl.pulls;state.unlocked=Math.max(state.unlocked,Math.min(n+1,LEVELS.length));}
    else{state.gold+=Math.round(lvl.reward*.35);state.pulls+=1;}
    get('battle-message').textContent='¡VICTORIA! '+(first?'+'+lvl.reward+' oro · +'+lvl.pulls+' tiradas':'Recompensa de repetición: +'+Math.round(lvl.reward*.35)+' oro · +1 tirada');
    notify('¡Misión superada! Tu forja te espera.');
  }else{get('battle-message').textContent='NÚCLEO DESTRUIDO. Reconfigura tus torretas y vuelve a intentarlo.';notify('Derrota. Prueba otra configuración.');}
  save();render();
}
function update(dt){
  if(!battle.running)return;
  const l=LEVELS[state.selectedLevel-1],t=dt/1000;
  battle.clock+=t;battle.spawnTimer+=t;
  if(battle.spawned<l.count&&battle.spawnTimer>=Math.max(.7,1.35-state.selectedLevel*.08)){battle.spawnTimer=0;spawn();}
  for(const e of battle.enemies){
    const factor=e.slow>battle.clock?.6:1;
    e.dist+=e.speed*t*factor;
    if(e.burn>battle.clock)e.hp-=5.5*t;
    if(e.poison>battle.clock)e.hp-=3*t;
    if(e.hp<=0)continue;
    if(e.dist>=pathLength){
      battle.hp-=e.boss?12:e.armored?3:1;e.hp=0;
      battle.fx.push({x:930,y:425,life:.6,color:'#ff715f',r:30});
    }
  }
  battle.enemies=battle.enemies.filter(e=>e.hp>0);
  for(const tw of state.towers){
    if(tw.pad===null)continue;
    const s=stats(tw.parts),[x,y]=PADS[tw.pad];tw.cooldown=(tw.cooldown||0)-t;
    if(tw.cooldown>0)continue;
    const targets=battle.enemies.filter(e=>{const p=pathAt(e.dist);return Math.hypot(p[0]-x,p[1]-y)<=s.range;}).sort((a,b)=>b.dist-a.dist);
    if(!targets.length)continue;
    const e=targets[0],point=pathAt(e.dist);e.hp-=s.damage;
    const color=s.kind==='fire'?'#ffa762':s.kind==='arc'?'#83e2fb':'#e4ebc7';
    battle.shots.push({x,y,x2:point[0],y2:point[1],life:.16,color});
    battle.fx.push({x:point[0],y:point[1],life:.22,color,r:15});
    if(s.effect==='burn')e.burn=Math.max(e.burn,battle.clock+2.3);
    if(s.effect==='slow')e.slow=Math.max(e.slow,battle.clock+1.5);
    if(s.effect==='chain'&&targets[1]){targets[1].hp-=s.damage*.48;const p2=pathAt(targets[1].dist);battle.shots.push({x:point[0],y:point[1],x2:p2[0],y2:p2[1],life:.17,color:'#9deaff'});}
    if(s.kind==='arc'&&targets[1])targets[1].hp-=s.damage*.22;
    tw.cooldown+=1/s.rate;
  }
  battle.shots=battle.shots.filter(s=>(s.life-=t)>0);battle.fx=battle.fx.filter(f=>(f.life-=t)>0);
  battle.enemies=battle.enemies.filter(e=>e.hp>0);
  if(battle.hp<=0){battle.hp=0;finish(false);}
  else if(battle.spawned>=l.count&&!battle.enemies.length)finish(true);
}
function draw(){
  if(active!=='fight')return;
  const W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle='#142b35';ctx.fillRect(0,0,W,H);
  for(let x=0;x<W;x+=40){ctx.strokeStyle='rgba(95,161,157,.10)';ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.strokeStyle='rgba(95,161,157,.10)';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // Ground: compact geometric shrubs / stones keep the stage legible.
  for(let i=0;i<32;i++){const x=(i*197+53)%960,y=(i*131+71)%560;const close=pathSegments.some(s=>{let ax=s.x2-s.x1,ay=s.y2-s.y1,k=clamp(((x-s.x1)*ax+(y-s.y1)*ay)/(s.len*s.len),0,1);return Math.hypot(x-(s.x1+k*ax),y-(s.y1+k*ay))<48;});if(close)continue;ctx.fillStyle=i%3===0?'#244b4d':'#22404a';ctx.beginPath();ctx.arc(x,y,7+i%4*2,0,Math.PI*2);ctx.fill();}
  ctx.lineJoin='round';ctx.lineCap='round';
  for(let [w,col] of [[70,'#1c3a44'],[55,'#617665'],[41,'#b69c72'],[31,'#8e7b5c']]){ctx.beginPath();ctx.moveTo(...POINTS[0]);POINTS.slice(1).forEach(p=>ctx.lineTo(...p));ctx.lineWidth=w;ctx.strokeStyle=col;ctx.stroke();}
  // Path centerline.
  ctx.setLineDash([8,19]);ctx.lineWidth=2;ctx.strokeStyle='#e7c18e66';ctx.beginPath();ctx.moveTo(...POINTS[0]);POINTS.slice(1).forEach(p=>ctx.lineTo(...p));ctx.stroke();ctx.setLineDash([]);
  const last=pathAt(pathLength-20);
  ctx.fillStyle='#132b3d';ctx.strokeStyle='#63d8db';ctx.lineWidth=7;ctx.beginPath();ctx.arc(last[0],last[1],28,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.textAlign='center';ctx.font='26px sans-serif';ctx.fillStyle='#8ee9e9';ctx.fillText('◈',last[0],last[1]+9);
  for(let i=0;i<PADS.length;i++){
    const [x,y]=PADS[i],t=state.towers.find(t=>t.pad===i);
    ctx.fillStyle=t?'#1d4558':'#1c3a49';ctx.strokeStyle=t?'#75d9dc':'#5a8192';ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(x,y,25,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle='#9ec4d0';ctx.font='22px sans-serif';ctx.fillText(t?'':'＋',x,y+7);
    if(t){
      const s=stats(t.parts),c=s.kind==='fire'?'#ffac68':s.kind==='arc'?'#7ae2ee':'#c9d7e4';
      ctx.save();ctx.translate(x,y);ctx.fillStyle='#314d60';ctx.strokeStyle='#bdd0dc';ctx.lineWidth=3;ctx.fillRect(-16,-15,32,30);ctx.strokeRect(-16,-15,32,30);
      ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,9,0,Math.PI*2);ctx.fill();ctx.fillRect(3,-5,25,10);ctx.restore();
      if(t.id===selectedTower&&!battle.running){ctx.strokeStyle='#7adce344';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,s.range,0,Math.PI*2);ctx.stroke();}
    }
  }
  for(let e of battle.enemies){
    const [x,y]=pathAt(e.dist);ctx.fillStyle=e.boss?'#9f54a9':e.armored?'#6a8095':e.fast?'#e5bd67':'#e77c62';ctx.strokeStyle=e.boss?'#f9bcff':'#2c3643';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,e.radius,0,Math.PI*2);ctx.fill();ctx.stroke();
    if(e.boss){ctx.font='18px sans-serif';ctx.fillStyle='#fff';ctx.fillText('♛',x,y+6);}
    ctx.fillStyle='#172f33';ctx.fillRect(x-20,y-e.radius-14,40,5);ctx.fillStyle=e.hp/e.max<.3?'#ff7562':'#96efb3';ctx.fillRect(x-20,y-e.radius-14,40*clamp(e.hp/e.max,0,1),5);
  }
  for(const shot of battle.shots){ctx.globalAlpha=clamp(shot.life/.16,0,1);ctx.strokeStyle=shot.color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(shot.x,shot.y);ctx.lineTo(shot.x2,shot.y2);ctx.stroke();ctx.globalAlpha=1;}
  for(const f of battle.fx){ctx.globalAlpha=clamp(f.life/.22,0,.75);ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(f.x,f.y,Math.max(2,f.r*(1-f.life/.4)),0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
  ctx.textAlign='left';
}
let lastFrame=performance.now(),hudClock=0;
function frame(now){
  const dt=clamp(now-lastFrame,0,50);lastFrame=now;update(dt);draw();
  hudClock+=dt;if(hudClock>220){hudClock=0;if(active==='fight'){get('base-health').textContent='NÚCLEO '+battle.hp+'/'+LEVELS[state.selectedLevel-1].baseHp;get('enemy-count').textContent=battle.enemies.length+' ENEMIGOS';}}
  requestAnimationFrame(frame);
}
document.addEventListener('click',ev=>{
  const nav=ev.target.closest('[data-nav]');if(nav){setView(nav.dataset.nav);return;}
  const part=ev.target.closest('[data-part]');if(part){const p=state.pieces.find(x=>x.uid===part.dataset.part);if(p){selected[p.slot]=p.uid;render();}return;}
  const dis=ev.target.closest('[data-disassemble]');if(dis){disassemble(dis.dataset.disassemble);return;}
  const tower=ev.target.closest('[data-tower]');if(tower){selectedTower=tower.dataset.tower;render();draw();return;}
  const level=ev.target.closest('[data-level]');if(level){setLevel(Number(level.dataset.level));return;}
  const action=ev.target.closest('[data-action]');if(action){const a=action.dataset.action;if(a==='forge')forge();if(a==='upgrade')upgrade();if(a==='assemble')assemble();if(a==='start')start();}
});
document.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){const t=ev.target.closest('[data-tower]');if(t){ev.preventDefault();selectedTower=t.dataset.tower;render();draw();}}});
canvas.addEventListener('pointerup',onArenaClick);
resetBattle();render();requestAnimationFrame(frame);
})();