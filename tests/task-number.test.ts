import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createTaskNumbers} from '../lib/task-number';
import {testConfig} from './fixtures/config';
const {formatTaskNumber,parseTaskNumber,taskFromSearch,taskPath,taskFromLocation,parseTaskSequence,prefixForProject}=createTaskNumbers(testConfig);
test('project numbers and clean private paths',()=>{assert.equal(formatTaskNumber(1),'ALP-001');assert.equal(formatTaskNumber(1000,'BET'),'BET-1000');assert.equal(parseTaskNumber('GAM-001'),'GAM-001');assert.equal(taskPath('DEL-123'),'/tasks/DEL-123');assert.equal(prefixForProject('Ops'),'OPS');assert.throws(()=>prefixForProject('Unknown'),/Supported projects/);assert.deepEqual(taskFromSearch(''),{task:null,invalid:false});});
test('old AK and query links are rejected, never aliased',()=>{for(const value of ['AK-001','ALP-000','ALP-1','ALP-0001','alp-001','ALP--001','ALP-1e3','javascript:alert(1)','https://evil.test','ALP-9007199254740992'])assert.equal(parseTaskNumber(value),null);for(const search of ['?task=AK-001','?task=ALP-001','?task=ALP-001&task=ALP-002','?task='])assert.deepEqual(taskFromSearch(search),{task:null,invalid:true});assert.throws(()=>taskPath('AK-001'));assert.throws(()=>formatTaskNumber(0));});
test('only clean approved project routes resolve',()=>{assert.deepEqual(taskFromLocation('/tasks/ALP-007'),{task:'ALP-007',invalid:false});assert.equal(parseTaskSequence('ALP-007'),7);assert.deepEqual(taskFromLocation('/'),{task:null,invalid:false});});
test('malformed clean paths cannot navigate to an external target',()=>{for(const path of ['/tasks/','/tasks/AK-007','/tasks/ALP-000','/tasks/ALP-007/extra','/tasks/%2F%2Fevil.test','/tasks/%ZZ','//evil.test/tasks/ALP-007'])assert.deepEqual(taskFromLocation(path),{task:null,invalid:true});});
