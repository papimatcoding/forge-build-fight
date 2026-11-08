import assert from "node:assert/strict";
import {chromium} from "playwright";
// Replace the PeerJS cloud signaling transport with a cross-tab fake.
// TWO real game pages run independently, sharing just the fake WebRTC channel.
const fakePeerJS="(()=>{\n const wire=new BroadcastChannel(\"barbaridades-peerjs-ci\");\n class Emitter{\n  constructor(){this.events={};}\n  on(k,fn){(this.events[k]??=[]).push(fn);return this;}\n  emit(k,...args){for(const fn of this.events[k]||[])fn(...args);}\n }\n class Connection extends Emitter{\n  constructor(local,remote){super();this.local=local;this.peer=remote;this.open=false;}\n  send(data){if(!this.open)throw Error(\"Fake connection closed\");wire.postMessage({type:\"data\",from:this.local,to:this.peer,data});}\n  close(){if(!this.open)return;this.open=false;wire.postMessage({type:\"close\",from:this.local,to:this.peer});this.emit(\"close\");}\n }\n class Peer extends Emitter{\n  constructor(id){\n   super();this.id=id||\"test-guest-\"+Math.random().toString(36).slice(2);this.connections=new Map();\n   wire.addEventListener(\"message\",e=>{\n    const msg=e.data;\n    if(msg.to!==this.id)return;\n    if(msg.type===\"connect\"){\n     const conn=new Connection(this.id,msg.from);\n     this.connections.set(msg.from,conn);\n     this.emit(\"connection\",conn);\n     setTimeout(()=>{conn.open=true;conn.emit(\"open\");},30);\n    }\n    if(msg.type===\"data\")this.connections.get(msg.from)?.emit(\"data\",msg.data);\n    if(msg.type===\"close\"){\n     const conn=this.connections.get(msg.from);\n     if(conn){conn.open=false;conn.emit(\"close\");}\n    }\n   });\n   setTimeout(()=>this.emit(\"open\",this.id),15);\n  }\n  connect(id){\n   const conn=new Connection(this.id,id);this.connections.set(id,conn);\n   wire.postMessage({type:\"connect\",from:this.id,to:id});\n   setTimeout(()=>{conn.open=true;conn.emit(\"open\");},55);\n   return conn;\n  }\n  destroy(){for(const c of this.connections.values())c.close();}\n }\n window.Peer=Peer;\n})();";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const context=await browser.newContext({viewport:{width:390,height:844}});
try{
 await context.route("**/peerjs.min.js",route=>route.fulfill({status:200,contentType:"application/javascript",body:fakePeerJS}));
 await context.addInitScript(()=>{
  let n=0;
  Math.random=()=>{n++;return n%2===0?.08125:.2+n*0.00000007;};
 });
 const host=await context.newPage();
 const guest=await context.newPage();
 const errors=[];
 host.on("pageerror",e=>errors.push("host: "+e.message));
 guest.on("pageerror",e=>errors.push("guest: "+e.message));
 await Promise.all([
  host.goto("http://127.0.0.1:8000/",{waitUntil:"networkidle"}),
  guest.goto("http://127.0.0.1:8000/",{waitUntil:"networkidle"})
 ]);
 await host.locator('[data-modal="online"]').click();
 await host.locator('[data-modal="host-room"]').click();
 const code=(await host.locator(".room-code").textContent()).trim();
 assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);
 await guest.locator('[data-modal="online"]').click();
 await guest.locator('[data-modal="join-prompt"]').click();
 await guest.locator("#join-room-code").fill(code);
 await guest.locator('[data-modal="join-by-code"]').click();
 await host.locator("#modal.hidden").waitFor({state:"attached",timeout:15000});
 await guest.locator("#modal.hidden").waitFor({state:"attached",timeout:15000});
 assert.equal(await host.locator("#own-name").textContent(),"JUGADOR 1");
 assert.equal(await guest.locator("#own-name").textContent(),"JUGADOR 2");
 assert.equal(await host.locator("#hand .hand-card").count(),3);
 assert.equal(await guest.locator("#hand .hand-card").count(),3);
 assert.equal(await host.locator("#end-turn").isEnabled(),true);
 assert.equal(await guest.locator("#end-turn").isDisabled(),true);
 await host.locator("#hand .hand-card").first().click();
 await host.locator('#own-lanes [data-lane="0"]').click();
 await guest.locator('#enemy-lanes [data-lane="0"] .card-piece').waitFor({timeout:7000});
 assert.equal(await host.locator("#own-energy").textContent(),"0");
 await host.locator("#end-turn").click();
 await guest.waitForFunction(()=>document.getElementById("round").textContent.includes("J2"),{timeout:7000});
 assert.equal(await host.locator("#end-turn").isDisabled(),true);
 assert.equal(await guest.locator("#end-turn").isEnabled(),true);
 assert.match(await guest.locator("#round").textContent(),/PREP/);
 await guest.locator("#hand .hand-card").first().click();
 await guest.locator('#own-lanes [data-lane="1"]').click();
 await host.locator('#enemy-lanes [data-lane="1"] .card-piece').waitFor({timeout:7000});
 await guest.locator("#end-turn").click();
 await host.waitForFunction(()=>document.getElementById("round").textContent.includes("J1")&&!document.getElementById("round").textContent.includes("PREP"),{timeout:7000});
 assert.equal(await guest.locator("#end-turn").isDisabled(),true);
 assert.equal(await host.locator("#end-turn").isEnabled(),true);
 assert.equal(await host.locator("#hand .hand-card").count(),3);
 assert.equal(await guest.locator("#hand .hand-card").count(),2);
 assert.match(await host.locator("#scale-label").textContent(),/BALANZA EQUILIBRADA/);
 await host.locator("#end-turn").click();
 await guest.waitForFunction(()=>document.getElementById("round").textContent.includes("J2")&&!document.getElementById("round").textContent.includes("PREP"),{timeout:7000});
 assert.match(await host.locator("#scale-label").textContent(),/JUGADOR 1 VA GANANDO POR 2/);
 assert.match(await guest.locator("#scale-label").textContent(),/JUGADOR 1 VA GANANDO POR 2/);
 await guest.locator("#end-turn").click();
 await host.waitForFunction(()=>document.getElementById("round").textContent.includes("J1"),{timeout:7000});
 assert.match(await host.locator("#scale-label").textContent(),/BALANZA EQUILIBRADA/);
 assert.match(await guest.locator("#scale-label").textContent(),/BALANZA EQUILIBRADA/);
 assert.equal(await host.locator("#end-turn").isEnabled(),true);
 assert.equal(await guest.locator("#end-turn").isDisabled(),true);
 assert.deepEqual(errors,[]);
 console.log("PASS dual-browser: 6-char room; 3-card hands; J1-J2 turns; real card plays, attacks and synchronized balance");
}finally{
 await context.close();await browser.close();
}
