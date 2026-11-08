import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {CARDS,CARDS_BY_ID,RULES,BLOCK,CANVA_SERIES_I_URL} from "../cards.js";
import {RoomPeer,normalizeRoomCode,createRoomCode,isRemoteCommand} from "../room.js";

function harness(){
 const els=new Map();
 const create=()=>({innerHTML:"",textContent:"",href:"",hidden:false,disabled:false,style:{},classList:{add(){},remove(){}},addEventListener(){}});
 const document={getElementById(id){if(!els.has(id))els.set(id,create());return els.get(id);},addEventListener(){}};
 const context={document,window:{open(){}},setTimeout:()=>1,clearTimeout(){},console,Math,RoomPeer,normalizeRoomCode,createRoomCode,isRemoteCommand,
   __cards:{CARDS,CARDS_BY_ID,RULES,BLOCK,CANVA_SERIES_I_URL}};
 vm.createContext(context);
 const script=fs.readFileSync(new URL("../game.js",import.meta.url),"utf8")
  .replace(/^import[^\n]*\n/gm,"");
 const globals="const {CARDS,CARDS_BY_ID,RULES,BLOCK,CANVA_SERIES_I_URL}=globalThis.__cards;";
 const expose=';globalThis.testApi={newGame,card,unitOf,playCard,endTurn,enterTurn,attackStep,applyDiseases,modifiedCost,closeModal,getGame:()=>game,logs:()=>logs,safeGuestSnapshot,remoteMessage,render,setPeer:p=>{peer=p;},getPending:()=>remotePending,shownHand:()=>document.getElementById("hand").innerHTML,place:(p,id,l)=>{game.players[p].board[l]=unitOf(card(id));return game.players[p].board[l];},give:(p,id)=>{const h={uid:uid(),id};game.players[p].hand.push(h);return h.uid;},energy:(p,v)=>{game.players[p].energy=v;},current:(p)=>{game.current=p;},turns:(v)=>{game.turns=v;}};';
 vm.runInContext(globals+script+expose,context);
 const api=context.testApi;api.newGame("local");return api;
}

test("16 cards with valid costs and Canva references",()=>{
 assert.equal(CARDS.length,16);
 assert.equal(new Set(CARDS.map(c=>c.id)).size,16);
 assert.deepEqual(CARDS.map(c=>c.canvaPage),Array.from({length:16},(_,i)=>i+1));
 assert.match(CANVA_SERIES_I_URL,/canva\.com/);
 assert.equal(CARDS_BY_ID.raul.name,"Raúl Becas y Ayudas");
 assert.equal(CARDS_BY_ID.raul.abilityName,"Beca MEC");
 for(const c of CARDS){assert.ok(c.cost>=0);if(c.type==="unit"){assert.ok(c.health>0);assert.ok(c.attack>=0);}}
});

test("3 energy per turn and no attacks in first two turns",()=>{
 const t=harness(),g=t.getGame();assert.equal(g.players[0].energy,3);
 t.place(0,"duck",0);t.endTurn();assert.equal(g.score,0);
 t.closeModal();t.endTurn();assert.equal(g.score,0);
 t.closeModal();t.endTurn();assert.equal(g.score,3);
});

test("Pirate token makes cards free for that turn only",()=>{
 const t=harness();t.energy(0,10);
 assert.equal(t.playCard(0,t.give(0,"piratetoken")),true);
 assert.equal(t.modifiedCost(t.card("sahur"),0),0);
 assert.equal(t.playCard(0,t.give(0,"sahur"),0),true);
 t.endTurn();t.closeModal();t.endTurn();t.closeModal();
 assert.equal(t.getGame().players[0].freeTurn,false);
});

test("Hipergamia focuses next attack on chosen enemy",()=>{
 const t=harness();t.place(0,"grandma",0);t.place(0,"duck",1);
 const target=t.place(1,"steve",2);t.energy(0,10);
 assert.equal(t.playCard(0,t.give(0,"hyper"),2),true);
 assert.equal(t.getGame().players[0].focusTargetId,target.uid);
 t.turns(2);t.attackStep(0);
 assert.equal(t.getGame().players[1].board[2],null);
 assert.equal(t.getGame().score,0);
});

test("Beca MEC increases energy income",()=>{
 const t=harness();t.place(0,"raul",0);t.energy(0,0);t.enterTurn();
 assert.equal(t.getGame().players[0].energy,4);
});

test("Perry alternates hat forms on each of its owner's turns",()=>{
 const t=harness(),u=t.place(0,"perry",0);
 assert.equal(u.attack,2);assert.equal(u.maxHealth,3);assert.equal(u.hat,true);
 t.current(1);t.enterTurn();assert.equal(u.hat,true);
 t.current(0);t.enterTurn();assert.equal(u.attack,4);assert.equal(u.maxHealth,2);assert.equal(u.hat,false);
 t.current(1);t.enterTurn();t.current(0);t.enterTurn();
 assert.equal(u.attack,2);assert.equal(u.maxHealth,3);assert.equal(u.hat,true);
});

test("Pereira retaliates with teeth (paletas)",()=>{
 const t=harness(),enemy=t.place(1,"pereira",0),attacker=t.place(0,"grandma",0);
 enemy.health=1;t.attackStep(0);
 assert.equal(t.getGame().players[1].board[0],null);assert.equal(attacker.health,2);
 assert.ok(t.logs().some(x=>x.includes("PALETAS")));
});

test("Laughing cow gives cheese and heals adjacent ally",()=>{
 const t=harness();t.place(0,"cow",1);const ally=t.place(0,"grandma",2);
 t.place(1,"block",1);ally.health=2;t.attackStep(0);
 assert.equal(ally.health,3);assert.equal(ally.cheese,1);
});

test("Cancer counts three victim turns and Quimio cures it",()=>{
 const t=harness(),victim=t.place(1,"cow",1);t.energy(0,10);
 assert.equal(t.playCard(0,t.give(0,"cancer"),1),true);
 t.applyDiseases(1);assert.equal(victim.cancer,2);
 t.applyDiseases(1);assert.equal(victim.cancer,1);
 t.applyDiseases(1);assert.equal(t.getGame().players[1].board[1],null);
 t.place(1,"cow",1);t.energy(0,10);
 t.playCard(0,t.give(0,"cancer"),1);t.current(1);t.energy(1,10);
 assert.equal(t.playCard(1,t.give(1,"chemo"),1),true);
 assert.equal(t.getGame().players[1].board[1].cancer,0);
});

test("P2P host transmits only the guest hand, never its own hidden cards",()=>{
 const t=harness();t.newGame("p2p-host");
 const live=t.getGame(),view=t.safeGuestSnapshot();
 assert.equal(view.mode,"p2p-guest");
 assert.equal(view.players[0].hand.length,live.players[0].hand.length);
 assert.ok(view.players[0].hand.every(h=>h.id===null&&h.uid===null));
 assert.ok(view.players[1].hand.every(h=>typeof h.id==="string"&&typeof h.uid==="string"));
 assert.equal(view.players[0].board.length,4);
 assert.equal(view.players[1].board.length,4);
});


test("Opening hands are exactly three cards for both players, without bonus draw",()=>{
 const t=harness(),g=t.getGame();
 assert.equal(RULES.startingHand,3);
 assert.equal(g.players[0].hand.length,3);
 assert.equal(g.players[1].hand.length,3);
 t.endTurn();t.closeModal();
 assert.equal(g.players[1].hand.length,3);
 t.endTurn();t.closeModal();
 assert.equal(g.players[0].hand.length,4); // First draw on second J1 turn.
});
test("Initial deal and subsequent draw animate once, without reanimating every render",()=>{
 const t=harness(),g=t.getGame();
 const first=t.shownHand();
 assert.equal((first.match(/is-dealt/g)||[]).length,3);
 t.render();
 assert.equal((t.shownHand().match(/is-dealt/g)||[]).length,0);
 t.endTurn();t.closeModal();t.render();
 assert.equal((t.shownHand().match(/is-dealt/g)||[]).length,3);
 t.endTurn();t.closeModal();t.render();
 assert.equal(g.players[0].hand.length,4);
 assert.equal((t.shownHand().match(/is-dealt/g)||[]).length,1);
});


test("P2P host enforces J1/J2 turns, independent attacks and command sequences",()=>{
 const t=harness();
 t.newGame("p2p-host");
 const state=t.getGame(),sent=[];
 const wire={role:"host",connected:true,expectedSeq:0,send(m){sent.push(m);return true;}};
 t.setPeer(wire);
 // J1 plays a duck; its first turn must not attack.
 t.place(0,"duck",0);
 assert.equal(t.endTurn(false),true);
 assert.equal(state.current,1);
 assert.equal(state.turns,1);
 assert.equal(state.score,0);
 assert.ok(sent.at(-1).type==="snapshot");
 // Host UI / mouse event can NEVER end guest's turn.
 assert.equal(t.endTurn(false),false);
 assert.equal(t.endTurn({type:"click"}),false);
 assert.equal(state.current,1);
 assert.equal(state.turns,1);
 // The guest's ordered command ends J2's opening turn.
 t.remoteMessage({type:"command",seq:1,action:{type:"end"}});
 assert.equal(state.current,0);
 assert.equal(state.turns,2);
 assert.equal(state.score,0);
 assert.equal(wire.expectedSeq,1);
 assert.equal(sent.at(-1).ackSeq,1);
 // Replaying a guest command cannot advance the turn.
 t.remoteMessage({type:"command",seq:1,action:{type:"end"}});
 assert.equal(state.current,0);
 assert.equal(state.turns,2);
 // Third global turn: only J1's duck attacks.
 assert.equal(t.endTurn(false),true);
 assert.equal(state.current,1);
 assert.equal(state.turns,3);
 assert.equal(state.score,3);
 // Valid J2 command ends the fourth turn; absent creatures, J2 deals nothing.
 t.remoteMessage({type:"command",seq:2,action:{type:"end"}});
 assert.equal(state.current,0);
 assert.equal(state.turns,4);
 assert.equal(state.score,3);
 assert.equal(sent.at(-1).ackSeq,2);
 // During J1's turn, an unsolicited J2 end command is rejected.
 t.remoteMessage({type:"command",seq:3,action:{type:"end"}});
 assert.equal(state.turns,4);
 assert.equal(state.current,0);
 assert.equal(state.score,3);
});

test("P2P host validates remote cards and ACKs rejected actions",()=>{
 const t=harness();
 t.newGame("p2p-host");
 const messages=[],peerMock={role:"host",connected:true,expectedSeq:0,send(m){messages.push(m);return true;}};
 t.setPeer(peerMock);
 t.endTurn(false);
 const current=t.getGame();
 assert.equal(current.current,1);
 // Forged card UID: do not spend energy or advance turn.
 const energy=current.players[1].energy;
 t.remoteMessage({type:"command",seq:1,action:{type:"play",uid:"not-in-hand",lane:0}});
 assert.equal(current.current,1);
 assert.equal(current.players[1].energy,energy);
 assert.ok(messages.some(m=>m.type==="reject"&&m.seq===1));
 assert.equal(messages.at(-1).ackSeq,1);
 // Valid guest card actually enters a lane and is synced.
 const cardId=t.give(1,"grandma");
 t.remoteMessage({type:"command",seq:2,action:{type:"play",uid:cardId,lane:0}});
 assert.equal(current.players[1].board[0].id,"grandma");
 assert.equal(current.players[1].energy,energy-3);
 assert.equal(messages.at(-1).ackSeq,2);
 assert.ok(messages.at(-1).state.players[0].hand.every(h=>h.id===null&&h.uid===null));
});
