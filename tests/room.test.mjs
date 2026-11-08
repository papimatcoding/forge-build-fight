import test from "node:test";
import assert from "node:assert/strict";
import {EventEmitter} from "node:events";
import {normalizeRoomCode,createRoomCode,roomPeerId,isRemoteCommand,RoomPeer} from "../room.js";

class FakeConnection extends EventEmitter{
 constructor(peerId){super();this.peer=peerId;this.open=false;this.other=null;}
 send(message){
  if(!this.open)throw Error("closed");
  const delivered=structuredClone(message);
  queueMicrotask(()=>{if(this.other?.open)this.other.emit("data",delivered);});
 }
 close(){
  if(!this.open)return;
  this.open=false;
  this.emit("close");
  if(this.other?.open){this.other.open=false;this.other.emit("close");}
 }
}
class FakePeer extends EventEmitter{
 static peers=new Map();
 static next=1;
 constructor(id){
  super();
  this.id=id||"guest-"+FakePeer.next++;
  if(FakePeer.peers.has(this.id)){
   queueMicrotask(()=>this.emit("error",{type:"unavailable-id"}));
   return;
  }
  FakePeer.peers.set(this.id,this);
  queueMicrotask(()=>this.emit("open",this.id));
 }
 connect(id){
  const host=FakePeer.peers.get(id);
  if(!host){
   queueMicrotask(()=>this.emit("error",{type:"peer-unavailable"}));
   return new FakeConnection(id);
  }
  const client=new FakeConnection(id),server=new FakeConnection(this.id);
  client.other=server;server.other=client;
  queueMicrotask(()=>{
   host.emit("connection",server);
   client.open=true;server.open=true;
   server.emit("open");client.emit("open");
  });
  return client;
 }
 destroy(){FakePeer.peers.delete(this.id);}
}
const flush=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};

test("6-digit friendly room codes are normalized and validated",()=>{
 const crypto={getRandomValues(bytes){bytes.fill(0);return bytes;}};
 const generated=createRoomCode(crypto);
 assert.equal(generated,"AAAAAA");
 assert.equal(normalizeRoomCode("ab c-234"),"ABC234");
 assert.equal(normalizeRoomCode("o0i1no"),null);
 assert.equal(normalizeRoomCode("ABC123"),null);
 assert.equal(normalizeRoomCode("ABC23"),null);
 assert.equal(roomPeerId("aBc234"),"barbaridades-v06-ABC234");
});
test("peer room exchanges messages without SDP strings",async()=>{
 const hostEvents=[],guestEvents=[],hostReceived=[],guestReceived=[];
 const host=new RoomPeer({PeerClass:FakePeer,onState:s=>hostEvents.push(s),onMessage:m=>hostReceived.push(m)});
 const guest=new RoomPeer({PeerClass:FakePeer,onState:s=>guestEvents.push(s),onMessage:m=>guestReceived.push(m)});
 try{
  assert.equal(host.host("ABC234"),"ABC234");
  guest.join("abc-234");
  await flush();
  assert.equal(host.connected,true);
  assert.equal(guest.connected,true);
  assert.ok(hostEvents.includes("connected")&&guestEvents.includes("connected"));
  assert.equal(guest.send({type:"hello",protocol:1}),true);
  await flush();
  assert.deepEqual(hostReceived[0],{type:"hello",protocol:1});
  assert.equal(guest.sendCommand({type:"end"}),true);
  await flush();
  assert.ok(isRemoteCommand(hostReceived[1],1));
  assert.equal(hostReceived[1].seq,1);
  assert.equal(guest.seq,1);
  assert.equal(host.send({type:"snapshot",version:2,ackSeq:1,state:{current:0}}),true);
  await flush();
  assert.equal(guestReceived[0].ackSeq,1);
  assert.equal(guestReceived[0].state.current,0);
  assert.equal(guest.sendCommand({type:"play",uid:"testcard",lane:2}),true);
  await flush();
  assert.ok(isRemoteCommand(hostReceived[2],2));
  assert.equal(hostReceived[2].action.lane,2);
 }finally{guest.close();host.close();}
});
test("room rejects duplicate room ID and unknown room",async()=>{
 const events=[],host=new RoomPeer({PeerClass:FakePeer});
 const duplicate=new RoomPeer({PeerClass:FakePeer,onState:s=>events.push(s)});
 const missingEvents=[];
 const missing=new RoomPeer({PeerClass:FakePeer,onState:s=>missingEvents.push(s)});
 try{
  host.host("TEST45");
  duplicate.host("TEST45");
  missing.join("NXT456");
  await flush();
  assert.ok(events.includes("code-in-use"));
  assert.ok(missingEvents.includes("room-not-found"));
 }finally{host.close();duplicate.close();missing.close();}
});
test("sequenced guest commands reject replayed/out-of-turn payloads",()=>{
 assert.equal(isRemoteCommand({type:"command",seq:1,action:{type:"end"}},1),true);
 assert.equal(isRemoteCommand({type:"command",seq:1,action:{type:"end"}},2),false);
 assert.equal(isRemoteCommand({type:"command",seq:2,action:{type:"play",uid:"c1",lane:0}},2),true);
 assert.equal(isRemoteCommand({type:"command",seq:2,action:{type:"play",uid:"c1",lane:4}},2),false);
 assert.equal(isRemoteCommand({type:"command",seq:2,action:{type:"play",uid:"",lane:1}},2),false);
});
