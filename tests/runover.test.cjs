const assert=require('node:assert/strict'),M=require('../dist/core.js');let count=0;
function test(n,f){f();count++;console.log('PASS '+n);}
function setup(dx=1,dy=0,x=600,y=400){
 const w=M.world(),a=M.sheep('a',0),b=M.sheep('b',1);a.bulldozer=w.bulldozerTime=30;w.bulldozerOwner=a.id;
 a.x=x-dx*30;a.y=y-dy*30;a.charge={id:1,dx,dy,hits:[],started:true};b.x=x;b.y=y;
 M.step(a,{},.05);M.combat([a,b],w);assert.equal(b.runover,5);return{w,a,b};
}
test('all center directions visibly clear map and stay out until timed reset',()=>{
 for(let n=0;n<16;n++){const angle=n*Math.PI/8,{b}=setup(Math.cos(angle),Math.sin(angle));M.step(b,{},1.6);assert.equal(b.launch.offMap,true);assert.ok(b.x< -180||b.x>1380||b.y< -120||b.y>920);const pos=[b.x,b.y,b.z];M.step(b,{},3.399);assert.ok(b.runover>0);assert.deepEqual([b.x,b.y,b.z],pos);M.step(b,{},.001);assert.equal(b.runover,0);assert.equal(b.launch,null);assert.deepEqual([b.x,b.y,b.z],[570,350,0]);}
});
test('corner and boundary outward trajectories never clamp or bounce',()=>{
 for(const [x,y,dx,dy]of [[110,170,-Math.SQRT1_2,-Math.SQRT1_2],[1090,660,Math.SQRT1_2,Math.SQRT1_2],[110,400,-1,0],[1090,400,1,0],[600,170,0,-1],[600,660,0,1]]){const{b}=setup(dx,dy,x,y);M.step(b,{},.1);assert.ok((b.x-x)*dx+(b.y-y)*dy>100);M.step(b,{},1.5);assert.equal(b.launch.offMap,true);}
});
test('runover suppresses movement, jump, bite, fire, baa and cosmetic changes',()=>{const{b}=setup();b.hat=2;M.cycleWool(b);M.step(b,{x:-1,y:1,jump:true,bite:true,baa:true,hat:true,wool:true},.1);assert.equal(b.x,725);assert.equal(b.y,400);assert.equal(b.attack,false);assert.equal(b.bite,0);assert.equal(b.baa,0);assert.equal(b.hat,2);assert.equal(b.woolIndex,0);assert.equal(b.ko,0);});
test('runover excludes targets and attackers from combat and additional launches',()=>{const{w,a,b}=setup();b.x=a.x+20;b.y=a.y;b.z=0;b.attack=true;a.heading=0;a.attack=true;a.bulldozer=0;M.combat([a,b],w);assert.equal(b.health,3);assert.equal(a.health,3);a.bulldozer=30;a.charge={id:2,dx:1,dy:0,hits:[],started:true};M.step(a,{},.05);M.combat([a,b],w);assert.equal(w.chargeEvents.filter(e=>e.type==='launch').length,1);assert.equal(b.runover,5);});
test('fullhealth respawn preserves wool and hat and consumes held controls',()=>{const{b}=setup();b.health=1;b.hat=3;M.cycleWool(b);M.cycleWool(b);M.step(b,{bite:true,jump:true,hat:true,wool:true},5);assert.equal(b.health,3);assert.equal(b.hat,3);assert.equal(b.woolIndex,1);assert.equal(b.ko,0);assert.equal(b.bbq,false);M.step(b,{bite:true,jump:true,hat:true,wool:true},.05);assert.equal(b.bite,0);assert.equal(b.z,0);assert.equal(b.hat,3);assert.equal(b.woolIndex,1);});
test('zero and invalid dt pause flight and countdown; large dt resets once',()=>{const{b}=setup();for(const dt of [0,-5,NaN,Infinity]){M.step(b,{},dt);assert.equal(b.runover,5);assert.equal(b.launch.elapsed,0);}M.step(b,{},1e8);assert.equal(b.runover,0);assert.equal(b.launch,null);assert.equal(b.x,570);assert.equal(b.y,350);assert.equal(b.health,3);});
test('disconnect and reconnect preserve out-of-play flight and eventual respawn',()=>{const{b}=setup();b.connected=false;M.step(b,{bite:true},2);assert.equal(b.launch.offMap,true);assert.equal(b.runover,3);b.connected=true;M.step(b,{bite:true},2.9);assert.ok(b.runover>0);M.step(b,{bite:true},.1);assert.equal(b.runover,0);assert.equal(b.health,3);assert.equal(b.connected,true);});
test('bulldozer expiry/removal does not cancel a sheep already flung',()=>{for(const remove of [false,true]){const{w,a,b}=setup();w.bulldozerTime=.1;M.stepWorld(w,remove?[b]:[a,b],.1);assert.equal(w.bulldozerOwner,null);assert.equal(b.runover,5);assert.ok(b.launch);M.step(b,{},1.6);assert.equal(b.launch.offMap,true);M.step(b,{},3.4);assert.equal(b.runover,0);}});
test('dragon fire KO keeps existing BBQ and five second respawn semantics',()=>{const w=M.world(),a=M.sheep('a',0),b=M.sheep('b',1);a.dragon=30;w.dragonOwner=a.id;w.dragonTime=30;b.x=a.x+100;M.step(a,{bite:true},.01);M.combat([a,b],w);assert.equal(b.ko,5);assert.equal(b.runover,0);assert.equal(b.bbq,true);M.step(b,{},5);assert.equal(b.health,3);assert.equal(b.ko,0);assert.equal(b.runover,0);});
console.log(count+' runover tests passed');
