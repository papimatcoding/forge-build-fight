import assert from "node:assert/strict";
import {chromium} from "playwright";

const targets=[
 {width:390,height:844,label:"phone-portrait"},
 {width:320,height:568,label:"small-phone-portrait"},
 {width:844,height:390,label:"phone-landscape"},
 {width:1366,height:768,label:"desktop"},
 {width:1280,height:720,label:"laptop"}
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
let failed=false;
try{
 for(const target of targets){
  const context=await browser.newContext({
   viewport:{width:target.width,height:target.height},deviceScaleFactor:1,
   reducedMotion:"reduce"
  });
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  try{
   await page.goto("http://127.0.0.1:8000/",{waitUntil:"networkidle",timeout:20000});
   await page.locator('[data-modal="local"]').click({timeout:10000});
   await page.waitForSelector(".hand-card",{timeout:10000});
   assert.equal(await page.locator(".hand-card").count(),3,target.label+": initial hand");
   const verify=async phase=>{
    const measurements=await page.evaluate(()=>{
     const ids=[".topbar",".board",".hand-panel","#hand","#end-turn","#own-lanes","#enemy-lanes",".scale"];
     const bounds={};
     for(const selector of ids){
      const node=document.querySelector(selector);
      if(!node)throw Error("Missing element "+selector);
      const box=node.getBoundingClientRect();
      bounds[selector]={top:Math.round(box.top),bottom:Math.round(box.bottom),left:Math.round(box.left),right:Math.round(box.right),height:Math.round(box.height),width:Math.round(box.width)};
     }
     return {
      vw:window.innerWidth,vh:window.innerHeight,
      docW:document.documentElement.scrollWidth,docH:document.documentElement.scrollHeight,
      bodyW:document.body.scrollWidth,bodyH:document.body.scrollHeight,
      bounds
     };
    });
    for(const [selector,rect] of Object.entries(measurements.bounds)){
     assert.ok(rect.height>=8,target.label+"/"+phase+": "+selector+" has insufficient height "+JSON.stringify(measurements));
     assert.ok(rect.top>=-2 && rect.bottom<=measurements.vh+2,target.label+"/"+phase+": "+selector+" outside viewport vertically "+JSON.stringify(measurements));
     assert.ok(rect.left>=-2 && rect.right<=measurements.vw+2,target.label+"/"+phase+": "+selector+" outside viewport horizontally "+JSON.stringify(measurements));
    }
    assert.ok(measurements.docH<=measurements.vh+2,target.label+"/"+phase+": page requires vertical scroll "+JSON.stringify(measurements));
    assert.ok(measurements.docW<=measurements.vw+2,target.label+"/"+phase+": page requires horizontal scroll "+JSON.stringify(measurements));
   };
   await verify("initial-3");
   await page.locator("#end-turn").click();
   await page.locator('[data-modal="ready"]').click();
   assert.equal(await page.locator(".hand-card").count(),3,target.label+": second player's opening hand");
   await verify("p2-opening-3");
   await page.locator("#end-turn").click();
   await page.locator('[data-modal="ready"]').click();
   assert.equal(await page.locator(".hand-card").count(),4,target.label+": next turn draws one");
   await verify("next-turn-4");
   assert.deepEqual(errors,[],target.label+": JavaScript console errors");
   console.log("PASS "+target.label+" ("+target.width+"x"+target.height+") — no page scroll, both initial hands 3, next-turn draw");
  }catch(error){
   failed=true;
   console.error("FAIL "+target.label+": "+error.stack);
   await page.screenshot({path:"/tmp/barbaridades-"+target.label+".png",fullPage:true}).catch(()=>{});
  }finally{
   await context.close();
  }
 }
}finally{
 await browser.close();
}
if(failed)process.exitCode=1;
