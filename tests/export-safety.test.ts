import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync } from 'node:fs';
import {createServiceBoardHandlers} from '../lib/service-board';
import {testConfig} from './fixtures/config';
import {deploymentConfig} from '../lib/deployment-config';
const unreachable=async()=>{throw new Error('Unexpected database call')};
const {GET,POST}=createServiceBoardHandlers(testConfig,{readBoard:unreachable,readActivity:unreachable,dispatchBoard:unreachable});
test('template carries no Site identity or runtime seed',()=>{
  const hosting=JSON.parse(readFileSync('.openai/hosting.json','utf8'));
  assert.equal(hosting.project_id??null,deploymentConfig.siteProjectId);
  assert.equal(existsSync('lib/seed.ts'),false);
  for(const path of ['lib/board-store.ts','app/board.tsx']) assert(!readFileSync(path,'utf8').includes('fixtures/'));
});
test('unconfigured private service adapter fails closed',async()=>{for(const handler of [GET,POST])assert.equal((await handler(new Request('https://example.com/api/service/board'))).status,503);});
