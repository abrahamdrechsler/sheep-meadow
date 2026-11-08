"""Original procedural composition and sound design; no samples or external music.
Rebuild: python scripts/generate-dozer-audio.py (numpy, scipy, ffmpeg required).
"""
from pathlib import Path
import numpy as np
from scipy.signal import butter,sosfilt
from scipy.io.wavfile import write
import subprocess,json
SR=32000
rng=np.random.default_rng(12150)
out=Path(__file__).resolve().parents[1]/'dist/audio'
def filt(x,hz,kind='lowpass'):return sosfilt(butter(2,hz,fs=SR,btype=kind,output='sos'),x)
def clock(d):return np.arange(round(SR*d))/SR
def pluck(f,d=.30):
 t=clock(d);return (np.sin(2*np.pi*f*t)+.50*np.sin(2*np.pi*2*f*t)*np.exp(-t*18)+.23*np.sin(2*np.pi*3*f*t)*np.exp(-t*24))*np.exp(-t*9)*np.minimum(t/.003,1)
def brass(f,d):
 t=clock(d);phase=2*np.pi*f*t+.014*np.sin(2*np.pi*5*t);return sum(np.sin(phase*k)/k**1.5 for k in range(1,7))*np.minimum(t/.025,1)*np.minimum((d-t)/.045,1)*(.8+.2*np.exp(-t*8))
def noise(d):return rng.normal(0,1,len(clock(d)))
report={}
def save(name,x,peak=.8):
 x=np.asarray(x);x*=peak/max(np.max(np.abs(x)),1e-8);x=np.clip(x,-.98,.98)
 wav=out/(name+'.wav');write(wav,SR,(x*32767).astype(np.int16))
 subprocess.run(['ffmpeg','-y','-v','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','128k',str(out/(name+'.mp3'))],check=True);wav.unlink()
 report[name]={'seconds':round(len(x)/SR,3),'source_peak_dbfs':round(20*np.log10(np.max(np.abs(x))),2),'source_rms_dbfs':round(20*np.log10(np.sqrt(np.mean(x*x))),2)}
# 16-bar original A-minor rodeo chase; picked banjo-like lead, offbeat chords,
# walking bass, galloping snare and kick, restrained brass answers. 150 BPM.
beat=.4;length=16*4*beat;mix=np.zeros((round(length*SR),2))
def add(x,start,gain=1,pan=0):
 i=round(start*SR);x=x[:len(mix)-i]*gain
 if len(x):mix[i:i+len(x),0]+=x*np.sqrt((1-pan)/2);mix[i:i+len(x),1]+=x*np.sqrt((1+pan)/2)
def hz(n):return 440*2**((n-69)/12)
roots=[45,45,48,43,45,45,40,40,45,48,43,40,45,43,40,45]
melodies=[[69,72,76,72,69,67,64,67],[69,72,76,79,76,72,69,67],[72,76,79,76,72,71,67,64],[67,71,74,71,67,64,62,64]]
for bar,root in enumerate(roots):
 start=bar*4*beat
 for b in range(4):
  t=clock(.22);kick=np.sin(2*np.pi*(48*t+40*.03*(1-np.exp(-t/.03))))*np.exp(-t*23);add(kick,start+b*beat,.48)
  t=clock(.15);sn=filt(noise(.15),1300,'highpass')*np.exp(-t*30)+.22*np.sin(2*np.pi*180*t)*np.exp(-t*25)
  if b%2:add(sn,start+b*beat,.24,.12)
  t=clock(.055);hat=filt(noise(.055),6500,'highpass')*np.exp(-t*85)
  add(hat,start+(b+.5)*beat,.10,.4)
  add(pluck(hz(root+(7 if b%2 else 0)-12),.30),start+b*beat,.65,-.1)
  chord=[root+12,root+15,root+19] if root==45 else [root+12,root+16,root+19]
  for j,n in enumerate(chord):add(pluck(hz(n),.14),start+(b+.5)*beat+j*.009,.13,-.5)
 for step,n in enumerate(melodies[bar%4]):add(pluck(hz(n+(12 if bar>=8 and step in [2,6] else 0)),.28),start+step*beat/2,.39,.28)
 if bar%4==3:
  for b,n in [(2,root+24),(2.75,root+19),(3.5,root+24)]:add(brass(hz(n),.18),start+b*beat,.18,-.25)
# The last phrase resolves into the first downbeat. Tiny seam ramps avoid clicks.
mix[:160]*=np.linspace(0,1,160)[:,None];mix[-160:]*=np.linspace(1,0,160)[:,None]
save('bulldozer-rodeo',np.tanh(mix*.8),.62)
# Sign strike: hollow wood thud with bright metal rattle.
t=clock(.30);x=.7*np.sin(2*np.pi*165*t)*np.exp(-t*22)+.35*np.sin(2*np.pi*1120*t)*np.exp(-t*30)+.5*filt(noise(.30),3500)*np.exp(-t*45);save('dozer-sign-hit',x,.73)
# Transformation: accelerating engine pitch, gear clunks and resolving brass blast.
t=clock(1.25);phase=2*np.pi*(45*t+60*t*t);x=(np.sin(phase)+.3*np.sin(phase*3))*.25*np.minimum(t/.08,1)*np.minimum((1.25-t)/.20,1)
for at in [.05,.32,.57]:
 z=clock(.10);v=filt(noise(.10),1600)*np.exp(-z*40);i=round(at*SR);x[i:i+len(v)]+=v*.35
for n in [57,64,69]:
 v=brass(hz(n),.65);i=int(.55*SR);x[i:i+len(v)]+=v*.15
save('dozer-start',x,.78)
# Charge: mechanical rev plus airy movement; short enough for repeat charges.
t=clock(.60);phase=2*np.pi*(48*t+100*t*t);env=np.minimum(t/.025,1)*np.minimum((.6-t)/.18,1);x=(np.sin(phase)+.35*np.sin(phase*3)+.25*filt(noise(.6),1800))*env;save('dozer-charge',x,.65)
# Crunch: clustered snapped branches with a warm low impact.
t=clock(.45);x=.5*np.sin(2*np.pi*85*t)*np.exp(-t*14)
for at in [0,.028,.065,.11,.17,.24]:
 z=clock(.11);v=filt(noise(.11),4200)*np.exp(-z*42);i=round(at*SR);x[i:i+len(v)]+=v*.45
save('dozer-crunch',x,.77)
# Sheep launch: elastic rising cartoon twang, not the engine rev.
t=clock(.52);phase=2*np.pi*(220*t+480*t*t);x=(np.sin(phase)+.3*np.sin(phase*2))*np.exp(-t*5)*np.minimum(t/.008,1)*np.minimum((.52-t)/.05,1);save('dozer-launch',x,.64)
# Horn: two cheerful, rounded truck-horn notes, no startling sustained alarm.
t=clock(.65);x=np.zeros(len(t))
for at,d in [(0,.18),(.25,.36)]:
 v=(brass(196,d)+brass(247,d))*.5;i=round(at*SR);x[i:i+len(v)]+=v
save('dozer-horn',x,.66)
(out/'bulldozer-audio-levels.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
