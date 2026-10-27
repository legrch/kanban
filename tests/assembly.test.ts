import assert from 'node:assert/strict';
import {test} from 'node:test';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {testConfig} from './fixtures/config';
test('assembly substitutes exactly two JSON files, omits private state and refuses existing targets',()=>{
 const root=mkdtempSync(join(tmpdir(),'kanban-assembly-test-'));
 try{
  const source=join(root,'source'),overlay=join(root,'input'),target=join(root,'target');
  mkdirSync(join(source,'config'),{recursive:true});mkdirSync(join(source,'.openai'));mkdirSync(join(source,'.private'));mkdirSync(overlay);
  const id='appgprj_00000000000000000000000000000000';
  writeFileSync(join(source,'config/deployment.json'),JSON.stringify(testConfig));writeFileSync(join(source,'.openai/hosting.json'),JSON.stringify({d1:'DB',r2:null}));writeFileSync(join(source,'common.txt'),'common source');writeFileSync(join(source,'.private/excluded.txt'),'synthetic private test input');
  writeFileSync(join(overlay,'deployment.json'),JSON.stringify({...testConfig,serviceMode:'sites-owner-private',siteProjectId:id}));writeFileSync(join(overlay,'hosting.json'),JSON.stringify({d1:'DB',r2:null,project_id:id}));
  const run=()=>execFileSync(process.execPath,['--import',resolve('scripts/test-loader.mjs'),resolve('scripts/assemble-private.mjs'),source,overlay,target],{stdio:'pipe'});
  run();assert.equal(readFileSync(join(target,'common.txt'),'utf8'),'common source');assert.equal(existsSync(join(target,'.private')),false);
  const receipt=JSON.parse(readFileSync(target+'.assembly-receipt.json','utf8'));assert.deepEqual(receipt.differences,['.openai/hosting.json','config/deployment.json']);assert.equal(receipt.liveAudienceVerified,false);assert.equal(receipt.gitHeadVerified,false);
  assert.throws(run);assert.equal(readFileSync(join(target,'common.txt'),'utf8'),'common source');
 }finally{rmSync(root,{recursive:true,force:true});}
});
