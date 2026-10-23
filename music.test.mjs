import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/10128/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let checks=0;
function check(value,message){assert(value,message);checks++;console.log('PASS',message);}
try{
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
 await context.addInitScript(()=>{
  window.__music=[];window.__hidden=false;window.__utterances=[];
  Object.defineProperty(document,'hidden',{get:()=>window.__hidden});
  window.Audio=class{
   constructor(){this.paused=true;this.volume=1;this.src='';this.plays=0;window.__music.push(this);}
   play(){this.plays++;if(window.__blockMusic)return Promise.reject(new Error('Autoplay blocked'));this.paused=false;return Promise.resolve();}
   pause(){this.paused=true;}
  };
  Object.defineProperty(window,'speechSynthesis',{value:{cancel(){window.__utterances.at(-1)?.onerror?.({error:'interrupted'});},getVoices(){return[];},speak(u){window.__utterances.push(u);}}});
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8137/');
 check(await page.evaluate(()=>window.__music[0].plays===0),'Opening page does not autoplay');
 await page.click('[data-act="theme"][data-theme="space"]');
 check(await page.evaluate(()=>window.__music[0].src.endsWith('/assets/audio/space.mp3')&&!window.__music[0].paused),'First trusted theme choice starts the space track');
 check(await page.evaluate(()=>window.__music[0].loop&&window.__music[0].volume===.18),'Music loops at a gentle default volume');
 await page.click('.avatar');
 await page.locator('#musicVolume').evaluate(el=>{el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}));});
 check(await page.evaluate(()=>window.__music[0].volume===.35&&window.__orbit.state.settings.musicVolume===.35),'Independent volume updates player and persisted preferences');
 await page.locator('#musicVolume').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
 check(await page.evaluate(()=>window.__music[0].paused),'Zero music volume pauses the player');
 await page.locator('#musicVolume').evaluate(el=>{el.value='35';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('[data-act="sound-toggle"]');
 check(await page.evaluate(()=>!window.__music[0].paused&&window.__orbit.state.settings.soundEffects===false),'Effect mute leaves background music playing');
 await page.click('[data-act="sound-toggle"]');
 await page.click('[data-act="speak"]');
 check(await page.evaluate(()=>Math.abs(window.__music[0].volume-.042)<.00001),'Pronunciation ducks BGM');
 await page.evaluate(()=>window.__utterances.at(-1).onend());
 check(await page.evaluate(()=>window.__music[0].volume===.35),'Speech end restores configured music level');
 await page.click('[data-act="speak"]');await page.click('[data-act="speak"]');
 await page.evaluate(()=>window.__utterances[window.__utterances.length-2].onend());
 check(await page.evaluate(()=>Math.abs(window.__music[0].volume-.042)<.00001),'Old cancelled speech callbacks cannot unduck a newer utterance');
 await page.evaluate(()=>window.__utterances.at(-1).onerror({error:'network'}));
 check(await page.evaluate(()=>window.__music[0].volume===.35),'Speech error restores music');
 await page.clock.install();await page.click('[data-act="speak"]');await page.clock.fastForward(30100);
 check(await page.evaluate(()=>window.__music[0].volume===.35),'Missing speech callbacks recover via watchdog');
 await page.click('.theme-switch [data-theme="island"]');
 check(await page.evaluate(()=>window.__music[0].src.endsWith('/assets/audio/island.mp3')),'Theme switching selects the matching recording');
 await page.evaluate(()=>{window.__hidden=true;document.dispatchEvent(new Event('visibilitychange'));});
 check(await page.evaluate(()=>window.__music[0].paused),'Hidden page pauses music');
 await page.evaluate(()=>{window.__hidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 check(await page.evaluate(()=>!window.__music[0].paused),'Visible page resumes after prior interaction');
 await page.click('.music-toggle');
 check(await page.evaluate(()=>window.__music[0].paused&&window.__orbit.state.settings.soundEffects===true),'Music mute leaves sound effects enabled');
 await page.reload();await page.click('.avatar');
 check(await page.evaluate(()=>window.__music[0].paused&&window.__orbit.state.settings.backgroundMusic===false)&&await page.locator('#musicVolume').inputValue()==='35','Music mute and volume survive reload');
 await page.evaluate(()=>window.__blockMusic=true);await page.click('.music-toggle');
 check(await page.evaluate(()=>window.__music[0].paused),'Rejected autoplay remains a safe silent state');
 await page.evaluate(()=>window.__blockMusic=false);await page.click('.avatar');
 check(await page.evaluate(()=>!window.__music[0].paused),'A later trusted click retries blocked playback');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Header and settings fit ${width}px screen`);}
 check(errors.length===0,'No page runtime errors');
 const real=await browser.newContext({serviceWorkers:'block'});
 await real.addInitScript(()=>{const NativeAudio=window.Audio;window.Audio=function(...args){const a=new NativeAudio(...args);window.__nativeMusic=a;return a;};});
 const p=await real.newPage();
 await p.goto('http://127.0.0.1:8137/');await p.click('[data-act="theme"][data-theme="space"]');
 await p.waitForFunction(()=>window.__nativeMusic.currentTime>.03);
 check(await p.evaluate(()=>!window.__nativeMusic.paused),'Trusted click starts native MP3 playback');
 check(await p.evaluate(async()=>{const a=new Audio('./assets/audio/space.mp3');await new Promise((ok,bad)=>{a.onloadedmetadata=ok;a.onerror=bad;a.load();});return a.duration>15;}),'Space MP3 decodes in the real browser');
 check(await p.evaluate(async()=>{const a=new Audio('./assets/audio/island.mp3');await new Promise((ok,bad)=>{a.onloadedmetadata=ok;a.onerror=bad;a.load();});return a.duration>15;}),'Island MP3 decodes in the real browser');
 const offlineContext=await browser.newContext(),offline=await offlineContext.newPage();
 await offline.goto('http://127.0.0.1:8137/');
 await offline.evaluate(async()=>{await navigator.serviceWorker.ready;await new Promise(ok=>{if(navigator.serviceWorker.controller)return ok();navigator.serviceWorker.addEventListener('controllerchange',ok,{once:true});});});
 check(await offline.evaluate(async()=>{const c=await caches.open('word-orbit-v1.0.6');return (await c.match('./assets/audio/space.mp3'))?.status===200&&(await c.match('./assets/audio/island.mp3'))?.status===200;}),'Both tracks precache for offline use');
 await offlineContext.setOffline(true);await offline.reload();await offline.click('[data-act="theme"][data-theme="space"]');
 check(await offline.locator('.music-toggle').count()===1&&await offline.evaluate(async()=>{const r=await fetch('./assets/audio/island.mp3');return r.ok&&(await r.arrayBuffer()).byteLength>100000;}),'Page and music work after offline reload');
 console.log('TOTAL',checks);
}finally{await browser.close();}
