import { requireChatGPTUser } from '../../chatgpt-auth';
import Board from '../../board';
import { parseTaskNumber,taskPath } from '../../../lib/task-number';
export const dynamic='force-dynamic';
export default async function TaskPage({params}:{params:Promise<{task:string}>}){const {task}=await params;const canonical=parseTaskNumber(task);const returnTo=canonical?taskPath(canonical):`/tasks/${encodeURIComponent(task.slice(0,100))}`;await requireChatGPTUser(returnTo);return <Board/>;}
