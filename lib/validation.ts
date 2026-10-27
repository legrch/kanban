import { z } from 'zod';
import { stages } from './types';
import { isSafeLink } from './links';
export const cardSchema = z.object({
 taskNumber:z.string().max(24).optional(), id:z.string().min(1).max(80).regex(/^[a-zA-Z0-9_-]+$/), title:z.string().trim().min(1).max(120), project:z.string().trim().min(1).max(40), owner:z.string().trim().max(40),
 stage:z.enum(stages),priority:z.enum(['high','normal','low']),storyPoints:z.number().int().refine(v=>[1,2,3,5,8,13].includes(v),'Use a Fibonacci story point value').nullable().optional(), summary:z.string().max(4000),nextAction:z.string().max(2000),evidence:z.string().max(4000),evidenceState:z.enum(['verified','reported','unknown']),
 evidenceAt:z.string().max(40).refine(v=>v===''||!Number.isNaN(Date.parse(v)),'Invalid date'),source:z.string().max(300),
 links:z.array(z.object({label:z.string().min(1).max(80),url:z.string().url().max(1000).refine(isSafeLink,'Use HTTPS or codex://threads/<UUID>')})).max(12),
 version:z.number().int().min(0),updatedAt:z.string().max(40).optional()
}).strict();
