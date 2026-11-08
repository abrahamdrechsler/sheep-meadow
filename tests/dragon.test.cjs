const assert=require('node:assert/strict');
const M=require('../dist/core.js');
let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
const idle={x:0,y:0,jump:false,baa:false,bite:false,hat:false,wool:false};
const close=(actual,expected,epsilon=1e-8)=>assert.ok(Math.abs(actual-expected)<epsilon,`${actual} != ${expected}`);
function fresh(){return{w:M.world({random:()=>.5}),a:M.sheep('pad0',0),b:M.sheep('pad1',1)};}
function eggAt(w,x=540,y=350,z=0){M.stepWorld(w,[],w.nextEggIn);Object.assign(w.egg,{x,y,z,vx:0,vy:0,vz:0,turnIn:100});return w.egg;}
function dragon(w,a,all=[a]){eggAt(w,a.x+50,a.y);w.egg.hits=2;a.attack=true;M.combat(all,w);assert.equal(a.dragon,30);}
function tick(w,all,dt,inputs={}){M.stepWorld(w,all,dt);for(const s of all)M.step(s,inputs[s.id]||idle,dt);return M.combat(all,w);}
function bite(w,a,all=[a]){M.step(a,{...idle,bite:true},.01);M.combat(all,w);M.step(a,idle,.2);return M.combat(all,w);}

test('default egg appears at exactly 50 seconds, not before',()=>{
  const {w}=fresh();assert.equal(w.nextEggIn,50);M.stepWorld(w,[],49.999);assert.equal(w.egg,null);
  M.stepWorld(w,[],.001);assert.ok(w.egg);assert.equal(w.egg.hits,0);assert.equal(w.egg.id,1);
});
test('configurable spawn interval supports tests without changing production default',()=>{
  const w=M.world({spawnInterval:2,random:()=>.5});M.stepWorld(w,[],1.99);assert.equal(w.egg,null);M.stepWorld(w,[],.01);assert.ok(w.egg);
  for(const value of [0,-1,Infinity,NaN])assert.equal(M.world({spawnInterval:value}).spawnInterval,50);
});
test('only one egg exists after arbitrarily long elapsed time',()=>{
  const {w}=fresh();M.stepWorld(w,[],120);const first=w.egg;M.stepWorld(w,[],1e9);assert.equal(w.egg,first);assert.equal(w.eggSerial,1);assert.equal(w.nextEggIn,50);
});
test('egg rolls, bounces, wanders and reflects within reachable meadow bounds',()=>{
  let seed=12;const w=M.world({spawnInterval:1,random:()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)});M.stepWorld(w,[],1);
  const initial={...w.egg};let peak=0,landed=false,turned=false;
  for(let i=0;i<600;i++){M.stepWorld(w,[],.05);const e=w.egg;peak=Math.max(peak,e.z);if(i>20&&e.z<1)landed=true;if(Math.abs(e.heading-initial.heading)>.2)turned=true;assert.ok(e.x>=140&&e.x<=1060);assert.ok(e.y>=195&&e.y<=635);assert.ok(e.z>=0&&e.z<55);}
  assert.ok(peak>15&&landed&&turned);assert.ok(w.egg.roll>0);assert.notEqual(w.egg.x,initial.x);
  Object.assign(w.egg,{x:1059,y:634,vx:120,vy:120});M.stepWorld(w,[],.05);assert.ok(w.egg.vx<0&&w.egg.vy<0);
});
test('egg bites use normal windup and only one impact per action',()=>{
  const {w,a}=fresh();eggAt(w,a.x+50);M.step(a,{...idle,bite:true},.01);M.combat([a],w);assert.equal(w.egg.hits,0);
  M.step(a,{...idle,bite:true},.199);M.combat([a],w);assert.equal(w.egg.hits,0);
  M.step(a,{...idle,bite:true},.001);M.combat([a],w);assert.equal(w.egg.hits,1);assert.equal(w.egg.hit,.42);M.combat([a],w);assert.equal(w.egg.hits,1);
});
test('egg misses behind, to the side, outside range and above bite height',()=>{
  for(const [dx,dy,z]of [[-40,0,0],[0,40,0],[84,0,0],[40,0,55]]){const {w,a}=fresh();eggAt(w,a.x+dx,a.y+dy,z);a.attack=true;M.combat([a],w);assert.equal(w.egg.hits,0);}
});
test('diagonal and jumping bites use heading and matching egg elevation',()=>{
  const {w,a}=fresh();a.heading=Math.PI/4;a.z=70;eggAt(w,a.x+40,a.y+40,35);a.attack=true;M.combat([a],w);assert.equal(w.egg.hits,1);
});
test('holding and rapid represses cannot accumulate egg hits through cooldown',()=>{
  const {w,a}=fresh();eggAt(w,a.x+50);bite(w,a);assert.equal(w.egg.hits,1);
  for(let i=0;i<20;i++){M.step(a,{...idle,bite:true},.02);M.combat([a],w);}assert.equal(w.egg.hits,1);
  M.step(a,idle,.01);M.step(a,{...idle,bite:true},.01);M.combat([a],w);assert.equal(a.bite,0);
  M.step(a,idle,.8);bite(w,a);assert.equal(w.egg.hits,2);
});
test('third successful biter alone owns a 30-second dragon',()=>{
  const {w,a,b}=fresh();b.x=a.x;b.y=a.y+20;eggAt(w,a.x+50,a.y+10);
  a.attack=true;M.combat([a,b],w);assert.equal(w.egg.hits,1);assert.equal(a.dragon,0);
  a.attack=true;M.combat([a,b],w);assert.equal(w.egg.hits,2);b.attack=true;M.combat([a,b],w);
  assert.equal(w.egg,null);assert.equal(w.dragonOwner,b.id);assert.equal(w.dragonTime,30);assert.equal(b.dragon,30);assert.equal(a.dragon,0);assert.equal(b.fire,0);
});
test('simultaneous third bites deterministically use slot order, not array order',()=>{
  for(const reverse of [false,true]){const {w,a,b}=fresh();a.x=480;a.y=330;b.x=480;b.y=370;eggAt(w,530,350);w.egg.hits=2;a.attack=b.attack=true;M.combat(reverse?[b,a]:[a,b],w);assert.equal(w.dragonOwner,a.id);assert.equal(b.dragon,0);}
});
test('multiple simultaneous hits award the actual third valid bite',()=>{
  const {w}=fresh(),all=[0,1,2].map(n=>M.sheep('pad'+n,n));for(const s of all)Object.assign(s,{x:480,y:350,attack:true});eggAt(w,530,350);M.combat([...all].reverse(),w);assert.equal(w.dragonOwner,'pad2');assert.equal(all[2].dragon,30);
});
test('KO or disconnected attackers cannot bite the egg',()=>{
  for(const changes of [{ko:2,health:0},{connected:false}]){const {w,a}=fresh();eggAt(w,a.x+50);Object.assign(a,changes,{attack:true});M.combat([a],w);assert.equal(w.egg.hits,0);assert.equal(a.attack,false);}
});
test('a sheep KO during simultaneous combat cannot claim the egg',()=>{
  const {w,a,b}=fresh();a.health=1;b.x=a.x+30;b.heading=Math.PI;a.attack=b.attack=true;eggAt(w,a.x+50);w.egg.hits=2;M.combat([a,b],w);assert.equal(a.ko,5);assert.equal(w.dragonOwner,null);assert.equal(w.egg.hits,2);
});
test('dragon B breathes instant fire instead of a normal bite windup',()=>{
  const {w,a,b}=fresh();b.x=a.x+120;dragon(w,a,[a,b]);a.biteCool=0;
  M.step(a,{...idle,bite:true},.016);assert.equal(a.fire,.55);assert.equal(a.fireAttack,true);assert.equal(a.attack,false);assert.equal(a.bite,0);
  assert.equal(M.combat([a,b],w),1);assert.equal(b.health,0);assert.equal(b.ko,5);assert.equal(b.bbq,true);assert.equal(b.hit,.42);assert.equal(b.z,0);assert.equal(b.vz,0);assert.equal(a.health,3);
});
test('fire misses rear, lateral, too-far and vertically separated sheep',()=>{
  for(const [dx,dy,z]of [[-100,0,0],[0,100,0],[231,0,0],[150,0,85],[100,150,0]]){const {w,a,b}=fresh();b.x=a.x+dx;b.y=a.y+dy;b.z=z;dragon(w,a);a.fireAttack=true;M.combat([a,b],w);assert.equal(b.health,3);assert.equal(b.bbq,false);}
});
test('fire reaches multiple forward targets and follows arbitrary headings',()=>{
  const {w,a}=fresh();dragon(w,a);a.heading=Math.PI/2;const b=M.sheep('pad1',1),c=M.sheep('pad2',2);
  Object.assign(b,{x:a.x,y:a.y+200,z:30});Object.assign(c,{x:a.x+15,y:a.y+130});a.fireAttack=true;assert.equal(M.combat([a,b,c],w),2);assert.equal(b.bbq,true);assert.equal(c.bbq,true);
});
test('fire action is consumed once and missing line prevents stale contact damage',()=>{
  const {w,a,b}=fresh();dragon(w,a);b.x=a.x+150;a.fireAttack=true;M.combat([a,b],w);b.ko=3;M.combat([a,b],w);assert.equal(b.ko,3);
  const c=M.sheep('pad2',2);c.x=a.x+120;a.fire=.5;a.fireLine=null;M.combat([a,c],w);assert.equal(c.health,3);
});
test('holding fire never repeats and rapid represses respect 2-second cooldown',()=>{
  const {w,a}=fresh();dragon(w,a);a.biteCool=0;M.step(a,{...idle,bite:true},.01);assert.equal(a.fireAttack,true);M.combat([a],w);
  M.step(a,{...idle,bite:true},2);assert.equal(a.fireAttack,false);M.step(a,idle,.01);M.step(a,{...idle,bite:true},.01);assert.equal(a.fireAttack,true);M.combat([a],w);
  M.step(a,idle,.01);M.step(a,{...idle,bite:true},.01);assert.equal(a.fireAttack,false);
});
test('already KO sheep are immune and fire cannot reset their five-second timer',()=>{
  const {w,a,b}=fresh();dragon(w,a);Object.assign(b,{x:a.x+150,ko:2,health:0,bbq:false});a.fireAttack=true;assert.equal(M.combat([a,b],w),0);assert.equal(b.ko,2);assert.equal(b.bbq,false);
});
test('BBQ sheep cannot move, jump, baa, bite or breathe fire while KO',()=>{
  const {w,a,b}=fresh();dragon(w,a);b.x=a.x+150;a.fireAttack=true;M.combat([a,b],w);const x=b.x;
  M.step(b,{...idle,x:1,jump:true,bite:true,baa:true},.1);assert.equal(b.x,x);assert.equal(b.z,0);assert.equal(b.baa,0);assert.equal(b.attack,false);assert.equal(b.fireAttack,false);assert.equal(b.bbq,true);
});
test('BBQ restores health, wool and hat after exactly five seconds',()=>{
  const {w,a,b}=fresh();dragon(w,a);Object.assign(b,{x:a.x+150,hat:3,woolIndex:1,woolColor:M.woolColors[1]});const color=b.color;a.fireAttack=true;M.combat([a,b],w);
  M.step(b,idle,4.999);assert.equal(b.bbq,true);assert.equal(b.health,0);M.step(b,idle,.001);assert.equal(b.ko,0);assert.equal(b.bbq,false);assert.equal(b.health,3);assert.equal(b.hat,3);assert.equal(b.woolColor,M.woolColors[1]);assert.equal(b.woolIndex,1);assert.equal(b.color,color);assert.equal(b.x,570);assert.equal(b.y,350);
});
test('color selection during BBQ is retained after respawn without leaking damage color',()=>{
  const {w,a,b}=fresh();dragon(w,a);b.x=a.x+150;a.fireAttack=true;M.combat([a,b],w);M.step(b,{...idle,wool:true},.1);assert.equal(b.woolColor,M.woolColors[0]);M.step(b,idle,4.9);assert.equal(b.bbq,false);assert.equal(b.woolColor,M.woolColors[0]);
});
test('dragon expires at 30 seconds and restores chosen cosmetics',()=>{
  const {w,a}=fresh();Object.assign(a,{hat:2,woolIndex:2,woolColor:M.woolColors[2]});dragon(w,a);M.stepWorld(w,[a],29.999);assert.ok(a.dragon>0);a.fire=.4;a.fireAttack=true;M.stepWorld(w,[a],.001);
  assert.equal(a.dragon,0);assert.equal(a.fire,0);assert.equal(a.fireAttack,false);assert.equal(w.dragonOwner,null);assert.equal(a.hat,2);assert.equal(a.woolColor,M.woolColors[2]);assert.equal(w.nextEggIn,50);assert.equal(w.egg,null);
});
test('no egg during dragon; next egg needs a fresh two-minute interval',()=>{
  const {w,a}=fresh();dragon(w,a);M.stepWorld(w,[a],29);assert.equal(w.egg,null);assert.equal(w.nextEggIn,50);M.stepWorld(w,[a],50);assert.equal(w.egg,null);close(w.nextEggIn,1);M.stepWorld(w,[a],1);assert.ok(w.egg);assert.equal(w.egg.id,2);
});
test('large elapsed delta crosses expiration and the next spawn without losing time',()=>{
  const {w,a}=fresh();dragon(w,a);M.stepWorld(w,[a],150);assert.equal(w.dragonOwner,null);assert.equal(a.dragon,0);assert.ok(w.egg);assert.equal(w.eggSerial,2);
});
test('dragon countdown survives disconnect and same-slot reconnection',()=>{
  const {w,a}=fresh();dragon(w,a);a.connected=false;const flock=new Map([[a.id,a]]);M.stepWorld(w,flock,10);assert.equal(a.dragon,20);assert.equal(w.dragonOwner,a.id);
  a.connected=true;M.stepWorld(w,flock,5);assert.equal(a.dragon,15);assert.equal(flock.get('pad0'),a);assert.equal(w.egg,null);
});
test('removed dragon owner cancels the power and resets spawn interval',()=>{
  const {w,a,b}=fresh();dragon(w,a);M.stepWorld(w,[b],0);assert.equal(w.dragonOwner,null);assert.equal(w.dragonTime,0);assert.equal(w.nextEggIn,50);assert.equal(b.dragon,0);assert.equal(w.egg,null);
});
test('owner knocked out loses dragon immediately and cannot retain fire',()=>{
  const {w,a,b}=fresh();dragon(w,a);a.health=1;b.x=a.x+40;b.heading=Math.PI;b.attack=true;a.fire=.5;M.combat([a,b],w);assert.equal(a.ko,5);assert.equal(a.dragon,0);assert.equal(a.fire,0);assert.equal(w.dragonOwner,null);assert.equal(w.nextEggIn,50);
});
test('external owner KO is reconciled by stepWorld without a combat call',()=>{
  const {w,a}=fresh();dragon(w,a);a.ko=5;a.health=0;M.stepWorld(w,[a],0);assert.equal(a.dragon,0);assert.equal(w.dragonOwner,null);assert.equal(w.nextEggIn,50);
});
test('expired dragon B becomes a bite and cannot use stale fire attack',()=>{
  const {w,a,b}=fresh();dragon(w,a);b.x=a.x+150;a.fireAttack=true;M.stepWorld(w,[a,b],30);M.combat([a,b],w);assert.equal(b.health,3);a.biteCool=0;M.step(a,{...idle,bite:true},.01);assert.equal(a.bite,.45);assert.equal(a.fireAttack,false);
});
test('disconnection cancels windup and stale fire without moving the slot',()=>{
  const {w,a,b}=fresh();eggAt(w,a.x+50);M.step(a,{...idle,bite:true},.01);a.connected=false;const x=a.x;M.step(a,{...idle,x:1,bite:true},.3);M.combat([a,b],w);assert.equal(w.egg.hits,0);assert.equal(a.x,x);assert.equal(a.bite,0);
  a.dragon=20;a.fireAttack=true;M.combat([a,b],w);assert.equal(b.health,3);assert.equal(a.fireAttack,false);
});
test('disconnected sheep finish jumps and effect timers without accepting stale input',()=>{
  const {a}=fresh();Object.assign(a,{connected:false,z:20,vz:-200,baa:.5,cool:.5});const x=a.x;
  for(let n=0;n<10;n++)M.step(a,{...idle,x:1,jump:true,bite:true,hat:true,wool:true,baa:true},.05);
  assert.equal(a.x,x);assert.equal(a.z,0);assert.equal(a.baa,0);assert.equal(a.cool,0);assert.equal(a.hat,0);assert.equal(a.woolIndex,-1);assert.equal(a.bite,0);
});
test('zero, negative and non-finite deltas do not advance timers or create NaN state',()=>{
  const {w,a}=fresh();dragon(w,a);a.fire=.4;a.hit=.3;a.biteCool=.7;
  for(const dt of [0,-1,NaN,Infinity,-Infinity]){M.stepWorld(w,[a],dt);M.step(a,idle,dt);assert.equal(a.dragon,30);assert.equal(a.fire,.4);assert.equal(a.hit,.3);assert.equal(a.biteCool,.7);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.z));}
});
test('large sheep delta expires effects and cooldown without teleporting',()=>{
  const {a}=fresh();Object.assign(a,{hit:.42,fire:.55,biteCool:.8});const x=a.x;M.step(a,{...idle,x:1},100);assert.equal(a.hit,0);assert.equal(a.fire,0);assert.equal(a.biteCool,0);close(a.x-x,10.5);
});
test('fire effect fades in 550ms and resets fully during KO',()=>{
  const {w,a}=fresh();dragon(w,a);a.biteCool=0;M.step(a,{...idle,bite:true},.01);M.step(a,idle,.54);close(a.fire,.01);M.step(a,idle,.01);assert.equal(a.fire,0);a.fire=.55;a.ko=4;M.step(a,idle,.01);assert.equal(a.fire,0);
});
test('ordinary bite keeps v11 feedback and never applies BBQ appearance',()=>{
  const {a,b}=fresh();b.x=a.x+50;a.attack=true;M.combat([a,b]);assert.equal(b.health,2);assert.equal(b.hit,.42);assert.equal(b.bbq,false);b.health=1;a.attack=true;M.combat([a,b]);assert.equal(b.ko,5);assert.equal(b.bbq,false);
});
test('frame pipeline supports Map flock and independently advances dragon and KO time',()=>{
  const {w,a,b}=fresh();dragon(w,a);const all=[a,b];Object.assign(b,{ko:5,health:0,bbq:true});tick(w,all,5);assert.equal(a.dragon,25);assert.equal(b.ko,0);assert.equal(b.health,3);assert.equal(b.bbq,false);M.stepWorld(w,new Map(all.map(s=>[s.id,s])),1);assert.equal(a.dragon,24);
});
console.log(count+' egg / dragon core tests passed');
