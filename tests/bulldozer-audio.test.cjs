const assert=require('node:assert/strict');
const {create}=require('../dist/audio.js');
const sources=[];let ctx;
class Context{
 constructor(){ctx=this;this.state='suspended';this.currentTime=0;this.destination={};}
 createGain(){return{gain:{value:0,setTargetAtTime(){}},connect(){},disconnect(){}};}
 createBufferSource(){const s={connect(){},disconnect(){},start(t,o){this.offset=o;},stop(t){this.stopped=true;if(!t)this.onended?.();}};sources.push(s);return s;}
 async decodeAudioData(){return{duration:100};}
 async resume(){this.state='running';this.onstatechange?.();}
}
(async()=>{
 const a=create({Context,fetcher:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})});await a.preload();await a.activate();
 const current=()=>sources.filter(s=>s.loop).at(-1);
 ctx.currentTime=4;assert.equal(a.setMode('bulldozer'),true);assert.equal(a.status().mode,'bulldozer');assert.equal(current().offset,0);
 const count=sources.length;a.setMode('bulldozer');assert.equal(sources.length,count);
 ctx.currentTime=7;a.setMode('dragon');assert.equal(current().offset,0);
 ctx.currentTime=9;a.setMode('meadow');assert.equal(current().offset,4);
 ctx.currentTime=10;a.setMode('bulldozer');assert.equal(current().offset,3);
 ctx.currentTime=12;a.setMusic(false);ctx.currentTime=20;a.setMode('dragon');assert.equal(a.status().musicPlaying,false);a.setMusic(true);assert.equal(current().offset,2);
 ctx.currentTime=22;a.visibility(true);ctx.currentTime=40;a.setMode('bulldozer');assert.equal(a.status().musicPlaying,false);a.visibility(false);assert.equal(current().offset,5);
 for(const cue of ['signHit','dozerStart','charge','crunch','launch','horn'])assert.equal(a.play(cue),true,cue);
 assert.equal(a.play('charge'),true);assert.equal(a.play('crunch'),true);assert.equal(a.status().activeVoices,8);assert.equal(a.play('horn'),false);
 a.setEffects(false);for(const cue of ['signHit','dozerStart','charge','crunch','launch','horn'])assert.equal(a.play(cue),false);
 assert.equal(a.status().activeVoices,0);assert.equal(a.status().musicPlaying,true);
 a.setEffects(true);a.visibility(true);assert.equal(a.play('horn'),false);a.visibility(false);assert.equal(a.play('horn'),true);
 assert.equal(a.setMode('invalid'),false);assert.equal(a.status().mode,'bulldozer');a.setBoss(true);assert.equal(a.status().mode,'dragon');a.setBoss(false);assert.equal(a.status().mode,'meadow');
 // All six directed transitions; returning to modes retains offsets and selected mutes.
 for(const from of ['meadow','dragon','bulldozer'])for(const to of ['meadow','dragon','bulldozer']){
  a.setMode(from);ctx.currentTime++;a.setMode(to);assert.equal(a.status().mode,to);assert.equal(a.status().musicPlaying,true);
  const before=sources.length;a.setMode(to);assert.equal(sources.length,before);
 }
 a.setMusic(false);a.setEffects(false);a.setMode('bulldozer');a.visibility(true);a.visibility(false);assert.equal(a.status().musicPlaying,false);assert.equal(a.play('charge'),false);
 console.log('PASS bulldozer audio: all mode pairs, repeated selection, three independent offsets, muted switch, hidden switch, effects mutes, eight-voice cap, legacy setBoss.');
})().catch(e=>{console.error(e);process.exitCode=1;});
