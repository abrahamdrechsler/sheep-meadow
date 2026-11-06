const assert=require('node:assert/strict');const M=require('../dist/core.js');let passed=0;function test(n,f){f();passed++;console.log('PASS '+n)}
function pad(index,x,y,pressed=[]){return{index,connected:true,axes:[x,y],buttons:Array.from({length:16},(_,i)=>({pressed:pressed.includes(i)}))};}
test('deadzone prevents drift',()=>assert.equal(M.axis(.17),0));
test('normalized diagonals',()=>{let i=M.input(pad(0,1,1));assert.ok(Math.abs(Math.hypot(i.x,i.y)-1)<1e-10)});
test('D-pad mapping and actions',()=>{let i=M.input(pad(0,0,0,[12,15,0,2,3]));assert.ok(i.x>0&&i.y<0&&i.jump&&i.baa&&i.hat)});
test('four independent controllers move their own sheep',()=>{const s=Array.from({length:4},(_,i)=>M.sheep('pad'+i,i));let before=s.map(x=>[x.x,x.y]);[[1,0],[-1,0],[0,1],[0,-1]].forEach(([x,y],i)=>M.step(s[i],M.input(pad(i,x,y)),.05));assert.ok(s[0].x>before[0][0]);assert.ok(s[1].x<before[1][0]);assert.ok(s[2].y>before[2][1]);assert.ok(s[3].y<before[3][1]);});
test('jump rises and lands, held button does not repeat',()=>{let s=M.sheep('p',0),i=M.input(pad(0,0,0,[0]));M.step(s,i,.016);assert.ok(s.z>0);for(let n=0;n<120;n++)M.step(s,i,.016);assert.equal(s.z,0);M.step(s,M.input(pad(0,0,0)),.016);M.step(s,i,.016);assert.ok(s.z>0)});
test('baa edge trigger and hat cycles',()=>{let s=M.sheep('p',0),i=M.input(pad(0,0,0,[2,3]));M.step(s,i,.016);assert.ok(s.baa>1);assert.equal(s.hat,1);M.step(s,i,.016);assert.equal(s.hat,1);for(let j=0;j<3;j++){M.step(s,M.input(pad(0,0,0)),.016);M.step(s,i,.016)}assert.equal(s.hat,0)});
test('world boundaries and timestep clamp',()=>{let s=M.sheep('p',0),i=M.input(pad(0,-1,-1));M.step(s,i,100);assert.ok(s.x>460);for(let n=0;n<1000;n++)M.step(s,i,.05);assert.equal(s.x,110);assert.equal(s.y,170)});
test('missing axes and buttons safe',()=>assert.deepEqual(M.input({}),{x:0,y:0,jump:false,baa:false,bite:false,hat:false,wool:false}));
console.log(passed+' tests passed');
