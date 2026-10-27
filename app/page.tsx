import { requireChatGPTUser } from './chatgpt-auth';
import Board from './board';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const params=await searchParams;const value=params.task;const task=typeof value==='string'?value.slice(0,100):Array.isArray(value)?'invalid':undefined;await requireChatGPTUser(task===undefined?'/':`/?task=${encodeURIComponent(task)}`);return <Board/>;}
