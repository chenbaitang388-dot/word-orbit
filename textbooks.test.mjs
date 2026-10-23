import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {TEXTBOOKS} from './dist/src/textbooks.js';
import {PRESETS} from './dist/src/presets.js';
assert.deepEqual(TEXTBOOKS.map(b=>b.name),['三年级上册','三年级下册','四年级上册','四年级下册','五年级上册','五年级下册','六年级上册']);
assert.deepEqual(TEXTBOOKS.map(b=>b.rows.length),[108,115,110,139,119,141,144]);
assert.equal(new Set(PRESETS.map(p=>p.id)).size,13);
assert.equal(TEXTBOOKS.reduce((n,b)=>n+b.rows.length,0),876);
assert(TEXTBOOKS.every(b=>b.rows.every(r=>r.word&&r.meaning&&(r.unit>=1&&r.unit<=6&&r.page>0||r.section==='Numbers'&&r.unit===null&&r.page===null))));
assert.equal(TEXTBOOKS.find(b=>b.name==='四年级下册').rows.filter(r=>r.section==='Numbers').length,28);
assert.equal(TEXTBOOKS.find(b=>b.name==='五年级上册').id,'pep-grade5-up-2026');
const require=createRequire('C:/Users/10128/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8137/');await page.click('[data-act="theme"][data-theme="space"]');
 async function library(){await page.locator('.sidebar nav [data-act="nav"][data-view="books"]').click();}
 async function add(id){await library();await page.click(`[data-act="preset"][data-id="${id}"]`);await page.click('[data-act="preset-add"]');}
 await add('pep-grade5-up-2026');
 for(const book of TEXTBOOKS)await add(book.id);
 assert.equal(await page.evaluate(()=>window.__orbit.state.books.length),7,'Re-adding grade5 does not duplicate the old collection');
 assert.equal(await page.evaluate(()=>window.__orbit.state.words.length),876,'All source entries are stored locally');
 assert(await page.evaluate(()=>window.__orbit.state.words.some(w=>w.unit===6&&w.page>0)),'Unit and source page survive addition');
 await library();assert.equal(await page.locator('.textbook-grid .book-card').count(),7);
 assert(await page.locator('.textbook-note').innerText().then(t=>t.includes('六年级下册')));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile library fits');
 await page.screenshot({path:'../../outputs/word-orbit-textbooks.png',fullPage:true});
 for(const [id,key,senses] of [['pep-grade3-up-new','orange',['橙子','橙红色']],['pep-grade4-up-new','cook',['烹饪','厨师']],['pep-grade6-up-new','run',['奔跑','运转']]]){
  await library();const bookId=await page.evaluate(id=>window.__orbit.state.books.find(b=>b.presetId===id).id,id);
  await page.click(`[data-act="book"][data-id="${bookId}"]`);await page.click('[data-act="book-start"]');
  const meaning=await page.evaluate(key=>window.__orbit.session.pool.find(w=>w.key===key).meaning,key);
  assert(senses.every(s=>meaning.includes(s)),`${key} retains all textbook senses in exercises`);
  await page.click('[data-act="exit"]');await page.click('[data-act="finish"]');
 }
 await page.reload();assert.equal(await page.evaluate(()=>window.__orbit.state.books.length),7,'Collections persist across reload');
 assert.equal(await page.evaluate(()=>window.__orbit.state.words.length),876);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await context.setOffline(true);await page.reload();await library();assert.equal(await page.locator('.textbook-grid .book-card').count(),7,'All textbook datasets are cached for offline use');
 assert.deepEqual(errors,[]);
 console.log('PASS Seven textbook datasets, 876 entries, metadata, duplicate senses, existing ID compatibility, mobile layout, persistence and offline use.');
}finally{await browser.close();}
