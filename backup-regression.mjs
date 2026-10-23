import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const logic = ['./dist/src/core.js','./dist/src/state.js','./dist/src/themes.js','./dist/src/grade5.js','./dist/src/sounds.js','./dist/src/textbooks.js','./dist/src/presets.js'].map(path=>read(path).replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')).join('\n');
const app = read('./dist/src/app.js').replace(/^import .*;\r?\n/gm, '').replace(/^load\(\);render\(\);\r?$/m, '').replace(/^if\('serviceWorker'.*$/m, '');
const valid = {
  version:1,theme:'space',books:[{id:'b1',name:'课堂单词'}],
  words:[{id:'w1',bookId:'b1',word:'apple',meaning:'苹果'},{id:'w2',bookId:'b1',word:'cat',meaning:'猫'}],
  prog:{},daily:{},xp:0,awards:{},settings:{newPerDay:10,reviewPerDay:30,mode:'auto'}
};
let disk=JSON.stringify(valid);
function tab(){
  const events={};
  const ctx=vm.createContext({console,Date,Math,JSON,Map,Set,Number,String,Object,Array,
    navigator:{},localStorage:{getItem:()=>disk,setItem:(_key,value)=>{disk=value;}},
    document:{addEventListener:(name,fn)=>{events[name]=fn;},querySelector:()=>({addEventListener(){}})},
    window:{addEventListener:(name,fn)=>{events[name]=fn;}}
  });
  vm.runInContext(logic+'\n'+app,ctx);
  vm.runInContext("render=()=>{};toast=text=>{globalThis.lastToast=text;};closeModal=()=>{};modal=()=>{};load();",ctx);
  return {ctx,events,run:code=>vm.runInContext(code,ctx)};
}
const a=tab();
assert.equal(a.run(`validBackup(${JSON.stringify(valid)})`),true);
for(const broken of [
  {...valid,daily:null}, {...valid,daily:{today:null}}, {...valid,daily:{today:{totalN:'5'}}},
  {...valid,prog:null}, {...valid,prog:{apple:{hist:{}}}}, {...valid,prog:{apple:{stage:-1}}},
  {...valid,awards:null}, {...valid,awards:{apple:'5'}}, {...valid,xp:-1},
  {...valid,settings:{newPerDay:'10'}}, {...valid,words:[{word:'apple',meaning:'苹果',bookId:'missing'}]}
]) {
  const original=disk;
  a.ctx.testFile={size:1,text:async()=>JSON.stringify(broken)};
  await a.run('restoreFile(testFile)');
  assert.equal(a.run('incomingBackup'),null,'Malformed backup must not reach confirmation');
  assert.equal(disk,original,'Malformed backup must not write storage');
}
// Valid replacement takes the same event path as the confirmation button.
a.ctx.testFile={size:1,text:async()=>JSON.stringify({...valid,xp:10})};
await a.run('restoreFile(testFile)');
await a.events.click({preventDefault(){},target:{closest:()=>({dataset:{act:'replace-confirm'}})}});
assert.equal(JSON.parse(disk).xp,10);

const merged=a.run(`mergeRewards({xp:5,awards:{apple:5}},{xp:5,awards:{cat:5}})`);
assert.equal(merged.xp,10,'Independent rewards must survive merging');
assert.equal(a.run(`mergeRewards({xp:10,awards:{apple:5,cat:5}},{xp:5,awards:{cat:5}}).xp`),10,'Repeated import cannot mint rewards');
assert.equal(a.run(`mergeRewards({xp:2,awards:{apple:2}},{xp:5,awards:{apple:5}}).xp`),5,'Keep highest earned award once');
assert.equal(a.run(`mergeRewards({xp:25},{xp:25}).xp`),25,'Legacy XP remains compatible');

// Two tabs begin from the same snapshot. B answers before its storage event arrives.
disk=JSON.stringify(valid);
const first=tab(),second=tab();
const begin=word=>`session={phase:'q',items:[{word:'${word}',key:'${word}',meaning:'测试'}],index:0,stats:{total:0,correct:0,xp:0},practice:false};`;
first.run(begin('apple'));second.run(begin('cat'));
first.run("answer('know')");
const savedByFirst=disk;
second.run("answer('know')");
assert.equal(disk,savedByFirst,'A stale answer cannot overwrite another tab');
assert.equal(second.run('session'),null,'Stale session exits before recording an answer');
assert.equal(second.run('state.prog.apple.reps'),1);
assert.match(second.ctx.lastToast,/另一个页面/);
// An actual storage event also interrupts an active session immediately.
first.run(begin('cat'));disk=JSON.stringify({...JSON.parse(disk),xp:50});
first.events.storage({key:'wordorbit.state.v1'});
assert.equal(first.run('session'),null);
assert.equal(first.run('state.xp'),50);
console.log('Backup validation, replacement, reward merging and cross-tab regression checks passed.');
