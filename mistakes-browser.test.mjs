import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire('C:/Users/10128/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const { chromium } = require('playwright');
const root = resolve('dist');
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(path);
    res.setHeader('Content-Type', ({ '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml' })[extname(path)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true });
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; console.log('PASS', label); };
const errors = [];
const seed = () => ({ version:1, books:[{ id:'b1', name:'测试词库', on:true }], words:[['apple','苹果'],['pear','梨'],['cat','猫']].map(([word,meaning],i) => ({ id:`w${i}`, bookId:'b1', word, meaning })), prog:{}, daily:{}, awards:{}, settings:{ newPerDay:10, reviewPerDay:30, mode:'auto', backgroundMusic:false, soundEffects:false }, xp:0, theme:'space', lastExport:0 });
const mistake = (word, meaning, correct=0) => ({ word, meaning, correct, wrongCount:1, cleared:0, lastAt:Date.now(), active:true });
async function fresh(state=seed()) {
  const context = await browser.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' });
  await context.addInitScript(data => { if (!localStorage.getItem('wordorbit.state.v1')) localStorage.setItem('wordorbit.state.v1', JSON.stringify(data)); window.AudioContext=undefined; window.webkitAudioContext=undefined; }, state);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.waitForSelector('.shell');
  return page;
}
const stateOf = page => page.evaluate(() => window.__orbit.state);
const current = page => page.evaluate(() => window.__orbit.session.items[window.__orbit.session.index]);
const notebook = page => page.locator('.sidebar [data-act="nav"][data-view="mistakes"]').click();
async function endRound(page) { await page.click('[data-act="exit"]'); await page.click('[data-act="finish"]'); }
async function spelling(page, word) {
  for (const letter of word) await page.locator(`[data-act="spell-key"][data-key="${letter}"]`).click();
  await page.locator('#spellForm button[type="submit"]').click();
}
async function correction(page, mode='spell', correct=true) {
  await page.click(`[data-act="mistakes-start"][data-mode="${mode}"]`);
  const word = await current(page);
  if (mode==='choice' && await page.locator('[data-act="choice"]').count()) {
    const buttons = page.locator('[data-act="choice"]');
    for (let i=0; i<await buttons.count(); i++) {
      const text = await buttons.nth(i).innerText();
      if (text.includes(word.meaning) === correct) { await buttons.nth(i).click(); break; }
    }
  } else await spelling(page, correct ? word.word : 'zzz');
  await page.click('[data-act="next"]');
  await page.click('[data-act="finish"]');
  return word.word;
}
try {
  const legacy = await fresh();
  check(Object.keys((await stateOf(legacy)).mistakes).length===0, 'Legacy backup without mistakes loads with an empty notebook');
  await legacy.click('[data-act="quick"][data-mode="choice"]');
  const chosen = await current(legacy);
  const choices = legacy.locator('[data-act="choice"]');
  for (let i=0; i<await choices.count(); i++) if (!(await choices.nth(i).innerText()).includes(chosen.meaning)) { await choices.nth(i).click(); break; }
  check((await stateOf(legacy)).mistakes[chosen.word]?.active, 'Wrong choice automatically adds the real word to the notebook');
  await endRound(legacy);
  await legacy.click('[data-act="quick"][data-mode="spell"]');
  const misspelled = await current(legacy);
  await spelling(legacy,'zzz');
  check((await stateOf(legacy)).mistakes[misspelled.word]?.active, 'Wrong spelling automatically adds the real word to the notebook');
  await legacy.context().close();

  const initial = seed();
  initial.mistakes = { apple:mistake('apple','苹果'), pear:mistake('pear','梨') };
  const page = await fresh(initial);
  await notebook(page);
  check(await page.locator('[data-mistake-key]:checked').count()===2, 'Notebook initially selects active words');
  await page.click('[data-act="mistakes-none"]');
  check(await page.locator('[data-act="mistakes-start"][data-mode="spell"]').isDisabled(), 'Empty selection disables starting a correction round');
  await page.locator('[data-mistake-key="apple"]').check();
  check(await page.locator('[data-mistake-key]:checked').count()===1, 'Checking a word selects only that word');
  await correction(page,'choice');
  check((await stateOf(page)).mistakes.apple.correct===1 && (await stateOf(page)).mistakes.pear.correct===0, 'Only selected word gains correction credit from choice answer');
  await correction(page);
  check((await stateOf(page)).mistakes.apple.correct===2, 'Correct answers accumulate across separate rounds');
  await correction(page,'spell',false);
  check((await stateOf(page)).mistakes.apple.correct===0, 'A wrong correction answer resets the count to zero');
  await correction(page);
  await page.reload();
  await notebook(page);
  check((await stateOf(page)).mistakes.apple.correct===1, 'Correction progress survives a browser reload');
  await page.click('[data-act="mistakes-none"]'); await page.locator('[data-mistake-key="apple"]').check();
  await correction(page,'choice');
  await correction(page);
  check((await stateOf(page)).mistakes.apple.active===false && (await stateOf(page)).mistakes.apple.cleared===1, 'Third correct answer removes word and records one completed correction');
  check(await page.locator('[data-mistake-key="apple"]').count()===0 && await page.locator('[data-mistake-key="pear"]').count()===1, 'Graduated word disappears while other wrong words stay');
  await page.reload(); await notebook(page);
  check(await page.locator('[data-mistake-key="apple"]').count()===0, 'Removal stays saved after reload');
  await page.context().close();

  const reentry=seed(); reentry.words=reentry.words.slice(0,1); reentry.mistakes={ apple:{ ...mistake('apple','苹果',3), active:false, cleared:1 } };
  const again=await fresh(reentry);
  await again.click('[data-act="quick"][data-mode="spell"]'); await spelling(again,'zzz'); await endRound(again); await notebook(again);
  check((await stateOf(again)).mistakes.apple.active && (await stateOf(again)).mistakes.apple.correct===0 && (await stateOf(again)).mistakes.apple.cleared===1, 'Previously corrected word reenters with zero count after another wrong answer');
  await again.click('[data-act="mistakes-start"][data-mode="choice"]');
  check(await again.locator('#spellForm').count()===1, 'A single available meaning falls back to spelling instead of a trivial choice');
  await again.context().close();

  const layout=await fresh(initial);
  for (const theme of ['space','island']) {
    await layout.locator(`[data-act="theme"][data-theme="${theme}"]`).click();
    for (const width of [320,390,768,1440]) {
      await layout.setViewportSize({ width, height:900 }); await notebook(layout);
      check(await layout.evaluate(() => document.documentElement.scrollWidth<=innerWidth), `${theme} notebook fits ${width}px without horizontal overflow`);
      await layout.click('[data-act="mistakes-start"][data-mode="spell"]');
      check(await layout.evaluate(() => document.documentElement.scrollWidth<=innerWidth), `${theme} spelling correction fits ${width}px without horizontal overflow`);
      await endRound(layout);
    }
  }
  await layout.locator('.sidebar [data-act="nav"][data-view="rewards"]').click();
  check(await layout.locator('.badge-card').count()===40, 'Expanded achievement page renders all 40 badges');
  check(!(await layout.locator('#main').innerText()).includes('${'), 'Achievement page displays computed values rather than literal template expressions');
  await layout.context().close();
  check(errors.length===0, `No browser runtime errors: ${errors.join('; ')}`);
  console.log(`TOTAL ${checks} browser checks passed`);
} finally { await browser.close(); await new Promise(done => server.close(done)); }
