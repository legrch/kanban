import {deploymentConfig} from './deployment-config';
import type {DeploymentConfig} from './config-contract';
export type TaskPrefix=string;
export const PROJECT_PREFIXES=deploymentConfig.projects;
export function createTaskNumbers(config:DeploymentConfig){
const PROJECT_PREFIXES=config.projects;
function prefixForProject(project:string):TaskPrefix{const prefix=Object.hasOwn(PROJECT_PREFIXES,project)?PROJECT_PREFIXES[project]:undefined;if(!prefix)throw new Error(`Supported projects are ${Object.keys(PROJECT_PREFIXES).join(', ')}. Choose one to number a new task.`);return prefix;}
function formatTaskNumber(value:number,prefix:TaskPrefix=config.defaultPrefix):string{if(!Object.values(PROJECT_PREFIXES).includes(prefix)||!Number.isSafeInteger(value)||value<1)throw new Error('Invalid task sequence');return `${prefix}-${String(value).padStart(3,'0')}`;}
function parseTaskSequence(value:string|null|undefined):number|null{if(typeof value!=='string')return null;const match=/^([A-Z]{2,8})-([0-9]{3,16})$/.exec(value);if(!match||!Object.values(PROJECT_PREFIXES).includes(match[1]))return null;const n=Number(match[2]);return Number.isSafeInteger(n)&&n>0&&String(n).padStart(3,'0')===match[2]?n:null;}
function parseTaskNumber(value:string|null|undefined):string|null{return parseTaskSequence(value)===null?null:value!;}
function taskPath(taskNumber:string):string{const valid=parseTaskNumber(taskNumber);if(!valid)throw new Error('Invalid task number');return `/tasks/${encodeURIComponent(valid)}`;}
function taskFromSearch(search:string):{task:string|null;invalid:boolean}{const params=new URLSearchParams(search);return {task:null,invalid:params.has('task')};}
function taskFromLocation(pathname:string,search=''):{task:string|null;invalid:boolean}{if(pathname==='/'||pathname==='')return taskFromSearch(search);const match=/^\/tasks\/([^/]+)\/?$/.exec(pathname);if(!match)return {task:null,invalid:true};try{const task=parseTaskNumber(decodeURIComponent(match[1]));return {task,invalid:task===null};}catch{return {task:null,invalid:true};}}
return {prefixForProject,formatTaskNumber,parseTaskSequence,parseTaskNumber,taskPath,taskFromSearch,taskFromLocation};
}
export const {prefixForProject,formatTaskNumber,parseTaskSequence,parseTaskNumber,taskPath,taskFromSearch,taskFromLocation}=createTaskNumbers(deploymentConfig);
