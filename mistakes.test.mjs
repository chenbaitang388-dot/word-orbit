import assert from 'node:assert/strict';
import {test} from 'node:test';
import {recordMistake,mergeMistakes} from './dist/src/mistakes.js';
import {validBackup} from './dist/src/state.js';
const word={word:'Apple',meaning:'苹果'};
const backup=mistakes=>({books:[],words:[],mistakes});
test('three correction answers graduate, errors reset, and later errors re-enter',()=>{
 let m=recordMistake({},word,false,false,100);
 assert.equal(m.apple.correct,0);assert.equal(m.apple.wrongCount,1);
 m=recordMistake(m,word,true,true,101);
 m=recordMistake(m,word,true,true,102);
 assert.equal(m.apple.correct,2);
 assert.equal(recordMistake(m,word,true,false,103),m,'ordinary correct answers do not advance correction challenge');
 m=recordMistake(m,word,false,true,104);
 assert.equal(m.apple.correct,0);assert.equal(m.apple.wrongCount,2);
 for(let i=0;i<3;i++)m=recordMistake(m,word,true,true,105+i);
 assert.equal(m.apple.active,false);assert.equal(m.apple.cleared,1);
 assert.equal(recordMistake(m,word,true,true,110),m,'repeat correct event cannot graduate twice');
 m=recordMistake(m,word,false,false,111);
 assert.equal(m.apple.active,true);assert.equal(m.apple.correct,0);assert.equal(m.apple.cleared,1);
 assert(validBackup(backup(m)));
});
test('backup merging uses latest attempt and retains completed tombstones',()=>{
 const old=recordMistake({},word,false,false,10);
 let done=old;for(let i=0;i<3;i++)done=recordMistake(done,word,true,true,11+i);
 assert.deepEqual(mergeMistakes(done,old),done);
 assert.deepEqual(mergeMistakes(old,done),done);
 assert.deepEqual(mergeMistakes(done,done),done);
 const again=recordMistake(done,word,false,false,20);
 assert.deepEqual(mergeMistakes(done,again),again);
 assert.deepEqual(mergeMistakes(again,done),again);
 assert.deepEqual(mergeMistakes(done,undefined),done,'legacy backup preserves new records');
});
test('malformed correction backups are rejected without rejecting old backups',()=>{
 assert(validBackup({books:[],words:[]}));
 const m=recordMistake({},word,false,false,10);
 assert(validBackup(backup(m)));
 for(const bad of [null,[],{apple:null},{apple:{...m.apple,correct:3}},{apple:{...m.apple,correct:-1}},
   {apple:{...m.apple,correct:'1'}},{apple:{...m.apple,word:'cat'}},{apple:{...m.apple,lastAt:Infinity}},
   {apple:{...m.apple,active:false}},{apple:{...m.apple,wrongCount:0}}])assert.equal(validBackup(backup(bad)),false);
});
