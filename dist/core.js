(function(root){
const colors=['#eaa0a0','#8db9e6','#d9b667','#b4a0d8'];
const woolColors=['#a9d9f3','#f2b8d2','#f7df91','#cab5ed'],woolNames=['Light blue','Pink','Yellow','Purple'];
function cycleWool(s){s.woolIndex=(s.woolIndex+1)%4;s.woolColor=woolColors[s.woolIndex];return woolNames[s.woolIndex];}
function axis(n){return Math.abs(n||0)<.18?0:Math.sign(n)*(Math.abs(n)-.18)/.82;}
function stick(x,y){x=Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;y=Number.isFinite(y)?Math.max(-1,Math.min(1,y)):0;const length=Math.hypot(x,y);if(length<=.18)return{x:0,y:0};const strength=(Math.min(length,1)-.18)/.82;return{x:x/length*strength,y:y/length*strength};}
function input(p){let {x,y}=stick(p.axes?.[0],p.axes?.[1]);const b=i=>!!p.buttons?.[i]?.pressed;const dx=(b(15)?1:0)-(b(14)?1:0),dy=(b(13)?1:0)-(b(12)?1:0);if(dx||dy){const length=Math.hypot(dx,dy);x=dx/length;y=dy/length;}return{x,y,jump:b(0),baa:b(2),bite:b(1),hat:b(3),wool:b(5)};}
function turn(current,target,dt){const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+delta*(1-Math.exp(-18*dt));}
const rules=Object.freeze({eggInterval:120,eggBites:3,dragonDuration:30,fireDuration:.55,fireRange:230,fireHeight:85,fireRadius:16,fireCooldown:2,sheepSpeed:210,dragonSpeed:175,scorchDuration:12,maxScorches:24,biteRange:83,biteHeight:55,biteCos:.5,attackCooldown:.8,koDuration:5,jumpSpeed:480,gravity:1000,fallGravity:600,stompHeight:85,stompRadius:30,squashDuration:.5});
function elapsed(dt){return Number.isFinite(dt)?Math.max(0,dt):0;}
function countdown(value,dt){const left=(value||0)-dt;return left>1e-9?left:0;}
function members(flock){return Array.from(flock instanceof Map?flock.values():flock||[]);}
function terrainHeight(x,z){
  const hill=(cx,cz,sx,sz,h)=>h*Math.exp(-((x-cx)**2/sx+(z-cz)**2/sz));
  const rolling=.15+hill(4,-2,13,8,.72)+hill(-1,3,11,7,.5)+hill(-7,-3,7,9,.36)+hill(7,4,8,5,.3)+Math.sin(x*.65+z*.35)*.07;
  const river=-4.8+Math.sin(z*.65+.8)*.65+Math.sin(z*1.4)*.22;
  return .08+rolling*(1-.82*Math.exp(-(((x-river)/.8)**2)));
}
function groundHeight(x,y){return 100*terrainHeight((x-600)/60,(y-400)/50);}
function sheep(id,n){return{id,n,x:480+n*90,y:350,z:0,vz:0,squash:0,motion:null,face:1,heading:0,walk:0,hat:0,woolIndex:-1,woolColor:null,baa:0,cool:0,bite:0,biteCool:0,attack:false,health:3,hit:0,ko:0,dragon:0,fire:0,fireLine:null,fireAttack:false,bbq:false,prev:{},connected:true,color:colors[n%4]};}

// Movement remains capped to avoid teleporting after a stalled frame. Timers use
// the full elapsed time, so a stall cannot extend a KO, cooldown, or power-up.
function step(s,i,dt){
  const seconds=elapsed(dt);dt=Math.min(seconds,.05);
  s.motion={x:s.x,y:s.y,z:s.z};
  s.squash=countdown(s.squash,seconds);
  if(s.connected===false)i={x:0,y:0};
  s.attack=false;s.fireAttack=false;s.hit=countdown(s.hit,seconds);s.fire=countdown(s.fire,seconds);
  if(i.wool&&!s.prev.wool)cycleWool(s);
  if(s.ko>0){
    s.ko=countdown(s.ko,seconds);s.prev={...i};s.fire=0;s.fireLine=null;s.squash=0;s.motion=null;
    if(s.ko===0){s.health=3;s.x=480+s.n*90;s.y=350;s.z=0;s.vz=0;s.bite=0;s.biteCool=.5;s.bbq=false;s.hit=0;}
    return;
  }
  const priorBite=s.bite;s.bite=countdown(s.bite,seconds);
  if(priorBite>.25&&s.bite<=.25&&!(s.dragon>0)&&s.connected!==false)s.attack=true;
  s.biteCool=countdown(s.biteCool,seconds);
  // Disconnected slots retain identity, cosmetics and power-up time, but never
  // execute a queued windup or a stale controller button.
  if(s.connected===false){s.bite=0;s.attack=false;s.fire=0;s.fireLine=null;}
  if(i.bite&&!s.prev.bite&&s.biteCool===0){
    s.biteCool=s.dragon>0?rules.fireCooldown:rules.attackCooldown;
    if(s.dragon>0){s.bite=0;s.fire=rules.fireDuration;s.fireAttack=true;}
    else s.bite=.45;
  }
  const speed=(s.dragon>0?rules.dragonSpeed:rules.sheepSpeed)*(s.squash>0?.25:1);
  s.x=Math.max(110,Math.min(1090,s.x+(i.x||0)*speed*dt));s.y=Math.max(170,Math.min(660,s.y+(i.y||0)*speed*dt));
  if(Math.hypot(i.x||0,i.y||0)>.001)s.heading=turn(s.heading,Math.atan2(i.y,i.x),dt);
  if(i.x)s.face=i.x<0?-1:1;s.walk+=Math.hypot(i.x||0,i.y||0)*dt*14;
  if(i.jump&&!s.prev.jump&&s.z===0)s.vz=rules.jumpSpeed;
  if(i.hat&&!s.prev.hat)s.hat=(s.hat+1)%4;
  if(i.baa&&!s.prev.baa&&s.cool<=0){s.baa=1.1;s.cool=.5;}
  s.vz-=(s.vz>0?rules.gravity:rules.fallGravity)*dt;s.z+=s.vz*dt;if(s.z<0){s.z=0;s.vz=0;}
  s.baa=countdown(s.baa,seconds);s.cool=countdown(s.cool,seconds);s.prev={...i};
  if(s.fireAttack)s.fireLine=fireLine(s);
}

function world(options={}){
  const interval=Number.isFinite(options.spawnInterval)&&options.spawnInterval>0?options.spawnInterval:rules.eggInterval;
  return{egg:null,nextEggIn:interval,spawnInterval:interval,dragonOwner:null,dragonTime:0,elapsed:0,eggSerial:0,scorches:[],scorchSerial:0,random:typeof options.random==='function'?options.random:Math.random};
}
function random(w){const value=w.random();return Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):.5;}
function spawnEgg(w){
  const heading=random(w)*Math.PI*2,speed=75+random(w)*45;
  w.egg={id:++w.eggSerial,x:300+random(w)*600,y:250+random(w)*300,z:0,vx:Math.cos(heading)*speed,vy:Math.sin(heading)*speed,vz:205,heading,roll:0,hits:0,hit:0,turnIn:1.2+random(w)*1.2};
  w.nextEggIn=w.spawnInterval;
}
function endDragon(w,flock){
  for(const s of flock){s.dragon=0;s.fire=0;s.fireLine=null;s.fireAttack=false;}
  w.dragonOwner=null;w.dragonTime=0;w.nextEggIn=w.spawnInterval;
}
function startDragon(w,s,flock){
  for(const other of flock)other.dragon=0;
  w.egg=null;w.dragonOwner=s.id;w.dragonTime=rules.dragonDuration;w.nextEggIn=w.spawnInterval;
  s.dragon=rules.dragonDuration;s.bite=0;s.biteCool=0;s.attack=false;s.fire=0;s.fireLine=null;s.fireAttack=false;
}
function moveEgg(w,dt){
  const e=w.egg;e.hit=countdown(e.hit,dt);
  // At most two seconds of obsolete visual physics need replaying after a long
  // suspension. Lifecycle timers above are never clamped or silently dropped.
  let remaining=Math.min(dt,2);
  while(remaining>1e-9){
    const step=Math.min(remaining,1/60);remaining-=step;e.turnIn-=step;
    if(e.turnIn<=0){
      const heading=Math.atan2(e.vy,e.vx)+(random(w)-.5)*2.6,speed=75+random(w)*45;
      e.vx=Math.cos(heading)*speed;e.vy=Math.sin(heading)*speed;e.turnIn=1.2+random(w)*1.2;
    }
    e.x+=e.vx*step;e.y+=e.vy*step;
    if(e.x<140){e.x=280-e.x;e.vx=Math.abs(e.vx);}else if(e.x>1060){e.x=2120-e.x;e.vx=-Math.abs(e.vx);}
    if(e.y<195){e.y=390-e.y;e.vy=Math.abs(e.vy);}else if(e.y>635){e.y=1270-e.y;e.vy=-Math.abs(e.vy);}
    e.vz-=600*step;e.z+=e.vz*step;if(e.z<=0){e.z=0;e.vz=175+random(w)*45;}
    e.heading=Math.atan2(e.vy,e.vx);e.roll+=Math.hypot(e.vx,e.vy)*step/18;
  }
}
function stepWorld(w,flock,dt){
  const all=members(flock);let seconds=elapsed(dt);w.elapsed+=seconds;
  w.scorches=(w.scorches||[]).filter(mark=>(mark.life=countdown(mark.life,seconds))>0);
  if(w.dragonOwner!==null){
    const owner=all.find(s=>s.id===w.dragonOwner);
    if(!owner||owner.ko>0)endDragon(w,all);
    else{
      const before=w.dragonTime;w.dragonTime=countdown(before,seconds);
      if(w.dragonTime>0){for(const s of all)s.dragon=s===owner?w.dragonTime:0;return w;}
      seconds=Math.max(0,seconds-before);endDragon(w,all);
    }
  }
  for(const s of all)if(s.dragon>0){s.dragon=0;s.fire=0;s.fireLine=null;s.fireAttack=false;}
  if(!w.egg){
    const before=w.nextEggIn;w.nextEggIn=countdown(before,seconds);
    if(w.nextEggIn>0)return w;
    seconds=Math.max(0,seconds-before);spawnEgg(w);
  }
  moveEgg(w,seconds);return w;
}
function inFront(a,b,range,height,cos){
  const dx=b.x-a.x,dy=b.y-a.y,distance=Math.hypot(dx,dy);
  return distance<=range&&dx*Math.cos(a.heading)+dy*Math.sin(a.heading)>=distance*cos&&Math.abs((a.z||0)-(b.z||0))<height;
}
// A finite capsule with round ends entirely inside [0,length]. The very same
// captured origin, heading and dimensions are consumed by both renderers.
function fireLine(s){return{x:s.x,y:s.y,z:s.z||0,heading:s.heading,length:rules.fireRange,radius:rules.fireRadius};}
function inFire(line,b){
  const dx=b.x-line.x,dy=b.y-line.y,c=Math.cos(line.heading),sn=Math.sin(line.heading);
  const along=dx*c+dy*sn,across=-dx*sn+dy*c;
  const center=Math.max(line.radius,Math.min(line.length-line.radius,along));
  return Math.hypot(along-center,across)<=line.radius+1e-9&&Math.abs((b.z||0)-line.z)<rules.fireHeight;
}
function scorch(w,line){
  if(!w||Math.abs(line.z)>=rules.fireHeight)return;
  w.scorches=w.scorches||[];
  w.scorches.push({id:++w.scorchSerial,x:line.x,y:line.y,heading:line.heading,length:line.length,radius:line.radius,life:rules.scorchDuration,maxLife:rules.scorchDuration});
  if(w.scorches.length>rules.maxScorches)w.scorches.splice(0,w.scorches.length-rules.maxScorches);
}
function knockOut(s,bbq){s.squash=0;s.motion=null;s.health=0;s.ko=rules.koDuration;s.bbq=!!bbq;s.baa=0;s.bite=0;s.fire=0;s.fireLine=null;s.attack=false;s.fireAttack=false;s.z=0;s.vz=0;}
// Resolve after combat so KO and newly transformed dragons cannot participate.
// Swept relative height and horizontal positions avoid tunneling. Snapshot all
// candidates before applying impulses to keep simultaneous contacts fair.
function bounce(flock){
  const all=members(flock),ordered=[...all].sort((a,b)=>a.n-b.n||String(a.id).localeCompare(String(b.id))),candidates=[];
  const eligible=s=>s.connected!==false&&s.ko<=0&&!(s.dragon>0);
  for(const a of ordered){
    if(!eligible(a)||!a.motion||a.vz>=0)continue;
    for(const b of ordered){
      if(a===b||!eligible(b))continue;
      const ap=a.motion,bp=b.motion||b;
      const before=ap.z+groundHeight(ap.x,ap.y)-bp.z-groundHeight(bp.x,bp.y)-rules.stompHeight,after=a.z+groundHeight(a.x,a.y)-b.z-groundHeight(b.x,b.y)-rules.stompHeight;
      if(before<0||after>0||before<=after)continue;
      const t=before/(before-after),ax=ap.x+(a.x-ap.x)*t,ay=ap.y+(a.y-ap.y)*t,bx=bp.x+(b.x-bp.x)*t,by=bp.y+(b.y-bp.y)*t;
      if(Math.hypot(ax-bx,ay-by)<=rules.stompRadius)candidates.push({a,b,t});
    }
  }
  candidates.sort((p,q)=>p.t-q.t||p.a.n-q.a.n||String(p.a.id).localeCompare(String(q.a.id))||p.b.n-q.b.n||String(p.b.id).localeCompare(String(q.b.id)));
  const bounced=new Set(),events=[];
  for(const {a,b}of candidates){
    if(bounced.has(a))continue;
    bounced.add(a);a.z=Math.max(0,b.z+groundHeight(b.x,b.y)+rules.stompHeight-groundHeight(a.x,a.y));a.vz=rules.jumpSpeed;b.squash=rules.squashDuration;
    events.push({jumperId:a.id,targetId:b.id});
  }
  for(const s of all)s.motion=null;
  return events;
}
function combat(flock,w){
  // Slot order, then ID, makes simultaneous bites deterministic independently
  // of Map insertion/reconnection order. Attack snapshots preserve traded hits.
  const all=members(flock),ordered=[...all].sort((a,b)=>a.n-b.n||String(a.id).localeCompare(String(b.id))),hits=[],eggAttackers=[];
  for(const a of ordered){
    if(a.ko>0||a.connected===false)continue;
    const fire=(a.fireAttack||(a.fire>0&&a.fireLine))&&a.dragon>0,bite=a.attack&&!(a.dragon>0);
    if(!fire&&!bite)continue;
    if(fire&&a.fireAttack){if(!a.fireLine)a.fireLine=fireLine(a);scorch(w,a.fireLine);}
    for(const b of ordered){
      if(a===b||b.ko>0)continue;
      if(fire?inFire(a.fireLine,b):inFront(a,b,rules.biteRange,rules.biteHeight,rules.biteCos))hits.push({target:b,fire});
    }
    if(bite&&w?.egg&&inFront(a,w.egg,rules.biteRange,rules.biteHeight,rules.biteCos))eggAttackers.push(a);
  }
  // Fire takes precedence when several actions land on the same frame. It
  // cannot convert a previously KO'd sheep or extend anybody's respawn timer.
  hits.sort((a,b)=>Number(b.fire)-Number(a.fire));let applied=0;
  for(const {target:b,fire}of hits){
    if(b.ko>0)continue;
    b.health=fire?0:Math.max(0,b.health-1);b.hit=.42;applied++;
    if(b.health===0)knockOut(b,fire);
  }
  if(w?.dragonOwner!==null&&w?.dragonOwner!==undefined){const owner=all.find(s=>s.id===w.dragonOwner);if(!owner||owner.ko>0)endDragon(w,all);}
  for(const a of eggAttackers){
    if(!w.egg||a.ko>0)continue;
    const e=w.egg;e.hits++;e.hit=.42;e.vx=Math.cos(a.heading)*125;e.vy=Math.sin(a.heading)*125;e.vz=190;
    if(e.hits>=rules.eggBites)startDragon(w,a,all);
  }
  for(const a of all){a.attack=false;a.fireAttack=false;}
  return applied;
}
root.Meadow={axis,stick,turn,input,sheep,step,combat,bounce,world,stepWorld,rules,terrainHeight,groundHeight,cycleWool,woolColors,woolNames};if(typeof module!=='undefined')module.exports=root.Meadow;
})(typeof window==='undefined'?globalThis:window);
