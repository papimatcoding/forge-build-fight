// Barbaridades v0.6 — short-room P2P over PeerJS WebRTC DataChannel.
// A public PeerServer provides automatic SDP signaling. Actual gameplay remains P2P.
// PeerJS Cloud is a shared free service: not a guaranteed production matchmaking backend.
const LETTERS="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SERVER_PREFIX="barbaridades-v06-";
const MAX_MESSAGE_BYTES=120000;
const ICE={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]};

export function normalizeRoomCode(value){
 const clean=String(value??"").toUpperCase().replace(/[\s-]/g,"");
 return clean.length===6&&[...clean].every(c=>LETTERS.includes(c))?clean:null;
}
export function createRoomCode(cryptoSource=globalThis.crypto){
 if(!cryptoSource?.getRandomValues)throw Error("No se puede generar un código seguro en este navegador.");
 const bytes=new Uint8Array(6);
 cryptoSource.getRandomValues(bytes);
 return [...bytes].map(n=>LETTERS[n%LETTERS.length]).join("");
}
export function roomPeerId(code){
 const normalized=normalizeRoomCode(code);
 if(!normalized)throw Error("Introduce un código válido de 6 caracteres.");
 return SERVER_PREFIX+normalized;
}
export function isRemoteCommand(value,expectedSequence){
 if(!value||value.type!=="command"||!Number.isSafeInteger(value.seq)||value.seq!==expectedSequence)return false;
 const cmd=value.action;
 if(!cmd||typeof cmd!=="object")return false;
 if(cmd.type==="end")return true;
 return cmd.type==="play"&&typeof cmd.uid==="string"&&cmd.uid.length>0&&cmd.uid.length<100&&
  (cmd.lane===null||Number.isInteger(cmd.lane)&&cmd.lane>=0&&cmd.lane<4);
}
export class RoomPeer {
 constructor({onMessage=()=>{},onState=()=>{},PeerClass=globalThis.Peer}={}){
  this.PeerClass=PeerClass;this.onMessage=onMessage;this.onState=onState;
  this.role=null;this.roomCode=null;this.peer=null;this.connection=null;
  this.connected=false;this.closed=false;this.seq=0;this.expectedSeq=0;this.status="new";
 }
 emit(state){if(!this.closed){this.status=state;this.onState(state);}}
 registerPeer(peer){
  this.peer=peer;
  peer.on("error",e=>{
   const type=e?.type||"network";
   const status=type==="unavailable-id"?"code-in-use":
    type==="peer-unavailable"?"room-not-found":"network-error";
   this.emit(status);
  });
  peer.on("disconnected",()=>{if(!this.connected)this.emit("signaling-offline");});
 }
 host(code){
  if(this.peer)throw Error("Ya hay una sala en uso.");
  if(typeof this.PeerClass!=="function")throw Error("El servicio de salas no se ha cargado. Recarga y comprueba tu conexión.");
  this.roomCode=normalizeRoomCode(code);
  if(!this.roomCode)throw Error("Código de sala inválido.");
  this.role="host";
  const peer=new this.PeerClass(roomPeerId(this.roomCode),{debug:0,config:ICE});
  this.registerPeer(peer);
  peer.on("open",()=>this.emit("waiting"));
  peer.on("connection",connection=>{
   if(this.connected||this.connection){connection.close();return;}
   this.attach(connection);
  });
  this.emit("connecting");
  return this.roomCode;
 }
 join(code){
  if(this.peer)throw Error("Ya hay una sala en uso.");
  if(typeof this.PeerClass!=="function")throw Error("El servicio de salas no se ha cargado. Recarga y comprueba tu conexión.");
  this.roomCode=normalizeRoomCode(code);
  if(!this.roomCode)throw Error("Introduce un código válido de 6 caracteres.");
  this.role="guest";
  const peer=new this.PeerClass(undefined,{debug:0,config:ICE});
  this.registerPeer(peer);
  peer.on("open",()=>{
   if(this.closed)return;
   const connection=peer.connect(roomPeerId(this.roomCode),{serialization:"json",reliable:true});
   this.attach(connection);
  });
  this.emit("connecting");
 }
 attach(connection){
  if(this.closed){connection.close();return;}
  this.connection=connection;
  connection.on("open",()=>{
   if(this.closed)return;
   this.connected=true;this.emit("connected");
  });
  connection.on("data",message=>{
   try{
    if(this.closed||!this.connected)return;
    if(!message||typeof message!=="object"||JSON.stringify(message).length>MAX_MESSAGE_BYTES){
     this.emit("protocol-error");return;
    }
    this.onMessage(message);
   }catch(e){this.emit("protocol-error");}
  });
  connection.on("close",()=>{
   if(this.closed)return;
   this.connected=false;this.emit("disconnected");
  });
  connection.on("error",()=>this.emit("network-error"));
 }
 send(message){
  if(!this.connected||!this.connection?.open)return false;
  try{
   const payload=JSON.stringify(message);
   if(payload.length>MAX_MESSAGE_BYTES)return false;
   this.connection.send(message);
   return true;
  }catch(e){this.emit("network-error");return false;}
 }
 sendCommand(action){
  const next=this.seq+1;
  if(!this.send({type:"command",seq:next,action}))return false;
  this.seq=next;
  return true;
 }
 close(){
  this.closed=true;this.connected=false;
  try{this.connection?.close();}catch(e){}
  try{this.peer?.destroy();}catch(e){}
  this.connection=null;this.peer=null;this.status="closed";
 }
}
