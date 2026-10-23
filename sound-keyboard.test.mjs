import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire('C:/Users/10128/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let checks=0;function check(value,message){assert(value,message);checks++;console.log('PASS',message);}
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{
  window.__audioNotes=[];window.__audioContexts=0;
  const Native=window.AudioContext;
  window.AudioContext=class extends Native{
   constructor(...args){super(...args);window.__audioContexts++;}
   createOscillator(){const oscillator=super.createOscillator(),note={};
    const set=oscillator.frequency.setValueAtTime.bind(oscillator.frequency);
    oscillator.frequency.setValueAtTime=(frequency,time)=>{note.frequency=frequency;return set(frequency,time);};
    const start=oscillator.start.bind(oscillator);
    oscillator.start=(time)=>{window.__audioNotes.push({...note,type:oscillator.type});return start(time);};
    return oscillator;
   }
  };
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8137/');
 check(await page.evaluate(()=>window.__audioContexts)===0,'Opening page is silent and creates no audio context');
 await page.click('[data-act="theme"][data-theme="space"]');await page.waitForFunction(()=>window.__audioNotes.length===3);
 check(await page.evaluate(()=>window.__audioNotes.every(n=>n.type==='triangle')),'Space theme has electronic tone palette');
 await page.click('[data-act="quick"][data-mode="spell"]');
 check(await page.locator('#spelling').getAttribute('readonly')!==null&&await page.locator('#spelling').getAttribute('inputmode')==='none','Spelling uses readonly display and suppresses mobile input suggestions');
 check(await page.locator('.letter-key').count()===30,'Keyboard includes alphabet, space, apostrophe, hyphen and backspace');
 await page.evaluate(()=>window.__audioNotes=[]);
 await page.click('[data-act="spell-key"][data-key="a"]');await page.click('[data-act="spell-key"][data-key=" "]');await page.click('[data-act="spell-key"][data-key="Backspace"]');
 check(await page.locator('#spelling').inputValue()==='a','Onscreen typing, spaces and deletion edit the answer');
 check(await page.evaluate(()=>window.__audioNotes.map(n=>n.frequency).join(','))==='920,520,360','Typing, space and backspace have differentiated cues without duplicate click');
 await page.keyboard.press('Backspace');await page.keyboard.type("hard-working's");
 check(await page.locator('#spelling').inputValue()==="hard-working's",'Physical keyboard handles letters, hyphens and apostrophes');
 await page.evaluate(()=>window.__audioNotes=[]);await page.keyboard.press('Enter');
 check(await page.evaluate(()=>window.__audioNotes.map(n=>n.frequency).join(','))==='294,247','Incorrect spelling plays only gentle error cue');
 await page.click('[data-act="next"]');const word=await page.evaluate(()=>window.__orbit.session.items[window.__orbit.session.index].word);
 await page.keyboard.type(word);await page.evaluate(()=>window.__audioNotes=[]);await page.keyboard.press('Enter');
 check(await page.evaluate(()=>window.__audioNotes.map(n=>n.frequency).join(','))==='523,659,784','Correct spelling plays distinct success cue');
 check((await page.locator('.answer-feedback').innerText()).includes('记住了'),'Sound feedback preserves answer validation');
 await page.click('[data-act="exit"]');await page.click('[data-act="finish"]');await page.click('.avatar');
 await page.click('[data-act="sound-toggle"]');await page.evaluate(()=>window.__audioNotes=[]);
 await page.click('[data-act="theme"][data-theme="island"]');
 check(await page.evaluate(()=>window.__audioNotes.length)===0,'Muted theme switching is silent');
 await page.click('[data-act="sound-toggle"]');await page.evaluate(()=>window.__audioNotes=[]);
 await page.click('[data-act="sound-preview"][data-kind="correct"]');
 check(await page.evaluate(()=>window.__audioNotes.map(n=>n.frequency).join(','))==='659,880,1047'&&await page.evaluate(()=>window.__audioNotes.every(n=>n.type==='sine')),'Cute theme uses softer, different success notes');
 await page.locator('#soundVolume').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.evaluate(()=>window.__audioNotes=[]);await page.click('[data-act="sound-preview"][data-kind="wrong"]');
 check(await page.evaluate(()=>window.__audioNotes.length)===0,'Zero volume is silent');
 await page.locator('#soundVolume').evaluate(el=>{el.value='65';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.click('[data-act="sound-toggle"]');await page.reload();await page.click('.avatar');
 check(await page.evaluate(()=>window.__orbit.state.settings.soundEffects)===false&&await page.locator('#soundVolume').inputValue()==='65','Mute and volume survive reload');
 await page.locator('.sidebar nav [data-act="nav"][data-view="home"]').click();await page.click('[data-act="quick"][data-mode="spell"]');await page.evaluate(()=>window.__audioNotes=[]);await page.click('[data-act="spell-key"][data-key="a"]');
 check(await page.evaluate(()=>window.__audioNotes.length)===0,'Muted keyboard typing is silent');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile spelling keyboard fits without horizontal scrolling');
 await page.screenshot({path:'../../outputs/word-orbit-keyboard.png',fullPage:true});
 await page.setViewportSize({width:320,height:740});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Keyboard also fits a 320px screen');
 check(errors.length===0,'No browser audio or keyboard runtime errors');
 const noAudio=await browser.newContext();await noAudio.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
 const fallback=await noAudio.newPage();await fallback.goto('http://127.0.0.1:8137/');await fallback.click('[data-act="theme"][data-theme="space"]');await fallback.click('[data-act="quick"][data-mode="spell"]');await fallback.keyboard.type('hello');
 check(await fallback.locator('#spelling').inputValue()==='hello','Learning still works when Web Audio is unsupported');
 console.log('TOTAL',checks);
}finally{await browser.close();}
