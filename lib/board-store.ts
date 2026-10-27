import { cardSchema } from './validation';
import type { Card,ActivityEntry } from './types';
import {createTaskNumbers,type TaskPrefix} from './task-number';
import {deploymentConfig} from './deployment-config';
import type {DeploymentConfig} from './config-contract';
export const ACTIVITY_LIMIT=100;
const conflict=()=>new Error('CONFLICT: This task has changed. Refresh the board before saving again.');
export function createBoardStore(database:D1Database,config:DeploymentConfig=deploymentConfig){
const {formatTaskNumber,prefixForProject}=createTaskNumbers(config);
function db(){return database;}
function allocationStatements(cardId:string,prefix:TaskPrefix,afterSuccessfulWrite=false){
 return [
 db().prepare(`INSERT INTO project_counters (prefix,last_number) SELECT ?,1 WHERE ${afterSuccessfulWrite?'changes()=1 AND ':''}NOT EXISTS (SELECT 1 FROM project_task_numbers WHERE card_id=?) ON CONFLICT(prefix) DO UPDATE SET last_number=last_number+1`).bind(prefix,cardId),
 db().prepare('INSERT INTO project_task_numbers (card_id,prefix,number) SELECT ?,prefix,last_number FROM project_counters WHERE prefix=? AND changes()=1 AND NOT EXISTS (SELECT 1 FROM project_task_numbers WHERE card_id=?) ON CONFLICT(card_id) DO NOTHING').bind(cardId,prefix,cardId)
 ];
}
async function numberFor(cardId:string){const row=await db().prepare('SELECT prefix,number FROM project_task_numbers WHERE card_id=?').bind(cardId).first<{prefix:TaskPrefix;number:number}>();return row?formatTaskNumber(row.number,row.prefix):undefined;}
async function readBoard():Promise<Card[]>{const rows=await db().prepare('SELECT c.id,c.data,c.version,c.updated_at,n.prefix,n.number FROM cards c LEFT JOIN project_task_numbers n ON n.card_id=c.id ORDER BY c.updated_at DESC').all<{id:string;data:string;version:number;updated_at:string;prefix:TaskPrefix;number:number|null}>();return rows.results.map(r=>{const {taskNumber:_old,...data}=JSON.parse(r.data);return {...data,id:r.id,version:r.version,updatedAt:r.updated_at,...(r.number?{taskNumber:formatTaskNumber(r.number,r.prefix)}:{})};});}
async function backfillNumbers(){
 const rows=await db().prepare('SELECT c.id,c.data,g.number AS legacy_number FROM cards c LEFT JOIN task_numbers g ON g.card_id=c.id LEFT JOIN project_task_numbers p ON p.card_id=c.id WHERE p.card_id IS NULL ORDER BY g.number IS NULL,g.number,c.updated_at,c.id').all<{id:string;data:string;legacy_number:number|null}>();
 // Explicit legacy overrides preserve issued historical project assignments.
 const statements=rows.results.flatMap(r=>allocationStatements(r.id,(r.legacy_number&&config.legacyPrefixes[String(r.legacy_number)])||prefixForProject(JSON.parse(r.data).project)));
 if(!statements.length)return {allocated:0};
 const results=await db().batch(statements);return {allocated:results.filter((_,i)=>i%2===1).reduce((sum,r)=>sum+r.meta.changes,0)};
}
async function readActivity(cardId:string,beforeVersion?:number):Promise<ActivityEntry[]>{if(typeof cardId!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(cardId))throw new Error('Invalid card ID');if(beforeVersion!==undefined&&(!Number.isSafeInteger(beforeVersion)||beforeVersion<1))throw new Error('Invalid history cursor');const rows=await db().prepare('SELECT id,card_id,version,data,created_at FROM card_activity WHERE card_id=? AND version < ? ORDER BY version DESC LIMIT ?').bind(cardId,beforeVersion??Number.MAX_SAFE_INTEGER,ACTIVITY_LIMIT).all<{id:string;card_id:string;version:number;data:string;created_at:string}>();return rows.results.map(r=>({...JSON.parse(r.data),id:r.id,cardId:r.card_id,version:r.version,createdAt:r.created_at}));}
async function upsertCard(input:unknown){const hasStoryPoints=input!==null&&typeof input==='object'&&Object.prototype.hasOwnProperty.call(input,'storyPoints');const parsed=cardSchema.parse(input);const {version,updatedAt:_discard,taskNumber:_derived,...data}=parsed;
 const createPrefix=version===0?prefixForProject(data.project):undefined;
 if(version===0){const pending=await db().prepare('SELECT c.id FROM cards c LEFT JOIN project_task_numbers p ON p.card_id=c.id WHERE p.card_id IS NULL LIMIT 1').first();if(pending)throw new Error('NUMBERING_PENDING: Task numbers are being reconciled. Creating tasks is temporarily unavailable; existing cards can still be edited.');}
 const prior=await db().prepare('SELECT data,version,updated_at FROM cards WHERE id=?').bind(data.id).first<{data:string;version:number;updated_at:string}>();
 if((version===0&&prior)||(version>0&&(!prior||prior.version!==version)))throw conflict();
 const before=prior?JSON.parse(prior.data):null;
 // Older whole-card clients omit this newly optional field. Preserve a saved estimate unless null is explicit.
 if(prior&&!hasStoryPoints&&before&&Object.prototype.hasOwnProperty.call(before,'storyPoints'))data.storyPoints=before.storyPoints;
 const changedFields=Object.keys(data).filter(key=>JSON.stringify(before?.[key])!==JSON.stringify(data[key as keyof typeof data]));
 // Refreshing only a timestamp is not a meaningful project update.
 if(prior&&changedFields.every(key=>key==='evidenceAt'))return {...before,version:prior.version,updatedAt:prior.updated_at,taskNumber:await numberFor(data.id)} as Card;
 const now=new Date().toISOString(),nextVersion=version+1;
 const event={kind:version===0?'created':'updated',changedFields,snapshot:data};
 const update=version===0?db().prepare('INSERT OR IGNORE INTO cards (id,data,version,updated_at) VALUES (?,?,1,?)').bind(data.id,JSON.stringify(data),now):db().prepare('UPDATE cards SET data=?,version=version+1,updated_at=? WHERE id=? AND version=?').bind(JSON.stringify(data),now,data.id,version);
 // D1 batch is transactional. changes() binds the event to a successful CAS;
 // a failed/stale update cannot append history. Reads are bounded; old receipts are retained.
 const statements=[
  update,
  db().prepare('INSERT INTO card_activity (id,card_id,version,data,created_at) SELECT ?,?,?,?,? WHERE changes()=1').bind(`${data.id}:${nextVersion}`,data.id,nextVersion,JSON.stringify(event),now)
 ];
 // Independent project counter + immutable mapping share the CAS transaction.
 // Counters and issued mappings are retained; updates never renumber.
 if(version===0)statements.push(...allocationStatements(data.id,createPrefix!,true));
 const results=await db().batch(statements);
 if(results[0].meta.changes!==1)throw conflict();
 return {...data,version:nextVersion,updatedAt:now,taskNumber:await numberFor(data.id)};}
async function dispatchBoard(body:unknown){const b=body as {action?:string;card?:unknown};if(b?.action==='backfill_numbers')return backfillNumbers();if(b?.action==='upsert')return upsertCard(b.card);throw new Error('Unknown action');}
return {readBoard,readActivity,upsertCard,backfillNumbers,dispatchBoard};
}
