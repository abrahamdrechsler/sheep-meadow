import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {create} from '../src/meadow3d.js';

const noop=()=>{},motion={matches:false};
globalThis.devicePixelRatio=1;
globalThis.matchMedia=()=>motion;
globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>new Proxy({getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4)})},{get:(o,k)=>o[k]||noop,set:()=>true})})};
let scene,renderer;
class FakeRenderer{constructor(){renderer=this;this.shadowMap={};}setPixelRatio(){}setSize(){}render(s){scene=s;s.updateMatrixWorld(true);}}
const view=create({clientWidth:1280,clientHeight:800},FakeRenderer);
const base={id:'p0',n:0,x:600,y:400,z:0,walk:.3,heading:.7,ko:0,bite:0,health:3,hat:2,baa:0,color:'#eaa0a0',woolColor:'#a9d9f3',dragon:0,fire:0,bbq:false};
function frame(s,t,world){if(world!==undefined)view.world(world);view.begin();view.sheep(s);view.render(t);}
frame(base,0);
const egg=scene.getObjectByName('dragon-egg'),day=scene.background.clone();
assert.equal(egg.visible,false);assert.equal(scene.getObjectByName('red-dragon'),undefined);assert.equal(renderer.toneMappingExposure,1.05);
console.log('PASS renderer remains backward-compatible without world state');
const world={egg:{x:460,y:360,z:28,heading:.4,roll:1.3,hits:1},dragonOwner:null};
frame(base,.1,world);
assert.equal(egg.visible,true);assert.equal(egg.children[0].rotation.z,-1.3);assert.equal(scene.getObjectByName('egg-cracks').visible,true);assert.equal(scene.getObjectsByProperty('name','dragon-egg').length,1);
const bounceY=egg.position.y;world.egg.z=0;frame(base,.2,world);assert.ok(Math.abs(bounceY-egg.position.y-.28)<1e-10);
console.log('PASS exactly one speckled egg follows world bounce, roll and cracked state');
const powered={...base,dragon:30,fire:.3};frame(powered,.3,{egg:null,dragonOwner:'p0'});
const dragon=scene.getObjectByName('red-dragon'),bare=()=>scene.getObjectByName('bbq-bare-sheep'),fire=scene.getObjectByName('directional-fire-breath'),tilt=dragon.parent,body=tilt.children.find(o=>o!==dragon&&o.isGroup);
assert.ok(dragon.visible);assert.equal(body.visible,false);assert.equal(egg.visible,false);assert.ok(fire.visible);assert.ok(dragon.getObjectByName('dragon-left-wing'));assert.ok(dragon.getObjectByName('dragon-right-wing'));assert.ok(dragon.getObjectByName('dragon-tail'));assert.equal(dragon.rotation.y,-Math.atan2(Math.sin(base.heading)*1.2,Math.cos(base.heading)));assert.equal(fire.parent,scene);assert.ok(fire.getObjectsByProperty('name','flame-tongue').length>=3);
scene.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite));if(o.isMesh){assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));assert.ok(o.scale.toArray().every(Number.isFinite));}});
console.log('PASS red mesh dragon replaces sheep with wings, horns, tail and directional fire');
for(let i=4;i<35;i++)frame(powered,i*.1,{egg:null,dragonOwner:'p0'});
assert.ok(scene.background.distanceToSquared?scene.background.distanceToSquared(day)>0:scene.background.getHex()!==day.getHex());assert.ok(renderer.toneMappingExposure<.86);assert.ok(scene.getObjectsByProperty('type','HemisphereLight')[0].intensity<.75);
frame({...powered,fire:0},3.5);assert.equal(fire.visible,false);
console.log('PASS scene darkens smoothly and fire switches off after its animation timer');
frame({...base,ko:5,bbq:true},3.6,{egg:null,dragonOwner:null});assert.equal(dragon.visible,false);assert.ok(bare().visible);assert.equal(body.visible,false);assert.equal(tilt.rotation.z,Math.PI);const blackColors=new Set();bare().traverse(o=>{if(o.isMesh)blackColors.add(o.material.color.getHexString());});assert.ok(blackColors.has('272823'));assert.ok(blackColors.has('181d1b'));assert.ok(!blackColors.has('a9d9f3'));
console.log('PASS BBQ victims are black, furless and upside-down during KO');
for(let i=37;i<80;i++)frame(base,i*.1,{egg:null,dragonOwner:null});
assert.equal(bare().visible,false);assert.equal(body.visible,true);assert.equal(dragon.visible,false);assert.equal(tilt.rotation.z,0);assert.ok(body.getObjectByName('Party hat').visible);const restored=[];body.traverse(o=>{if(o.isMesh&&o.material.color.getHexString()==='a9d9f3')restored.push(o);});assert.ok(restored.length>30);assert.ok(renderer.toneMappingExposure>1.049);assert.equal(scene.background.getHexString(),day.getHexString());
console.log('PASS expiration restores daylight, selected wool and hat without material contamination');
motion.matches=true;frame({...powered,hit:.3},8,{egg:{...world.egg,z:50,roll:2},dragonOwner:'p0'});const wings=dragon.getObjectByName('dragon-left-wing'),tail=dragon.getObjectByName('dragon-tail');assert.equal(tilt.position.x,0);assert.equal(wings.rotation.x,0);assert.equal(tail.rotation.y,0);assert.equal(egg.children[0].rotation.z,0);assert.equal(fire.scale.y,1);const stillY=egg.position.y;frame(powered,8.1,{egg:{...world.egg,z:90,roll:4},dragonOwner:'p0'});assert.equal(egg.position.y,stillY);assert.equal(fire.scale.y,1);
console.log('PASS reduced motion disables shake, wing/tail oscillation, egg roll and fire flicker');

const calls=[],styles=[],labels=[];let fillStyle;
const ctx=new Proxy({fillText:(...v)=>labels.push(v),fill:(...v)=>calls.push(['fill',fillStyle,...v]),translate:(...v)=>calls.push(['translate',...v]),rotate:(...v)=>calls.push(['rotate',...v]),scale:(...v)=>calls.push(['scale',...v]),ellipse:(...v)=>calls.push(['ellipse',...v]),fillRect:(...v)=>calls.push(['fillRect',fillStyle,...v])},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>{if(k==='fillStyle'){fillStyle=v;styles.push(v);}if(k==='strokeStyle')styles.push(v);return true;}});
const sandbox={window:{},Math,matchMedia:()=>motion};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../dist/fallback.js',import.meta.url),'utf8'),sandbox);const fallback=sandbox.window.MeadowFallback.create({getContext:()=>ctx});
motion.matches=false;fallback.world(world);fallback.begin();assert.ok(styles.includes('#f2d28e'));assert.ok(styles.includes('#894631'));calls.length=0;fallback.sheep(powered);assert.ok(styles.includes('#bd352e'));assert.ok(styles.includes('#ef702c'));assert.ok(calls.some(v=>v[0]==='rotate'&&v[1]===powered.heading));assert.ok(labels.some(v=>v[0].includes('DRAGON 30s')));
fallback.world({egg:null,dragonOwner:'p0'});for(let i=0;i<40;i++)fallback.render(i*.1);fallback.begin();assert.ok(styles.includes('#222236'));
console.log('PASS Canvas fallback draws the egg, directional red dragon/fire, timer and darkened meadow');
styles.length=0;calls.length=0;fallback.sheep({...base,ko:5,bbq:true});assert.ok(styles.includes('#272823'));assert.ok(!styles.includes('#a9d9f3'));assert.ok(calls.some(v=>v[0]==='rotate'&&v[1]===Math.PI+base.heading));assert.ok(labels.some(v=>v[0].includes('BBQ 5s')));styles.length=0;fallback.sheep(base);assert.ok(styles.includes('#a9d9f3'));
console.log('PASS Canvas BBQ loses its wool, flips upside-down and restores selected wool on recovery');
motion.matches=true;calls.length=0;fallback.world({egg:{...world.egg,z:50,roll:2},dragonOwner:'p0'});fallback.begin();assert.ok(calls.some(v=>v[0]==='rotate'&&v[1]===0));const eggMove=calls.find(v=>v[0]==='translate'&&v[1]===world.egg.x);assert.equal(eggMove[2],world.egg.y-3.5-21);
console.log('PASS Canvas reduced motion caps egg bounce and disables egg rolling');
console.log('10 dragon renderer checks passed (scene graph and mocked Canvas, no GPU rasterization)');

// Captured world coordinates must not follow subsequent movement or turning.
motion.matches=false;
const fixedLine={x:600,y:400,z:0,heading:0,length:230,radius:16};
frame({...powered,fireLine:fixedLine},9,{egg:null,dragonOwner:'p0',scorches:[]});
const fixedPosition=fire.position.clone(),fixedRotation=fire.rotation.y;
frame({...powered,x:780,y:530,heading:2.4,fireLine:fixedLine},9.1);
assert.ok(fire.position.equals(fixedPosition));assert.equal(fire.rotation.y,fixedRotation);
assert.equal(fire.children.length,5);assert.equal(fire.children.reduce((n,q)=>n+q.count,0),110);
const poolGeometries=fire.children.map(q=>q.geometry),poolMaterials=fire.children.map(q=>q.material);
for(let i=0;i<40;i++)frame({...powered,fireLine:fixedLine},9.2+i*.02);
fire.children.forEach((q,i)=>{assert.equal(q.geometry,poolGeometries[i]);assert.equal(q.material,poolMaterials[i]);assert.ok([...q.instanceMatrix.array].every(Number.isFinite));});
console.log('PASS directional jet stays fixed while owner moves/turns; 110 pooled particles reuse GPU resources');
const scorch={id:1,x:1056,y:175,heading:0,length:230,radius:16,life:12,maxLife:12};
frame(base,10.1,{egg:null,dragonOwner:null,scorches:[scorch]});
const marks=scene.getObjectsByProperty('name','fading-ground-scorch');assert.equal(marks.length,24);assert.equal(marks.filter(q=>q.visible).length,1);
const fullOpacity=marks[0].material.opacity;assert.ok(fullOpacity>0);
const charred=[];scene.traverse(q=>{if(q.userData.unburned&&!q.material.color.equals(q.userData.unburned))charred.push(q);});assert.ok(charred.length>0);
scorch.life=1;frame(base,10.2);assert.ok(marks[0].material.opacity<fullOpacity);
frame(base,10.3,{egg:null,dragonOwner:null,scorches:[]});assert.ok(marks.every(q=>!q.visible));charred.forEach(q=>assert.ok(q.material.color.equals(q.userData.unburned)));
console.log('PASS 24 pooled terrain scorch ribbons fade, disappear, and restore independent tree materials');
motion.matches=true;frame(base,10.4,{egg:{...world.egg,hit:.42},dragonOwner:null});
const eggGlow=scene.getObjectByName('egg-hit-glow');assert.ok(eggGlow.visible);assert.ok(eggGlow.material.opacity>0);
frame(base,10.5,{egg:{...world.egg,hit:0},dragonOwner:null});assert.equal(eggGlow.visible,false);
console.log('PASS brief red egg-hit glow works under reduced motion and clears after hit timer');

// Regression: northern ridge and diagonal hill jets must stay above the rendered terrain triangles.
const {Matrix4,Vector3,Raycaster}=await import('three');
const terrain=scene.getObjectByName('feathered-meadow-ground'),ray=new Raycaster(),particleMatrix=new Matrix4(),particlePosition=new Vector3();
motion.matches=false;
for(const [x,y,heading]of [[400,170,0],[916,315,-Math.PI/4]]){
 frame({...powered,x,y,heading,fireLine:{x,y,z:0,heading,length:230,radius:16}},11,{egg:null,dragonOwner:'p0',scorches:[]});
 for(const layer of fire.children)for(let i=0;i<layer.count;i++){
  layer.getMatrixAt(i,particleMatrix);particlePosition.setFromMatrixPosition(particleMatrix).applyMatrix4(layer.matrixWorld);
  ray.set(new Vector3(particlePosition.x,10,particlePosition.z),new Vector3(0,-1,0));const hit=ray.intersectObject(terrain)[0];
  if(hit)assert.ok(particlePosition.y>hit.point.y+.07,'fire center buried in hill');
 }
}
const mask=marks[0].material.alphaMap.image.data;
assert.equal(mask[1],0);assert.equal(mask[((16*128)+0)*4+1],0);assert.ok(mask[((16*128)+64)*4+1]>240);
assert.equal(marks[0].geometry.attributes.position.count,245);
console.log('PASS both northern GPU repro paths have all particle centers above terrain; scorch mask has rounded feathered ends');
frame({...base,squash:.5},11.1,{egg:null,dragonOwner:null,scorches:[]});assert.ok(tilt.scale.y<.8);assert.ok(tilt.scale.x>.95);
frame({...base,squash:.25},11.2);const recoveredY=tilt.scale.y;assert.ok(recoveredY>.8&&recoveredY<.95);
frame({...base,squash:0},11.3);assert.equal(tilt.scale.y,.95);assert.equal(tilt.scale.x,.95);
motion.matches=true;frame({...base,squash:.5},11.4);assert.ok(tilt.scale.y>.88&&tilt.scale.y<.95);
console.log('PASS head-bounce squash gently widens/compresses, recovers, and reduces amplitude under reduced motion');

motion.matches=false;calls.length=0;fallback.sheep({...base,squash:.5});assert.ok(calls.some(v=>v[0]==='scale'&&v[1]>1&&v[2]<1));motion.matches=true;calls.length=0;fallback.sheep({...base,squash:.5});assert.ok(calls.some(v=>v[0]==='scale'&&v[2]>.9&&v[2]<1));console.log('PASS Canvas squash and reduced-motion squash are visible without flashes');

// Transparent ground spans the entire arena, so distance sorting alone can cover northern flames.
assert.equal(terrain.renderOrder,-30);assert.equal(terrain.material.transparent,true);assert.equal(terrain.material.depthWrite,false);
const terrainRibbons=[];scene.traverse(q=>{if(q.isMesh&&q.geometry.attributes.edgeAlpha)terrainRibbons.push(q);});assert.equal(terrainRibbons.length,3);
terrainRibbons.forEach(q=>assert.equal(q.renderOrder,-20));
marks.forEach(q=>{assert.equal(q.renderOrder,-10);assert.equal(q.material.depthTest,true);assert.equal(q.material.depthWrite,false);});
fire.children.forEach(q=>{assert.ok(q.renderOrder>0&&q.renderOrder<10);assert.equal(q.material.depthTest,true);assert.equal(q.material.depthWrite,false);assert.equal(q.material.transparent,true);});
assert.equal(fire.renderOrder,0);assert.ok(fire.children[4].renderOrder<fire.children[0].renderOrder);
console.log('PASS transparent terrain, ribbons, scorch, smoke and flame have stable painter order; opaque depth occlusion stays enabled');
