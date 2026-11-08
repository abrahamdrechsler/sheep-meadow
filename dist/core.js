(function(root){
const colors=['#eaa0a0','#8db9e6','#d9b667','#b4a0d8'];
const woolColors=['#a9d9f3','#f2b8d2','#f7df91','#cab5ed'],woolNames=['Light blue','Pink','Yellow','Purple'];
function cycleWool(s){s.woolIndex=(s.woolIndex+1)%4;s.woolColor=woolColors[s.woolIndex];return woolNames[s.woolIndex];}
function axis(n){return Math.abs(n||0)<.18?0:Math.sign(n)*(Math.abs(n)-.18)/.82;}
function stick(x,y){x=Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0;y=Number.isFinite(y)?Math.max(-1,Math.min(1,y)):0;const length=Math.hypot(x,y);if(length<=.18)return{x:0,y:0};const strength=(Math.min(length,1)-.18)/.82;return{x:x/length*strength,y:y/length*strength};}
function input(p){let {x,y}=stick(p.axes?.[0],p.axes?.[1]);const b=i=>!!p.buttons?.[i]?.pressed;const dx=(b(15)?1:0)-(b(14)?1:0),dy=(b(13)?1:0)-(b(12)?1:0);if(dx||dy){const length=Math.hypot(dx,dy);x=dx/length;y=dy/length;}return{x,y,jump:b(0),baa:b(2),bite:b(1),hat:b(3),wool:b(5)};}
function turn(current,target,dt){const delta=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+delta*(1-Math.exp(-18*dt));}
const rules=Object.freeze({eggInterval:50,runoverDuration:5,launchSpeed:1250,launchDuration:1.6,bulldozerDuration:30,bulldozerSpeed:150,chargeSpeed:1400,chargeCooldown:1.2,chargeRadius:40,trackDuration:12,maxTracks:72,eggBites:3,dragonDuration:30,fireDuration:.55,fireRange:230,fireHeight:85,fireRadius:16,fireCooldown:2,sheepSpeed:210,dragonSpeed:175,scorchDuration:12,maxScorches:24,biteRange:83,biteHeight:55,biteCos:.5,attackCooldown:.8,koDuration:5,jumpSpeed:560,gravity:850,fallGravity:450,stompHeight:85,stompRadius:30,squashDuration:.5});
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
function sheep(id,n){return{id,n,x:480+n*90,y:350,z:0,vz:0,squash:0,motion:null,face:1,heading:0,walk:0,hat:0,woolIndex:-1,woolColor:null,baa:0,cool:0,bite:0,biteCool:0,attack:false,health:3,hit:0,ko:0,dragon:0,bulldozer:0,charge:null,chargeSegment:null,chargeSerial:0,chargeCool:0,runover:0,launch:null,fire:0,fireLine:null,fireAttack:false,bbq:false,prev:{},connected:true,color:colors[n%4]};}

// Movement remains capped to avoid teleporting after a stalled frame. Timers use
// the full elapsed time, so a stall cannot extend a KO, cooldown, or power-up.
function step(s,i,dt){
  const seconds=elapsed(dt);dt=Math.min(seconds,.05);
  s.motion={x:s.x,y:s.y,z:s.z};s.chargeSegment=null;s.chargeCool=countdown(s.chargeCool,seconds);
  if(s.connected===false||!(s.bulldozer>0))s.charge=null;
  s.squash=countdown(s.squash,seconds);
  if(s.connected===false)i={x:0,y:0};
  s.attack=false;s.fireAttack=false;s.hit=countdown(s.hit,seconds);s.fire=countdown(s.fire,seconds);
  // Runover is a nonfatal out-of-play state, separate from bite/fire KO.
  // Analytic flight uses real active time so a stalled frame cannot trap a sheep.
  if(s.runover>0){
    s.runover=countdown(s.runover,seconds);s.prev={...i};s.motion=null;
    s.attack=false;s.fireAttack=false;s.bite=0;s.fire=0;s.fireLine=null;s.baa=0;s.squash=0;
    const flight=s.launch;
    if(flight){
      flight.elapsed=Math.min(flight.duration,flight.elapsed+seconds);const t=flight.elapsed;
      s.x=flight.x+flight.vx*t;s.y=flight.y+flight.vy*t;
      s.z=Math.max(0,flight.z+850*t-500*t*t);s.vz=850-1000*t;
      flight.offMap=s.x< -180||s.x>1380||s.y< -120||s.y>920;
    }
    if(s.runover===0){s.launch=null;s.health=3;s.x=480+s.n*90;s.y=350;s.z=0;s.vz=0;s.biteCool=.5;s.hit=0;s.bbq=false;}
    return;
  }
  if(i.wool&&!s.prev.wool)cycleWool(s);
  if(s.ko>0){
    s.ko=countdown(s.ko,seconds);s.prev={...i};s.fire=0;s.fireLine=null;s.squash=0;s.motion=null;s.charge=null;s.launch=null;
    if(s.ko===0){s.health=3;s.x=480+s.n*90;s.y=350;s.z=0;s.vz=0;s.bite=0;s.biteCool=.5;s.bbq=false;s.hit=0;}
    return;
  }
  const priorBite=s.bite;s.bite=countdown(s.bite,seconds);
  if(priorBite>.25&&s.bite<=.25&&!(s.dragon>0)&&!(s.bulldozer>0)&&s.connected!==false)s.attack=true;
  s.biteCool=countdown(s.biteCool,seconds);
  // Disconnected slots retain identity, cosmetics and power-up time, but never
  // execute a queued windup or a stale controller button.
  if(s.connected===false){s.bite=0;s.attack=false;s.fire=0;s.fireLine=null;}
  if(i.bite&&!s.prev.bite&&s.bulldozer>0&&!s.charge&&s.chargeCool===0&&s.z===0){
    const heading=Math.hypot(i.x||0,i.y||0)>.001?Math.atan2(i.y||0,i.x||0):s.heading;
    s.heading=heading;s.charge={id:++s.chargeSerial,dx:Math.cos(heading),dy:Math.sin(heading),hits:[],started:true};
  }
  if(i.bite&&!s.prev.bite&&s.biteCool===0&&!(s.bulldozer>0)){
    s.biteCool=s.dragon>0?rules.fireCooldown:rules.attackCooldown;
    if(s.dragon>0){s.bite=0;s.fire=rules.fireDuration;s.fireAttack=true;}
    else s.bite=.45;
  }
  if(s.charge){
    const c=s.charge,ox=s.x,oy=s.y;
    let distance=rules.chargeSpeed*dt;
    if(c.dx>1e-9)distance=Math.min(distance,(1090-s.x)/c.dx);
    if(c.dx< -1e-9)distance=Math.min(distance,(110-s.x)/c.dx);
    if(c.dy>1e-9)distance=Math.min(distance,(660-s.y)/c.dy);
    if(c.dy< -1e-9)distance=Math.min(distance,(170-s.y)/c.dy);
    distance=Math.max(0,distance);s.x+=c.dx*distance;s.y+=c.dy*distance;s.heading=Math.atan2(c.dy,c.dx);
    s.chargeSegment={x:ox,y:oy,x2:s.x,y2:s.y,charge:c};s.walk+=dt*25;
    if((c.dx< -1e-9&&s.x<=110+1e-7)||(c.dx>1e-9&&s.x>=1090-1e-7)||(c.dy< -1e-9&&s.y<=170+1e-7)||(c.dy>1e-9&&s.y>=660-1e-7)){s.charge=null;s.chargeCool=rules.chargeCooldown;s.chargeSegment.ended=true;}
  }else{
    const speed=(s.dragon>0?rules.dragonSpeed:s.bulldozer>0?rules.bulldozerSpeed:rules.sheepSpeed)*(s.squash>0?.25:1);
    s.x=Math.max(110,Math.min(1090,s.x+(i.x||0)*speed*dt));s.y=Math.max(170,Math.min(660,s.y+(i.y||0)*speed*dt));
    if(Math.hypot(i.x||0,i.y||0)>.001)s.heading=turn(s.heading,Math.atan2(i.y||0,i.x||0),dt);
    if(i.x)s.face=i.x<0?-1:1;s.walk+=Math.hypot(i.x||0,i.y||0)*dt*14;
  }
  if(i.jump&&!s.prev.jump&&s.z===0&&!(s.bulldozer>0)&&!s.launch)s.vz=rules.jumpSpeed;
  if(i.hat&&!s.prev.hat)s.hat=(s.hat+1)%4;
  if(i.baa&&!s.prev.baa&&s.cool<=0){s.baa=1.1;s.cool=.5;}
  s.vz-=(s.vz>0?rules.gravity:rules.fallGravity)*dt;s.z+=s.vz*dt;if(s.z<0){s.z=0;s.vz=0;if(s.launch){s.launch=null;s.squash=.25;}}
  s.baa=countdown(s.baa,seconds);s.cool=countdown(s.cool,seconds);s.prev={...i};
  if(s.fireAttack)s.fireLine=fireLine(s);
}

function world(options={}){
  const interval=Number.isFinite(options.spawnInterval)&&options.spawnInterval>0?options.spawnInterval:rules.eggInterval;
  return{nextEventKind:'dragon',bulldozerOwner:null,bulldozerTime:0,tracks:[],trackSerial:0,chargeEvents:[],chargeEventSerial:0,trees:[[132,170],[1056,175],[1080,595],[540,140],[372,655],[90,315],[180,580]].map(([x,y],id)=>({id,x,y,fallen:false,heading:0,fallTime:0})),egg:null,nextEggIn:interval,spawnInterval:interval,dragonOwner:null,dragonTime:0,elapsed:0,eggSerial:0,scorches:[],scorchSerial:0,random:typeof options.random==='function'?options.random:Math.random};
}
function random(w){const value=w.random();return Number.isFinite(value)?Math.max(0,Math.min(.999999999,value)):.5;}
function spawnEgg(w){
  const heading=random(w)*Math.PI*2,speed=75+random(w)*45;
  w.egg={kind:w.nextEventKind||'dragon',id:++w.eggSerial,x:300+random(w)*600,y:250+random(w)*300,z:0,vx:Math.cos(heading)*speed,vy:Math.sin(heading)*speed,vz:205,heading,roll:0,hits:0,hit:0,turnIn:1.2+random(w)*1.2};
  if(w.egg.kind==='bulldozer'){w.egg.vx=0;w.egg.vy=0;w.egg.vz=0;}
  w.nextEggIn=w.spawnInterval;
}
function endDragon(w,flock){
  for(const s of flock){s.dragon=0;s.fire=0;s.fireLine=null;s.fireAttack=false;}
  w.dragonOwner=null;w.dragonTime=0;w.nextEggIn=w.spawnInterval;
}
function startDragon(w,s,flock){
  for(const other of flock)other.dragon=0;
  w.nextEventKind='bulldozer';w.egg=null;w.dragonOwner=s.id;w.dragonTime=rules.dragonDuration;w.nextEggIn=w.spawnInterval;
  s.dragon=rules.dragonDuration;s.bite=0;s.biteCool=0;s.attack=false;s.fire=0;s.fireLine=null;s.fireAttack=false;
}
function endBulldozer(w,all){
  for(const s of all){s.bulldozer=0;s.charge=null;s.chargeSegment=null;s.chargeCool=0;}
  w.bulldozerOwner=null;w.bulldozerTime=0;w.nextEggIn=w.spawnInterval;
  for(const tree of w.trees||[])tree.fallen=false;
}
function startBulldozer(w,s,all){
  for(const other of all)other.bulldozer=0;
  w.egg=null;w.nextEventKind='dragon';w.bulldozerOwner=s.id;w.bulldozerTime=rules.bulldozerDuration;w.nextEggIn=w.spawnInterval;
  s.bulldozer=rules.bulldozerDuration;s.bite=0;s.biteCool=0;s.attack=false;s.charge=null;s.chargeCool=0;s.launch=null;s.z=0;s.vz=0;s.squash=0;
}
function chargeEvent(w,type,data){
  w.chargeEvents.push({id:++w.chargeEventSerial,type,...data});
  if(w.chargeEvents.length>64)w.chargeEvents.splice(0,w.chargeEvents.length-64);
}
function segmentDistance(x,y,x2,y2,px,py){
  const dx=x2-x,dy=y2-y,d=dx*dx+dy*dy,t=d?Math.max(0,Math.min(1,((px-x)*dx+(py-y)*dy)/d)):0;
  return Math.hypot(px-x-t*dx,py-y-t*dy);
}
function resolveCharges(w,all){
  for(const a of all){
    const p=a.chargeSegment;if(!p||a.ko>0||a.connected===false||!(a.bulldozer>0))continue;
    const c=p.charge,heading=Math.atan2(c.dy,c.dx),base={ownerId:a.id,x:a.x,y:a.y,heading,chargeId:c.id};
    if(c.started){chargeEvent(w,'chargeStart',base);c.started=false;}
    if(Math.hypot(p.x2-p.x,p.y2-p.y)>0){
      w.tracks.push({id:++w.trackSerial,x:p.x,y:p.y,x2:p.x2,y2:p.y2,heading,life:rules.trackDuration,maxLife:rules.trackDuration});
      if(w.tracks.length>rules.maxTracks)w.tracks.splice(0,w.tracks.length-rules.maxTracks);
    }
    for(const b of all){
      if(b===a||b.ko>0||b.runover>0||b.bulldozer>0||b.dragon>0||c.hits.includes(b.id))continue;
      const prior=b.motion||b;
      // Relative swept positions catch fast charges and moving sheep, not only endpoints.
      if(Math.min(prior.z||0,b.z||0)>70||segmentDistance(p.x-prior.x,p.y-prior.y,p.x2-b.x,p.y2-b.y,0,0)>rules.chargeRadius)continue;
      c.hits.push(b.id);b.runover=rules.runoverDuration;
      b.launch={vx:c.dx*rules.launchSpeed,vy:c.dy*rules.launchSpeed,x:b.x,y:b.y,z:Math.max(b.z,8),elapsed:0,duration:rules.launchDuration,offMap:false};
      b.vz=850;b.z=b.launch.z;b.squash=0;b.attack=false;b.bite=0;b.fireAttack=false;b.fire=0;b.fireLine=null;b.baa=0;b.motion=null;
      chargeEvent(w,'launch',{...base,targetId:b.id,x:b.x,y:b.y});
    }
    for(const tree of w.trees||[]){
      if(tree.fallen||segmentDistance(p.x,p.y,p.x2,p.y2,tree.x,tree.y)>rules.chargeRadius+20)continue;
      tree.fallen=true;tree.heading=heading;tree.fallTime=w.elapsed;chargeEvent(w,'tree',{...base,treeId:tree.id,x:tree.x,y:tree.y});
    }
    if(p.ended)chargeEvent(w,'chargeEnd',base);
    a.chargeSegment=null;
  }
}
function moveEgg(w,dt){
  const e=w.egg;e.hit=countdown(e.hit,dt);if(e.kind==='bulldozer')return;
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
  w.tracks=(w.tracks||[]).filter(mark=>(mark.life=countdown(mark.life,seconds))>0);
  if(w.bulldozerOwner!==null&&w.bulldozerOwner!==undefined){
    const owner=all.find(s=>s.id===w.bulldozerOwner);
    if(!owner||owner.ko>0)endBulldozer(w,all);
    else{
      const before=w.bulldozerTime;w.bulldozerTime=countdown(before,seconds);
      if(w.bulldozerTime>0){for(const s of all)s.bulldozer=s===owner?w.bulldozerTime:0;return w;}
      seconds=Math.max(0,seconds-before);endBulldozer(w,all);
    }
  }
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
function knockOut(s,bbq){s.charge=null;s.chargeSegment=null;s.launch=null;s.squash=0;s.motion=null;s.health=0;s.ko=rules.koDuration;s.bbq=!!bbq;s.baa=0;s.bite=0;s.fire=0;s.fireLine=null;s.attack=false;s.fireAttack=false;s.z=0;s.vz=0;}
// Resolve after combat so KO and newly transformed dragons cannot participate.
// Swept relative height and horizontal positions avoid tunneling. Snapshot all
// candidates before applying impulses to keep simultaneous contacts fair.
function bounce(flock){
  const all=members(flock),ordered=[...all].sort((a,b)=>a.n-b.n||String(a.id).localeCompare(String(b.id))),candidates=[];
  const eligible=s=>s.connected!==false&&s.ko<=0&&!(s.runover>0)&&!(s.dragon>0)&&!(s.bulldozer>0)&&!s.launch;
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
    if(a.ko>0||a.runover>0||a.connected===false)continue;
    const fire=(a.fireAttack||(a.fire>0&&a.fireLine))&&a.dragon>0,bite=a.attack&&!(a.dragon>0)&&!(a.bulldozer>0);
    if(!fire&&!bite)continue;
    if(fire&&a.fireAttack){if(!a.fireLine)a.fireLine=fireLine(a);scorch(w,a.fireLine);}
    for(const b of ordered){
      if(a===b||b.ko>0||b.runover>0)continue;
      if(fire?inFire(a.fireLine,b):inFront(a,b,rules.biteRange,rules.biteHeight,rules.biteCos))hits.push({target:b,fire});
    }
    if(bite&&w?.egg&&inFront(a,w.egg,rules.biteRange,rules.biteHeight,rules.biteCos))eggAttackers.push(a);
  }
  // Fire takes precedence when several actions land on the same frame. It
  // cannot convert a previously KO'd sheep or extend anybody's respawn timer.
  hits.sort((a,b)=>Number(b.fire)-Number(a.fire));let applied=0;
  for(const {target:b,fire}of hits){
    if(b.ko>0||b.runover>0)continue;
    b.health=fire?0:Math.max(0,b.health-1);b.hit=.42;applied++;
    if(b.health===0)knockOut(b,fire);
  }
  if(w?.dragonOwner!==null&&w?.dragonOwner!==undefined){const owner=all.find(s=>s.id===w.dragonOwner);if(!owner||owner.ko>0)endDragon(w,all);}
  if(w?.bulldozerOwner!=null){const owner=all.find(s=>s.id===w.bulldozerOwner);if(!owner||owner.ko>0)endBulldozer(w,all);}
  for(const a of eggAttackers){
    if(!w.egg||a.ko>0||a.runover>0)continue;
    const e=w.egg;e.hits++;e.hit=.42;if(e.kind!=='bulldozer'){e.vx=Math.cos(a.heading)*125;e.vy=Math.sin(a.heading)*125;e.vz=190;}
    if(e.hits>=rules.eggBites){if(e.kind==='bulldozer')startBulldozer(w,a,all);else startDragon(w,a,all);}
  }
  if(w)resolveCharges(w,ordered);
  for(const a of all){a.attack=false;a.fireAttack=false;}
  return applied;
}
root.Meadow={axis,stick,turn,input,sheep,step,combat,bounce,world,stepWorld,rules,terrainHeight,groundHeight,cycleWool,woolColors,woolNames};if(typeof module!=='undefined')module.exports=root.Meadow;
})(typeof window==='undefined'?globalThis:window);
