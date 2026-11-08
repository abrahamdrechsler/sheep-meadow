"""Fully decode each new MP3 and assert duration, finite signal and peak headroom."""
import subprocess,json,numpy as np
from pathlib import Path
p=Path(__file__).resolve().parents[1]/'dist/audio';result={}
expected=json.loads((p/'bulldozer-audio-levels.json').read_text())
for name,source in expected.items():
 f=p/(name+'.mp3')
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(f),'-f','f32le','-ac','1','-ar','32000','pipe:1']);a=np.frombuffer(b,dtype=np.float32)
 assert len(a)>0 and np.isfinite(a).all(),f
 assert np.max(np.abs(a))<.99,f
 assert abs(len(a)/32000-source['seconds'])<.002,f
 result[f.name]={'decoded_seconds':round(len(a)/32000,3),'mono_peak_dbfs':round(float(20*np.log10(np.max(np.abs(a)))),2),'mono_rms_dbfs':round(float(20*np.log10(np.sqrt(np.mean(a*a)))),2)}
print(json.dumps(result,indent=2));(p/'bulldozer-decoded-levels.json').write_text(json.dumps(result,indent=2)+'\n')
