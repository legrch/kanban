import assert from 'node:assert/strict';
import {test} from 'node:test';
import {deploymentConfig as config} from '../lib/deployment-config';
import {validateDeploymentConfig,validateHosting} from '../lib/config-contract';
import {createTaskNumbers} from '../lib/task-number';
import {createServiceBoardHandlers} from '../lib/service-board';
import {testConfig} from './fixtures/config';
import {fixture} from './fixtures/store';
import {fixtureCards} from './fixtures/cards';
const numbers=createTaskNumbers(config);
test('assembled configuration supports every issued prefix and preserves full-card no-op state',async()=>{
 const {s,sqlite}=fixture();
 for(const [project,prefix] of Object.entries(config.projects)){
  const card=await s.upsertCard({...fixtureCards[0],id:'configured-'+prefix,project});
  assert.equal(card.taskNumber,`${prefix}-001`);
  assert.equal(numbers.parseTaskNumber(card.taskNumber),card.taskNumber);
  assert.equal(numbers.taskFromLocation(numbers.taskPath(card.taskNumber)).task,card.taskNumber);
  const snapshot=()=>JSON.stringify(['cards','card_activity','project_task_numbers','project_counters'].map(table=>sqlite.prepare(`SELECT * FROM ${table}`).all()));
  const before=snapshot();assert.deepEqual(await s.upsertCard(card),card);assert.equal(snapshot(),before);
  assert.equal((await s.upsertCard({...fixtureCards[0],id:'next-'+prefix,project})).taskNumber,`${prefix}-002`);
 }
});
test('every configured historical override wins over mutable project labels without rewriting records',async()=>{
 const {s,sqlite}=fixture();const labels=Object.keys(config.projects);const overrides=Object.entries(config.legacyPrefixes);
 const rows=overrides.length?overrides:[['1',config.projects[labels[0]]]];
 for(const [legacy,prefix] of rows){const project=overrides.length?(labels.find(label=>config.projects[label]!==prefix)??labels[0]):labels[0];const card={...fixtureCards[0],id:'history-fixture-'+legacy,project,version:7};sqlite.prepare('INSERT INTO cards VALUES (?,?,?,?)').run(card.id,JSON.stringify(card),7,'2020-01-01T00:00:00Z');sqlite.prepare('INSERT INTO task_numbers (number,card_id) VALUES (?,?)').run(Number(legacy),card.id);}
 const before=JSON.stringify(sqlite.prepare('SELECT * FROM cards ORDER BY id').all());
 assert.equal((await s.backfillNumbers()).allocated,rows.length);
 const counts:Record<string,number>={};
 for(const [legacy,prefix] of rows.sort((a,b)=>Number(a[0])-Number(b[0]))){counts[prefix]=(counts[prefix]??0)+1;const card=(await s.readBoard()).find(c=>c.id==='history-fixture-'+legacy)!;assert.equal(card.taskNumber,numbers.formatTaskNumber(counts[prefix],prefix));assert.equal((await s.readActivity(card.id)).length,0);}
 assert.equal(JSON.stringify(sqlite.prepare('SELECT * FROM cards ORDER BY id').all()),before);
 assert.deepEqual(await s.backfillNumbers(),{allocated:0});
 await assert.rejects(s.dispatchBoard({action:'seed'}),/Unknown action/);
 assert.equal(JSON.stringify(sqlite.prepare('SELECT * FROM cards ORDER BY id').all()),before);
});
test('invalid configuration and mismatched manifests fail closed',()=>{
 for(const bad of [{...testConfig,serviceMode:'public'},{...testConfig,serviceMode:'sites-owner-private'},{...testConfig,legacyPrefixes:{1:'BAD'}},{...testConfig,projects:{A:'DUP',B:'DUP'}}])assert.throws(()=>validateDeploymentConfig(bad));
 assert.throws(()=>validateHosting(testConfig,{d1:'DB',project_id:'mismatch'}));
});
test('same shared service handler gates defaults and preserves private dispatch contract',async()=>{
 let calls=0;const api={readBoard:async()=>{calls++;return [];},readActivity:async()=>[],dispatchBoard:async(body:unknown)=>{calls++;return body;}};
 const disabled=createServiceBoardHandlers(testConfig,api);assert.equal((await disabled.GET(new Request('https://example.com/api/service/board'))).status,503);assert.equal(calls,0);
 // Synthetic identity is test-only, not a claim about actual access.
 const enabled=createServiceBoardHandlers({...testConfig,serviceMode:'sites-owner-private',siteProjectId:'appgprj_00000000000000000000000000000000'},api);
 assert.equal((await enabled.GET(new Request('https://example.com/api/service/board'))).status,200);
 assert.equal((await enabled.POST(new Request('https://example.com/api/service/board',{method:'POST'}))).status,415);
 assert.equal((await enabled.POST(new Request('https://example.com/api/service/board',{method:'POST',headers:{'content-type':'application/json',origin:'https://other.example'},body:'{}'}))).status,403);
 assert.equal((await enabled.POST(new Request('https://example.com/api/service/board',{method:'POST',headers:{'content-type':'application/json'},body:'{"action":"upsert"}'}))).status,200);
 assert.equal(calls,2);
 const assembled=createServiceBoardHandlers(config,api);assert.equal((await assembled.GET(new Request('https://example.com/api/service/board'))).status,config.serviceMode==='disabled'?503:200);
});
