// Short, locally synthesized feedback: works offline, without media downloads.
// No AudioContext is created until a user interaction requests a sound.
const SPACE = {
  click:[[680,0,.045]],
  type:[[920,0,.026]],
  erase:[[360,0,.04]],
  space:[[520,0,.035]],
  flip:[[440,0,.07],[660,.045,.08]],
  switch:[[392,0,.08],[587,.06,.1],[784,.12,.13]],
  start:[[330,0,.09],[494,.08,.1],[660,.16,.15]],
  correct:[[523,0,.1],[659,.08,.12],[784,.16,.18]],
  wrong:[[294,0,.13],[247,.12,.18]],
  gentle:[[392,0,.11],[440,.1,.14]],
  reward:[[659,0,.1],[880,.09,.17]],
  complete:[[523,0,.12],[659,.1,.12],[784,.2,.12],[1047,.32,.24]],
};
const ISLAND = {
  click:[[880,0,.055]],
  type:[[1175,0,.03]],
  erase:[[440,0,.045]],
  space:[[659,0,.04]],
  flip:[[698,0,.08],[880,.055,.1]],
  switch:[[523,0,.09],[659,.07,.11],[880,.15,.16]],
  start:[[523,0,.1],[698,.09,.12],[1047,.19,.18]],
  correct:[[659,0,.12],[880,.09,.15],[1047,.19,.2]],
  wrong:[[349,0,.14],[294,.13,.2]],
  gentle:[[523,0,.12],[587,.11,.15]],
  reward:[[784,0,.12],[1047,.1,.2]],
  complete:[[523,0,.13],[698,.11,.13],[880,.22,.14],[1047,.36,.26]],
};
export const SOUND_PALETTES={space:SPACE,island:ISLAND};

export function createSoundPlayer(getPreferences){
  let context=null,master=null,lastClick=-Infinity,generation=0;
  const active=new Set();
  function cancel(){generation++;for(const oscillator of active){try{oscillator.stop();}catch{}}active.clear();}
  function play(kind='click',delay=0){
    const preferences=getPreferences();
    if(preferences.enabled===false||preferences.volume===0)return;
    const palette=SOUND_PALETTES[preferences.theme]||SPACE,notes=palette[kind];
    if(!notes)return;
    try{
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Audio)return;
      if(!context||context.state==='closed'){
        context=new Audio();master=context.createGain();master.connect(context.destination);
      }
      if(kind==='click'&&context.currentTime-lastClick<.045)return;
      if(kind==='click')lastClick=context.currentTime;
      const request=generation;
      const emit=()=>{
        // A pending resume must not play a queued cue after the user mutes.
        const latest=getPreferences();
        if(request!==generation||latest.enabled===false||latest.volume===0)return;
        const volume=Number.isFinite(latest.volume)?Math.min(1,Math.max(0,latest.volume)):.4;
        master.gain.setValueAtTime(volume*.32,context.currentTime);
        for(const [frequency,offset,duration] of notes){
          if(active.size>=16){try{active.values().next().value.stop();}catch{}}
          const oscillator=context.createOscillator(),envelope=context.createGain();
          const start=context.currentTime+.006+Math.max(0,delay)+offset;
          oscillator.type=preferences.theme==='island'?'sine':'triangle';
          oscillator.frequency.setValueAtTime(frequency,start);
          if(kind==='click'||kind==='flip')oscillator.frequency.exponentialRampToValueAtTime(frequency*.85,start+duration);
          envelope.gain.setValueAtTime(0,start);
          envelope.gain.linearRampToValueAtTime(.22,start+.006);
          envelope.gain.exponentialRampToValueAtTime(.001,start+duration);
          envelope.gain.linearRampToValueAtTime(0,start+duration+.02);
          oscillator.connect(envelope);envelope.connect(master);active.add(oscillator);
          oscillator.onended=()=>{active.delete(oscillator);oscillator.disconnect();envelope.disconnect();};
          oscillator.start(start);oscillator.stop(start+duration+.025);
        }
      };
      // resume() is invoked in the click/submit handler for mobile autoplay rules.
      if(context.state==='suspended')context.resume().then(emit).catch(()=>{});else emit();
    }catch{/* Unsupported or unavailable audio never interrupts learning. */}
  }
  return {play,cancel};
}
