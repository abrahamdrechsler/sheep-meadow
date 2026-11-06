(function(root){
function create(options={}){
 const Context=options.Context||root.AudioContext||root.webkitAudioContext,fetcher=options.fetcher||root.fetch?.bind(root);let context=null,musicSource=null,master=null,musicGain=null,effectsGain=null,loading=null,hidden=false,musicOffset=0,musicStarted=0;const buffers={},errors={},active=new Set();let musicEnabled=true,effectsEnabled=true;
 const urls=options.urls||{baa:'audio/sheep-baa.mp3',chomp:'audio/chomp.mp3',music:'audio/meadow-music.mp3'};
 function setup(){if(context)return true;if(!Context)return false;try{context=new Context();master=context.createGain();master.gain.value=.85;master.connect(context.destination);musicGain=context.createGain();musicGain.gain.value=.20;musicGain.connect(master);effectsGain=context.createGain();effectsGain.gain.value=.8;effectsGain.connect(master);context.onstatechange=syncMusic;return true;}catch(e){errors.engine='Audio unsupported';return false;}}
 function preload(){if(loading)return loading;if(!setup()||!fetcher)return Promise.resolve();loading=Promise.all(Object.entries(urls).map(async([name,url])=>{try{const response=await fetcher(url);if(!response.ok)throw Error('HTTP '+response.status);const bytes=await response.arrayBuffer();buffers[name]=await context.decodeAudioData(bytes);delete errors[name];syncMusic();}catch(e){errors[name]='Could not load '+name;}}));return loading;}
 function stopMusic(){if(!musicSource)return;musicOffset=(musicOffset+Math.max(0,context.currentTime-musicStarted))%(buffers.music?.duration||1);try{musicSource.stop();}catch(e){}musicSource.disconnect();musicSource=null;}
 function syncMusic(){if(!musicEnabled||hidden||context?.state!=='running'||!buffers.music){stopMusic();return;}if(musicSource)return;musicSource=context.createBufferSource();musicSource.buffer=buffers.music;musicSource.loop=true;musicSource.connect(musicGain);musicStarted=context.currentTime;musicSource.start(0,musicOffset);}
 function activate(){if(!setup())return Promise.resolve(false);preload();let result;try{result=context.state==='running'?Promise.resolve():context.resume();}catch(e){return Promise.resolve(false);}return Promise.resolve(result).then(()=>{syncMusic();return context.state==='running';}).catch(()=>false);}
 function play(name){if(!effectsEnabled||hidden||context?.state!=='running'||!buffers[name])return false;if(active.size>=8)return false;const source=context.createBufferSource();source.buffer=buffers[name];source.connect(effectsGain);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();};source.start();return true;}
 function setEffects(value){effectsEnabled=!!value;if(!value){for(const source of active){try{source.stop();}catch(e){}source.disconnect();}active.clear();}return effectsEnabled;}
 function setMusic(value){musicEnabled=!!value;syncMusic();return musicEnabled;}
 function visibility(value){hidden=!!value;syncMusic();if(hidden){for(const source of active){try{source.stop();}catch(e){}}active.clear();}}
 function status(){const state=!Context?'unavailable':context?.state||'waiting';const failed=Object.keys(errors);return{musicEnabled,effectsEnabled,state,ready:Object.keys(buffers),errors:failed,musicPlaying:!!musicSource,label:failed.length?'load error: '+failed.join(', '):state==='running'?(Object.keys(buffers).length===3?'ready':'loading recordings'):'click Start for audio'};}
 preload();if(context?.state==='running')syncMusic();
 return{activate,preload,play,setEffects,setMusic,visibility,status};
}
root.MeadowAudio={create};if(typeof module!=='undefined')module.exports=root.MeadowAudio;
})(typeof window==='undefined'?globalThis:window);
