// No signaling server: exchange a WebRTC offer and answer manually.
// STUN alone is best-effort. No TURN fallback or reconnection is provided.
const DEFAULT_ICE=[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}];
const MAX_SIGNAL=250000;
export function encodeSignal(payload){
 const bytes=new TextEncoder().encode(JSON.stringify(payload));
 let binary="";for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export function decodeSignal(value){
 if(typeof value!=="string"||!value.trim()||value.length>MAX_SIGNAL)throw Error("Código de conexión inválido");
 const raw=value.trim().replace(/-/g,"+").replace(/_/g,"/");
 const binary=atob(raw);
 const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0))));
 if(data.version!==1||!["offer","answer"].includes(data.type)||!data.description||data.description.type!==data.type||typeof data.description.sdp!=="string")throw Error("Oferta o respuesta incompatible");
 if(data.description.sdp.length>90000)throw Error("Oferta demasiado larga");
 return data;
}
export function isRemoteCommand(value,expectedSequence){
 if(!value||value.type!=="command"||!Number.isSafeInteger(value.seq)||value.seq!==expectedSequence)return false;
 const command=value.action;
 return command&&(
  command.type==="end"||
  command.type==="play"&&typeof command.uid==="string"&&command.uid.length>0&&command.uid.length<100&&
  (command.lane===null||Number.isInteger(command.lane)&&command.lane>=0&&command.lane<4)
 );
}
export class ManualPeer{
 constructor({onMessage=()=>{},onState=()=>{},iceServers=DEFAULT_ICE}={}){
  this.onMessage=onMessage;this.onState=onState;this.iceServers=iceServers;
  this.pc=null;this.channel=null;this.seq=0;this.expectedSeq=0;this.status="new";
 }
 emit(status){this.status=status;this.onState(status);}
 makeConnection(){
  if(typeof RTCPeerConnection==="undefined")throw Error("Tu navegador no admite WebRTC");
  this.pc=new RTCPeerConnection({iceServers:this.iceServers});
  this.pc.onconnectionstatechange=()=>{
   const state=this.pc?.connectionState;
   if(state==="connected")this.emit("connected");
   if(state==="failed"||state==="closed")this.emit(state);
   if(state==="disconnected")this.emit("disconnected");
  };
  this.pc.ondatachannel=event=>this.attachChannel(event.channel);
 }
 attachChannel(channel){
  this.channel=channel;
  channel.onopen=()=>this.emit("connected");
  channel.onclose=()=>this.emit("disconnected");
  channel.onerror=()=>this.emit("error");
  channel.onmessage=e=>{
   try{
    if(typeof e.data!=="string"||e.data.length>150000)throw Error("Mensaje excesivo");
    this.onMessage(JSON.parse(e.data));
   }catch(error){this.emit("protocol-error");}
  };
 }
 async gather(){
  const pc=this.pc;
  if(pc.iceGatheringState==="complete")return;
  await new Promise(resolve=>{
   let finished=false;
   const done=()=>{if(finished)return;finished=true;pc.removeEventListener("icegatheringstatechange",changed);clearTimeout(timer);resolve();};
   const changed=()=>{if(pc.iceGatheringState==="complete")done();};
   const timer=setTimeout(done,18000);
   pc.addEventListener("icegatheringstatechange",changed);
  });
 }
 async createOffer(){
  this.makeConnection();
  this.attachChannel(this.pc.createDataChannel("barbaridades",{ordered:true}));
  await this.pc.setLocalDescription(await this.pc.createOffer());
  await this.gather();
  this.emit("offer-ready");
  return encodeSignal({version:1,type:"offer",description:this.pc.localDescription});
 }
 async acceptOffer(value){
  const signal=decodeSignal(value);
  if(signal.type!=="offer")throw Error("Necesitas una oferta del anfitrión.");
  this.makeConnection();
  await this.pc.setRemoteDescription(signal.description);
  await this.pc.setLocalDescription(await this.pc.createAnswer());
  await this.gather();
  this.emit("answer-ready");
  return encodeSignal({version:1,type:"answer",description:this.pc.localDescription});
 }
 async acceptAnswer(value){
  const signal=decodeSignal(value);
  if(signal.type!=="answer"||!this.pc)throw Error("Necesitas la respuesta del invitado.");
  await this.pc.setRemoteDescription(signal.description);
  this.emit("connecting");
 }
 send(data){
  if(!this.channel||this.channel.readyState!=="open")return false;
  this.channel.send(JSON.stringify(data));return true;
 }
 sendCommand(action){return this.send({type:"command",seq:++this.seq,action});}
 close(){
  if(this.channel){this.channel.onclose=null;this.channel.close();}
  if(this.pc){this.pc.onconnectionstatechange=null;this.pc.close();}
  this.channel=null;this.pc=null;this.emit("closed");
 }
}
