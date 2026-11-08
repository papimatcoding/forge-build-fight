import assert from "node:assert/strict";
import {chromium} from "playwright";

const sizes=[
 {width:345,height:690,name:"user-mobile"},
 {width:320,height:568,name:"small-android"},
 {width:390,height:844,name:"android-portrait"},
 {width:844,height:390,name:"phone-landscape"},
 {width:1366,height:768,name:"desktop"}
];
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
let failures=0;
for(const size of sizes){
 const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},deviceScaleFactor:1});
 const page=await ctx.newPage();
 page.setDefaultTimeout(10000);
 const errors=[];
 page.on("pageerror",err=>errors.push(err.message));
 try{
  // All starting cards become Abuela (cost 3), guaranteeing a real playable
  // on-board card instead of relying on a lucky random starting hand.
  await page.addInitScript(()=>{
   let count=0;
   Math.random=()=>0.106+(count++ % 10000)*0.00000001;
  });
  await page.goto("http://127.0.0.1:8000/",{waitUntil:"networkidle"});
  const background=await page.evaluate(async()=>{
   const style=getComputedStyle(document.querySelector(".board")).backgroundImage;
   const response=await fetch("./assets/board/arena.svg");
   return {style,ok:response.ok,status:response.status};
  });
  assert.equal(background.ok,true,size.name+": SVG arena is deployed");
  assert.ok(background.style.includes("arena.svg"),size.name+": board uses live artwork");
  await page.locator('[data-modal="local"]').click();
  assert.equal(await page.locator(".hand-card").count(),3,size.name+": exactly 3 starting cards");
  assert.equal(await page.locator("#hand .hand-card .card-art-image").count(),3,size.name+": opening cards have images");
  await page.locator("#hand .hand-card").last().click();
  const firstSlot=page.locator('#own-lanes [data-lane="0"]');
  await firstSlot.click();
  assert.equal(await page.locator("#own-lanes .lane.filled").count(),1,size.name+": a card placed on the field");
  assert.equal(await page.locator("#hand .hand-card").count(),2,size.name+": card is removed from hand");
  await page.locator("#own-lanes .lane.filled .card-art-image").waitFor({state:"visible"});
  const measure=await page.evaluate(()=>{
   const selectors=[".shell",".topbar",".layout",".main-panel",".board","#enemy-lanes","#own-lanes",".hand-panel","#hand","#end-turn",".board .lane.filled",".board .lane.filled .card-piece",".board .lane.filled .card-art",".board .lane.filled .card-art-image",".hand-card .card-art"];
   const rects={};
   for(const sel of selectors){
    const el=document.querySelector(sel);
    if(!el)throw Error("Missing "+sel);
    const r=el.getBoundingClientRect();
    rects[sel]={x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};
   }
   const img=document.querySelector(".board .lane.filled .card-art-image");
   const end=document.querySelector("#end-turn");
   const b=end.getBoundingClientRect();
   const clickTop=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
   return {
    rects,docH:document.documentElement.scrollHeight,docW:document.documentElement.scrollWidth,
    vw:innerWidth,vh:innerHeight,
    footerHidden:getComputedStyle(document.querySelector(".shell > footer")).display==="none",
    imgLoaded:img.complete&&img.naturalWidth>0,
    imgFit:getComputedStyle(img).objectFit,
    endHit:Boolean(clickTop?.closest("#end-turn")),
    handArtImgLoaded:[...document.querySelectorAll(".hand-card .card-art-image")].every(el=>el.complete&&el.naturalWidth>0)
   };
  });
  console.log("GEOMETRY "+size.name+" "+JSON.stringify({viewport:[measure.vw,measure.vh],board:measure.rects[".board"],lane:measure.rects[".board .lane.filled"],card:measure.rects[".board .lane.filled .card-piece"],art:measure.rects[".board .lane.filled .card-art"],hand:measure.rects["#hand"],handArt:measure.rects[".hand-card .card-art"],button:measure.rects["#end-turn"],endHit:measure.endHit}));
  assert.equal(measure.footerHidden,true,size.name+": old footer must be hidden");
  assert.equal(measure.imgLoaded,true,size.name+": field card must display actual PNG");
  assert.equal(measure.handArtImgLoaded,true,size.name+": hand card PNGs must load");
  assert.equal(measure.imgFit,"contain",size.name+": card PNG must not be cropped");
  assert.ok(measure.docH<=size.height+1,size.name+": page is vertically scrollable: "+JSON.stringify(measure));
  assert.ok(measure.docW<=size.width+1,size.name+": page is horizontally scrollable: "+JSON.stringify(measure));
  const art=measure.rects[".board .lane.filled .card-art"];
  assert.ok(art.h >= (size.height < 500 ? 9 : 27),size.name+": field artwork collapsed to a strip: "+JSON.stringify(measure));
  assert.ok(measure.rects[".hand-card .card-art"].h>=15,size.name+": hand artwork collapsed: "+JSON.stringify(measure));
  const hit=measure.rects["#end-turn"];
  assert.ok(hit.bottom<=size.height&&hit.y>=0,size.name+": end turn button off screen");
  assert.equal(measure.endHit,true,size.name+": field card overlays the end-turn button");
  assert.deepEqual(errors,[],size.name+": runtime JS errors");
  await page.screenshot({path:"/tmp/barbaridades-"+size.name+"-field.png",fullPage:true});
  await page.locator("#end-turn").click();
  await page.locator('[data-modal="ready"]').click();
  assert.equal(await page.locator(".hand-card").count(),3,size.name+": player 2 starts with 3");
  console.log("PASS "+size.name+" "+size.width+"x"+size.height+" fieldArt="+Math.round(art.h)+"px handArt="+Math.round(measure.rects[".hand-card .card-art"].h)+"px endTurn hit=true");
 }catch(error){
  failures++;
  console.error("FAIL "+size.name+": "+error.stack);
  await page.screenshot({path:"/tmp/barbaridades-"+size.name+"-FAIL.png",fullPage:true}).catch(()=>{});
 }finally{await ctx.close();}
}
await browser.close();
if(failures)process.exitCode=1;
