import test from "node:test";
import assert from "node:assert/strict";
import {encodeSignal,decodeSignal,isRemoteCommand} from "../remote.js";

test("manual offer and answer codes survive copy/paste",()=>{
 for(const type of ["offer","answer"]){
  const signal={version:1,type,description:{type,sdp:"v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n"}};
  const code=encodeSignal(signal);
  assert.match(code,/^[a-zA-Z0-9_-]+$/);
  assert.deepEqual(decodeSignal("  "+code+"  "),signal);
 }
});
test("manual SDP rejects invalid or oversized input",()=>{
 assert.throws(()=>decodeSignal("not a valid code"));
 const bad=encodeSignal({version:2,type:"offer",description:{type:"offer",sdp:"test"}});
 assert.throws(()=>decodeSignal(bad));
 const mismatch=encodeSignal({version:1,type:"answer",description:{type:"offer",sdp:"test"}});
 assert.throws(()=>decodeSignal(mismatch));
 assert.throws(()=>decodeSignal("a".repeat(250001)));
});
test("P2P commands require strictly sequential ordered turns",()=>{
 const good={type:"command",seq:1,action:{type:"play",uid:"abc123",lane:2}};
 assert.equal(isRemoteCommand(good,1),true);
 assert.equal(isRemoteCommand(good,2),false);
 assert.equal(isRemoteCommand({...good,action:{type:"end"}},1),true);
 assert.equal(isRemoteCommand({...good,action:{type:"play",uid:"abc123",lane:null}},1),true);
 assert.equal(isRemoteCommand({...good,action:{type:"play",uid:"abc123",lane:9}},1),false);
 assert.equal(isRemoteCommand({...good,seq:0},1),false);
 assert.equal(isRemoteCommand({...good,action:{type:"play",uid:"",lane:0}},1),false);
});
